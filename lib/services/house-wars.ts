import type { SupabaseClient } from "@supabase/supabase-js";
import type { HouseWar } from "@/lib/types/phase2";
import { publishNews } from "./news";

type Supabase = SupabaseClient;

export async function getOrCreateHouseWar(supabase: Supabase, seasonId: string) {
  const { data: active } = await supabase
    .from("house_wars")
    .select("*")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .maybeSingle();

  if (active) return active;

  const { data: houses } = await supabase
    .from("creator_houses")
    .select("id, name, fame_score")
    .order("fame_score", { ascending: false })
    .limit(10);

  if (!houses || houses.length < 2) return null;

  const shuffled = [...houses].sort(() => Math.random() - 0.5);
  const houseA = shuffled[0];
  const houseB = shuffled[1];

  const weekNumber = Math.ceil((Date.now() - new Date().setHours(0, 0, 0, 0)) / (7 * 24 * 60 * 60 * 1000));
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 7);

  const themes = ["Content Clash", "Trend Domination", "Fame Face-Off", "Revenue Rumble", "Viral Velocity"];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const { data: war } = await supabase
    .from("house_wars")
    .insert({
      season_id: seasonId,
      week_number: weekNumber,
      house_a_id: houseA.id,
      house_b_id: houseB.id,
      theme,
      reward_pool: 25000 + houses.length * 1000,
      ends_at: endsAt.toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (war) {
    await publishNews(supabase, {
      headline: `House War: ${houseA.name} vs ${houseB.name}`,
      summary: `Weekly clan battle "${theme}" has begun. Exclusive rewards await the victor.`,
      category: "house_war",
      relatedHouseId: houseA.id,
      controversyScore: 35,
      isTrending: true,
    });
  }

  return war;
}

export async function contributeToHouseWar(
  supabase: Supabase,
  creatorId: string,
  houseId: string,
  points: number
) {
  const { data: war } = await supabase
    .from("house_wars")
    .select("*")
    .eq("status", "active")
    .or(`house_a_id.eq.${houseId},house_b_id.eq.${houseId}`)
    .gte("ends_at", new Date().toISOString())
    .maybeSingle();

  if (!war) throw new Error("No active house war for your house");

  await supabase.from("house_war_contributions").upsert(
    {
      house_war_id: war.id,
      creator_id: creatorId,
      house_id: houseId,
      points,
    },
    { onConflict: "house_war_id,creator_id" }
  );

  const scoreField = war.house_a_id === houseId ? "house_a_score" : "house_b_score";
  const currentScore = war.house_a_id === houseId ? war.house_a_score : war.house_b_score;

  await supabase
    .from("house_wars")
    .update({ [scoreField]: currentScore + points })
    .eq("id", war.id);

  return war;
}

export async function resolveExpiredHouseWars(supabase: Supabase) {
  const { data: wars } = await supabase
    .from("house_wars")
    .select("*")
    .eq("status", "active")
    .lte("ends_at", new Date().toISOString());

  for (const war of wars ?? []) {
    const winnerId =
      war.house_a_score > war.house_b_score
        ? war.house_a_id
        : war.house_b_score > war.house_a_score
        ? war.house_b_id
        : null;

    await supabase
      .from("house_wars")
      .update({
        status: "completed",
        winner_house_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", war.id);

    if (winnerId) {
      await supabase
        .from("creator_houses")
        .update({
          fame_score: war.house_a_id === winnerId ? war.house_a_score + 100 : war.house_b_score + 100,
          house_revenue: Number(war.reward_pool),
        })
        .eq("id", winnerId);

      const { data: members } = await supabase.from("creators").select("id, user_id").eq("house_id", winnerId);

      for (const member of members ?? []) {
        await supabase.from("notifications").insert({
          user_id: member.user_id,
          creator_id: member.id,
          type: "house_war",
          title: "House War Victory!",
          message: `Your house won the weekly war and earned ${war.reward_pool} in rewards.`,
          data: { houseWarId: war.id },
        });
      }
    }
  }
}

export async function getActiveHouseWar(supabase: Supabase): Promise<HouseWar | null> {
  const { data: war } = await supabase
    .from("house_wars")
    .select("*")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!war) return null;

  const { data: houses } = await supabase
    .from("creator_houses")
    .select("id, name, fame_score")
    .in("id", [war.house_a_id, war.house_b_id]);

  const houseMap = new Map(houses?.map((h) => [h.id, h]) ?? []);

  return {
    ...war,
    house_a: houseMap.get(war.house_a_id),
    house_b: houseMap.get(war.house_b_id),
  } as HouseWar;
}

export async function getHouseLeaderboard(supabase: Supabase, limit = 20) {
  const { data } = await supabase
    .from("creator_houses")
    .select("id, name, fame_score, house_revenue, house_rank")
    .order("fame_score", { ascending: false })
    .limit(limit);

  const houses = data ?? [];
  for (let i = 0; i < houses.length; i++) {
    await supabase.from("creator_houses").update({ house_rank: i + 1 }).eq("id", houses[i].id);
  }

  return houses.map((h, i) => ({ ...h, house_rank: i + 1 }));
}

export async function joinHouse(supabase: Supabase, creatorId: string, houseId: string) {
  const { data: house } = await supabase.from("creator_houses").select("*").eq("id", houseId).single();
  if (!house) throw new Error("House not found");

  const { count } = await supabase
    .from("creators")
    .select("*", { count: "exact", head: true })
    .eq("house_id", houseId);

  if ((count ?? 0) >= house.max_members) throw new Error("House is full");

  await supabase.from("creators").update({ house_id: houseId }).eq("id", creatorId);

  if (house.owner_creator_id && house.owner_creator_id !== creatorId) {
    await supabase.from("creator_relationships").insert({
      creator_id: creatorId,
      related_creator_id: house.owner_creator_id,
      relationship_type: "house_member",
      strength: 50,
    });
  }

  return house;
}
