import { NextRequest } from "next/server";
import { requireAuth, requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import {
  getCreatorRelationships,
  getPublicRelationshipDrama,
  requestRelationship,
  respondToRelationship,
  endRelationship,
  startCollaboration,
} from "@/lib/services/relationships";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);

  if (searchParams.get("view") === "drama") {
    const drama = await getPublicRelationshipDrama(client, 8);
    return jsonSuccess({ drama });
  }

  const { data: { user } } = await client.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const creator = await getActiveCreator(client, user.id);
  if (!creator) return jsonSuccess({ relationships: [] });

  const status = searchParams.get("status") as "pending" | "active" | "ended" | null;
  const relationships = await getCreatorRelationships(client, creator.id, status ?? undefined);
  return jsonSuccess({ relationships });
}

const requestSchema = z.object({
  action: z.literal("request"),
  targetCreatorId: z.string().uuid(),
  type: z.enum(["friend", "dating", "collaborator", "feud"]),
});

const respondSchema = z.object({
  action: z.literal("respond"),
  relationshipId: z.string().uuid(),
  accept: z.boolean(),
});

const endSchema = z.object({
  action: z.literal("end"),
  relationshipId: z.string().uuid(),
});

const collabSchema = z.object({
  action: z.literal("collab"),
  targetCreatorId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`relationships:${user!.id}`, 15)) return jsonError("Rate limit exceeded", 429);

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  const body = await request.json();

  if (body.action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const rel = await requestRelationship(supabase, creator.id, parsed.data.targetCreatorId, parsed.data.type);
      return jsonSuccess({ relationship: rel });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Request failed", 400);
    }
  }

  if (body.action === "respond") {
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result = await respondToRelationship(supabase, parsed.data.relationshipId, creator.id, parsed.data.accept);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Response failed", 400);
    }
  }

  if (body.action === "end") {
    const parsed = endSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result = await endRelationship(supabase, parsed.data.relationshipId, creator.id);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "End failed", 400);
    }
  }

  if (body.action === "collab") {
    const parsed = collabSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const rel = await startCollaboration(supabase, creator.id, parsed.data.targetCreatorId);
      return jsonSuccess({ relationship: rel });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Collab failed", 400);
    }
  }

  return jsonError("Unknown action", 400);
}
