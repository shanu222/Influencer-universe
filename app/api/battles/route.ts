import { NextRequest } from "next/server";
import { requireAuth, requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import { createBattle, getActiveBattles, getCreatorBattles, voteInBattle } from "@/lib/services/battles";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "true";

  if (mine) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);
    const creator = await getActiveCreator(client, user.id);
    if (!creator) return jsonSuccess({ battles: [] });
    const battles = await getCreatorBattles(client, creator.id);
    return jsonSuccess({ battles });
  }

  const battles = await getActiveBattles(client, 20);
  return jsonSuccess({ battles });
}

const createSchema = z.object({
  opponentId: z.string().uuid(),
  type: z.enum(["music_battle", "trend_battle", "streaming_battle", "popularity_battle", "fan_vote_battle"]),
});

const voteSchema = z.object({
  rivalryId: z.string().uuid(),
  votedForCreatorId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`battle:${user!.id}`, 10)) return jsonError("Rate limit exceeded", 429);

  const body = await request.json();
  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  if (body.action === "vote") {
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result = await voteInBattle(supabase, parsed.data.rivalryId, user!.id, parsed.data.votedForCreatorId);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Vote failed", 400);
    }
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  try {
    const battle = await createBattle(supabase, {
      challengerId: creator.id,
      opponentId: parsed.data.opponentId,
      type: parsed.data.type,
      userId: user!.id,
    });
    return jsonSuccess({ battle });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create battle", 400);
  }
}
