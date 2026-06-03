export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DefaultTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      users: DefaultTable;
      creators: DefaultTable;
      creator_stats: DefaultTable;
      content: DefaultTable;
      songs: DefaultTable;
      trends: DefaultTable;
      trend_participations: DefaultTable;
      notifications: DefaultTable;
      rankings: DefaultTable;
      analytics: DefaultTable;
      achievements: DefaultTable;
      creator_achievements: DefaultTable;
      seasons: DefaultTable;
      sponsorships: DefaultTable;
      businesses: DefaultTable;
      transactions: DefaultTable;
      followers: DefaultTable;
      creator_relationships: DefaultTable;
      rivalries: DefaultTable;
      events: DefaultTable;
      creator_houses: DefaultTable;
      award_nominations: DefaultTable;
      awards: DefaultTable;
      agencies: DefaultTable;
  agency_creators: DefaultTable;
  agency_rankings: DefaultTable;
  creator_dna: DefaultTable;
  creator_personality: DefaultTable;
  life_events: DefaultTable;
  battle_votes: DefaultTable;
  news_articles: DefaultTable;
  house_wars: DefaultTable;
  house_war_contributions: DefaultTable;
  skill_definitions: DefaultTable;
  creator_skills: DefaultTable;
  perk_definitions: DefaultTable;
  creator_perks: DefaultTable;
  season_rewards: DefaultTable;
  hall_of_fame: DefaultTable;
  social_posts: DefaultTable;
  post_likes: DefaultTable;
  post_comments: DefaultTable;
  post_reposts: DefaultTable;
  trending_topics: DefaultTable;
  relationship_events: DefaultTable;
  creator_valuations: DefaultTable;
  marketplace_listings: DefaultTable;
  marketplace_transfers: DefaultTable;
  market_rankings: DefaultTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
