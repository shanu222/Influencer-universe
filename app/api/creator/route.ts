import { requireAuth, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import { computePreviewMetrics } from "@/lib/services/economy";
import type { Creator, CreatorStats } from "@/lib/types/database";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const [{ data: profile }, creator] = await Promise.all([
    supabase.from("users").select("*").eq("id", user!.id).single(),
    getActiveCreator(supabase, user!.id),
  ]);

  let stats = null;
  let previewMetrics = null;
  if (creator) {
    const { data } = await supabase
      .from("creator_stats")
      .select("*")
      .eq("creator_id", creator.id)
      .single();
    stats = data;
    if (stats) {
      previewMetrics = computePreviewMetrics(creator as Creator, stats as CreatorStats);
    }
  }

  const { data: recentContent } = creator
    ? await supabase
        .from("content")
        .select("id, title, views, likes, type, thumbnail_gradient, virality_score, published_at")
        .eq("creator_id", creator.id)
        .order("published_at", { ascending: false })
        .limit(3)
    : { data: [] };

  return jsonSuccess({ profile, creator, stats, recentContent: recentContent ?? [], previewMetrics });
}
