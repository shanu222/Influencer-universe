import { NextRequest } from "next/server";
import { jsonSuccess } from "@/lib/api/auth-helpers";
import { getNewsFeed, getControversialNews } from "@/lib/services/news";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const trending = searchParams.get("trending") === "true";
  const controversies = searchParams.get("controversies") === "true";

  if (controversies) {
    const items = await getControversialNews(client, 10);
    return jsonSuccess({ items });
  }

  const result = await getNewsFeed(client, { page, limit: 15, trending });
  return jsonSuccess(result);
}
