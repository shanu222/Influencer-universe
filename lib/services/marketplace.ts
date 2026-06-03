import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatorValuation, MarketplaceListing, MarketplaceTransfer, MarketRankingEntry } from "@/lib/types/phase3";
import { calculateMarketValue } from "@/lib/types/phase3";
import { publishNews } from "./news";

type Supabase = SupabaseClient;

async function notifyUser(
  supabase: Supabase,
  userId: string,
  input: { creatorId?: string; type: string; title: string; message: string; data?: Record<string, unknown> }
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    creator_id: input.creatorId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? {},
  });
}

export async function updateCreatorValuation(supabase: Supabase, creatorId: string) {
  const { data: creator } = await supabase
    .from("creators")
    .select("followers, influence, net_worth, fame_score, level")
    .eq("id", creatorId)
    .single();

  if (!creator) return null;

  const marketValue = calculateMarketValue(creator);
  const { data: existing } = await supabase
    .from("creator_valuations")
    .select("market_value")
    .eq("creator_id", creatorId)
    .maybeSingle();

  let trendDirection: "up" | "down" | "stable" = "stable";
  if (existing) {
    if (marketValue > Number(existing.market_value) * 1.05) trendDirection = "up";
    else if (marketValue < Number(existing.market_value) * 0.95) trendDirection = "down";
  }

  const components = {
    followers: creator.followers,
    influence: creator.influence,
    net_worth: Number(creator.net_worth),
    fame_score: creator.fame_score,
    level: creator.level,
  };

  await supabase.from("creator_valuations").upsert(
    {
      creator_id: creatorId,
      market_value: marketValue,
      trend_direction: trendDirection,
      components,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "creator_id" }
  );

  return { creatorId, marketValue, trendDirection, components };
}

export async function refreshAllValuations(supabase: Supabase) {
  const { data: creators } = await supabase.from("creators").select("id");
  for (const c of creators ?? []) {
    await updateCreatorValuation(supabase, c.id);
  }
}

export async function getCreatorValuation(supabase: Supabase, creatorId: string): Promise<CreatorValuation | null> {
  const { data } = await supabase.from("creator_valuations").select("*").eq("creator_id", creatorId).maybeSingle();
  if (!data) {
    await updateCreatorValuation(supabase, creatorId);
    const { data: refreshed } = await supabase.from("creator_valuations").select("*").eq("creator_id", creatorId).maybeSingle();
    return refreshed as CreatorValuation | null;
  }
  return data as CreatorValuation;
}

export async function listCreatorForSale(
  supabase: Supabase,
  sellerUserId: string,
  creatorId: string,
  askingPrice: number
) {
  if (askingPrice <= 0) throw new Error("Asking price must be positive");

  const { data: creator } = await supabase.from("creators").select("*").eq("id", creatorId).single();
  if (!creator || creator.user_id !== sellerUserId) throw new Error("You do not own this creator");

  const { data: activeListing } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("status", "active")
    .maybeSingle();

  if (activeListing) throw new Error("Creator already listed");

  const valuation = await updateCreatorValuation(supabase, creatorId);

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      creator_id: creatorId,
      seller_user_id: sellerUserId,
      asking_price: askingPrice,
      market_value_at_list: valuation?.marketValue ?? askingPrice,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await publishNews(supabase, {
    headline: `${creator.name} Listed on Creator Marketplace`,
    summary: `Asking ${askingPrice.toLocaleString()} — market value ${(valuation?.marketValue ?? askingPrice).toLocaleString()}`,
    category: "market",
    relatedCreatorId: creatorId,
    controversyScore: 25,
    isTrending: false,
  });

  return listing;
}

export async function cancelListing(supabase: Supabase, sellerUserId: string, listingId: string) {
  const { data: listing } = await supabase.from("marketplace_listings").select("*").eq("id", listingId).single();
  if (!listing || listing.seller_user_id !== sellerUserId) throw new Error("Listing not found");
  if (listing.status !== "active") throw new Error("Listing not active");

  await supabase.from("marketplace_listings").update({ status: "cancelled" }).eq("id", listingId);
  return { cancelled: true };
}

export async function buyCreator(
  supabase: Supabase,
  buyerUserId: string,
  listingId: string
) {
  const { data: listing } = await supabase.from("marketplace_listings").select("*").eq("id", listingId).single();
  if (!listing || listing.status !== "active") throw new Error("Listing not available");
  if (listing.seller_user_id === buyerUserId) throw new Error("Cannot buy your own listing");

  const { data: buyerCreator } = await supabase
    .from("creators")
    .select("id, net_worth, user_id")
    .eq("user_id", buyerUserId)
    .order("net_worth", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: agency } = await supabase.from("users").select("agency_id").eq("id", buyerUserId).single();
  let availableFunds = Number(buyerCreator?.net_worth ?? 0);

  if (agency?.agency_id) {
    const { data: ag } = await supabase.from("agencies").select("shared_funds").eq("id", agency.agency_id).single();
    availableFunds += Number(ag?.shared_funds ?? 0);
  }

  if (availableFunds < Number(listing.asking_price)) {
    throw new Error("Insufficient funds to purchase this creator");
  }

  const { data: creator } = await supabase.from("creators").select("*").eq("id", listing.creator_id).single();
  if (!creator) throw new Error("Creator not found");

  const salePrice = Number(listing.asking_price);
  const soldAt = new Date().toISOString();

  await supabase
    .from("marketplace_listings")
    .update({ status: "sold", sold_at: soldAt, buyer_user_id: buyerUserId })
    .eq("id", listingId);

  await supabase.from("creators").update({ user_id: buyerUserId }).eq("id", listing.creator_id);

  if (agency?.agency_id) {
    const { data: ag } = await supabase.from("agencies").select("shared_funds").eq("id", agency.agency_id).single();
    const fromAgency = Math.min(Number(ag?.shared_funds ?? 0), salePrice);
    const fromCreator = salePrice - fromAgency;

    if (fromAgency > 0) {
      await supabase
        .from("agencies")
        .update({ shared_funds: Number(ag?.shared_funds) - fromAgency })
        .eq("id", agency.agency_id);
    }

    if (fromCreator > 0 && buyerCreator) {
      await supabase
        .from("creators")
        .update({ net_worth: Math.max(0, Number(buyerCreator.net_worth) - fromCreator) })
        .eq("id", buyerCreator.id);
    }

    await supabase.from("agency_creators").delete().eq("creator_id", listing.creator_id);
    const { count } = await supabase
      .from("agency_creators")
      .select("*", { count: "exact", head: true })
      .eq("agency_id", agency.agency_id);

    await supabase.from("agency_creators").insert({
      agency_id: agency.agency_id,
      creator_id: listing.creator_id,
      is_primary: (count ?? 0) === 0,
      slot_order: count ?? 0,
    });
  }

  await supabase.from("marketplace_transfers").insert({
    creator_id: listing.creator_id,
    listing_id: listingId,
    from_user_id: listing.seller_user_id,
    to_user_id: buyerUserId,
    sale_price: salePrice,
  });

  await supabase.from("transactions").insert({
    creator_id: listing.creator_id,
    type: "marketplace_sale",
    amount: salePrice,
    description: `Sold ${creator.name} on marketplace`,
    reference_id: listingId,
    reference_type: "marketplace_listing",
  });

  if (buyerCreator?.id) {
    await supabase.from("transactions").insert({
      creator_id: buyerCreator.id,
      type: "marketplace_purchase",
      amount: -salePrice,
      description: `Purchased ${creator.name}`,
      reference_id: listingId,
      reference_type: "marketplace_listing",
    });
  }

  await notifyUser(supabase, listing.seller_user_id, {
    creatorId: listing.creator_id,
    type: "marketplace_sale",
    title: "Creator sold!",
    message: `${creator.name} sold for ${salePrice.toLocaleString()}`,
    data: { listingId, salePrice },
  });

  await notifyUser(supabase, buyerUserId, {
    creatorId: listing.creator_id,
    type: "marketplace_sale",
    title: "Creator acquired!",
    message: `You now own ${creator.name}`,
    data: { listingId, salePrice },
  });

  const { data: sellerCreator } = await supabase
    .from("creators")
    .select("id, net_worth")
    .eq("user_id", listing.seller_user_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (sellerCreator) {
    await supabase
      .from("creators")
      .update({ net_worth: Number(sellerCreator.net_worth) + salePrice })
      .eq("id", sellerCreator.id);
  }

  await publishNews(supabase, {
    headline: `BLOCKBUSTER DEAL: ${creator.name} Changes Hands`,
    summary: `Sold for ${salePrice.toLocaleString()} in a major marketplace transfer`,
    category: "market",
    relatedCreatorId: listing.creator_id,
    controversyScore: 45,
    isTrending: true,
  });

  await updateCreatorValuation(supabase, listing.creator_id);

  return { creatorId: listing.creator_id, salePrice };
}

export async function getActiveListings(supabase: Supabase, limit = 20): Promise<MarketplaceListing[]> {
  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("status", "active")
    .order("listed_at", { ascending: false })
    .limit(limit);

  if (!listings?.length) return [];

  const creatorIds = listings.map((l) => l.creator_id);
  const [{ data: creators }, { data: valuations }] = await Promise.all([
    supabase.from("creators").select("id, name, avatar_gradient, followers, influence, level").in("id", creatorIds),
    supabase.from("creator_valuations").select("*").in("creator_id", creatorIds),
  ]);

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);
  const valuationMap = new Map(valuations?.map((v) => [v.creator_id, v]) ?? []);

  return listings.map((l) => ({
    ...l,
    asking_price: Number(l.asking_price),
    market_value_at_list: Number(l.market_value_at_list),
    creator: creatorMap.get(l.creator_id),
    valuation: valuationMap.get(l.creator_id) as CreatorValuation | undefined,
  }));
}

export async function getTransferHistory(supabase: Supabase, creatorId?: string, limit = 20): Promise<MarketplaceTransfer[]> {
  let query = supabase.from("marketplace_transfers").select("*").order("transferred_at", { ascending: false }).limit(limit);
  if (creatorId) query = query.eq("creator_id", creatorId);

  const { data: transfers } = await query;
  if (!transfers?.length) return [];

  const creatorIds = [...new Set(transfers.map((t) => t.creator_id))];
  const { data: creators } = await supabase.from("creators").select("id, name, avatar_gradient").in("id", creatorIds);
  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);

  return transfers.map((t) => ({
    ...t,
    sale_price: Number(t.sale_price),
    creator: creatorMap.get(t.creator_id),
  }));
}

export async function updateMarketRankings(supabase: Supabase, seasonId: string) {
  const { data: valuations } = await supabase
    .from("creator_valuations")
    .select("creator_id, market_value")
    .order("market_value", { ascending: false })
    .limit(100);

  for (let i = 0; i < (valuations ?? []).length; i++) {
    const v = valuations![i];
    const { data: existing } = await supabase
      .from("market_rankings")
      .select("rank_position")
      .eq("season_id", seasonId)
      .eq("creator_id", v.creator_id)
      .maybeSingle();

    await supabase.from("market_rankings").upsert(
      {
        season_id: seasonId,
        creator_id: v.creator_id,
        rank_position: i + 1,
        previous_position: existing?.rank_position ?? null,
        market_value: v.market_value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "season_id,creator_id" }
    );
  }
}

export async function getMarketRankings(supabase: Supabase, seasonId: string, limit = 50): Promise<MarketRankingEntry[]> {
  const { data: rankings } = await supabase
    .from("market_rankings")
    .select("creator_id, rank_position, previous_position, market_value")
    .eq("season_id", seasonId)
    .order("rank_position", { ascending: true })
    .limit(limit);

  if (!rankings?.length) return [];

  const creatorIds = rankings.map((r) => r.creator_id);
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, avatar_gradient, followers")
    .in("id", creatorIds);

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);

  return rankings.map((r) => ({
    ...r,
    market_value: Number(r.market_value),
    creator: creatorMap.get(r.creator_id),
  }));
}

export async function getMyListings(supabase: Supabase, userId: string) {
  const { data } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("seller_user_id", userId)
    .order("listed_at", { ascending: false })
    .limit(10);

  return data ?? [];
}
