"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Shield, Flame, Trophy, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost, ApiClientError } from "@/lib/api/client";

interface AdminData {
  stats: { users: number; creators: number };
  trends: { id: string; title: string; popularity: number; participant_count: number }[];
  season: { name: string; season_number: number } | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiGet<AdminData>("/api/admin");
      setData(json);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 403) {
        router.push("/home");
        return;
      }
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      await apiPost("/api/admin", { action, ...extra });
      toast.success("Action completed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Hidden management panel</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold">{data?.stats.users ?? 0}</p>
          </div>
          <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total Creators</p>
            <p className="text-3xl font-bold">{data?.stats.creators ?? 0}</p>
          </div>
        </div>

        <div className="bg-glass-bg border border-glass-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Season</p>
          <p className="font-semibold">{data?.season?.name ?? "None"}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runAction("create_trend")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-white font-semibold disabled:opacity-50"
          >
            {actionLoading === "create_trend" ? <Loader2 className="size-4 animate-spin" /> : <Flame className="size-4" />}
            AI Generate Trend
          </button>
          <button
            onClick={() => runAction("refresh_rankings")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-4 py-2 border border-glass-border rounded-lg font-semibold disabled:opacity-50"
          >
            {actionLoading === "refresh_rankings" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh Rankings
          </button>
          <button
            onClick={() => runAction("create_season")}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-4 py-2 border border-glass-border rounded-lg font-semibold disabled:opacity-50"
          >
            {actionLoading === "create_season" ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
            New Season
          </button>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Recent Trends</h2>
          <div className="space-y-2">
            {(data?.trends ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-glass-bg border border-glass-border rounded-lg p-3">
                <span>{t.title}</span>
                <span className="text-sm text-muted-foreground">{t.participant_count} participants · {t.popularity}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
