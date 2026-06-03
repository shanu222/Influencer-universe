import { NextRequest } from "next/server";
import { requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { createContent, getActiveCreator } from "@/lib/services/game";
import type { ContentType } from "@/lib/types/database";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["video", "short", "music", "podcast", "livestream", "comedy", "fashion", "gaming"]),
  trendId: z.string().uuid().optional(),
  metadata: z
    .object({
      title: z.string(),
      description: z.string(),
      category: z.string(),
      thumbnailPrompt: z.string(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`content:${user!.id}`)) return jsonError("Rate limit exceeded", 429);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator. Create one first.", 404);

  try {
    const content = await createContent(supabase, {
      creatorId: creator.id,
      contentType: parsed.data.type as ContentType,
      trendId: parsed.data.trendId,
      metadata: parsed.data.metadata,
    });
    return jsonSuccess({ content });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create content", 500);
  }
}

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);
  const offset = (page - 1) * limit;

  const { data: items, error, count } = await client
    .from("content")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return jsonError(error.message, 500);

  const creatorIds = [...new Set((items ?? []).map((c) => c.creator_id))];
  const { data: creators } = creatorIds.length
    ? await client.from("creators").select("id, name, handle, avatar_gradient, is_verified").in("id", creatorIds)
    : { data: [] };

  const creatorMap = new Map((creators ?? []).map((c) => [c.id, c]));
  const enriched = (items ?? []).map((item) => ({
    ...item,
    creator: creatorMap.get(item.creator_id) ?? null,
  }));

  return jsonSuccess({ items: enriched, page, limit, total: count ?? 0, hasMore: (count ?? 0) > offset + limit });
}
