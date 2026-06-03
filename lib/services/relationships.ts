import type { SupabaseClient } from "@supabase/supabase-js";
import type { CelebrityRelationship, CelebrityRelationshipType, RelationshipEvent } from "@/lib/types/phase3";
import { publishNews } from "./news";

type Supabase = SupabaseClient;

const REQUESTABLE_TYPES: CelebrityRelationshipType[] = ["friend", "dating", "collaborator", "feud"];

async function notifyUser(
  supabase: Supabase,
  userId: string,
  input: { creatorId?: string; type: string; title: string; message: string; data?: Record<string, unknown> }
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    creator_id: input.creatorId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data ?? {},
  });
}

async function logRelationshipEvent(
  supabase: Supabase,
  relationshipId: string,
  eventType: string,
  headline: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from("relationship_events").insert({
    relationship_id: relationshipId,
    event_type: eventType,
    headline,
    metadata,
  });
}

async function publishRelationshipNews(
  supabase: Supabase,
  headline: string,
  summary: string,
  creatorAId: string,
  creatorBId: string,
  controversyScore = 40
) {
  await publishNews(supabase, {
    headline,
    summary,
    category: "drama",
    relatedCreatorId: creatorAId,
    controversyScore,
    isTrending: controversyScore >= 50,
  });
}

export async function getCreatorRelationships(
  supabase: Supabase,
  creatorId: string,
  status?: "pending" | "active" | "ended"
): Promise<CelebrityRelationship[]> {
  let query = supabase
    .from("creator_relationships")
    .select("*")
    .or(`creator_id.eq.${creatorId},related_creator_id.eq.${creatorId}`)
    .in("relationship_type", ["friend", "dating", "collaborator", "feud", "ex_partner"]);

  if (status) query = query.eq("status", status);

  const { data: rows } = await query.order("created_at", { ascending: false });
  if (!rows?.length) return [];

  const relatedIds = [...new Set(rows.flatMap((r) => [r.creator_id, r.related_creator_id]))];
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, avatar_gradient")
    .in("id", relatedIds);

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);

  return rows.map((r) => ({
    ...r,
    creator: creatorMap.get(r.creator_id),
    related_creator: creatorMap.get(r.related_creator_id),
  })) as CelebrityRelationship[];
}

export async function getRelationshipEvents(supabase: Supabase, limit = 10): Promise<RelationshipEvent[]> {
  const { data } = await supabase
    .from("relationship_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function requestRelationship(
  supabase: Supabase,
  fromCreatorId: string,
  toCreatorId: string,
  type: CelebrityRelationshipType
) {
  if (fromCreatorId === toCreatorId) throw new Error("Cannot relate to yourself");
  if (!REQUESTABLE_TYPES.includes(type)) throw new Error("Invalid relationship type");

  const { data: existing } = await supabase
    .from("creator_relationships")
    .select("id, status")
    .eq("creator_id", fromCreatorId)
    .eq("related_creator_id", toCreatorId)
    .eq("relationship_type", type)
    .maybeSingle();

  if (existing?.status === "active" || existing?.status === "pending") {
    throw new Error("Relationship already exists");
  }

  const [{ data: fromCreator }, { data: toCreator }] = await Promise.all([
    supabase.from("creators").select("name, user_id").eq("id", fromCreatorId).single(),
    supabase.from("creators").select("name, user_id").eq("id", toCreatorId).single(),
  ]);

  if (!fromCreator || !toCreator) throw new Error("Creator not found");

  const storySummary =
    type === "dating"
      ? `${fromCreator.name} and ${toCreator.name} are rumored to be dating`
      : type === "feud"
      ? `${fromCreator.name} started a feud with ${toCreator.name}`
      : type === "collaborator"
      ? `${fromCreator.name} wants to collab with ${toCreator.name}`
      : `${fromCreator.name} sent a friend request to ${toCreator.name}`;

  const { data: rel, error } = await supabase
    .from("creator_relationships")
    .insert({
      creator_id: fromCreatorId,
      related_creator_id: toCreatorId,
      relationship_type: type,
      status: type === "feud" ? "active" : "pending",
      strength: type === "feud" ? 30 : 50,
      initiated_by: fromCreatorId,
      story_summary: storySummary,
      is_public: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logRelationshipEvent(supabase, rel.id, "requested", storySummary, { type });

  if (type === "feud") {
    await publishRelationshipNews(
      supabase,
      `FEUD ALERT: ${fromCreator.name} vs ${toCreator.name}`,
      storySummary,
      fromCreatorId,
      toCreatorId,
      70
    );
  } else if (toCreator.user_id) {
    await notifyUser(supabase, toCreator.user_id, {
      creatorId: toCreatorId,
      type: "relationship_request",
      title: `${type} request`,
      message: storySummary,
      data: { relationshipId: rel.id, type },
    });
  }

  return rel;
}

export async function respondToRelationship(
  supabase: Supabase,
  relationshipId: string,
  responderCreatorId: string,
  accept: boolean
) {
  const { data: rel } = await supabase.from("creator_relationships").select("*").eq("id", relationshipId).single();
  if (!rel) throw new Error("Relationship not found");
  if (rel.related_creator_id !== responderCreatorId && rel.creator_id !== responderCreatorId) {
    throw new Error("Not authorized");
  }
  if (rel.status !== "pending") throw new Error("Request already resolved");

  const initiatorId = rel.initiated_by ?? rel.creator_id;
  const otherId = initiatorId === rel.creator_id ? rel.related_creator_id : rel.creator_id;
  if (responderCreatorId !== otherId) throw new Error("Only the recipient can respond");

  const status = accept ? "active" : "declined";
  await supabase.from("creator_relationships").update({ status }).eq("id", relationshipId);

  const [{ data: a }, { data: b }] = await Promise.all([
    supabase.from("creators").select("name, user_id").eq("id", rel.creator_id).single(),
    supabase.from("creators").select("name, user_id").eq("id", rel.related_creator_id).single(),
  ]);

  const headline = accept
    ? `${a?.name} and ${b?.name} are now ${rel.relationship_type}s!`
    : `${b?.name} declined ${rel.relationship_type} request from ${a?.name}`;

  await logRelationshipEvent(supabase, relationshipId, accept ? "accepted" : "declined", headline);

  if (accept) {
    await publishRelationshipNews(
      supabase,
      headline,
      headline,
      rel.creator_id,
      rel.related_creator_id,
      rel.relationship_type === "dating" ? 65 : 35
    );

    const initiatorUserId = a?.user_id === rel.creator_id ? a?.user_id : b?.user_id;
    if (initiatorUserId) {
      await notifyUser(supabase, initiatorUserId, {
        creatorId: initiatorId,
        type: "relationship_update",
        title: "Relationship accepted!",
        message: headline,
        data: { relationshipId },
      });
    }
  }

  return { status };
}

export async function endRelationship(supabase: Supabase, relationshipId: string, actorCreatorId: string) {
  const { data: rel } = await supabase.from("creator_relationships").select("*").eq("id", relationshipId).single();
  if (!rel) throw new Error("Relationship not found");
  if (rel.creator_id !== actorCreatorId && rel.related_creator_id !== actorCreatorId) {
    throw new Error("Not authorized");
  }
  if (rel.status !== "active") throw new Error("Relationship not active");

  const endedAt = new Date().toISOString();
  await supabase
    .from("creator_relationships")
    .update({ status: "ended", ended_at: endedAt })
    .eq("id", relationshipId);

  const [{ data: a }, { data: b }] = await Promise.all([
    supabase.from("creators").select("name, user_id").eq("id", rel.creator_id).single(),
    supabase.from("creators").select("name, user_id").eq("id", rel.related_creator_id).single(),
  ]);

  let headline = `${a?.name} and ${b?.name} ended their ${rel.relationship_type} relationship`;
  let eventType = "ended";

  if (rel.relationship_type === "dating") {
    headline = `BREAKUP: ${a?.name} and ${b?.name} split up`;
    eventType = "breakup";

    await supabase.from("creator_relationships").insert({
      creator_id: rel.creator_id,
      related_creator_id: rel.related_creator_id,
      relationship_type: "ex_partner",
      status: "active",
      strength: 40,
      story_summary: `${a?.name} and ${b?.name} are exes now`,
      is_public: true,
    });

    await publishRelationshipNews(supabase, headline, headline, rel.creator_id, rel.related_creator_id, 75);
  } else if (rel.relationship_type === "collaborator") {
    headline = `${a?.name} and ${b?.name} ended their collaboration`;
    await publishRelationshipNews(supabase, headline, headline, rel.creator_id, rel.related_creator_id, 30);
  }

  await logRelationshipEvent(supabase, relationshipId, eventType, headline);

  const otherUserId = actorCreatorId === rel.creator_id ? b?.user_id : a?.user_id;
  if (otherUserId) {
    await notifyUser(supabase, otherUserId, {
      creatorId: actorCreatorId === rel.creator_id ? rel.related_creator_id : rel.creator_id,
      type: "relationship_update",
      title: "Relationship ended",
      message: headline,
      data: { relationshipId },
    });
  }

  return { ended: true, headline };
}

export async function startCollaboration(
  supabase: Supabase,
  creatorAId: string,
  creatorBId: string
) {
  return requestRelationship(supabase, creatorAId, creatorBId, "collaborator");
}

export async function generateAutoRelationshipStories(supabase: Supabase) {
  const { data: creators } = await supabase
    .from("creators")
    .select("id, name, followers, influence")
    .order("followers", { ascending: false })
    .limit(30);

  if (!creators || creators.length < 2) return;

  const roll = Math.random();
  const a = creators[Math.floor(Math.random() * creators.length)];
  let b = creators[Math.floor(Math.random() * creators.length)];
  while (b.id === a.id) b = creators[Math.floor(Math.random() * creators.length)];

  if (roll < 0.25) {
    await requestRelationship(supabase, a.id, b.id, "collaborator").catch(() => {});
  } else if (roll < 0.4) {
    await requestRelationship(supabase, a.id, b.id, "friend").catch(() => {});
  } else if (roll < 0.55 && a.followers > 50000 && b.followers > 50000) {
    await requestRelationship(supabase, a.id, b.id, "dating").catch(() => {});
  } else if (roll < 0.7) {
    await requestRelationship(supabase, a.id, b.id, "feud").catch(() => {});
  }
}

export async function getPublicRelationshipDrama(supabase: Supabase, limit = 5) {
  const events = await getRelationshipEvents(supabase, limit);
  return events;
}
