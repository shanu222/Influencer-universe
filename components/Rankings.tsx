"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Globe,
  MapPin,
  Users,
  Video,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
} from "lucide-react";
import BottomNav from "./BottomNav";
import { useRankings } from "@/hooks/useRankings";
import { useHallOfFame } from "@/hooks/useGameState";
import { formatCurrency, formatNumber, getRankChange } from "@/lib/utils/format";
import type { Creator } from "@/lib/types/database";
import type { HallOfFameEntry, AgencyRankingEntry, HouseLeaderboardEntry } from "@/lib/types/phase2";
import type { MarketRankingEntry } from "@/lib/types/phase3";
import { Building2, Landmark, DollarSign } from "lucide-react";
import { apiGet } from "@/lib/api/client";

type RankTab = "global" | "country" | "friends" | "genre" | "agency" | "hall_of_fame" | "houses" | "market";

export default function Rankings() {
  const [activeTab, setActiveTab] = useState<RankTab>("global");
  const { rankings, season, loading } = useRankings(activeTab === "global" || activeTab === "country" || activeTab === "friends" || activeTab === "genre" ? activeTab : "global");
  const { entries: hallEntries, loading: hallLoading } = useHallOfFame();
  const [agencyRankings, setAgencyRankings] = useState<AgencyRankingEntry[]>([]);
  const [houseLeaderboard, setHouseLeaderboard] = useState<HouseLeaderboardEntry[]>([]);
  const [marketRankings, setMarketRankings] = useState<MarketRankingEntry[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "agency") {
      setExtraLoading(true);
      apiGet<{ rankings: AgencyRankingEntry[] }>("/api/agency")
        .then((d) => setAgencyRankings(d.rankings ?? []))
        .finally(() => setExtraLoading(false));
    }
    if (activeTab === "houses") {
      setExtraLoading(true);
      apiGet<{ leaderboard: HouseLeaderboardEntry[] }>("/api/houses")
        .then((d) => setHouseLeaderboard(d.leaderboard ?? []))
        .finally(() => setExtraLoading(false));
    }
    if (activeTab === "market") {
      setExtraLoading(true);
      apiGet<{ rankings: MarketRankingEntry[] }>("/api/marketplace?view=rankings")
        .then((d) => setMarketRankings(d.rankings ?? []))
        .finally(() => setExtraLoading(false));
    }
  }, [activeTab]);

  const tabs = [
    { id: "global", icon: Globe, label: "Global" },
    { id: "country", icon: MapPin, label: "Country" },
    { id: "agency", icon: Building2, label: "Agency" },
    { id: "hall_of_fame", icon: Landmark, label: "Hall of Fame" },
    { id: "houses", icon: Trophy, label: "Houses" },
    { id: "market", icon: DollarSign, label: "Market" },
  ];

  const getBadge = (rank: number) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return undefined;
  };

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case "gold":
        return <Crown className="size-5 text-gold" fill="currentColor" />;
      case "silver":
        return <Medal className="size-5 text-gray-400" fill="currentColor" />;
      case "bronze":
        return <Medal className="size-5 text-amber-600" fill="currentColor" />;
      default:
        return null;
    }
  };

  const getChangeIcon = (change: string) => {
    switch (change) {
      case "up":
        return <ArrowUp className="size-4 text-green-500" />;
      case "down":
        return <ArrowDown className="size-4 text-red-500" />;
      default:
        return <Minus className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="size-full flex flex-col bg-background overflow-hidden">
      <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 px-6 py-4 border-b border-glass-border">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-gradient-to-br from-gold to-yellow-600 flex items-center justify-center">
              <Trophy className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Global Rankings</h1>
              <p className="text-sm text-muted-foreground">
                {season ? `${season.name} · Compete with the best creators` : "Compete with the best creators"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className="relative flex-shrink-0">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-accent text-white"
                        : "bg-glass-bg backdrop-blur-xl border border-glass-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="size-4" />
                    <span className="text-sm font-semibold whitespace-nowrap">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 pb-24 space-y-3">
        {(activeTab === "hall_of_fame" && hallLoading) ||
        (activeTab === "agency" && extraLoading) ||
        (activeTab === "houses" && extraLoading) ||
        (activeTab === "market" && extraLoading) ||
        ((activeTab === "global" || activeTab === "country") && loading) ? (
          <div className="text-center py-8 text-muted-foreground">Loading rankings...</div>
        ) : activeTab === "hall_of_fame" ? (
          (hallEntries as HallOfFameEntry[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No Hall of Fame entries yet. Make history!</div>
          ) : (
            (hallEntries as HallOfFameEntry[]).map((entry, index) => (
              <motion.div
                key={entry.id}
                className="bg-glass-bg border border-gold/30 rounded-xl p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <Crown className="size-6 text-gold" />
                  <div>
                    <p className="font-semibold">{entry.creator?.name ?? "Creator"}</p>
                    <p className="text-sm text-muted-foreground">{entry.record_label}</p>
                    <p className="text-xs text-gold capitalize">{entry.category.replace(/_/g, " ")}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )
        ) : activeTab === "agency" ? (
          agencyRankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No agency rankings yet.</div>
          ) : (
            agencyRankings.map((entry, index) => {
              const agency = entry.agencies;
              return (
                <motion.div key={entry.agency_id ?? String(index)} className="bg-glass-bg border border-glass-border rounded-xl p-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">#{entry.rank_position} {agency?.name}</p>
                      <p className="text-xs text-muted-foreground">Level {agency?.level} · Rep {agency?.reputation}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{entry.score.toFixed(0)} pts</p>
                  </div>
                </motion.div>
              );
            })
          )
        ) : activeTab === "houses" ? (
          houseLeaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No houses yet.</div>
          ) : (
            houseLeaderboard.map((house, index) => (
              <motion.div key={house.id} className="bg-glass-bg border border-glass-border rounded-xl p-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">#{house.house_rank} {house.name}</p>
                    <p className="text-xs text-muted-foreground">Fame {house.fame_score}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )
        ) : activeTab === "market" ? (
          marketRankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No market rankings yet.</div>
          ) : (
            marketRankings.map((entry, index) => (
              <motion.div key={entry.creator_id} className="bg-glass-bg border border-gold/20 rounded-xl p-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">#{entry.rank_position} {entry.creator?.name ?? "Creator"}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(entry.creator?.followers ?? 0)} followers</p>
                  </div>
                  <p className="text-sm font-bold text-gold">{formatCurrency(entry.market_value)}</p>
                </div>
              </motion.div>
            ))
          )
        ) : loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading rankings...</div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No rankings yet. Create content to climb the charts!</div>
        ) : (
          rankings.map((entry, index) => {
            const creator = entry.creator as Creator;
            const rank = entry.rank_position;
            const badge = getBadge(rank);
            const isTopThree = rank <= 3;
            const isYou = entry.is_you;
            const change = getRankChange(rank, entry.previous_position);

            return (
              <motion.div
                key={`${creator.id}-${rank}`}
                className={`relative bg-glass-bg backdrop-blur-xl border rounded-xl p-4 overflow-hidden ${
                  isYou ? "border-primary/50 bg-primary/5" : isTopThree ? "border-gold/30 bg-gold/5" : "border-glass-border"
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                {isYou && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-primary rounded-full">
                    <span className="text-xs font-semibold text-white">YOU</span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1 w-12">
                    <div className="flex items-center gap-1">
                      {getBadgeIcon(badge)}
                      {!badge && (
                        <span className={`text-lg font-bold ${isTopThree ? "text-gold" : "text-muted-foreground"}`}>#{rank}</span>
                      )}
                    </div>
                    {getChangeIcon(change)}
                  </div>

                  <div className={`size-14 rounded-full bg-gradient-to-br ${creator.avatar_gradient ?? "from-primary to-accent"} flex-shrink-0`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{creator.name}</h3>
                      {creator.is_verified && (
                        <div className="size-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Zap className="size-3 text-white" fill="currentColor" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Followers</p>
                        <p className="font-semibold text-primary">{formatNumber(creator.followers)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Net Worth</p>
                        <p className="font-semibold text-gold">{formatCurrency(Number(creator.net_worth))}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Influence</p>
                        <p className="font-semibold text-secondary">{creator.influence}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        isYou ? "bg-gradient-to-r from-primary to-accent" : isTopThree ? "bg-gradient-to-r from-gold to-yellow-600" : "bg-gradient-to-r from-secondary to-cyan-600"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${creator.influence}%` }}
                      transition={{ duration: 1, delay: 0.2 + index * 0.05 }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <BottomNav active="rankings" />
    </div>
  );
}
