"use client";

import { motion } from "motion/react";
import { useState } from "react";
import {
  TrendingUp,
  Flame,
  Music,
  Gamepad2,
  Shirt,
  Globe,
  Clock,
  Users,
  Zap,
  ArrowUp,
  Swords,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api/client";
import BottomNav from "./BottomNav";
import { useTrends } from "@/hooks/useTrends";
import { useGameState } from "@/hooks/useGameState";
import { useCreator } from "@/hooks/useCreator";
import {
  formatNumber,
  formatTimeRemaining,
  getCompetitionLabel,
  getTrendGradient,
} from "@/lib/utils/format";

export default function TrendCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string>("global");
  const [joining, setJoining] = useState<string | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const { trends, loading, joinTrend } = useTrends(selectedCategory === "global" ? undefined : selectedCategory);
  const { houseWar, houseLeaderboard } = useGameState();
  const { creator } = useCreator();

  const startTrendBattle = async () => {
    if (!creator) return;
    const opponents = await apiGet<{ rankings: { is_you?: boolean; creator?: { id: string } }[] }>(
      "/api/rankings?type=global&limit=20"
    );
    const opponent = opponents.rankings?.find((r) => !r.is_you)?.creator;
    if (!opponent) {
      toast.error("No opponents available");
      return;
    }
    setBattleLoading(true);
    try {
      await apiPost("/api/battles", { opponentId: opponent.id, type: "trend_battle" });
      toast.success("Trend battle started!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Battle failed");
    } finally {
      setBattleLoading(false);
    }
  };

  const joinHouseAction = async (houseId: string) => {
    try {
      const { house } = await apiPost<{ house: { name: string } }>("/api/houses", { houseId });
      toast.success(`Joined ${house.name}!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to join house");
    }
  };

  const trendCategories = [
    { id: "global", icon: Globe, label: "Global", color: "text-primary" },
    { id: "music", icon: Music, label: "Music", color: "text-accent" },
    { id: "gaming", icon: Gamepad2, label: "Gaming", color: "text-secondary" },
    { id: "fashion", icon: Shirt, label: "Fashion", color: "text-gold" },
    { id: "challenge", icon: Flame, label: "Challenges", color: "text-orange-500" },
  ];

  const handleJoin = async (trendId: string) => {
    setJoining(trendId);
    try {
      await joinTrend(trendId);
      toast.success("Joined trend! Create content to boost your score.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to join trend");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="size-full flex flex-col bg-background overflow-hidden">
      <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 px-6 py-4 border-b border-glass-border">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Flame className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Trend Center</h1>
              <p className="text-sm text-muted-foreground">Join viral trends & grow faster</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {trendCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary/20 border border-primary/50"
                    : "bg-glass-bg backdrop-blur-xl border border-glass-border hover:border-primary/50"
                }`}
              >
                <category.icon className={`size-4 ${category.color}`} />
                <span className="text-sm font-semibold whitespace-nowrap">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-4">
        {houseWar && (
          <motion.div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="size-5 text-primary" />
              <h3 className="font-bold">House War — {houseWar.theme ?? "Weekly Clash"}</h3>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span>{houseWar.house_a?.name ?? "House A"}: {houseWar.house_a_score}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{houseWar.house_b?.name ?? "House B"}: {houseWar.house_b_score}</span>
            </div>
            <p className="text-xs text-gold">Reward pool: ${Number(houseWar.reward_pool).toLocaleString()}</p>
          </motion.div>
        )}

        {!creator?.house_id && houseLeaderboard.length > 0 && (
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Join a Creator House</h3>
            <div className="flex flex-wrap gap-2">
              {houseLeaderboard.slice(0, 4).map((h) => (
                <button
                  key={h.id}
                  onClick={() => joinHouseAction(h.id)}
                  className="px-3 py-1.5 text-xs font-semibold bg-primary/20 border border-primary/40 rounded-lg"
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.button
          onClick={startTrendBattle}
          disabled={battleLoading || !creator}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-secondary to-primary rounded-xl font-semibold text-white disabled:opacity-50"
        >
          {battleLoading ? <Loader2 className="size-4 animate-spin" /> : <Swords className="size-4" />}
          Start Trend Battle
        </motion.button>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading trends...</div>
        ) : trends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No active trends. Check back soon!</div>
        ) : (
          trends.map((trend, index) => {
            const hot = trend.popularity >= 85;
            const gradient = getTrendGradient(trend.category);
            return (
              <motion.div
                key={trend.id}
                className="relative bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4 overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{trend.title}</h3>
                        {hot && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full">
                            <Flame className="size-3 text-white" fill="currentColor" />
                            <span className="text-xs text-white font-semibold">HOT</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">{trend.category.replace("_", " ")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-green-500">
                        <ArrowUp className="size-4" />
                        <span className="text-sm font-semibold">+{Number(trend.growth_rate).toFixed(0)}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">growth</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Popularity</span>
                      <span className="text-sm font-semibold text-primary">{trend.popularity}%</span>
                    </div>
                    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${trend.popularity}%` }}
                        transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-background/30 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Participants</span>
                      </div>
                      <p className="text-sm font-semibold">{formatNumber(trend.participant_count)}</p>
                    </div>
                    <div className="bg-background/30 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Time Left</span>
                      </div>
                      <p className="text-sm font-semibold">{formatTimeRemaining(trend.ends_at)}</p>
                    </div>
                    <div className="bg-background/30 backdrop-blur-sm rounded-lg p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <Zap className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Competition</span>
                      </div>
                      <div className="px-2 py-0.5 rounded border text-xs font-semibold inline-block text-accent bg-accent/10 border-accent/20">
                        {getCompetitionLabel(trend.competition)}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary to-accent rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={joining === trend.id}
                    onClick={() => handleJoin(trend.id)}
                  >
                    {joining === trend.id ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
                    Join This Trend
                  </motion.button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <BottomNav active="trends" />
    </div>
  );
}
