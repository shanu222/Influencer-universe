export const DNA_TRAITS = [
  "ambitious",
  "rebellious",
  "charismatic",
  "perfectionist",
  "risk_taker",
  "loyal",
  "dramatic",
  "innovative",
  "introverted",
  "controversial",
  "authentic",
  "strategic",
] as const;

export type DnaTrait = (typeof DNA_TRAITS)[number];

export const STRENGTH_POOL = [
  "Viral Instinct",
  "Brand Magnetism",
  "Trend Surfer",
  "Loyal Fanbase",
  "Studio Grinder",
  "Natural Entertainer",
  "Controversy Fuel",
  "Collab King",
  "Algorithm Whisperer",
  "Main Character Energy",
] as const;

export const WEAKNESS_POOL = [
  "Scandal Prone",
  "Burnout Risk",
  "One-Hit Wonder",
  "Niche Locked",
  "Energy Drain",
  "Cancel Culture Target",
  "Perfection Paralysis",
  "Trend Chaser",
  "Ego Clash",
  "Inconsistent Posting",
] as const;

export interface CreatorDna {
  creator_id: string;
  traits: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  growth_modifiers: {
    followers: number;
    revenue: number;
    virality: number;
    energy: number;
  };
  hidden_trait: string | null;
  is_partially_revealed: boolean;
}

export interface LifeEvent {
  id: string;
  creator_id: string;
  event_type: string;
  title: string;
  description: string;
  severity: number;
  choices: { id: string; label: string; effects: Record<string, number> }[];
  effects: Record<string, unknown>;
  selected_choice: string | null;
  is_resolved: boolean;
  expires_at: string;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  category: string;
  related_creator_id: string | null;
  controversy_score: number;
  is_trending: boolean;
  view_count: number;
  published_at: string;
  creator?: { name: string; handle: string; avatar_gradient: string | null };
}

export interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  type: string;
  status: string;
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  started_at: string | null;
  ends_at: string | null;
  challenger?: { name: string; avatar_gradient: string | null };
  opponent?: { name: string; avatar_gradient: string | null };
}

export interface HouseWar {
  id: string;
  week_number: number;
  house_a_id: string;
  house_b_id: string;
  house_a_score: number;
  house_b_score: number;
  winner_house_id: string | null;
  reward_pool: number;
  theme: string | null;
  status: string;
  ends_at: string;
  house_a?: { name: string; fame_score: number };
  house_b?: { name: string; fame_score: number };
}

export interface Agency {
  id: string;
  name: string;
  level: number;
  xp: number;
  shared_energy_pool: number;
  shared_funds: number;
  reputation: number;
  max_creators: number;
  creators?: { id: string; name: string; is_primary: boolean }[];
}

export interface AgencyRankingEntry {
  agency_id: string;
  rank_position: number;
  score: number;
  agencies: { name: string; level: number; reputation: number };
}

export interface HouseLeaderboardEntry {
  id: string;
  name: string;
  house_rank: number;
  fame_score: number;
}

export interface SkillDefinition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  branch: string;
  max_level: number;
  level?: number;
  xp_in_skill?: number;
}

export interface PerkDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  branch: string;
  unlocked?: boolean;
}

export interface HallOfFameEntry {
  id: string;
  creator_id: string;
  category: string;
  record_value: number;
  record_label: string;
  season_number: number | null;
  achieved_at: string;
  creator?: { name: string; avatar_gradient: string | null };
}

export interface CreatorPersonality {
  creator_id: string;
  goals: { type: string; target: number; progress: number; label: string }[];
  memory: { event: string; sentiment: string; at: string }[];
  preferences: Record<string, unknown>;
  decision_style: string;
  risk_tolerance: number;
}

export interface SeasonInfo {
  id: string;
  season_number: number;
  name: string;
  theme: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string;
  days_remaining: number;
  reward_tiers: { rank: number; label: string; reward: string }[];
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.8));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let total = 0;
  while (level < 100) {
    const needed = xpForLevel(level);
    if (total + needed > xp) break;
    total += needed;
    level++;
  }
  return level;
}

export function xpProgressInLevel(xp: number, level: number): { current: number; needed: number; pct: number } {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForLevel(l);
  const current = xp - total;
  const needed = xpForLevel(level);
  return { current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}
