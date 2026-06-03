import { requireAuth, requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { createCreator } from "@/lib/services/game";
import { z } from "zod";

const statSchema = z.number().min(1).max(100);

const schema = z.object({
  name: z.string().min(2).max(50),
  gender: z.enum(["male", "female", "non_binary", "other"]),
  age: z.number().min(13).max(80),
  nationality: z.string().min(2).max(50),
  niche: z.enum([
    "singer", "rapper", "gamer", "streamer", "actor", "comedian",
    "fashion", "fitness", "entrepreneur",
  ]),
  personality: z.string().min(10).max(500),
  stats: z.object({
    creativity: statSchema,
    talent: statSchema,
    looks: statSchema,
    charisma: statSchema,
    intelligence: statSchema,
    discipline: statSchema,
    confidence: statSchema,
    authenticity: statSchema,
    humor: statSchema,
    drama: statSchema,
  }),
});

export async function POST(request: Request) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`creator:${user!.id}`, 5)) return jsonError("Rate limit exceeded", 429);

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  const totalPoints = Object.values(parsed.data.stats).reduce((a, b) => a + b, 0);
  if (totalPoints !== 500) {
    return jsonError("Stats must total exactly 500 points (10 stats × avg 50, distribute freely)");
  }

  try {
    const creator = await createCreator(supabase, user!.id, parsed.data);
    return jsonSuccess({ creator });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create creator", 500);
  }
}
