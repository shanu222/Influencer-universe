import { NextRequest } from "next/server";
import { jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "global";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 100);

  const { data: season } = await client
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .single();

  if (!season) return jsonSuccess({ rankings: [], season: null });

  const rankType = type === "genre" || type === "friends" ? "global" : type;

  let rankingQuery = client
    .from("rankings")
    .select("rank_position, previous_position, score, country_code, niche, creator_id")
    .eq("season_id", season.id)
    .eq("rank_type", rankType)
    .order("rank_position", { ascending: true })
    .limit(limit);

  if (type === "country") {
    const country = searchParams.get("country");
    if (country) rankingQuery = rankingQuery.eq("country_code", country);
  }

  const { data: rankingRows, error } = await rankingQuery;
  if (error) return jsonError(error.message, 500);

  const creatorIds = [...new Set((rankingRows ?? []).map((r) => r.creator_id))];
  const { data: creators } = creatorIds.length
    ? await client
        .from("creators")
        .select("id, name, handle, followers, net_worth, influence, fame_score, avatar_gradient, is_verified, nationality, niche")
        .in("id", creatorIds)
    : { data: [] };

  const creatorMap = new Map((creators ?? []).map((c) => [c.id, c]));

  let activeCreatorId: string | null = null;
  const { data: { user } } = await client.auth.getUser();
  if (user) {
    const creator = await getActiveCreator(client, user.id);
    activeCreatorId = creator?.id ?? null;
  }

  const rankings = (rankingRows ?? []).map((r) => {
    const creator = creatorMap.get(r.creator_id);
    return {
      rank_position: r.rank_position,
      previous_position: r.previous_position,
      score: r.score,
      creator,
      is_you: r.creator_id === activeCreatorId,
    };
  });

  if (activeCreatorId && !rankings.some((r) => r.is_you)) {
    const { data: myRank } = await client
      .from("rankings")
      .select("rank_position, previous_position, score, creator_id")
      .eq("season_id", season.id)
      .eq("rank_type", "global")
      .eq("creator_id", activeCreatorId)
      .maybeSingle();

    if (myRank) {
      rankings.push({
        ...myRank,
        creator: creatorMap.get(myRank.creator_id) ?? creators?.find((c) => c.id === myRank.creator_id),
        is_you: true,
      });
    }
  }

  return jsonSuccess({ rankings, season });
}
