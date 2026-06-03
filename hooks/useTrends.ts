"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { Trend } from "@/lib/types/database";

export function useTrends(category?: string) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = category ? `?category=${category}` : "";
      const data = await apiGet<{ trends: Trend[] }>(`/api/trends${params}`);
      setTrends(data.trends ?? []);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const joinTrend = async (trendId: string) => {
    await apiPost("/api/trends", { trendId });
    await refresh();
  };

  return { trends, loading, joinTrend, refresh };
}
