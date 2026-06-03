import { requireAuth, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: analytics }, { data: topContent }, { data: achievements }] = await Promise.all([
    supabase
      .from("analytics")
      .select("*")
      .eq("creator_id", creator.id)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    supabase
      .from("content")
      .select("id, title, type, views, likes, virality_score, thumbnail_gradient, published_at")
      .eq("creator_id", creator.id)
      .order("views", { ascending: false })
      .limit(6),
    supabase
      .from("creator_achievements")
      .select("unlocked_at, achievement:achievements(*)")
      .eq("creator_id", creator.id)
      .order("unlocked_at", { ascending: false })
      .limit(8),
  ]);

  return jsonSuccess({
    creator,
    analytics: analytics ?? [],
    topContent: topContent ?? [],
    achievements: achievements ?? [],
  });
}
