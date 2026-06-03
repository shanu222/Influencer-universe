"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";
import type { LifeEvent, NewsArticle, Battle, HouseWar, Agency, CreatorDna, SeasonInfo } from "@/lib/types/phase2";
import type { TrendingTopic, CreatorValuation, MarketplaceListing, RelationshipEvent } from "@/lib/types/phase3";
import type { Creator } from "@/lib/types/database";

interface GameState {
  creator: Creator | null;
  lifeEvents: LifeEvent[];
  battles: Battle[];
  news: NewsArticle[];
  houseWar: HouseWar | null;
  houseLeaderboard: { id: string; name: string; fame_score: number; house_rank: number }[];
  season: SeasonInfo | null;
  agency: Agency | null;
  dna: CreatorDna | null;
  relationshipDrama: RelationshipEvent[];
  marketplaceListings: MarketplaceListing[];
  trendingTopics: TrendingTopic[];
  valuation: CreatorValuation | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useGameState(): GameState {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [houseWar, setHouseWar] = useState<HouseWar | null>(null);
  const [houseLeaderboard, setHouseLeaderboard] = useState<GameState["houseLeaderboard"]>([]);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [dna, setDna] = useState<CreatorDna | null>(null);
  const [relationshipDrama, setRelationshipDrama] = useState<RelationshipEvent[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [valuation, setValuation] = useState<CreatorValuation | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{
        creator: Creator;
        lifeEvents: LifeEvent[];
        battles: Battle[];
        news: NewsArticle[];
        houseWar: HouseWar;
        houseLeaderboard: GameState["houseLeaderboard"];
        season: SeasonInfo;
        agency: Agency;
        dna: CreatorDna;
        relationshipDrama: RelationshipEvent[];
        marketplaceListings: MarketplaceListing[];
        trendingTopics: TrendingTopic[];
        valuation: CreatorValuation;
      }>("/api/game/state");
      setCreator(data.creator);
      setLifeEvents(data.lifeEvents ?? []);
      setBattles(data.battles ?? []);
      setNews(data.news ?? []);
      setHouseWar(data.houseWar);
      setHouseLeaderboard(data.houseLeaderboard ?? []);
      setSeason(data.season);
      setAgency(data.agency);
      setDna(data.dna);
      setRelationshipDrama(data.relationshipDrama ?? []);
      setMarketplaceListings(data.marketplaceListings ?? []);
      setTrendingTopics(data.trendingTopics ?? []);
      setValuation(data.valuation ?? null);
    } catch {
      /* unauthenticated or network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    creator,
    lifeEvents,
    battles,
    news,
    houseWar,
    houseLeaderboard,
    season,
    agency,
    dna,
    relationshipDrama,
    marketplaceListings,
    trendingTopics,
    valuation,
    loading,
    refresh,
  };
}

export function useProgression() {
  const [data, setData] = useState<{
    progression: unknown;
    dna: CreatorDna | null;
    personality: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiGet<{ progression: unknown; dna: CreatorDna; personality: unknown }>("/api/progression");
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

export function useNews(page = 1) {
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const data = await apiGet<{ items: NewsArticle[]; hasMore: boolean }>(`/api/news?page=${p}&limit=15`);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return { items, hasMore, loading, loadMore: () => load(page + 1, true) };
}

export function useHallOfFame(category?: string) {
  const [entries, setEntries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = category ? `?category=${category}` : "";
    apiGet<{ entries: unknown[] }>(`/api/hall-of-fame${params}`)
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [category]);

  return { entries, loading };
}
