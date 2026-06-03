import { requireAuth, requireAuthMutation, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import {
  getActiveHouseWar,
  getHouseLeaderboard,
  joinHouse,
  contributeToHouseWar,
} from "@/lib/services/house-wars";
import { getActiveSeasonInfo } from "@/lib/services/hall-of-fame";
import { z } from "zod";

export async function GET() {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;

  const season = await getActiveSeasonInfo(client);
  const [houseWar, leaderboard] = await Promise.all([
    getActiveHouseWar(client),
    getHouseLeaderboard(client, 20),
  ]);

  const { data: houses } = await client
    .from("creator_houses")
    .select("id, name, description, fame_score, house_rank, max_members")
    .order("fame_score", { ascending: false });

  return jsonSuccess({ houseWar, leaderboard, houses: houses ?? [], season });
}

const joinSchema = z.object({ houseId: z.string().uuid() });
const contributeSchema = z.object({ points: z.number().min(1).max(1000).optional() });

export async function POST(request: Request) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  const body = await request.json();

  if (body.action === "contribute") {
    if (!creator.house_id) return jsonError("Not in a house", 400);
    const parsed = contributeSchema.safeParse(body);
    const points = parsed.success ? (parsed.data.points ?? 50) : 50;
    try {
      await contributeToHouseWar(supabase, creator.id, creator.house_id, points);
      return jsonSuccess({ message: "Contribution recorded" });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Contribution failed", 400);
    }
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  try {
    const house = await joinHouse(supabase, creator.id, parsed.data.houseId);
    return jsonSuccess({ house });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to join house", 400);
  }
}
