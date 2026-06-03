export type CreatorNiche =
  | "singer"
  | "rapper"
  | "gamer"
  | "streamer"
  | "actor"
  | "comedian"
  | "fashion"
  | "fitness"
  | "entrepreneur";

export type CreatorGender = "male" | "female" | "non_binary" | "other";

export type ContentType =
  | "video"
  | "short"
  | "music"
  | "podcast"
  | "livestream"
  | "comedy"
  | "fashion"
  | "gaming";

export type TrendCategory =
  | "dance"
  | "gaming"
  | "fashion"
  | "music"
  | "tech"
  | "food"
  | "lifestyle"
  | "challenge";

export type RankType = "global" | "country" | "niche" | "friends";

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string;
  is_admin: boolean;
  active_creator_id: string | null;
  created_at: string;
}

export interface Creator {
  id: string;
  user_id: string;
  name: string;
  handle: string;
  gender: CreatorGender;
  age: number;
  nationality: string;
  niche: CreatorNiche;
  personality: string | null;
  avatar_url: string | null;
  avatar_gradient: string | null;
  mood: string;
  level: number;
  xp: number;
  followers: number;
  subscribers: number;
  net_worth: number;
  reputation: number;
  energy: number;
  influence: number;
  trend_score: number;
  fame_score: number;
  engagement_rate: number;
  monthly_revenue: number;
  total_views: number;
  following_count: number;
  is_verified: boolean;
  house_id: string | null;
  consistency_score: number;
  content_count: number;
  last_content_at: string | null;
  created_at: string;
}

export interface CreatorStats {
  creator_id: string;
  creativity: number;
  talent: number;
  looks: number;
  charisma: number;
  intelligence: number;
  discipline: number;
  confidence: number;
  authenticity: number;
  humor: number;
  drama: number;
}

export interface Content {
  id: string;
  creator_id: string;
  trend_id: string | null;
  type: ContentType;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_prompt: string | null;
  thumbnail_gradient: string | null;
  quality_score: number;
  trend_match_score: number;
  audience_match_score: number;
  virality_score: number;
  engagement_score: number;
  views: number;
  likes: number;
  comments_count: number;
  shares: number;
  followers_gained: number;
  revenue: number;
  is_trending: boolean;
  is_sponsored: boolean;
  published_at: string;
  creator?: Pick<Creator, "id" | "name" | "handle" | "avatar_gradient" | "is_verified">;
}

export interface Song {
  id: string;
  creator_id: string;
  content_id: string | null;
  song_name: string;
  album_name: string | null;
  genre: string;
  lyrics_concept: string | null;
  popularity_score: number;
  trend_score: number;
  success_prediction: number;
  streams: number;
  revenue: number;
  released_at: string;
}

export interface Trend {
  id: string;
  title: string;
  description: string | null;
  category: TrendCategory;
  popularity: number;
  growth_rate: number;
  competition: "low" | "medium" | "high" | "very_high";
  duration_days: number;
  reward_multiplier: number;
  participant_count: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

export interface RankingEntry {
  rank_position: number;
  previous_position: number | null;
  score: number;
  creator: Pick<
    Creator,
    | "id"
    | "name"
    | "handle"
    | "followers"
    | "net_worth"
    | "influence"
    | "fame_score"
    | "avatar_gradient"
    | "is_verified"
    | "nationality"
    | "niche"
  >;
  is_you?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  creator_id: string | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsSnapshot {
  date: string;
  followers: number;
  followers_gained: number;
  views: number;
  revenue: number;
  engagement_rate: number;
  trend_score: number;
  influence: number;
}

export interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  unlocked_at?: string;
}

export interface Sponsorship {
  id: string;
  brand_name: string;
  brand_type: string;
  contract_value: number;
  risk_level: string;
  min_followers: number;
  min_influence: number;
  duration_days: number;
  benefits: string[];
  status: string;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  daily_revenue: number;
  total_revenue: number;
  level: number;
  is_active: boolean;
}

export interface CreateCreatorInput {
  name: string;
  gender: CreatorGender;
  age: number;
  nationality: string;
  niche: CreatorNiche;
  personality: string;
  stats: Omit<CreatorStats, "creator_id">;
}

export interface CreateContentInput {
  creatorId: string;
  type: ContentType;
  trendId?: string;
}

export interface CreateSongInput {
  creatorId: string;
  genre: string;
}

export const NICHE_OPTIONS: { value: CreatorNiche; label: string }[] = [
  { value: "singer", label: "Singer" },
  { value: "rapper", label: "Rapper" },
  { value: "gamer", label: "Gamer" },
  { value: "streamer", label: "Streamer" },
  { value: "actor", label: "Actor" },
  { value: "comedian", label: "Comedian" },
  { value: "fashion", label: "Fashion" },
  { value: "fitness", label: "Fitness" },
  { value: "entrepreneur", label: "Entrepreneur" },
];

export const CONTENT_TYPE_MAP: Record<string, ContentType> = {
  videos: "video",
  music: "music",
  livestreams: "livestream",
  podcasts: "podcast",
  challenges: "short",
};

export const STAT_KEYS = [
  "creativity",
  "talent",
  "looks",
  "charisma",
  "intelligence",
  "discipline",
  "confidence",
  "authenticity",
  "humor",
  "drama",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
