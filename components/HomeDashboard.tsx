"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  TrendingUp,
  Users,
  Zap,
  Heart,
  Video,
  Music,
  Radio,
  Handshake,
  Briefcase,
  Flame,
  BarChart3,
  User,
  Play,
  Swords,
  Newspaper,
  Sparkles as SparklesIcon,
  Trophy,
  Dna,
  ShoppingBag,
} from "lucide-react";
import BottomNav from "./BottomNav";
import { useCreator } from "@/hooks/useCreator";
import { useRankings } from "@/hooks/useRankings";
import { useGameState } from "@/hooks/useGameState";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { toast } from "sonner";
import { apiPost } from "@/lib/api/client";
import { xpProgressInLevel } from "@/lib/types/phase2";

export default function HomeDashboard() {
  const navigate = useRouter();
  const { creator, recentContent, loading, refresh: refreshCreator } = useCreator();
  const { rankings } = useRankings("global");
  const { lifeEvents, news, season, dna, battles, relationshipDrama, marketplaceListings, trendingTopics, valuation, refresh: refreshGame } = useGameState();

  const xpProgress = creator ? xpProgressInLevel(creator.xp, creator.level) : null;

  const voteBattle = async (rivalryId: string, votedForCreatorId: string) => {
    try {
      await apiPost("/api/battles", { action: "vote", rivalryId, votedForCreatorId });
      toast.success("Vote recorded!");
      await refreshGame();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    }
  };

  const resolveEvent = async (eventId: string, choiceId: string) => {
    try {
      await apiPost("/api/life-events", { eventId, choiceId });
      toast.success("Decision applied!");
      await Promise.all([refreshCreator(), refreshGame()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve event");
    }
  };

  const myRank = rankings.find((r) => r.is_you);
  const rankChange =
    myRank?.previous_position && myRank.rank_position < myRank.previous_position
      ? `↑ ${myRank.previous_position - myRank.rank_position} from last update`
      : myRank?.previous_position && myRank.rank_position > myRank.previous_position
      ? `↓ ${myRank.rank_position - myRank.previous_position} from last update`
      : null;

  const quickActions = [
    { icon: Video, label: "Create Content", color: "from-primary to-purple-600", onClick: () => navigate.push("/studio") },
    { icon: Music, label: "Record Song", color: "from-accent to-pink-600", onClick: () => navigate.push("/studio?tab=music") },
    { icon: Radio, label: "Go Live", color: "from-secondary to-blue-600", onClick: () => navigate.push("/studio?tab=livestreams") },
    { icon: Handshake, label: "Collaborate", color: "from-gold to-yellow-600", onClick: () => navigate.push("/feed") },
    { icon: Briefcase, label: "Start Business", color: "from-green-500 to-emerald-600", onClick: () => navigate.push("/profile?tab=businesses") },
    { icon: Flame, label: "Join Trend", color: "from-orange-500 to-red-600", onClick: () => navigate.push("/trends") },
  ];

  if (loading || !creator) {
    return (
      <div className="size-full flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading your empire...</div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-background overflow-hidden">
      <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 p-6 pb-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

        <motion.div
          className="relative bg-glass-bg backdrop-blur-xl border border-glass-border rounded-2xl p-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className={`size-20 rounded-full bg-gradient-to-br ${creator.avatar_gradient ?? "from-primary via-accent to-secondary"} p-0.5`}>
                <div className="size-full rounded-full bg-background flex items-center justify-center">
                  <User className="size-10 text-primary" />
                </div>
              </div>
              {creator.is_verified && (
                <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-gold flex items-center justify-center">
                  <BadgeCheck className="size-5 text-background" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-2xl font-bold">{creator.name}</h2>
                {creator.is_verified && <BadgeCheck className="size-6 text-primary" />}
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
                  Lv.{creator.level}
                </span>
              </div>
              {xpProgress && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>XP {xpProgress.current}/{xpProgress.needed}</span>
                    <span>{xpProgress.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${xpProgress.pct}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Followers</p>
                  <p className="text-lg font-bold text-primary">{formatNumber(creator.followers)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subscribers</p>
                  <p className="text-lg font-bold text-secondary">{formatNumber(creator.subscribers)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-gold">{formatCurrency(Number(creator.monthly_revenue))}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 pb-24 space-y-6">
        {season && (
          <motion.div
            className="bg-gradient-to-r from-gold/20 to-primary/20 border border-gold/30 rounded-xl p-4 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trophy className="size-8 text-gold flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{season.name}</p>
              <p className="text-xs text-muted-foreground">
                Theme: {season.theme ?? "Competition"} · {season.days_remaining} days left
              </p>
            </div>
          </motion.div>
        )}

        {lifeEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <SparklesIcon className="size-5 text-accent" />
              Life Events
            </h3>
            {lifeEvents.map((event) => (
              <div key={event.id} className="bg-glass-bg border border-accent/30 rounded-xl p-4 space-y-3">
                <div>
                  <p className="font-semibold text-accent">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => resolveEvent(event.id, choice.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-accent/20 border border-accent/40 rounded-lg hover:bg-accent/30"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {trendingTopics.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="size-5 text-accent" />
              Trending Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => navigate.push("/feed")}
                  className="text-xs px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-full text-accent font-semibold"
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {relationshipDrama.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Heart className="size-5 text-accent" />
              Celebrity Drama
            </h3>
            <div className="space-y-2">
              {relationshipDrama.slice(0, 3).map((event) => (
                <div key={event.id} className="bg-glass-bg border border-accent/20 rounded-lg p-3">
                  <p className="font-semibold text-sm">{event.headline}</p>
                  <p className="text-xs text-muted-foreground capitalize">{event.event_type.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {marketplaceListings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <ShoppingBag className="size-5 text-gold" />
              Creator Marketplace
            </h3>
            {valuation && (
              <p className="text-xs text-muted-foreground mb-2">
                Your valuation: {formatCurrency(Number(valuation.market_value))} ({valuation.trend_direction})
              </p>
            )}
            <div className="space-y-2">
              {marketplaceListings.slice(0, 3).map((listing) => (
                <div key={listing.id} className="bg-glass-bg border border-gold/20 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{listing.creator?.name ?? "Creator"}</p>
                    <p className="text-xs text-muted-foreground">Lv.{listing.creator?.level ?? 1} · {formatNumber(listing.creator?.followers ?? 0)} followers</p>
                  </div>
                  <p className="text-sm font-bold text-gold">{formatCurrency(Number(listing.asking_price))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {news.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Newspaper className="size-5 text-secondary" />
              News Network
            </h3>
            <div className="space-y-2">
              {news.slice(0, 3).map((article) => (
                <div key={article.id} className="bg-glass-bg border border-glass-border rounded-lg p-3">
                  <p className="font-semibold text-sm">{article.headline}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {battles.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Swords className="size-5 text-primary" />
              Active Battles
            </h3>
            {battles.slice(0, 2).map((b) => (
              <div key={b.id} className="bg-glass-bg border border-glass-border rounded-lg p-3 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {b.challenger?.name} vs {b.opponent?.name}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{b.type.replace(/_/g, " ")}</span>
                </div>
                {b.type === "fan_vote_battle" && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => voteBattle(b.id, b.challenger_id)}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-primary/30 hover:bg-primary/10"
                    >
                      Vote {b.challenger?.name}
                    </button>
                    <button
                      onClick={() => voteBattle(b.id, b.opponent_id)}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-accent/30 hover:bg-accent/10"
                    >
                      Vote {b.opponent?.name}
                    </button>
                  </div>
                )}
                {b.type !== "fan_vote_battle" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Score: {b.challenger_score} — {b.opponent_score}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {dna && dna.strengths.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-glass-bg border border-glass-border rounded-lg px-3 py-2">
            <Dna className="size-4 text-primary" />
            <span>
              DNA: {dna.strengths.join(", ")}
              {dna.weaknesses.length > 0 && isOwnerVisible(dna) ? ` · Weakness: ${dna.weaknesses[0]}` : ""}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Popularity</p>
                <p className="text-xl font-bold">{creator.fame_score}</p>
              </div>
            </div>
            <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${creator.fame_score}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </motion.div>

          <motion.div
            className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-gold/20 flex items-center justify-center">
                <BarChart3 className="size-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trend Rank</p>
                <p className="text-xl font-bold">#{myRank?.rank_position ?? "—"}</p>
              </div>
            </div>
            {rankChange && <p className="text-xs text-green-500">{rankChange}</p>}
          </motion.div>

          <motion.div
            className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Zap className="size-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Energy</p>
                <p className="text-xl font-bold">{creator.energy}%</p>
              </div>
            </div>
            <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${creator.energy}%` }}
                transition={{ duration: 1, delay: 0.4 }}
              />
            </div>
          </motion.div>

          <motion.div
            className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Heart className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reputation</p>
                <p className="text-xl font-bold">{creator.reputation}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground capitalize">{creator.mood} mood</p>
          </motion.div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                className={`relative overflow-hidden bg-gradient-to-br ${action.color} rounded-xl p-4 text-left group`}
                onClick={action.onClick}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative z-10 flex items-center gap-3">
                  <action.icon className="size-6 text-white" />
                  <span className="font-semibold text-white">{action.label}</span>
                </div>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Latest Viral Content</h3>
            <button className="text-sm text-primary hover:text-primary/80" onClick={() => navigate.push("/feed")}>
              View All
            </button>
          </div>
          {recentContent.length === 0 ? (
            <div className="bg-glass-bg border border-glass-border rounded-xl p-6 text-center text-muted-foreground text-sm">
              No content yet. Head to the studio to create your first viral hit!
            </div>
          ) : (
            <div className="space-y-3">
              {recentContent.map((content, index) => (
                <motion.div
                  key={content.id}
                  className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4 flex items-center gap-4 group cursor-pointer hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  onClick={() => navigate.push("/feed")}
                >
                  <div className={`size-16 rounded-lg bg-gradient-to-br ${content.thumbnail_gradient ?? "from-primary/40 to-accent/40"} flex items-center justify-center`}>
                    <Play className="size-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 group-hover:text-primary transition-colors">{content.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {formatNumber(content.views)} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="size-3" />
                        {formatNumber(content.likes)} likes
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function isOwnerVisible(dna: { weaknesses: string[]; hidden_trait: string | null }) {
  return dna.weaknesses.length > 0 || !!dna.hidden_trait;
}
