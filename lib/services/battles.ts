import type { SupabaseClient } from "@supabase/supabase-js";
import type { Battle } from "@/lib/types/phase2";
import { publishNews } from "./news";

type Supabase = SupabaseClient;

const BATTLE_DURATION_HOURS: Record<string, number> = {
  music_battle: 24,
  trend_battle: 12,
  streaming_battle: 6,
  popularity_battle: 48,
  fan_vote_battle: 72,
};

export async function createBattle(
  supabase: Supabase,
  input: {
    challengerId: string;
    opponentId: string;
    type: string;
    userId: string;
  }
) {
  if (input.challengerId === input.opponentId) throw new Error("Cannot battle yourself");

  const { data: existingForward } = await supabase
    .from("rivalries")
    .select("id")
    .eq("challenger_id", input.challengerId)
    .eq("opponent_id", input.opponentId)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existingForward) throw new Error("Battle already in progress with this creator");

  const { data: dupCheck } = await supabase
    .from("rivalries")
    .select("id")
    .eq("challenger_id", input.opponentId)
    .eq("opponent_id", input.challengerId)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (dupCheck) throw new Error("Battle already in progress with this creator");

  const hours = BATTLE_DURATION_HOURS[input.type] ?? 24;
  const endsAt = new Date();
  endsAt.setHours(endsAt.getHours() + hours);

  const status = input.type === "fan_vote_battle" ? "active" : "active";

  const { data: battle, error } = await supabase
    .from("rivalries")
    .insert({
      challenger_id: input.challengerId,
      opponent_id: input.opponentId,
      type: input.type,
      status,
      started_at: new Date().toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: opponent } = await supabase.from("creators").select("user_id, name").eq("id", input.opponentId).single();
  const { data: challenger } = await supabase.from("creators").select("name").eq("id", input.challengerId).single();

  if (opponent?.user_id) {
    await supabase.from("notifications").insert({
      user_id: opponent.user_id,
      creator_id: input.opponentId,
      type: "battle_challenge",
      title: "Battle Challenge!",
      message: `${challenger?.name} challenged you to a ${input.type.replace(/_/g, " ")}!`,
      data: { battleId: battle.id },
    });
  }

  await publishNews(supabase, {
    headline: `${challenger?.name} vs ${opponent?.name}: ${input.type.replace(/_/g, " ")} begins!`,
    summary: `A high-stakes creator battle has started. Fans are picking sides.`,
    category: "battle",
    relatedCreatorId: input.challengerId,
    relatedRivalryId: battle.id,
    controversyScore: 40,
    isTrending: true,
  });

  return battle;
}

export async function voteInBattle(
  supabase: Supabase,
  rivalryId: string,
  voterUserId: string,
  votedForCreatorId: string
) {
  const { data: battle } = await supabase.from("rivalries").select("*").eq("id", rivalryId).single();
  if (!battle || battle.status !== "active") throw new Error("Battle not active");
  if (votedForCreatorId !== battle.challenger_id && votedForCreatorId !== battle.opponent_id) {
    throw new Error("Invalid vote target");
  }

  await supabase.from("battle_votes").upsert(
    { rivalry_id: rivalryId, voter_user_id: voterUserId, voted_for_creator_id: votedForCreatorId },
    { onConflict: "rivalry_id,voter_user_id" }
  );

  const { count: challengerVotes } = await supabase
    .from("battle_votes")
    .select("*", { count: "exact", head: true })
    .eq("rivalry_id", rivalryId)
    .eq("voted_for_creator_id", battle.challenger_id);

  const { count: opponentVotes } = await supabase
    .from("battle_votes")
    .select("*", { count: "exact", head: true })
    .eq("rivalry_id", rivalryId)
    .eq("voted_for_creator_id", battle.opponent_id);

  await supabase
    .from("rivalries")
    .update({
      challenger_score: challengerVotes ?? 0,
      opponent_score: opponentVotes ?? 0,
    })
    .eq("id", rivalryId);

  return { challengerVotes: challengerVotes ?? 0, opponentVotes: opponentVotes ?? 0 };
}

export async function resolveExpiredBattles(supabase: Supabase) {
  const { data: battles } = await supabase
    .from("rivalries")
    .select("*")
    .eq("status", "active")
    .lte("ends_at", new Date().toISOString());

  for (const battle of battles ?? []) {
    let challengerScore = battle.challenger_score;
    let opponentScore = battle.opponent_score;

    if (battle.type !== "fan_vote_battle") {
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("creators").select("influence, fame_score, trend_score").eq("id", battle.challenger_id).single(),
        supabase.from("creators").select("influence, fame_score, trend_score").eq("id", battle.opponent_id).single(),
      ]);

      if (battle.type === "music_battle") {
        challengerScore = (c?.fame_score ?? 0) + Math.floor(Math.random() * 20);
        opponentScore = (o?.fame_score ?? 0) + Math.floor(Math.random() * 20);
      } else if (battle.type === "trend_battle") {
        challengerScore = (c?.trend_score ?? 0) + Math.floor(Math.random() * 15);
        opponentScore = (o?.trend_score ?? 0) + Math.floor(Math.random() * 15);
      } else {
        challengerScore = (c?.influence ?? 0) + Math.floor(Math.random() * 10);
        opponentScore = (o?.influence ?? 0) + Math.floor(Math.random() * 10);
      }
    }

    const winnerId =
      challengerScore > opponentScore
        ? battle.challenger_id
        : opponentScore > challengerScore
        ? battle.opponent_id
        : null;

    await supabase
      .from("rivalries")
      .update({
        status: "completed",
        challenger_score: challengerScore,
        opponent_score: opponentScore,
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", battle.id);

    if (winnerId) {
      const prize = 5000 + Math.floor(Math.random() * 10000);
      await supabase
        .from("creators")
        .select("net_worth, influence")
        .eq("id", winnerId)
        .single()
        .then(async ({ data: w }) => {
          if (w) {
            await supabase
              .from("creators")
              .update({
                net_worth: Number(w.net_worth) + prize,
                influence: Math.min(100, w.influence + 3),
              })
              .eq("id", winnerId);
          }
        });

      await supabase.from("transactions").insert({
        creator_id: winnerId,
        type: "rivalry_prize",
        amount: prize,
        description: `Battle victory: ${battle.type}`,
        reference_id: battle.id,
        reference_type: "rivalry",
      });

      const { recordHallOfFame } = await import("./hall-of-fame");
      await recordHallOfFame(supabase, winnerId, "battle_wins", 1, "Battle victories");
    }
  }
}

export async function getActiveBattles(supabase: Supabase, limit = 20): Promise<Battle[]> {
  const { data } = await supabase
    .from("rivalries")
    .select("*")
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  const creatorIds = [...new Set(data.flatMap((b) => [b.challenger_id, b.opponent_id]))];
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, avatar_gradient")
    .in("id", creatorIds);

  const map = new Map(creators?.map((c) => [c.id, c]) ?? []);

  return data.map((b) => ({
    ...b,
    challenger: map.get(b.challenger_id),
    opponent: map.get(b.opponent_id),
  })) as Battle[];
}

export async function getCreatorBattles(supabase: Supabase, creatorId: string) {
  const { data } = await supabase
    .from("rivalries")
    .select("*")
    .or(`challenger_id.eq.${creatorId},opponent_id.eq.${creatorId}`)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}
