import { NextRequest } from "next/server";
import { requireAuthMutation, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { generateContentSuggestions } from "@/lib/services/ai";
import { getCreatorWithStats } from "@/lib/services/game";
import type { ContentType } from "@/lib/types/database";
import { z } from "zod";

const schema = z.object({
  creatorId: z.string().uuid(),
  contentType: z.enum(["video", "short", "music", "podcast", "livestream", "comedy", "fashion", "gaming"]),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const data = await getCreatorWithStats(supabase, parsed.data.creatorId);
  if (!data || data.creator.user_id !== user!.id) {
    return jsonError("Creator not found", 404);
  }

  try {
    const suggestions = await generateContentSuggestions({
      creator: data.creator,
      stats: data.stats,
      contentType: parsed.data.contentType as ContentType,
    });
    return jsonSuccess({ suggestions });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to generate suggestions", 500);
  }
}
