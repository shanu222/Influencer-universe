"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { Creator, CreatorStats, Content, User } from "@/lib/types/database";

interface PreviewMetrics {
  quality: number;
  viral: number;
  engagement: number;
}

interface CreatorData {
  profile: User | null;
  creator: Creator | null;
  stats: CreatorStats | null;
  previewMetrics: PreviewMetrics | null;
  recentContent: Content[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCreator(): CreatorData {
  const [profile, setProfile] = useState<User | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [previewMetrics, setPreviewMetrics] = useState<PreviewMetrics | null>(null);
  const [recentContent, setRecentContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{
        profile: User;
        creator: Creator;
        stats: CreatorStats;
        previewMetrics: PreviewMetrics;
        recentContent: Content[];
      }>("/api/creator");
      setProfile(data.profile);
      setCreator(data.creator);
      setStats(data.stats);
      setPreviewMetrics(data.previewMetrics ?? null);
      setRecentContent(data.recentContent ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, creator, stats, previewMetrics, recentContent, loading, error, refresh };
}
