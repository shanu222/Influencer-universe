import { requireAdmin, requireAdminMutation, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { generateTrend } from "@/lib/services/ai";
import { updateRankings } from "@/lib/services/game";
import { z } from "zod";

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const [
    { count: userCount },
    { count: creatorCount },
    { data: trends },
    { data: season },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("creators").select("*", { count: "exact", head: true }),
    supabase.from("trends").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("seasons").select("*").eq("is_active", true).maybeSingle(),
  ]);

  return jsonSuccess({
    stats: { users: userCount ?? 0, creators: creatorCount ?? 0 },
    trends: trends ?? [],
    season,
  });
}

const trendSchema = z.object({
  action: z.enum(["create_trend", "refresh_rankings", "create_season"]),
  category: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  durationDays: z.number().optional(),
});

export async function POST(request: Request) {
  const { supabase, error } = await requireAdminMutation();
  if (error) return error;

  const body = await request.json();
  const parsed = trendSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message);

  switch (parsed.data.action) {
    case "create_trend": {
      const generated = parsed.data.title
        ? { title: parsed.data.title, description: parsed.data.description ?? "", category: parsed.data.category ?? "challenge" }
        : await generateTrend({ category: parsed.data.category });

      const duration = parsed.data.durationDays ?? 7;
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + duration);

      const { data: trend } = await supabase
        .from("trends")
        .insert({
          title: generated.title,
          description: generated.description,
          category: generated.category,
          popularity: 50 + Math.floor(Math.random() * 40),
          growth_rate: 20 + Math.random() * 50,
          competition: ["low", "medium", "high", "very_high"][Math.floor(Math.random() * 4)],
          duration_days: duration,
          ends_at: endsAt.toISOString(),
          is_ai_generated: !parsed.data.title,
        })
        .select()
        .single();

      return jsonSuccess({ trend });
    }

    case "refresh_rankings": {
      await updateRankings(supabase);
      return jsonSuccess({ message: "Rankings updated" });
    }

    case "create_season": {
      const { data: lastSeason } = await supabase
        .from("seasons")
        .select("season_number")
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from("seasons").update({ is_active: false }).eq("is_active", true);

      const seasonNumber = (lastSeason?.season_number ?? 0) + 1;
      const startsAt = new Date();
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 30);

      const { data: season } = await supabase
        .from("seasons")
        .insert({
          season_number: seasonNumber,
          name: `Season ${seasonNumber}`,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      await updateRankings(supabase);
      return jsonSuccess({ season });
    }

    default:
      return jsonError("Unknown action");
  }
}
