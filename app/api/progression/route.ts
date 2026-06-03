import { requireAuth, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import { getCreatorProgression } from "@/lib/services/xp";
import { getCreatorDna } from "@/lib/services/dna";
import { getCreatorPersonality } from "@/lib/services/personality";

export async function GET() {
  const { supabase, user, error } = await requireAuth();
  if (error) return error;

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  const [progression, dna, personality] = await Promise.all([
    getCreatorProgression(supabase, creator.id),
    getCreatorDna(supabase, creator.id, true),
    getCreatorPersonality(supabase, creator.id),
  ]);

  return jsonSuccess({ progression, dna, personality });
}
