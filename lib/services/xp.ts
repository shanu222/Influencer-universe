import type { SupabaseClient } from "@supabase/supabase-js";
import { levelFromXp, xpForLevel, xpProgressInLevel } from "@/lib/types/phase2";
import { revealDnaPartial } from "./dna";

type Supabase = SupabaseClient;

export async function awardXp(
  supabase: Supabase,
  creatorId: string,
  amount: number,
  source: string
) {
  const { data: creator } = await supabase.from("creators").select("xp, level").eq("id", creatorId).single();
  if (!creator) return;

  const newXp = creator.xp + amount;
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > creator.level;

  await supabase.from("creators").update({ xp: newXp, level: newLevel }).eq("id", creatorId);

  if (leveledUp) {
    await checkPerkUnlocks(supabase, creatorId, newLevel);
    await revealDnaPartial(supabase, creatorId, newLevel);

    const { data: c } = await supabase.from("creators").select("user_id").eq("id", creatorId).single();
    if (c) {
      await supabase.from("notifications").insert({
        user_id: c.user_id,
        creator_id: creatorId,
        type: "achievement_unlocked",
        title: `Level Up! Now Level ${newLevel}`,
        message: `Your creator reached level ${newLevel} from ${source}.`,
        data: { level: newLevel },
      });
    }
  }

  return { xp: newXp, level: newLevel, leveledUp };
}

export async function awardSkillXp(
  supabase: Supabase,
  creatorId: string,
  skillSlug: string,
  amount: number
) {
  const { data: skillDef } = await supabase.from("skill_definitions").select("*").eq("slug", skillSlug).single();
  if (!skillDef) return;

  const { data: existing } = await supabase
    .from("creator_skills")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("skill_id", skillDef.id)
    .maybeSingle();

  const currentXp = (existing?.xp_in_skill ?? 0) + amount;
  const xpNeeded = skillDef.xp_per_level;
  let level = existing?.level ?? 0;

  while (level < skillDef.max_level && currentXp >= xpNeeded * (level + 1)) {
    level++;
  }

  await supabase.from("creator_skills").upsert(
    {
      creator_id: creatorId,
      skill_id: skillDef.id,
      level,
      xp_in_skill: currentXp,
      unlocked_at: existing?.unlocked_at ?? new Date().toISOString(),
    },
    { onConflict: "creator_id,skill_id" }
  );

  return { level, xp: currentXp };
}

async function checkPerkUnlocks(supabase: Supabase, creatorId: string, level: number) {
  const { data: perks } = await supabase
    .from("perk_definitions")
    .select("*")
    .lte("required_creator_level", level);

  const { data: unlocked } = await supabase
    .from("creator_perks")
    .select("perk_id")
    .eq("creator_id", creatorId);

  const unlockedIds = new Set(unlocked?.map((u) => u.perk_id) ?? []);

  for (const perk of perks ?? []) {
    if (unlockedIds.has(perk.id)) continue;

    if (perk.required_skill_slug) {
      const { data: skillDef } = await supabase
        .from("skill_definitions")
        .select("id")
        .eq("slug", perk.required_skill_slug)
        .single();
      if (!skillDef) continue;

      const { data: skill } = await supabase
        .from("creator_skills")
        .select("level")
        .eq("creator_id", creatorId)
        .eq("skill_id", skillDef.id)
        .maybeSingle();

      if ((skill?.level ?? 0) < perk.required_skill_level) continue;
    }

    await supabase.from("creator_perks").insert({ creator_id: creatorId, perk_id: perk.id });
  }
}

export async function getCreatorProgression(supabase: Supabase, creatorId: string) {
  const { data: creator } = await supabase.from("creators").select("xp, level").eq("id", creatorId).single();
  if (!creator) return null;

  const [{ data: skills }, { data: perks }, { data: skillDefs }, { data: perkDefs }] = await Promise.all([
    supabase.from("creator_skills").select("*").eq("creator_id", creatorId),
    supabase.from("creator_perks").select("perk_id").eq("creator_id", creatorId),
    supabase.from("skill_definitions").select("*").order("sort_order"),
    supabase.from("perk_definitions").select("*").order("sort_order"),
  ]);

  const skillMap = new Map(skills?.map((s) => [s.skill_id, s]) ?? []);
  const unlockedPerkIds = new Set(perks?.map((p) => p.perk_id) ?? []);

  const progress = xpProgressInLevel(creator.xp, creator.level);

  return {
    level: creator.level,
    xp: creator.xp,
    progress,
    skills: (skillDefs ?? []).map((def) => ({
      ...def,
      level: skillMap.get(def.id)?.level ?? 0,
      xp_in_skill: skillMap.get(def.id)?.xp_in_skill ?? 0,
    })),
    perks: (perkDefs ?? []).map((def) => ({
      ...def,
      unlocked: unlockedPerkIds.has(def.id),
    })),
  };
}

export function xpFromContent(viralityScore: number, followersGained: number): number {
  return Math.round(viralityScore * 2 + Math.log10(Math.max(followersGained, 1)) * 10);
}

export function xpFromBattle(won: boolean): number {
  return won ? 500 : 150;
}
