import type { SupabaseClient } from "@supabase/supabase-js";
import type { HallOfFameEntry, SeasonInfo } from "@/lib/types/phase2";

type Supabase = SupabaseClient;

export async function recordHallOfFame(
  supabase: Supabase,
  creatorId: string,
  category: string,
  value: number,
  label: string,
  increment = false
) {
  const { data: existing } = await supabase
    .from("hall_of_fame")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("category", category)
    .maybeSingle();

  const newValue = increment && existing ? Number(existing.record_value) + value : value;

  if (existing && !increment && value <= Number(existing.record_value)) return existing;

  const { data: season } = await supabase.from("seasons").select("id, season_number").eq("is_active", true).maybeSingle();

  await supabase.from("hall_of_fame").upsert(
    {
      creator_id: creatorId,
      category,
      record_value: newValue,
      record_label: label,
      season_id: season?.id ?? null,
      season_number: season?.season_number ?? null,
      achieved_at: new Date().toISOString(),
    },
    { onConflict: "creator_id,category" }
  );
}

export async function syncHallOfFameRecords(supabase: Supabase) {
  const { data: creators } = await supabase
    .from("creators")
    .select("id, followers, total_views, net_worth, influence")
    .order("followers", { ascending: false })
    .limit(100);

  for (const c of creators ?? []) {
    if (c.followers >= 1_000_000) {
      await recordHallOfFame(supabase, c.id, "all_time_followers", c.followers, `${c.followers.toLocaleString()} followers`);
    }
    if (c.total_views >= 10_000_000) {
      await recordHallOfFame(supabase, c.id, "all_time_views", c.total_views, `${c.total_views.toLocaleString()} total views`);
    }
    if (Number(c.net_worth) >= 1_000_000) {
      await recordHallOfFame(supabase, c.id, "all_time_wealth", Number(c.net_worth), `$${Number(c.net_worth).toLocaleString()} net worth`);
    }
  }
}

export async function getHallOfFame(
  supabase: Supabase,
  category?: string,
  limit = 50
): Promise<HallOfFameEntry[]> {
  let query = supabase
    .from("hall_of_fame")
    .select("*")
    .order("record_value", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);

  const { data } = await query;
  const creatorIds = [...new Set((data ?? []).map((e) => e.creator_id))];
  const { data: creators } = creatorIds.length
    ? await supabase.from("creators").select("id, name, avatar_gradient").in("id", creatorIds)
    : { data: [] };

  const map = new Map(creators?.map((c) => [c.id, c]) ?? []);

  return (data ?? []).map((e) => ({
    ...e,
    creator: map.get(e.creator_id),
  })) as HallOfFameEntry[];
}

export async function getActiveSeasonInfo(supabase: Supabase): Promise<SeasonInfo | null> {
  const { data: season } = await supabase.from("seasons").select("*").eq("is_active", true).maybeSingle();
  if (!season) return null;

  const endsAt = new Date(season.ends_at);
  const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return {
    ...season,
    days_remaining: daysRemaining,
    reward_tiers: (season.reward_tiers as SeasonInfo["reward_tiers"]) ?? [
      { rank: 1, label: "Season Champion", reward: "Exclusive badge + 100K bonus" },
      { rank: 10, label: "Top 10", reward: "50K bonus + trend boost" },
      { rank: 100, label: "Top 100", reward: "10K bonus" },
    ],
  };
}

export async function distributeSeasonRewards(supabase: Supabase, seasonId: string) {
  const { data: season } = await supabase.from("seasons").select("*").eq("id", seasonId).single();
  if (!season) return;

  const { data: topRankings } = await supabase
    .from("rankings")
    .select("creator_id, rank_position")
    .eq("season_id", seasonId)
    .eq("rank_type", "global")
    .lte("rank_position", 100)
    .order("rank_position");

  const rewardMap: Record<number, number> = { 1: 100000, 2: 50000, 3: 25000 };
  for (let r = 4; r <= 10; r++) rewardMap[r] = 10000;
  for (let r = 11; r <= 100; r++) rewardMap[r] = 2000;

  for (const rank of topRankings ?? []) {
    const amount = rewardMap[rank.rank_position] ?? 1000;
    const label =
      rank.rank_position === 1
        ? "Season Champion"
        : rank.rank_position <= 10
        ? `Top ${rank.rank_position}`
        : "Top 100";

    await supabase.from("season_rewards").insert({
      season_id: seasonId,
      creator_id: rank.creator_id,
      reward_type: "season_end",
      reward_label: label,
      reward_value: { cash: amount, rank: rank.rank_position },
      rank_achieved: rank.rank_position,
    });

    await supabase
      .from("creators")
      .select("net_worth, user_id")
      .eq("id", rank.creator_id)
      .single()
      .then(async ({ data: c }) => {
        if (c) {
          await supabase.from("creators").update({ net_worth: Number(c.net_worth) + amount }).eq("id", rank.creator_id);
          await supabase.from("transactions").insert({
            creator_id: rank.creator_id,
            type: "season_reward",
            amount,
            description: `${season.name}: ${label}`,
          });
          await supabase.from("notifications").insert({
            user_id: c.user_id,
            creator_id: rank.creator_id,
            type: "season_start",
            title: `${season.name} Rewards!`,
            message: `You finished #${rank.rank_position} and earned $${amount.toLocaleString()}!`,
            data: { seasonId, rank: rank.rank_position },
          });

          if (rank.rank_position === 1) {
            await recordHallOfFame(supabase, rank.creator_id, "season_champion", season.season_number, `Season ${season.season_number} Champion`);
          }
        }
      });
  }

  await supabase.from("seasons").update({ is_active: false }).eq("id", seasonId);
}
