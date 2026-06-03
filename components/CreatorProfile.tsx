"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import {
  User,
  BadgeCheck,
  Settings,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Briefcase,
  Image,
  Video,
  Music,
  Trophy,
  Zap,
  Eye,
} from "lucide-react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from "recharts";
import BottomNav from "./BottomNav";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProgression } from "@/hooks/useGameState";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { xpProgressInLevel } from "@/lib/types/phase2";
import type { CreatorPersonality, SkillDefinition, PerkDefinition, Agency } from "@/lib/types/phase2";
import type { CelebrityRelationship, CreatorValuation } from "@/lib/types/phase3";
import { Dna, Target, Building2, Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api/client";
import { useRelationships, useMarketplace } from "@/hooks/useSocial";

const ICON_MAP: Record<string, typeof Trophy> = {
  trophy: Trophy,
  award: Award,
  zap: Zap,
  users: Users,
};

export default function CreatorProfile() {
  const [activeTab, setActiveTab] = useState<"photos" | "videos" | "songs" | "awards" | "businesses">("videos");
  const { creator, analytics, topContent, achievements, loading } = useAnalytics();
  const { progression, dna, personality, loading: progLoading } = useProgression();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [switchingCreator, setSwitchingCreator] = useState(false);
  const [listPrice, setListPrice] = useState("");
  const { relationships, respondRelationship, endRelationship } = useRelationships();
  const { valuation, listCreator } = useMarketplace();

  useEffect(() => {
    apiGet<{ agency: Agency | null }>("/api/agency")
      .then((d) => setAgency(d.agency ?? null))
      .catch(() => setAgency(null));
  }, [creator?.id]);

  const switchCreator = async (creatorId: string) => {
    if (creatorId === creator?.id) return;
    setSwitchingCreator(true);
    try {
      await apiPost("/api/agency", { creatorId });
      toast.success("Switched active creator");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to switch creator");
    } finally {
      setSwitchingCreator(false);
    }
  };

  const handleListForSale = async () => {
    const price = parseFloat(listPrice);
    if (!creator || !price || price <= 0) {
      toast.error("Enter a valid asking price");
      return;
    }
    const data = await listCreator(creator.id, price);
    if ("error" in data && data.error) toast.error(data.error);
    else {
      toast.success("Listed on marketplace!");
      setListPrice("");
    }
  };

  const pendingRelationships = (relationships as CelebrityRelationship[]).filter((r) => r.status === "pending");
  const activeRelationships = (relationships as CelebrityRelationship[]).filter((r) => r.status === "active");
  const myValuation = valuation as CreatorValuation | null;

  const xpProgress = creator ? xpProgressInLevel(creator.xp, creator.level) : null;
  const skills = (progression as { skills?: SkillDefinition[] })?.skills ?? [];
  const perks = (progression as { perks?: PerkDefinition[] })?.perks ?? [];
  const goals = (personality as CreatorPersonality)?.goals ?? [];

  const tabs = [
    { id: "photos", icon: Image, label: "Photos" },
    { id: "videos", icon: Video, label: "Videos" },
    { id: "songs", icon: Music, label: "Songs" },
    { id: "awards", icon: Award, label: "Awards" },
    { id: "businesses", icon: Briefcase, label: "Businesses" },
  ];

  const followerData = analytics.map((a) => ({
    month: new Date(a.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    followers: a.followers / 1_000_000,
  }));

  const revenueData = analytics.map((a) => ({
    month: new Date(a.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    revenue: Number(a.revenue) / 1_000_000,
  }));

  const growthPct =
    analytics.length >= 2
      ? Math.round(
          ((analytics[analytics.length - 1].followers - analytics[0].followers) / Math.max(analytics[0].followers, 1)) * 100
        )
      : 0;

  const filteredContent = topContent.filter((c) => {
    if (activeTab === "videos") return c.type === "video" || c.type === "short" || c.type === "livestream";
    if (activeTab === "songs") return c.type === "music";
    return true;
  });

  if (loading || !creator) {
    return (
      <div className="size-full flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-background overflow-hidden">
      <div className="relative h-48 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <button className="absolute top-4 right-4 size-10 rounded-full bg-glass-bg backdrop-blur-xl border border-glass-border flex items-center justify-center hover:bg-primary/20 transition-colors">
          <Settings className="size-5" />
        </button>
      </div>

      <div className="relative px-6 -mt-16 mb-4">
        <motion.div
          className={`size-32 rounded-full bg-gradient-to-br ${creator.avatar_gradient ?? "from-primary via-accent to-secondary"} p-1 mb-4`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="size-full rounded-full bg-background flex items-center justify-center">
            <User className="size-16 text-primary" />
          </div>
        </motion.div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{creator.name}</h1>
              {creator.is_verified && <BadgeCheck className="size-6 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground mb-3">@{creator.handle}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(creator.followers)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(creator.following_count)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatNumber(creator.total_views)}</p>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="size-4 text-gold" />
              <span className="text-xs text-muted-foreground">Net Worth</span>
            </div>
            <p className="text-lg font-bold text-gold">{formatCurrency(Number(creator.net_worth))}</p>
          </div>
          <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">Influence</span>
            </div>
            <p className="text-lg font-bold text-primary">{creator.influence}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6">
        {achievements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent Achievements</h3>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((achievement, index) => {
                const Icon = ICON_MAP[achievement.icon] ?? Trophy;
                return (
                  <motion.div
                    key={achievement.id}
                    className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-lg p-3 flex items-center gap-2"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Icon className="size-5 text-gold" />
                    <span className="text-xs font-medium truncate">{achievement.title}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {!progLoading && xpProgress && (
          <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Level {creator?.level}</h3>
              <span className="text-xs text-muted-foreground">{xpProgress.current}/{xpProgress.needed} XP</span>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${xpProgress.pct}%` }} />
            </div>
            {skills.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-muted-foreground">Skill Tree</p>
                {skills.slice(0, 4).map((skill) => (
                  <div key={skill.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{skill.name}</span>
                      <span>Lv.{skill.level ?? 0}/{skill.max_level}</span>
                    </div>
                    <div className="h-1 bg-background/50 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${((skill.level ?? 0) / skill.max_level) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {perks.filter((p) => p.unlocked).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {perks.filter((p) => p.unlocked).map((p) => (
                  <span key={p.id} className="text-xs px-2 py-0.5 bg-gold/20 text-gold rounded-full">{p.name}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {dna && dna.strengths.length > 0 && (
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Dna className="size-4 text-primary" />
              Creator DNA
            </h3>
            <p className="text-xs text-green-500 mb-1">Strengths: {dna.strengths.join(", ")}</p>
            {dna.weaknesses.length > 0 && <p className="text-xs text-accent">Weaknesses: {dna.weaknesses.join(", ")}</p>}
            {dna.hidden_trait && <p className="text-xs text-muted-foreground mt-1">Hidden trait: {dna.hidden_trait}</p>}
          </div>
        )}

        {goals.length > 0 && (
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Target className="size-4 text-secondary" />
              AI Goals
            </h3>
            {goals.map((g, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{g.label}</span>
                  <span>{Math.min(g.progress, g.target)}/{g.target}</span>
                </div>
                <div className="h-1 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(100, (g.progress / g.target) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {agency && (agency.creators?.length ?? 0) > 0 && (
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Building2 className="size-4 text-gold" />
              {agency.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Level {agency.level} · Shared energy {agency.shared_energy_pool} · Rep {agency.reputation}
            </p>
            {(agency.creators?.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-2">
                {agency.creators?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => switchCreator(c.id)}
                    disabled={switchingCreator || c.id === creator.id}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      c.id === creator.id
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-glass-border hover:border-primary/50"
                    }`}
                  >
                    {c.name}{c.is_primary ? " ★" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {myValuation && (
          <div className="bg-glass-bg border border-gold/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ShoppingBag className="size-4 text-gold" />
              Market Valuation
            </h3>
            <p className="text-lg font-bold text-gold">{formatCurrency(Number(myValuation.market_value))}</p>
            <p className="text-xs text-muted-foreground capitalize mb-3">Trend: {myValuation.trend_direction}</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="Asking price"
                className="flex-1 text-xs bg-background/50 border border-glass-border rounded-lg px-3 py-2"
              />
              <button onClick={handleListForSale} className="text-xs px-3 py-2 bg-gold/20 border border-gold/40 rounded-lg text-gold font-semibold">
                List for Sale
              </button>
            </div>
          </div>
        )}

        {(pendingRelationships.length > 0 || activeRelationships.length > 0) && (
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Heart className="size-4 text-accent" />
              Relationships
            </h3>
            {pendingRelationships.map((rel) => (
              <div key={rel.id} className="mb-3 pb-3 border-b border-glass-border last:border-0">
                <p className="text-xs font-medium capitalize">{rel.relationship_type} request</p>
                <p className="text-xs text-muted-foreground mb-2">{rel.story_summary}</p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const data = await respondRelationship(rel.id, true);
                      if ("error" in data && data.error) toast.error(data.error);
                      else toast.success("Accepted!");
                    }}
                    className="text-xs px-2 py-1 bg-primary/20 rounded-lg"
                  >
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      const data = await respondRelationship(rel.id, false);
                      if ("error" in data && data.error) toast.error(data.error);
                      else toast.success("Declined");
                    }}
                    className="text-xs px-2 py-1 bg-accent/20 rounded-lg"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {activeRelationships.slice(0, 5).map((rel) => {
              const other = rel.creator_id === creator.id ? rel.related_creator : rel.creator;
              return (
                <div key={rel.id} className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-xs font-medium">{other?.name ?? "Creator"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{rel.relationship_type} · Str {rel.strength}</p>
                  </div>
                  {rel.relationship_type !== "ex_partner" && (
                    <button
                      onClick={async () => {
                        const data = await endRelationship(rel.id);
                        if ("error" in data && data.error) toast.error(data.error);
                        else toast.success("headline" in data && data.headline ? data.headline : "Relationship ended");
                      }}
                      className="text-xs text-accent"
                    >
                      End
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {followerData.length > 0 && (
          <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Follower Growth</h3>
              {growthPct !== 0 && (
                <span className={`ml-auto text-xs ${growthPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {growthPct >= 0 ? "↑" : "↓"} {Math.abs(growthPct)}% period
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={followerData}>
                <defs>
                  <linearGradient id="followerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="followers" stroke="#8b5cf6" strokeWidth={2} fill="url(#followerGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {revenueData.length > 0 && (
          <div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="size-4 text-gold" />
              <h3 className="text-sm font-semibold">Revenue</h3>
              <span className="ml-auto text-xs text-gold">{formatCurrency(Number(creator.monthly_revenue))}/mo</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={revenueData}>
                <Line type="monotone" dataKey="revenue" stroke="#fbbf24" strokeWidth={2} dot={{ fill: "#fbbf24", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    isActive ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-glass-bg border border-glass-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="size-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {filteredContent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No content in this category yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredContent.map((item, index) => (
                <motion.div
                  key={item.id}
                  className={`relative aspect-square rounded-lg bg-gradient-to-br ${item.thumbnail_gradient ?? "from-primary/40 to-accent/40"} overflow-hidden group cursor-pointer`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity space-y-1">
                      <div className="flex items-center justify-center gap-1 text-white text-xs">
                        <Eye className="size-3" />
                        <span>{formatNumber(item.views)}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-white text-xs">
                        <Heart className="size-3" />
                        <span>{formatNumber(item.likes)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Video className="size-4 text-white drop-shadow-lg" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
