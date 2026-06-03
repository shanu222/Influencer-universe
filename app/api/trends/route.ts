import { NextRequest } from "next/server";
import { requireAuth, requireAuthMutation, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { joinTrend, getActiveCreator } from "@/lib/services/game";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = client
    .from("trends")
    .select("*")
    .eq("is_active", true)
    .gte("ends_at", new Date().toISOString())
    .order("popularity", { ascending: false });

  if (category && category !== "global") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return jsonSuccess({ trends: data ?? [] });
}

const joinSchema = z.object({ trendId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;

  const body = await request.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  try {
    const trend = await joinTrend(supabase, creator.id, parsed.data.trendId);
    return jsonSuccess({ trend });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to join trend", 400);
  }
}
