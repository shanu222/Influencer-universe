"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useCallback, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Music,
  Zap,
  Eye,
  Sparkles,
  Newspaper,
  Repeat2,
} from "lucide-react";
import BottomNav from "./BottomNav";
import { useSocialFeed } from "@/hooks/useSocial";
import { useNews } from "@/hooks/useGameState";
import { formatNumber, formatRelativeTime } from "@/lib/utils/format";
import { toast } from "sonner";
import type { SocialPost } from "@/lib/types/phase3";

export default function ViralFeed() {
  const [activeTopic, setActiveTopic] = useState<string | undefined>();
  const { items, topics, loading, loadingMore, hasMore, loadMore, likePost, commentPost, repostPost } = useSocialFeed(activeTopic);
  const { items: newsItems, loading: newsLoading } = useNews();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) loadMore();
      });
      if (node) observerRef.current.observe(node);
    },
    [loadingMore, hasMore, loadMore]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleLike = async (post: SocialPost) => {
    const ok = await likePost(post.id, !!post.liked_by_me);
    if (!ok) toast.error("Could not update like");
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim()) return;
    const ok = await commentPost(postId, commentText);
    if (ok) {
      toast.success("Comment posted!");
      setCommentText("");
      setCommentPostId(null);
    } else {
      toast.error("Could not post comment");
    }
  };

  const handleRepost = async (post: SocialPost) => {
    const ok = await repostPost(post.id);
    if (ok) toast.success("Reposted!");
    else toast.error("Could not repost");
  };

  return (
    <div className="size-full flex flex-col bg-background overflow-hidden">
      <div className="relative bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 px-6 py-4 border-b border-glass-border backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Viral Feed
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 border border-accent/30 rounded-full">
            <Sparkles className="size-4 text-accent" />
            <span className="text-sm font-semibold text-accent">Social Network</span>
          </div>
        </div>
        {topics.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setActiveTopic(undefined)}
              className={`flex-shrink-0 text-xs px-3 py-1 rounded-full border ${
                !activeTopic ? "border-primary bg-primary/20 text-primary" : "border-glass-border text-muted-foreground"
              }`}
            >
              All
            </button>
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.slug)}
                className={`flex-shrink-0 text-xs px-3 py-1 rounded-full border ${
                  activeTopic === t.slug ? "border-accent bg-accent/20 text-accent" : "border-glass-border text-muted-foreground"
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {!newsLoading && newsItems.length > 0 && (
          <div className="border-b border-glass-border p-4 bg-secondary/5">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="size-5 text-secondary" />
              <h2 className="font-semibold">News Network</h2>
            </div>
            <div className="space-y-2">
              {newsItems.slice(0, 3).map((article) => (
                <div key={article.id} className="bg-glass-bg border border-glass-border rounded-lg p-3">
                  <p className="font-semibold text-sm">{article.headline}</p>
                  <p className="text-xs text-muted-foreground">{article.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading feed...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No posts yet. Create content in the studio to populate the social network!
          </div>
        ) : (
          items.map((item, index) => {
              const creator = item.creator;
              const content = item.content;
              return (
                <motion.div
                  key={item.id}
                  className="relative border-b border-glass-border last:border-b-0"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`size-12 rounded-full bg-gradient-to-br ${creator?.avatar_gradient ?? "from-primary to-accent"}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{creator?.name ?? "Creator"}</h3>
                          {creator?.is_verified && (
                            <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                              <Zap className="size-3 text-white" fill="currentColor" />
                            </div>
                          )}
                          {item.is_trending && (
                            <div className="px-2 py-0.5 bg-accent/20 border border-accent/30 rounded-full">
                              <span className="text-xs font-semibold text-accent">TRENDING</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</p>
                      </div>
                    </div>

                    <p className="text-sm mb-3">{item.body}</p>

                    {content && (
                      <div
                        className={`relative w-full aspect-[9/16] max-h-[400px] rounded-xl bg-gradient-to-br ${content.thumbnail_gradient ?? "from-primary/40 to-accent/40"} mb-3 overflow-hidden`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="size-10 text-white/80" fill="currentColor" />
                        </div>
                        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full flex items-center gap-2">
                          {content.type === "music" ? <Music className="size-4 text-white" /> : <Play className="size-4 text-white" />}
                          <span className="text-xs text-white font-semibold capitalize">{content.type}</span>
                        </div>
                        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full flex items-center gap-2">
                          <Eye className="size-4 text-white" />
                          <span className="text-sm text-white font-semibold">{formatNumber(content.views)}</span>
                        </div>
                        {content.title && (
                          <div className="absolute bottom-4 right-4 left-16">
                            <p className="text-xs text-white font-semibold truncate">{content.title}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.topic_tag && (
                      <span className="text-xs text-secondary mb-2 inline-block">#{item.topic_tag}</span>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleLike(item)} className="flex items-center gap-2 group">
                          <div className={`size-10 rounded-full flex items-center justify-center ${item.liked_by_me ? "bg-accent/30" : "bg-accent/10 group-hover:bg-accent/20"}`}>
                            <Heart className={`size-5 ${item.liked_by_me ? "text-accent fill-accent" : "text-accent"}`} />
                          </div>
                          <span className="text-sm font-semibold">{formatNumber(item.likes_count)}</span>
                        </button>
                        <button onClick={() => setCommentPostId(commentPostId === item.id ? null : item.id)} className="flex items-center gap-2 group">
                          <div className="size-10 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center">
                            <MessageCircle className="size-5 text-primary" />
                          </div>
                          <span className="text-sm font-semibold">{formatNumber(item.comments_count)}</span>
                        </button>
                        <button onClick={() => handleRepost(item)} disabled={item.reposted_by_me} className="flex items-center gap-2 group disabled:opacity-50">
                          <div className="size-10 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center">
                            <Repeat2 className="size-5 text-secondary" />
                          </div>
                          <span className="text-sm font-semibold">{formatNumber(item.reposts_count)}</span>
                        </button>
                      </div>
                    </div>

                    {commentPostId === item.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 text-sm bg-glass-bg border border-glass-border rounded-lg px-3 py-2"
                          onKeyDown={(e) => e.key === "Enter" && handleComment(item.id)}
                        />
                        <button
                          onClick={() => handleComment(item.id)}
                          className="px-3 py-2 text-xs bg-primary text-white rounded-lg"
                        >
                          Post
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
        )}
        {hasMore && <div ref={loadMoreRef} className="h-10 flex items-center justify-center text-muted-foreground text-sm">{loadingMore ? "Loading..." : ""}</div>}
      </div>

      <BottomNav active="feed" />
    </div>
  );
}
