"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { SocialPost, TrendingTopic } from "@/lib/types/phase3";

export function useSocialFeed(topicTag?: string) {
  const [items, setItems] = useState<SocialPost[]>([]);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadTopics = useCallback(async () => {
    try {
      const data = await apiGet<{ topics: TrendingTopic[] }>("/api/social?view=topics");
      setTopics(data.topics ?? []);
    } catch {
      setTopics([]);
    }
  }, []);

  const load = useCallback(
    async (pageNum: number, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: "10" });
        if (topicTag) params.set("topic", topicTag);
        const data = await apiGet<{ items: SocialPost[]; hasMore: boolean }>(`/api/social?${params}`);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items ?? []));
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [topicTag]
  );

  useEffect(() => {
    loadTopics();
    load(1);
  }, [load, loadTopics]);

  const likePost = async (postId: string, liked: boolean) => {
    try {
      const data = await apiPost<{ likesCount: number }>("/api/social", {
        action: liked ? "unlike" : "like",
        postId,
      });
      setItems((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked_by_me: !liked, likes_count: data.likesCount ?? p.likes_count } : p
        )
      );
      return true;
    } catch {
      return false;
    }
  };

  const commentPost = async (postId: string, body: string) => {
    try {
      await apiPost("/api/social", { action: "comment", postId, body });
      setItems((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
      return true;
    } catch {
      return false;
    }
  };

  const repostPost = async (postId: string) => {
    try {
      const data = await apiPost<{ repostsCount: number }>("/api/social", { action: "repost", postId });
      setItems((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, reposted_by_me: true, reposts_count: data.repostsCount ?? p.reposts_count + 1 }
            : p
        )
      );
      return true;
    } catch {
      return false;
    }
  };

  return {
    items,
    topics,
    loading,
    loadingMore,
    hasMore,
    loadMore: () => {
      if (!loadingMore && hasMore) load(page + 1, true);
    },
    refresh: () => load(1),
    likePost,
    commentPost,
    repostPost,
  };
}

export function useRelationships() {
  const [relationships, setRelationships] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ relationships: unknown[] }>("/api/relationships");
      setRelationships(data.relationships ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestRelationship = async (targetCreatorId: string, type: string) => {
    try {
      await apiPost("/api/relationships", { action: "request", targetCreatorId, type });
      await refresh();
      return { success: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Request failed" };
    }
  };

  const respondRelationship = async (relationshipId: string, accept: boolean) => {
    try {
      await apiPost("/api/relationships", { action: "respond", relationshipId, accept });
      await refresh();
      return { success: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Response failed" };
    }
  };

  const endRelationship = async (relationshipId: string) => {
    try {
      const result = await apiPost<{ headline?: string }>("/api/relationships", { action: "end", relationshipId });
      await refresh();
      return result;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "End failed" };
    }
  };

  return { relationships, loading, refresh, requestRelationship, respondRelationship, endRelationship };
}

export function useMarketplace() {
  const [listings, setListings] = useState<unknown[]>([]);
  const [valuation, setValuation] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, mineData] = await Promise.all([
        apiGet<{ listings: unknown[] }>("/api/marketplace?view=listings"),
        apiGet<{ valuation: unknown }>("/api/marketplace?view=mine"),
      ]);
      setListings(listData.listings ?? []);
      setValuation(mineData.valuation ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const listCreator = async (creatorId: string, askingPrice: number) => {
    try {
      await apiPost("/api/marketplace", { action: "list", creatorId, askingPrice });
      await refresh();
      return { success: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Listing failed" };
    }
  };

  const buyListing = async (listingId: string) => {
    try {
      await apiPost("/api/marketplace", { action: "buy", listingId });
      await refresh();
      return { success: true };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Purchase failed" };
    }
  };

  return { listings, valuation, loading, refresh, listCreator, buyListing };
}
