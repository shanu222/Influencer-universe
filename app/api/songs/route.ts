import { NextRequest } from "next/server";
import { requireAuth, requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { createSong, getActiveCreator } from "@/lib/services/game";
import { z } from "zod";

const schema = z.object({
  genre: z.string().min(1).max(50),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`song:${user!.id}`)) return jsonError("Rate limit exceeded", 429);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  try {
    const result = await createSong(supabase, {
      creatorId: creator.id,
      genre: parsed.data.genre,
    });
    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create song", 500);
  }
}

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonSuccess({ songs: [] });

  const { data } = await supabase
    .from("songs")
    .select("*")
    .eq("creator_id", creator.id)
    .order("released_at", { ascending: false });

  return jsonSuccess({ songs: data ?? [] });
}
