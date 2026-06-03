import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialPost, PostComment, TrendingTopic } from "@/lib/types/phase3";
import { publishNews } from "./news";

type Supabase = SupabaseClient;

async function notifyUser(
  supabase: Supabase,
  userId: string,
  input: { creatorId?: string; type: string; title: string; message: string; data?: Record<string, unknown> }
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    creator_id: input.creatorId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? {},
  });
}

export async function createPostFromContent(
  supabase: Supabase,
  creatorId: string,
  contentId: string,
  body: string,
  isTrending: boolean
) {
  const topicTag = isTrending ? "viral-moment" : null;
  const { data: post } = await supabase
    .from("social_posts")
    .insert({
      creator_id: creatorId,
      content_id: contentId,
      body,
      topic_tag: topicTag,
      is_trending: isTrending,
      engagement_score: isTrending ? 75 : 25,
    })
    .select()
    .single();

  if (topicTag) await bumpTopic(supabase, topicTag);
  return post;
}

export async function createSocialPost(
  supabase: Supabase,
  creatorId: string,
  body: string,
  topicTag?: string
) {
  if (!body.trim()) throw new Error("Post body required");

  const { data: post, error } = await supabase
    .from("social_posts")
    .insert({
      creator_id: creatorId,
      body: body.trim(),
      topic_tag: topicTag ?? null,
      engagement_score: 10,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (topicTag) await bumpTopic(supabase, topicTag);
  return post;
}

async function bumpTopic(supabase: Supabase, slug: string) {
  const { data: topic } = await supabase.from("trending_topics").select("*").eq("slug", slug).maybeSingle();
  if (!topic) return;

  await supabase
    .from("trending_topics")
    .update({
      post_count: topic.post_count + 1,
      momentum_score: Math.min(100, topic.momentum_score + 3),
      updated_at: new Date().toISOString(),
    })
    .eq("id", topic.id);
}

export async function getSocialFeed(
  supabase: Supabase,
  options: { page?: number; limit?: number; topicTag?: string; viewerCreatorId?: string } = {}
) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 10, 50);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("social_posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.topicTag) query = query.eq("topic_tag", options.topicTag);

  const { data: posts, error, count } = await query;
  if (error) throw new Error(error.message);

  const creatorIds = [...new Set((posts ?? []).map((p) => p.creator_id))];
  const contentIds = [...new Set((posts ?? []).map((p) => p.content_id).filter(Boolean))] as string[];

  const [{ data: creators }, { data: contents }] = await Promise.all([
    creatorIds.length
      ? supabase.from("creators").select("id, name, handle, avatar_gradient, is_verified, user_id").in("id", creatorIds)
      : { data: [] },
    contentIds.length
      ? supabase.from("content").select("id, type, title, description, thumbnail_gradient, views, likes, is_trending").in("id", contentIds)
      : { data: [] },
  ]);

  let likedPostIds = new Set<string>();
  let repostedPostIds = new Set<string>();
  if (options.viewerCreatorId && posts?.length) {
    const postIds = posts.map((p) => p.id);
    const [{ data: likes }, { data: reposts }] = await Promise.all([
      supabase.from("post_likes").select("post_id").eq("creator_id", options.viewerCreatorId).in("post_id", postIds),
      supabase.from("post_reposts").select("original_post_id").eq("reposter_creator_id", options.viewerCreatorId).in("original_post_id", postIds),
    ]);
    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
    repostedPostIds = new Set(reposts?.map((r) => r.original_post_id) ?? []);
  }

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);
  const contentMap = new Map(contents?.map((c) => [c.id, c]) ?? []);

  const items: SocialPost[] = (posts ?? []).map((p) => ({
    ...p,
    creator: creatorMap.get(p.creator_id) ?? undefined,
    content: p.content_id ? contentMap.get(p.content_id) ?? undefined : undefined,
    liked_by_me: likedPostIds.has(p.id),
    reposted_by_me: repostedPostIds.has(p.id),
  }));

  return { items, page, limit, total: count ?? 0, hasMore: (count ?? 0) > offset + limit };
}

export async function getTrendingTopics(supabase: Supabase, limit = 10): Promise<TrendingTopic[]> {
  const { data } = await supabase
    .from("trending_topics")
    .select("*")
    .eq("is_active", true)
    .order("momentum_score", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function likePost(supabase: Supabase, postId: string, creatorId: string) {
  const { data: post } = await supabase.from("social_posts").select("*").eq("id", postId).single();
  if (!post) throw new Error("Post not found");

  const { error } = await supabase.from("post_likes").insert({ post_id: postId, creator_id: creatorId });
  if (error) {
    if (error.code === "23505") return { liked: true, likesCount: post.likes_count };
    throw new Error(error.message);
  }

  const likesCount = post.likes_count + 1;
  const engagement = post.engagement_score + 5;
  await supabase
    .from("social_posts")
    .update({ likes_count: likesCount, engagement_score: engagement, is_trending: engagement >= 80 })
    .eq("id", postId);

  if (post.creator_id !== creatorId) {
    const { data: owner } = await supabase.from("creators").select("user_id, name").eq("id", post.creator_id).single();
    const { data: liker } = await supabase.from("creators").select("name").eq("id", creatorId).single();
    if (owner?.user_id) {
      await notifyUser(supabase, owner.user_id, {
        creatorId: post.creator_id,
        type: "post_like",
        title: "New like on your post",
        message: `${liker?.name ?? "Someone"} liked your post`,
        data: { postId },
      });
    }
  }

  return { liked: true, likesCount };
}

export async function unlikePost(supabase: Supabase, postId: string, creatorId: string) {
  const { data: post } = await supabase.from("social_posts").select("likes_count, engagement_score").eq("id", postId).single();
  if (!post) throw new Error("Post not found");

  await supabase.from("post_likes").delete().eq("post_id", postId).eq("creator_id", creatorId);

  const likesCount = Math.max(0, post.likes_count - 1);
  await supabase
    .from("social_posts")
    .update({ likes_count: likesCount, engagement_score: Math.max(0, post.engagement_score - 5) })
    .eq("id", postId);

  return { liked: false, likesCount };
}

export async function commentOnPost(supabase: Supabase, postId: string, creatorId: string, body: string) {
  if (!body.trim()) throw new Error("Comment required");

  const { data: post } = await supabase.from("social_posts").select("*").eq("id", postId).single();
  if (!post) throw new Error("Post not found");

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, creator_id: creatorId, body: body.trim() })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("social_posts")
    .update({
      comments_count: post.comments_count + 1,
      engagement_score: post.engagement_score + 8,
    })
    .eq("id", postId);

  if (post.creator_id !== creatorId) {
    const { data: owner } = await supabase.from("creators").select("user_id").eq("id", post.creator_id).single();
    const { data: commenter } = await supabase.from("creators").select("name").eq("id", creatorId).single();
    if (owner?.user_id) {
      await notifyUser(supabase, owner.user_id, {
        creatorId: post.creator_id,
        type: "post_comment",
        title: "New comment",
        message: `${commenter?.name ?? "Someone"} commented on your post`,
        data: { postId, commentId: comment.id },
      });
    }
  }

  return comment;
}

export async function getPostComments(supabase: Supabase, postId: string, limit = 20): Promise<PostComment[]> {
  const { data: comments } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const creatorIds = [...new Set((comments ?? []).map((c) => c.creator_id))];
  const { data: creators } = creatorIds.length
    ? await supabase.from("creators").select("id, name, avatar_gradient").in("id", creatorIds)
    : { data: [] };

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);
  return (comments ?? []).map((c) => ({
    ...c,
    creator: creatorMap.get(c.creator_id) ?? undefined,
  }));
}

export async function repostPost(supabase: Supabase, postId: string, reposterCreatorId: string, caption?: string) {
  const { data: post } = await supabase.from("social_posts").select("*").eq("id", postId).single();
  if (!post) throw new Error("Post not found");
  if (post.creator_id === reposterCreatorId) throw new Error("Cannot repost your own post");

  const { error } = await supabase.from("post_reposts").insert({
    original_post_id: postId,
    reposter_creator_id: reposterCreatorId,
    caption: caption?.trim() ?? null,
  });

  if (error) {
    if (error.code === "23505") throw new Error("Already reposted");
    throw new Error(error.message);
  }

  await supabase
    .from("social_posts")
    .update({
      reposts_count: post.reposts_count + 1,
      engagement_score: post.engagement_score + 12,
      is_trending: post.engagement_score + 12 >= 70,
    })
    .eq("id", postId);

  const { data: owner } = await supabase.from("creators").select("user_id").eq("id", post.creator_id).single();
  const { data: reposter } = await supabase.from("creators").select("name").eq("id", reposterCreatorId).single();
  if (owner?.user_id) {
    await notifyUser(supabase, owner.user_id, {
      creatorId: post.creator_id,
      type: "post_repost",
      title: "Your post was reposted",
      message: `${reposter?.name ?? "Someone"} reposted your content`,
      data: { postId },
    });
  }

  return { repostsCount: post.reposts_count + 1 };
}

export async function refreshTrendingTopics(supabase: Supabase) {
  const { data: topics } = await supabase.from("trending_topics").select("id, slug").eq("is_active", true);

  for (const topic of topics ?? []) {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { count } = await supabase
      .from("social_posts")
      .select("*", { count: "exact", head: true })
      .eq("topic_tag", topic.slug)
      .gte("created_at", since.toISOString());

    const momentum = Math.min(100, (count ?? 0) * 5 + Math.floor(Math.random() * 10));
    await supabase
      .from("trending_topics")
      .update({ post_count: count ?? 0, momentum_score: momentum, updated_at: new Date().toISOString() })
      .eq("id", topic.id);
  }

  await supabase
    .from("social_posts")
    .update({ is_trending: false })
    .lt("engagement_score", 70);

  await supabase.from("social_posts").update({ is_trending: true }).gte("engagement_score", 70);
}

export async function publishViralPostNews(supabase: Supabase, creatorName: string, body: string, creatorId: string) {
  await publishNews(supabase, {
    headline: `${creatorName}'s Post Is Trending`,
    summary: body.slice(0, 200),
    category: "social",
    relatedCreatorId: creatorId,
    controversyScore: 15,
    isTrending: true,
  });
}
