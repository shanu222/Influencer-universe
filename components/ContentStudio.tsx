"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import {
  Video,
  Music,
  Radio,
  Mic,
  Flame,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Eye,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCreator } from "@/hooks/useCreator";
import { CONTENT_TYPE_MAP, type ContentType } from "@/lib/types/database";
import { formatNumber } from "@/lib/utils/format";
import { apiPost } from "@/lib/api/client";

const GENRES = ["pop", "hip_hop", "rap", "r_and_b", "rock", "electronic", "country", "indie"];

export default function ContentStudio() {
  const navigate = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "videos";
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [generating, setGenerating] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("pop");
  const [suggestions, setSuggestions] = useState<
    { title: string; description: string; category: string; viralChance: number; audienceMatch: number }[]
  >([]);
  const [qualityMetrics, setQualityMetrics] = useState({ quality: 0, viral: 0, engagement: 0 });
  const { creator, stats, previewMetrics, refresh } = useCreator();

  const contentTypes = [
    { id: "videos", icon: Video, label: "Videos", color: "from-primary to-purple-600", type: "video" as ContentType },
    { id: "music", icon: Music, label: "Music", color: "from-accent to-pink-600", type: "music" as ContentType },
    { id: "livestreams", icon: Radio, label: "Livestreams", color: "from-secondary to-blue-600", type: "livestream" as ContentType },
    { id: "podcasts", icon: Mic, label: "Podcasts", color: "from-gold to-yellow-600", type: "podcast" as ContentType },
    { id: "challenges", icon: Flame, label: "Challenges", color: "from-orange-500 to-red-600", type: "short" as ContentType },
  ];

  useEffect(() => {
    if (previewMetrics) {
      setQualityMetrics(previewMetrics);
    }
  }, [previewMetrics]);

  useEffect(() => {
    if (!creator) return;
    const contentType = CONTENT_TYPE_MAP[selectedTab] ?? "video";
    apiPost<{ suggestions: typeof suggestions }>("/api/ai/suggestions", {
      creatorId: creator.id,
      contentType,
    })
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [creator, selectedTab]);

  const createContent = async (type: ContentType, metadata?: { title: string; description: string; category: string; thumbnailPrompt: string }) => {
    if (!creator) return;
    setGenerating(true);
    try {
      const data = await apiPost<{ content: { title: string } }>("/api/content", { type, metadata });
      toast.success(`Created: ${data.content.title}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create content");
    } finally {
      setGenerating(false);
    }
  };

  const recordSong = async () => {
    if (!creator) return;
    setGenerating(true);
    try {
      const data = await apiPost<{ song: { song_name: string } }>("/api/songs", { genre: selectedGenre });
      toast.success(`Released: ${data.song.song_name}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record song");
    } finally {
      setGenerating(false);
    }
  };

  const activeType = contentTypes.find((t) => t.id === selectedTab);

  return (
    <div className="size-full flex flex-col bg-background overflow-hidden">
      <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 px-6 py-4 border-b border-glass-border">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate.push("/home")}
            className="size-10 rounded-full bg-glass-bg backdrop-blur-xl border border-glass-border flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-2xl font-bold">Content Studio</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
          {contentTypes.map((type) => {
            const isActive = selectedTab === type.id;
            return (
              <button key={type.id} onClick={() => setSelectedTab(type.id)} className="relative flex-shrink-0">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${type.color} text-white`
                      : "bg-glass-bg backdrop-blur-xl border border-glass-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <type.icon className="size-4" />
                  <span className="text-sm font-semibold whitespace-nowrap">{type.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <motion.div className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary rounded-2xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="size-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI-Powered Creation</h3>
                <p className="text-sm text-white/80">Energy: {creator?.energy ?? 0}% · Generates titles & metadata only (v1)</p>
              </div>
            </div>

            {selectedTab === "music" ? (
              <div className="space-y-3">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-white/20 text-white border border-white/30"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g} className="text-black">
                      {g.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
                <motion.button
                  className="w-full px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={recordSong}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="size-5 animate-spin" /> : null}
                  Record Song
                </motion.button>
              </div>
            ) : (
              <motion.button
                className="w-full mt-4 px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => createContent(activeType?.type ?? "video")}
                disabled={generating}
              >
                {generating ? <Loader2 className="size-5 animate-spin" /> : null}
                Generate {activeType?.label}
              </motion.button>
            )}
          </div>
        </motion.div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Trending Suggestions</h3>
          </div>

          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading AI suggestions...</p>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.title + index}
                  className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex gap-4">
                    <div className="size-24 rounded-lg bg-gradient-to-br from-primary/40 to-accent/40 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1 truncate">{suggestion.title}</h4>
                      <p className="text-xs text-muted-foreground mb-3">{suggestion.category}</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Viral Chance</span>
                            <span className="text-xs font-semibold text-accent">{suggestion.viralChance}%</span>
                          </div>
                          <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-accent to-pink-600 rounded-full" style={{ width: `${suggestion.viralChance}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Audience Match</span>
                            <span className="text-xs font-semibold text-primary">{suggestion.audienceMatch}%</span>
                          </div>
                          <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full" style={{ width: `${suggestion.audienceMatch}%` }} />
                          </div>
                        </div>
                      </div>
                      <motion.button
                        className="w-full px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={generating}
                        onClick={() =>
                          createContent(activeType?.type ?? "video", {
                            title: suggestion.title,
                            description: suggestion.description,
                            category: suggestion.category,
                            thumbnailPrompt: suggestion.title,
                          })
                        }
                      >
                        Create This Content
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <motion.div className="bg-glass-bg backdrop-blur-xl border border-glass-border rounded-xl p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="font-semibold mb-4">Content Quality Prediction</h3>
          <div className="space-y-3">
            {[
              { label: "Content Quality", value: qualityMetrics.quality, icon: Target, color: "from-primary to-accent" },
              { label: "Viral Potential", value: qualityMetrics.viral, icon: TrendingUp, color: "from-secondary to-cyan-600" },
              { label: "Audience Engagement", value: qualityMetrics.engagement, icon: Users, color: "from-accent to-pink-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <span className="text-sm font-semibold">{value}%</span>
                </div>
                <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                  <motion.div className={`h-full bg-gradient-to-r ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
