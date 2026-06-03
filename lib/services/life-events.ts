import type { SupabaseClient } from "@supabase/supabase-js";
import type { Creator } from "@/lib/types/database";
import type { LifeEvent } from "@/lib/types/phase2";
import { generateCreatorDecision } from "./ai";

type Supabase = SupabaseClient;

const EVENT_TEMPLATES: Record<
  string,
  { title: string; description: string; choices: LifeEvent["choices"] }
> = {
  viral_moment: {
    title: "Unexpected Viral Moment",
    description: "A clip from your creator is spreading faster than expected. How do you capitalize?",
    choices: [
      { id: "double_down", label: "Double down — post more similar content", effects: { followers: 5000, energy: -15 } },
      { id: "ride_wave", label: "Ride the wave — go live now", effects: { followers: 8000, reputation: 0.2 } },
      { id: "stay_calm", label: "Stay calm — quality over quantity", effects: { reputation: 0.5, followers: 2000 } },
    ],
  },
  scandal: {
    title: "Scandal Breaking",
    description: "Old content resurfaced and fans are divided. Your manager needs a strategy.",
    choices: [
      { id: "apologize", label: "Public apology video", effects: { reputation: 0.3, followers: -3000 } },
      { id: "ignore", label: "Ignore and keep posting", effects: { reputation: -0.5, followers: 1000 } },
      { id: "address", label: "Address it in a podcast", effects: { reputation: 0.1, influence: 5 } },
    ],
  },
  burnout: {
    title: "Creator Burnout Warning",
    description: "Energy is critically low. Pushing through could backfire.",
    choices: [
      { id: "rest", label: "Take a 3-day break", effects: { energy: 40, followers: -500 } },
      { id: "light", label: "Light content only", effects: { energy: 20, reputation: 0.1 } },
      { id: "push", label: "Push through anyway", effects: { energy: -20, reputation: -0.3, followers: 2000 } },
    ],
  },
  award_nomination: {
    title: "Award Nomination!",
    description: "Your creator has been nominated for a major industry award.",
    choices: [
      { id: "campaign", label: "Launch fan campaign", effects: { influence: 10, followers: 3000, energy: -10 } },
      { id: "humble", label: "Stay humble — thank fans", effects: { reputation: 0.4, influence: 5 } },
    ],
  },
  sponsorship_offer: {
    title: "Exclusive Brand Deal",
    description: "A major brand wants an exclusive partnership. High reward, high visibility.",
    choices: [
      { id: "accept", label: "Accept the deal", effects: { revenue: 50000, reputation: 0.2 } },
      { id: "negotiate", label: "Negotiate higher terms", effects: { revenue: 75000, reputation: -0.1 } },
      { id: "decline", label: "Decline — stay independent", effects: { reputation: 0.5, influence: 3 } },
    ],
  },
  fan_controversy: {
    title: "Fan Controversy",
    description: "A segment of fans is upset about recent content direction.",
    choices: [
      { id: "poll", label: "Run a fan poll", effects: { engagement: 5, followers: 1500 } },
      { id: "revert", label: "Revert to classic style", effects: { followers: 500, reputation: 0.2 } },
      { id: "stand_firm", label: "Stand firm on vision", effects: { influence: 8, followers: -1000 } },
    ],
  },
};

const EVENT_WEIGHTS = [
  { type: "viral_moment", weight: 20 },
  { type: "scandal", weight: 8 },
  { type: "burnout", weight: 15 },
  { type: "award_nomination", weight: 10 },
  { type: "sponsorship_offer", weight: 12 },
  { type: "fan_controversy", weight: 10 },
];

function pickEventType(creator: Creator): string {
  if (creator.energy < 25) return "burnout";
  const total = EVENT_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EVENT_WEIGHTS) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return "viral_moment";
}

export async function maybeSpawnLifeEvent(
  supabase: Supabase,
  creator: Creator,
  userId: string
): Promise<LifeEvent | null> {
  const { count } = await supabase
    .from("life_events")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creator.id)
    .eq("is_resolved", false);

  if ((count ?? 0) >= 2) return null;
  if (Math.random() > 0.35) return null;

  const eventType = pickEventType(creator);
  const template = EVENT_TEMPLATES[eventType];
  if (!template) return null;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const { data, error } = await supabase
    .from("life_events")
    .insert({
      creator_id: creator.id,
      user_id: userId,
      event_type: eventType,
      title: template.title,
      description: template.description,
      severity: 30 + Math.floor(Math.random() * 50),
      choices: template.choices,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) return null;

  await supabase.from("notifications").insert({
    user_id: userId,
    creator_id: creator.id,
    type: "life_event",
    title: template.title,
    message: template.description.slice(0, 120),
    data: { eventId: data.id, eventType },
  });

  return data as LifeEvent;
}

export async function resolveLifeEvent(
  supabase: Supabase,
  eventId: string,
  userId: string,
  choiceId: string
) {
  const { data: event } = await supabase
    .from("life_events")
    .select("*")
    .eq("id", eventId)
    .eq("user_id", userId)
    .single();

  if (!event || event.is_resolved) throw new Error("Event not found or already resolved");

  const choices = event.choices as LifeEvent["choices"];
  const choice = choices.find((c) => c.id === choiceId);
  if (!choice) throw new Error("Invalid choice");

  const { data: creator } = await supabase.from("creators").select("*").eq("id", event.creator_id).single();
  if (!creator) throw new Error("Creator not found");

  const updates: Record<string, unknown> = {};
  const effects = choice.effects;
  if (effects.followers) updates.followers = Math.max(0, creator.followers + effects.followers);
  if (effects.energy) updates.energy = Math.min(100, Math.max(0, creator.energy + effects.energy));
  if (effects.reputation) updates.reputation = Math.min(5, Math.max(0, Number(creator.reputation) + effects.reputation));
  if (effects.revenue) updates.net_worth = Number(creator.net_worth) + effects.revenue;
  if (effects.influence) updates.influence = Math.min(100, creator.influence + effects.influence);

  if (Object.keys(updates).length > 0) {
    await supabase.from("creators").update(updates).eq("id", event.creator_id);
  }

  await supabase
    .from("life_events")
    .update({
      is_resolved: true,
      selected_choice: choiceId,
      effects: effects,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  const { appendPersonalityMemory } = await import("./personality");
  await appendPersonalityMemory(supabase, event.creator_id, {
    event: `${event.title}: chose ${choice.label}`,
    sentiment: effects.reputation && effects.reputation < 0 ? "negative" : "positive",
  });

  return { event, effects: choice.effects };
}

export async function getActiveLifeEvents(supabase: Supabase, userId: string) {
  const { data } = await supabase
    .from("life_events")
    .select("*")
    .eq("user_id", userId)
    .eq("is_resolved", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []) as LifeEvent[];
}

export async function aiResolveEventChoice(
  supabase: Supabase,
  creator: Creator,
  event: LifeEvent
): Promise<string> {
  const choiceLabels = event.choices.map((c) => c.label);
  try {
    const decision = await generateCreatorDecision({
      creator,
      situation: `${event.title}: ${event.description}`,
      options: choiceLabels,
    });
    const match = event.choices.find((c) => c.label === decision.choice);
    return match?.id ?? event.choices[0].id;
  } catch {
    return event.choices[Math.floor(Math.random() * event.choices.length)].id;
  }
}
