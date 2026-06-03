import { NextRequest } from "next/server";
import { requireAuth, requireAuthMutation, rateLimit, jsonError, jsonSuccess } from "@/lib/api/auth-helpers";
import { getActiveCreator } from "@/lib/services/game";
import {
  getSocialFeed,
  getTrendingTopics,
  createSocialPost,
  likePost,
  unlikePost,
  commentOnPost,
  getPostComments,
  repostPost,
} from "@/lib/services/social";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const supabase = (await import("@/lib/supabase/server")).createClient();
  const client = await supabase;
  const { searchParams } = new URL(request.url);

  if (searchParams.get("view") === "topics") {
    const topics = await getTrendingTopics(client, 10);
    return jsonSuccess({ topics });
  }

  const postId = searchParams.get("postId");
  if (postId) {
    const comments = await getPostComments(client, postId, 30);
    return jsonSuccess({ comments });
  }

  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50);
  const topicTag = searchParams.get("topic") ?? undefined;

  let viewerCreatorId: string | undefined;
  const { data: { user } } = await client.auth.getUser();
  if (user) {
    const creator = await getActiveCreator(client, user.id);
    viewerCreatorId = creator?.id;
  }

  const feed = await getSocialFeed(client, { page, limit, topicTag, viewerCreatorId });
  return jsonSuccess(feed);
}

const createPostSchema = z.object({
  action: z.literal("create_post"),
  body: z.string().min(1).max(500),
  topicTag: z.string().optional(),
});

const likeSchema = z.object({
  action: z.enum(["like", "unlike"]),
  postId: z.string().uuid(),
});

const commentSchema = z.object({
  action: z.literal("comment"),
  postId: z.string().uuid(),
  body: z.string().min(1).max(280),
});

const repostSchema = z.object({
  action: z.literal("repost"),
  postId: z.string().uuid(),
  caption: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireAuthMutation();
  if (error) return error;
  if (!rateLimit(`social:${user!.id}`, 30)) return jsonError("Rate limit exceeded", 429);

  const creator = await getActiveCreator(supabase, user!.id);
  if (!creator) return jsonError("No active creator", 404);

  const body = await request.json();

  if (body.action === "create_post") {
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const post = await createSocialPost(supabase, creator.id, parsed.data.body, parsed.data.topicTag);
      return jsonSuccess({ post });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Failed to create post", 400);
    }
  }

  if (body.action === "like" || body.action === "unlike") {
    const parsed = likeSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result =
        parsed.data.action === "like"
          ? await likePost(supabase, parsed.data.postId, creator.id)
          : await unlikePost(supabase, parsed.data.postId, creator.id);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Like failed", 400);
    }
  }

  if (body.action === "comment") {
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const comment = await commentOnPost(supabase, parsed.data.postId, creator.id, parsed.data.body);
      return jsonSuccess({ comment });
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Comment failed", 400);
    }
  }

  if (body.action === "repost") {
    const parsed = repostSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    try {
      const result = await repostPost(supabase, parsed.data.postId, creator.id, parsed.data.caption);
      return jsonSuccess(result);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Repost failed", 400);
    }
  }

  return jsonError("Unknown action", 400);
}
