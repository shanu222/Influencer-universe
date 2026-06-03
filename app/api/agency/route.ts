import { requireAuth, requireAuthMutation, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getUserAgency, switchActiveCreator } from "@/lib/services/agency";
import { getActiveSeasonInfo } from "@/lib/services/hall-of-fame";
import { z } from "zod";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const agency = await getUserAgency(supabase, user!.id);
  const season = await getActiveSeasonInfo(supabase);

  let rankings: unknown[] = [];
  if (season) {
    const { getAgencyRankings } = await import("@/lib/services/agency");
    rankings = await getAgencyRankings(supabase, season.id, 50);
  }

  return jsonSuccess({ agency, rankings, season });
}

const switchSchema = z.object({ creatorId: z.string().uuid() });

export async function POST(request: Request) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;

  const body = await request.json();
  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  try {
    await switchActiveCreator(supabase, user!.id, parsed.data.creatorId);
    return jsonSuccess({ activeCreatorId: parsed.data.creatorId });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Switch failed", 400);
  }
}
