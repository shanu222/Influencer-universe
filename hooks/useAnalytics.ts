"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { Creator, AnalyticsSnapshot, Content, Achievement } from "@/lib/types/database";

export function useAnalytics() {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot[]>([]);
  const [topContent, setTopContent] = useState<Content[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{
        creator: Creator;
        analytics: AnalyticsSnapshot[];
        topContent: Content[];
        achievements: Achievement[];
      }>("/api/analytics");
      setCreator(data.creator);
      setAnalytics(data.analytics ?? []);
      setTopContent(data.topContent ?? []);
      setAchievements(data.achievements ?? []);
    } catch {
      setCreator(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { creator, analytics, topContent, achievements, loading, refresh };
}
