"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { RankingEntry } from "@/lib/types/database";
import type { SeasonInfo } from "@/lib/types/phase2";

export function useRankings(type: string) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ rankings: RankingEntry[]; season: SeasonInfo }>(`/api/rankings?type=${type}`);
      setRankings(data.rankings ?? []);
      setSeason(data.season ?? null);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rankings, season, loading, refresh };
}
