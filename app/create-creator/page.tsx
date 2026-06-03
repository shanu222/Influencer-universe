"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { NICHE_OPTIONS, STAT_KEYS, type CreatorGender, type CreatorNiche, type StatKey } from "@/lib/types/database";
import { apiPost } from "@/lib/api/client";

const TOTAL_STAT_POINTS = 500;

export default function CreateCreatorPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    gender: "non_binary" as CreatorGender,
    age: 22,
    nationality: "United States",
    niche: "streamer" as CreatorNiche,
    personality: "",
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 50])) as Record<StatKey, number>,
  });

  const statTotal = Object.values(form.stats).reduce((a, b) => a + b, 0);
  const remaining = TOTAL_STAT_POINTS - statTotal;

  const updateStat = (key: StatKey, value: number) => {
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: value } }));
  };

  const handleSubmit = async () => {
    if (remaining !== 0) {
      toast.error(`Allocate exactly ${TOTAL_STAT_POINTS} stat points (${remaining} remaining)`);
      return;
    }
    if (form.personality.length < 10) {
      toast.error("Describe your creator's personality (min 10 characters)");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/creators", form);
      toast.success(`${form.name} is ready for fame!`);
      router.push("/home");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create creator");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="size-full overflow-y-auto bg-gradient-to-br from-[#0a0a12] via-[#1a0a2e] to-[#0a0a12] p-6">
      <div className="max-w-lg mx-auto">
        <motion.div className="flex items-center gap-3 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Sparkles className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Create Your AI Creator</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 2</p>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.div className="space-y-4 bg-glass-bg border border-glass-border rounded-2xl p-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div>
              <label className="text-sm text-muted-foreground">Creator Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 px-4 py-3 rounded-xl bg-input-background border border-glass-border outline-none focus:border-primary"
                placeholder="Nova Star"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as CreatorGender })}
                  className="w-full mt-1 px-4 py-3 rounded-xl bg-input-background border border-glass-border"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Age</label>
                <input
                  type="number"
                  min={13}
                  max={80}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: parseInt(e.target.value, 10) })}
                  className="w-full mt-1 px-4 py-3 rounded-xl bg-input-background border border-glass-border"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Nationality</label>
              <input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="w-full mt-1 px-4 py-3 rounded-xl bg-input-background border border-glass-border"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Niche</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {NICHE_OPTIONS.map((n) => (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() => setForm({ ...form, niche: n.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.niche === n.value ? "bg-primary text-white" : "bg-input-background border border-glass-border"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Personality</label>
              <textarea
                value={form.personality}
                onChange={(e) => setForm({ ...form, personality: e.target.value })}
                rows={3}
                className="w-full mt-1 px-4 py-3 rounded-xl bg-input-background border border-glass-border resize-none"
                placeholder="Bold, charismatic, loves drama and viral moments..."
              />
            </div>
            <button onClick={() => setStep(2)} disabled={!form.name} className="w-full py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-semibold text-white disabled:opacity-50">
              Next: Assign Stats
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div className="space-y-4 bg-glass-bg border border-glass-border rounded-2xl p-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                <span className="font-semibold">Creator Stats</span>
              </div>
              <span className={`text-sm font-bold ${remaining === 0 ? "text-green-500" : "text-gold"}`}>
                {remaining} pts left
              </span>
            </div>

            {STAT_KEYS.map((key) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <label className="text-sm capitalize">{key}</label>
                  <span className="text-sm font-semibold">{form.stats[key]}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={form.stats[key]}
                  onChange={(e) => updateStat(key, parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
              </div>
            ))}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-glass-border rounded-xl font-semibold">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || remaining !== 0}
                className="flex-1 py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Creating..." : "Launch Creator"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
