import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agency } from "@/lib/types/phase2";

type Supabase = SupabaseClient;

export async function createAgencyForUser(supabase: Supabase, userId: string, username: string) {
  const { data: existing } = await supabase.from("users").select("agency_id").eq("id", userId).single();
  if (existing?.agency_id) {
    return getAgency(supabase, existing.agency_id);
  }

  const { data: agency, error } = await supabase
    .from("agencies")
    .insert({
      owner_user_id: userId,
      name: `${username} Agency`,
      tagline: "Building the next generation of stars",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("users").update({ agency_id: agency.id }).eq("id", userId);
  return agency as Agency;
}

export async function addCreatorToAgency(supabase: Supabase, agencyId: string, creatorId: string, isPrimary = false) {
  const { data: agency } = await supabase.from("agencies").select("*").eq("id", agencyId).single();
  if (!agency) throw new Error("Agency not found");

  const { count } = await supabase
    .from("agency_creators")
    .select("*", { count: "exact", head: true })
    .eq("agency_id", agencyId);

  if ((count ?? 0) >= agency.max_creators) throw new Error("Agency at max capacity");

  await supabase.from("agency_creators").insert({
    agency_id: agencyId,
    creator_id: creatorId,
    is_primary: isPrimary,
    slot_order: count ?? 0,
  });

  if (isPrimary) {
    await supabase.from("users").select("id").eq("agency_id", agencyId).single();
  }
}

export async function getAgency(supabase: Supabase, agencyId: string): Promise<Agency | null> {
  const { data: agency } = await supabase.from("agencies").select("*").eq("id", agencyId).single();
  if (!agency) return null;

  const { data: members } = await supabase
    .from("agency_creators")
    .select("creator_id, is_primary, slot_order")
    .eq("agency_id", agencyId)
    .order("slot_order");

  const creatorIds = (members ?? []).map((m) => m.creator_id);
  const { data: creators } = creatorIds.length
    ? await supabase.from("creators").select("id, name, followers, influence, avatar_gradient").in("id", creatorIds)
    : { data: [] };

  const creatorMap = new Map(creators?.map((c) => [c.id, c]) ?? []);

  return {
    ...agency,
    creators: (members ?? []).map((m) => ({
      id: m.creator_id,
      name: creatorMap.get(m.creator_id)?.name ?? "Creator",
      is_primary: m.is_primary,
    })),
  } as Agency;
}

export async function getUserAgency(supabase: Supabase, userId: string) {
  const { data: user } = await supabase.from("users").select("agency_id").eq("id", userId).single();
  if (!user?.agency_id) return null;
  return getAgency(supabase, user.agency_id);
}

export async function switchActiveCreator(supabase: Supabase, userId: string, creatorId: string) {
  const { data: link } = await supabase
    .from("agency_creators")
    .select("agency_id")
    .eq("creator_id", creatorId)
    .single();

  const { data: user } = await supabase.from("users").select("agency_id").eq("id", userId).single();
  if (link?.agency_id !== user?.agency_id) {
    const { data: creator } = await supabase.from("creators").select("user_id").eq("id", creatorId).single();
    if (creator?.user_id !== userId) throw new Error("Creator not in your agency");
  }

  await supabase.from("users").update({ active_creator_id: creatorId }).eq("id", userId);
  return creatorId;
}

export async function updateAgencyRankings(supabase: Supabase, seasonId: string) {
  const { data: agencies } = await supabase.from("agencies").select("id");

  const scores: { agencyId: string; score: number }[] = [];

  for (const agency of agencies ?? []) {
    const { data: members } = await supabase
      .from("agency_creators")
      .select("creator_id")
      .eq("agency_id", agency.id);

    const creatorIds = (members ?? []).map((m) => m.creator_id);
    const { data: creators } = creatorIds.length
      ? await supabase.from("creators").select("followers, influence, net_worth").in("id", creatorIds)
      : { data: [] };

    const score = (creators ?? []).reduce(
      (sum, c) => sum + (c.followers ?? 0) / 1000 + (c.influence ?? 0) + Number(c.net_worth ?? 0) / 10000,
      0
    );

    scores.push({ agencyId: agency.id, score });
  }

  scores.sort((a, b) => b.score - a.score);

  for (let i = 0; i < scores.length; i++) {
    const { data: existing } = await supabase
      .from("agency_rankings")
      .select("rank_position")
      .eq("season_id", seasonId)
      .eq("agency_id", scores[i].agencyId)
      .maybeSingle();

    await supabase.from("agency_rankings").upsert(
      {
        season_id: seasonId,
        agency_id: scores[i].agencyId,
        rank_position: i + 1,
        previous_position: existing?.rank_position ?? null,
        score: scores[i].score,
      },
      { onConflict: "season_id,agency_id" }
    );
  }
}

export async function getAgencyRankings(supabase: Supabase, seasonId: string, limit = 50) {
  const { data: rankings } = await supabase
    .from("agency_rankings")
    .select("agency_id, rank_position, previous_position, score")
    .eq("season_id", seasonId)
    .order("rank_position", { ascending: true })
    .limit(limit);

  if (!rankings?.length) return [];

  const agencyIds = rankings.map((r) => r.agency_id);
  const { data: agencies } = await supabase
    .from("agencies")
    .select("id, name, level, reputation")
    .in("id", agencyIds);

  const agencyMap = new Map(agencies?.map((a) => [a.id, a]) ?? []);

  return rankings.map((r) => ({
    ...r,
    agencies: agencyMap.get(r.agency_id) ?? { name: "Agency", level: 1, reputation: 0 },
  }));
}

export async function consumeAgencyEnergy(supabase: Supabase, agencyId: string, amount: number): Promise<boolean> {
  const { data: agency } = await supabase.from("agencies").select("shared_energy_pool").eq("id", agencyId).single();
  if (!agency || agency.shared_energy_pool < amount) return false;

  await supabase
    .from("agencies")
    .update({ shared_energy_pool: agency.shared_energy_pool - amount })
    .eq("id", agencyId);

  return true;
}

export async function regenerateAgencyEnergy(supabase: Supabase) {
  const { data: agencies } = await supabase.from("agencies").select("id, shared_energy_pool, level");
  for (const a of agencies ?? []) {
    const max = 200 + a.level * 20;
    await supabase
      .from("agencies")
      .update({ shared_energy_pool: Math.min(max, a.shared_energy_pool + 15) })
      .eq("id", a.id);
  }
}
