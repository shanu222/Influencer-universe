"use client";

import { useCallback, useEffect, useState } from "react";
import type { Content } from "@/lib/types/database";

export function useFeed() {
  const [items, setItems] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/content?page=${pageNum}&limit=10`);
      const data = await res.json();
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(data.hasMore);
      setPage(pageNum);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = () => {
    if (!loadingMore && hasMore) load(page + 1, true);
  };

  return { items, loading, loadingMore, hasMore, loadMore, refresh: () => load(1) };
}
