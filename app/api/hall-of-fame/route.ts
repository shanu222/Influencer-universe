import { NextRequest } from "next/server";
import { jsonSuccess } from "@/lib/api/auth-helpers";
import { getHallOfFame } from "@/lib/services/hall-of-fame";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;

  const entries = await getHallOfFame(client, category, 100);
  return jsonSuccess({ entries });
}
