import { requireAuth, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import { getActiveLifeEvents } from "@/lib/services/life-events";
import { getActiveBattles } from "@/lib/services/battles";
import { getNewsFeed } from "@/lib/services/news";
import { getActiveHouseWar, getHouseLeaderboard } from "@/lib/services/house-wars";
import { getActiveSeasonInfo } from "@/lib/services/hall-of-fame";
import { getUserAgency } from "@/lib/services/agency";
import { getCreatorDna } from "@/lib/services/dna";
import { getPublicRelationshipDrama } from "@/lib/services/relationships";
import { getActiveListings, getCreatorValuation } from "@/lib/services/marketplace";
import { getTrendingTopics } from "@/lib/services/social";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const creator = await getActiveCreator(supabase, user!.id);

  const [lifeEvents, battles, news, houseWar, houses, season, agency, dna, relationshipDrama, marketplaceListings, trendingTopics, valuation] =
    await Promise.all([
      getActiveLifeEvents(supabase, user!.id),
      getActiveBattles(supabase, 5),
      getNewsFeed(supabase, { limit: 5, trending: true }),
      getActiveHouseWar(supabase),
      getHouseLeaderboard(supabase, 10),
      getActiveSeasonInfo(supabase),
      getUserAgency(supabase, user!.id),
      creator ? getCreatorDna(supabase, creator.id, true) : null,
      getPublicRelationshipDrama(supabase, 5),
      getActiveListings(supabase, 5),
      getTrendingTopics(supabase, 5),
      creator ? getCreatorValuation(supabase, creator.id) : null,
    ]);

  return jsonSuccess({
    creator,
    lifeEvents,
    battles,
    news: news.items,
    houseWar,
    houseLeaderboard: houses,
    season,
    agency,
    dna,
    relationshipDrama,
    marketplaceListings,
    trendingTopics,
    valuation,
  });
}
