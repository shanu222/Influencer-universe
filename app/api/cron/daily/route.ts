import { NextRequest, NextResponse } from "next/server";
import { jsonSuccess } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { updateRankings } from "@/lib/services/game";
import { calculateBusinessDailyRevenue } from "@/lib/services/economy";
import { resolveExpiredBattles } from "@/lib/services/battles";
import { resolveExpiredHouseWars, getOrCreateHouseWar } from "@/lib/services/house-wars";
import { generateAndPublishNews } from "@/lib/services/news";
import { syncHallOfFameRecords, getActiveSeasonInfo, distributeSeasonRewards } from "@/lib/services/hall-of-fame";
import { regenerateAgencyEnergy } from "@/lib/services/agency";
import { refreshTrendingTopics } from "@/lib/services/social";
import { generateAutoRelationshipStories } from "@/lib/services/relationships";
import { refreshAllValuations, updateMarketRankings } from "@/lib/services/marketplace";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: businesses } = await supabase.from("businesses").select("*").eq("is_active", true);

  for (const business of businesses ?? []) {
    const { data: creator } = await supabase
      .from("creators")
      .select("fame_score, followers, net_worth, monthly_revenue")
      .eq("id", business.creator_id)
      .single();

    if (!creator) continue;

    const dailyRevenue = calculateBusinessDailyRevenue(
      business.type,
      business.level,
      creator.fame_score,
      creator.followers
    );

    await supabase
      .from("businesses")
      .update({
        daily_revenue: dailyRevenue,
        total_revenue: Number(business.total_revenue) + dailyRevenue,
      })
      .eq("id", business.id);

    await supabase.from("transactions").insert({
      creator_id: business.creator_id,
      type: "business_revenue",
      amount: dailyRevenue,
      description: `Daily revenue: ${business.name}`,
      reference_id: business.id,
      reference_type: "business",
    });

    await supabase
      .from("creators")
      .update({
        net_worth: Number(creator.net_worth) + dailyRevenue,
        monthly_revenue: Number(creator.monthly_revenue) + dailyRevenue,
      })
      .eq("id", business.creator_id);
  }

  const { data: creators } = await supabase.from("creators").select("id, energy");
  for (const creator of creators ?? []) {
    await supabase
      .from("creators")
      .update({ energy: Math.min(100, creator.energy + 10) })
      .eq("id", creator.id);
  }

  await updateRankings(supabase);
  await resolveExpiredBattles(supabase);
  await resolveExpiredHouseWars(supabase);
  await syncHallOfFameRecords(supabase);
  await regenerateAgencyEnergy(supabase);

  const season = await getActiveSeasonInfo(supabase);
  if (season && season.days_remaining <= 0) {
    await distributeSeasonRewards(supabase, season.id);
  } else if (season) {
    await getOrCreateHouseWar(supabase, season.id);
  }

  await generateAndPublishNews(supabase, "Daily industry roundup");

  await refreshTrendingTopics(supabase);
  await generateAutoRelationshipStories(supabase);
  await refreshAllValuations(supabase);
  if (season) await updateMarketRankings(supabase, season.id);

  return jsonSuccess({
    businessesProcessed: businesses?.length ?? 0,
    seasonDaysRemaining: season?.days_remaining,
  });
}
