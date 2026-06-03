import { requireAuth, requireAuthMutation, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveLifeEvents, resolveLifeEvent } from "@/lib/services/life-events";
import { z } from "zod";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;
  const events = await getActiveLifeEvents(supabase, user!.id);
  return jsonSuccess({ events });
}

const schema = z.object({ eventId: z.string().uuid(), choiceId: z.string() });

export async function POST(request: Request) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  try {
    const result = await resolveLifeEvent(supabase, parsed.data.eventId, user!.id, parsed.data.choiceId);
    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to resolve event", 400);
  }
}
