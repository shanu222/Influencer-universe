import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DNA_TRAITS,
  STRENGTH_POOL,
  WEAKNESS_POOL,
  type CreatorDna,
  type DnaTrait,
} from "@/lib/types/phase2";

type Supabase = SupabaseClient;

function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function traitModifiers(traits: Record<string, number>): CreatorDna["growth_modifiers"] {
  const mods = { followers: 1, revenue: 1, virality: 1, energy: 1 };
  if ((traits.ambitious ?? 0) > 60) mods.followers += 0.1;
  if ((traits.risk_taker ?? 0) > 60) mods.virality += 0.15;
  if ((traits.perfectionist ?? 0) > 60) mods.revenue += 0.1;
  if ((traits.introverted ?? 0) > 60) mods.energy -= 0.05;
  if ((traits.controversial ?? 0) > 60) mods.virality += 0.2;
  if ((traits.strategic ?? 0) > 60) mods.revenue += 0.08;
  if ((traits.dramatic ?? 0) > 70) mods.virality += 0.1;
  return mods;
}

export function generateDna(niche: string): Omit<CreatorDna, "creator_id"> {
  const traits: Record<string, number> = {};
  for (const t of DNA_TRAITS) {
    traits[t] = 20 + Math.floor(Math.random() * 70);
  }

  if (niche === "gamer" || niche === "streamer") traits.innovative = Math.min(100, (traits.innovative ?? 50) + 15);
  if (niche === "comedian") traits.dramatic = Math.min(100, (traits.dramatic ?? 50) + 20);
  if (niche === "fashion") traits.charismatic = Math.min(100, (traits.charismatic ?? 50) + 15);

  const strengths = pickRandom(STRENGTH_POOL, 2);
  const availableWeaknesses = WEAKNESS_POOL.filter((w) => !strengths.includes(w as never));
  const weaknesses = pickRandom(availableWeaknesses, 2);
  const hidden = pickRandom(DNA_TRAITS, 1)[0];

  const growth_modifiers = traitModifiers(traits);
  for (const s of strengths) {
    if (s === "Viral Instinct") growth_modifiers.virality += 0.12;
    if (s === "Brand Magnetism") growth_modifiers.revenue += 0.15;
    if (s === "Trend Surfer") growth_modifiers.followers += 0.1;
  }
  for (const w of weaknesses) {
    if (w === "Burnout Risk") growth_modifiers.energy -= 0.1;
    if (w === "Scandal Prone") growth_modifiers.revenue -= 0.08;
  }

  return {
    traits,
    strengths,
    weaknesses,
    growth_modifiers,
    hidden_trait: hidden,
    is_partially_revealed: false,
  };
}

export async function createCreatorDna(supabase: Supabase, creatorId: string, niche: string) {
  const dna = generateDna(niche);
  await supabase.from("creator_dna").insert({ creator_id: creatorId, ...dna });
  return dna;
}

export async function getCreatorDna(supabase: Supabase, creatorId: string, isOwner: boolean): Promise<CreatorDna | null> {
  const { data } = await supabase.from("creator_dna").select("*").eq("creator_id", creatorId).maybeSingle();
  if (!data) return null;

  if (!isOwner && !data.is_partially_revealed) {
    return {
      creator_id: creatorId,
      traits: {},
      strengths: data.strengths?.slice(0, 1) ?? [],
      weaknesses: [],
      growth_modifiers: { followers: 1, revenue: 1, virality: 1, energy: 1 },
      hidden_trait: null,
      is_partially_revealed: false,
    };
  }

  const result: CreatorDna = {
    creator_id: creatorId,
    traits: isOwner ? (data.traits as Record<string, number>) : {},
    strengths: data.strengths ?? [],
    weaknesses: isOwner ? (data.weaknesses ?? []) : [],
    growth_modifiers: data.growth_modifiers as CreatorDna["growth_modifiers"],
    hidden_trait: isOwner ? data.hidden_trait : null,
    is_partially_revealed: data.is_partially_revealed,
  };

  return result;
}

export function applyDnaModifiers(
  base: { followersGained: number; revenue: number; viralityScore: number; energyCost: number },
  dna: CreatorDna | null
) {
  if (!dna) return base;
  const m = dna.growth_modifiers;
  return {
    followersGained: Math.round(base.followersGained * m.followers),
    revenue: Math.round(base.revenue * m.revenue * 100) / 100,
    viralityScore: Math.min(100, Math.round(base.viralityScore * m.virality)),
    energyCost: Math.round(base.energyCost * (2 - m.energy)),
  };
}

export async function revealDnaPartial(supabase: Supabase, creatorId: string, level: number) {
  if (level >= 10) {
    await supabase.from("creator_dna").update({ is_partially_revealed: true }).eq("creator_id", creatorId);
  }
  if (level >= 50) {
    await supabase
      .from("creator_dna")
      .update({ is_partially_revealed: true, fully_revealed_at: new Date().toISOString() })
      .eq("creator_id", creatorId);
  }
}
