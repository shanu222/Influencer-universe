import { NextRequest } from "next/server";
import { requireAuth, requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import { getActiveSeasonInfo } from "@/lib/services/hall-of-fame";
import {
  getActiveListings,
  getMarketRankings,
  getTransferHistory,
  getCreatorValuation,
  getMyListings,
  listCreatorForSale,
  cancelListing,
  buyCreator,
} from "@/lib/services/marketplace";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "listings";

  if (view === "rankings") {
    const season = await getActiveSeasonInfo(client);
    if (!season) return jsonSuccess({ rankings: [] });
    const rankings = await getMarketRankings(client, season.id, 50);
    return jsonSuccess({ rankings, season });
  }

  if (view === "transfers") {
    const creatorId = searchParams.get("creatorId") ?? undefined;
    const transfers = await getTransferHistory(client, creatorId, 20);
    return jsonSuccess({ transfers });
  }

  if (view === "valuation") {
    const creatorId = searchParams.get("creatorId");
    if (!creatorId) return jsonError("creatorId required", 400);
    const valuation = await getCreatorValuation(client, creatorId);
    return jsonSuccess({ valuation });
  }

  const { data: { user } } = await client.auth.getUser();

  if (view === "mine" && user) {
    const listings = await getMyListings(client, user.id);
    const creator = await getActiveCreator(client, user.id);
    const valuation = creator ? await getCreatorValuation(client, creator.id) : null;
    return jsonSuccess({ listings, valuation });
  }

  const listings = await getActiveListings(client, 20);
  return jsonSuccess({ listings });
}

const listSchema = z.object({
  action: z.literal("list"),
  creatorId: z.string().uuid(),
  askingPrice: z.number().positive(),
});

const buySchema = z.object({
  action: z.literal("buy"),
  listingId: z.string().uuid(),
});

const cancelSchema = z.object({
  action: z.literal("cancel"),
  listingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`marketplace:${user!.id}`, 10)) return jsonError("Rate limit exceeded", 429);

  const body = await request.json();

  if (body.action === "list") {
    const parsed = listSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const listing = await listCreatorForSale(supabase, user!.id, parsed.data.creatorId, parsed.data.askingPrice);
      return jsonSuccess({ listing });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Listing failed", 400);
    }
  }

  if (body.action === "buy") {
    const parsed = buySchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result = await buyCreator(supabase, user!.id, parsed.data.listingId);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Purchase failed", 400);
    }
  }

  if (body.action === "cancel") {
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result = await cancelListing(supabase, user!.id, parsed.data.listingId);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Cancel failed", 400);
    }
  }

  return jsonError("Unknown action", 400);
}
