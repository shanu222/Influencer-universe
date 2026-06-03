import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsArticle } from "@/lib/types/phase2";
import { generateNewsHeadline } from "./ai";

type Supabase = SupabaseClient;

export async function publishNews(
  supabase: Supabase,
  input: {
    headline: string;
    summary: string;
    category: string;
    relatedCreatorId?: string;
    relatedHouseId?: string;
    relatedRivalryId?: string;
    controversyScore?: number;
    isTrending?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("news_articles")
    .insert({
      headline: input.headline,
      summary: input.summary,
      category: input.category,
      related_creator_id: input.relatedCreatorId ?? null,
      related_house_id: input.relatedHouseId ?? null,
      related_rivalry_id: input.relatedRivalryId ?? null,
      controversy_score: input.controversyScore ?? 0,
      is_trending: input.isTrending ?? false,
      is_ai_generated: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function generateAndPublishNews(supabase: Supabase, context?: string) {
  const { data: topCreators } = await supabase
    .from("creators")
    .select("name, niche, followers, fame_score")
    .order("followers", { ascending: false })
    .limit(5);

  try {
    const generated = await generateNewsHeadline({
      topCreators: topCreators ?? [],
      context,
    });

    return publishNews(supabase, {
      headline: generated.headline,
      summary: generated.summary,
      category: generated.category,
      controversyScore: generated.controversyScore,
      isTrending: generated.controversyScore > 60,
    });
  } catch {
    const creator = topCreators?.[0];
    return publishNews(supabase, {
      headline: creator ? `${creator.name} Dominates This Week's Charts` : "Creator Economy Hits New Peak",
      summary: "Industry insiders report unprecedented growth in the influencer space.",
      category: "general",
      relatedCreatorId: undefined,
    });
  }
}

export async function getNewsFeed(
  supabase: Supabase,
  options: { page?: number; limit?: number; trending?: boolean } = {}
): Promise<{ items: NewsArticle[]; hasMore: boolean }> {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 15, 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("news_articles")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.trending) query = query.eq("is_trending", true);

  const { data, count } = await query;
  const creatorIds = [...new Set((data ?? []).map((n) => n.related_creator_id).filter(Boolean))] as string[];

  const { data: creators } = creatorIds.length
    ? await supabase.from("creators").select("id, name, handle, avatar_gradient").in("id", creatorIds)
    : { data: [] };

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);

  const items = (data ?? []).map((n) => ({
    ...n,
    creator: n.related_creator_id ? creatorMap.get(n.related_creator_id) : undefined,
  })) as NewsArticle[];

  return { items, hasMore: (count ?? 0) > offset + limit };
}

export async function getControversialNews(supabase: Supabase, limit = 5) {
  const { data } = await supabase
    .from("news_articles")
    .select("*")
    .gte("controversy_score", 50)
    .order("controversy_score", { ascending: false })
    .limit(limit);
  return data ?? [];
}
