import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatorPersonality } from "@/lib/types/phase2";

type Supabase = SupabaseClient;

const GOAL_TEMPLATES = [
  { type: "followers", label: "Reach {target} followers", baseTarget: 10000 },
  { type: "viral", label: "Score a viral hit (80+ virality)", baseTarget: 80 },
  { type: "wealth", label: "Accumulate ${target} net worth", baseTarget: 100000 },
  { type: "influence", label: "Hit {target} influence score", baseTarget: 50 },
  { type: "award", label: "Win an industry award", baseTarget: 1 },
];

export function generateInitialPersonality(niche: string, personalityText: string): Omit<CreatorPersonality, "creator_id"> {
  const goals = GOAL_TEMPLATES.slice(0, 3).map((g, i) => ({
    type: g.type,
    target: g.baseTarget * (i + 1),
    progress: 0,
    label: g.label.replace("{target}", String(g.baseTarget * (i + 1))),
  }));

  const styles = ["aggressive", "balanced", "cautious", "creative"];
  const decision_style = styles[Math.floor(Math.random() * styles.length)];

  const preferences: Record<string, unknown> = {
    content_types: niche === "gamer" ? ["gaming", "livestream"] : ["video", "short"],
    collaboration: Math.random() > 0.5,
    risk_tolerance: personalityText.toLowerCase().includes("bold") ? 75 : 50,
    favorite_trends: [],
  };

  return {
    goals,
    memory: [{ event: "Career started", sentiment: "positive", at: new Date().toISOString() }],
    preferences,
    decision_style,
    risk_tolerance: (preferences.risk_tolerance as number) ?? 50,
  };
}

export async function createCreatorPersonality(
  supabase: Supabase,
  creatorId: string,
  niche: string,
  personalityText: string
) {
  const personality = generateInitialPersonality(niche, personalityText);
  await supabase.from("creator_personality").insert({ creator_id: creatorId, ...personality });
  return personality;
}

export async function getCreatorPersonality(supabase: Supabase, creatorId: string): Promise<CreatorPersonality | null> {
  const { data } = await supabase.from("creator_personality").select("*").eq("creator_id", creatorId).maybeSingle();
  return data as CreatorPersonality | null;
}

export async function appendPersonalityMemory(
  supabase: Supabase,
  creatorId: string,
  entry: { event: string; sentiment: string }
) {
  const { data } = await supabase.from("creator_personality").select("memory").eq("creator_id", creatorId).single();
  if (!data) return;

  const memory = (data.memory as CreatorPersonality["memory"]) ?? [];
  memory.unshift({ ...entry, at: new Date().toISOString() });
  if (memory.length > 20) memory.pop();

  await supabase.from("creator_personality").update({ memory, updated_at: new Date().toISOString() }).eq("creator_id", creatorId);
}

export async function updatePersonalityGoals(supabase: Supabase, creatorId: string, creator: Record<string, unknown>) {
  const { data } = await supabase.from("creator_personality").select("goals").eq("creator_id", creatorId).single();
  if (!data) return;

  const goals = (data.goals as CreatorPersonality["goals"]).map((g) => {
    let progress = g.progress;
    if (g.type === "followers") progress = Number(creator.followers);
    if (g.type === "influence") progress = Number(creator.influence);
    if (g.type === "wealth") progress = Number(creator.net_worth);
    return { ...g, progress: Math.min(g.target, progress) };
  });

  await supabase.from("creator_personality").update({ goals }).eq("creator_id", creatorId);
}

export async function runAutonomousDecision(supabase: Supabase, creatorId: string) {
  const { data: creator } = await supabase.from("creators").select("*").eq("id", creatorId).single();
  const personality = await getCreatorPersonality(supabase, creatorId);
  if (!creator || !personality) return null;

  const { generateCreatorDecision } = await import("./ai");
  const situations = [
    { situation: "Should I post content today or rest?", options: ["Post content", "Rest and recharge", "Go live instead"] },
    { situation: "A rival just surpassed my follower count", options: ["Challenge them to a battle", "Ignore and focus on content", "Collaborate with them"] },
    { situation: "A controversial trend is blowing up", options: ["Join the trend", "Stay away", "Create counter-content"] },
  ];

  const pick = situations[Math.floor(Math.random() * situations.length)];
  try {
    const decision = await generateCreatorDecision({ creator: creator as never, ...pick });
    await appendPersonalityMemory(supabase, creatorId, {
      event: `Decision: ${decision.choice} — ${decision.reasoning}`,
      sentiment: "neutral",
    });
    await supabase
      .from("creator_personality")
      .update({ last_decision_at: new Date().toISOString() })
      .eq("creator_id", creatorId);

    return decision;
  } catch {
    return null;
  }
}
