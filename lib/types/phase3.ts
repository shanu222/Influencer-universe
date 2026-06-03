export interface SocialPost {
  id: string;
  creator_id: string;
  content_id: string | null;
  body: string;
  topic_tag: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  engagement_score: number;
  is_trending: boolean;
  created_at: string;
  creator?: { id: string; name: string; handle: string; avatar_gradient: string | null; is_verified: boolean };
  content?: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    thumbnail_gradient: string | null;
    views: number;
    likes: number;
    is_trending: boolean;
  };
  liked_by_me?: boolean;
  reposted_by_me?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  creator_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  creator?: { name: string; avatar_gradient: string | null };
}

export interface TrendingTopic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  post_count: number;
  momentum_score: number;
}

export type CelebrityRelationshipType = "friend" | "dating" | "collaborator" | "feud" | "ex_partner" | "rival";

export interface CelebrityRelationship {
  id: string;
  creator_id: string;
  related_creator_id: string;
  relationship_type: CelebrityRelationshipType;
  status: "pending" | "active" | "ended" | "declined";
  strength: number;
  story_summary: string | null;
  is_public: boolean;
  initiated_by: string | null;
  created_at: string;
  ended_at: string | null;
  creator?: { name: string; avatar_gradient: string | null };
  related_creator?: { name: string; avatar_gradient: string | null };
}

export interface RelationshipEvent {
  id: string;
  relationship_id: string;
  event_type: string;
  headline: string;
  created_at: string;
}

export interface CreatorValuation {
  creator_id: string;
  market_value: number;
  trend_direction: "up" | "down" | "stable";
  components: Record<string, number>;
  updated_at: string;
  creator?: { name: string; avatar_gradient: string | null; followers: number; level: number };
}

export interface MarketplaceListing {
  id: string;
  creator_id: string;
  seller_user_id: string;
  asking_price: number;
  market_value_at_list: number;
  status: "active" | "sold" | "cancelled";
  listed_at: string;
  sold_at: string | null;
  creator?: { name: string; avatar_gradient: string | null; followers: number; influence: number; level: number };
  valuation?: CreatorValuation;
}

export interface MarketplaceTransfer {
  id: string;
  creator_id: string;
  from_user_id: string;
  to_user_id: string;
  sale_price: number;
  transferred_at: string;
  creator?: { name: string; avatar_gradient: string | null };
}

export interface MarketRankingEntry {
  creator_id: string;
  rank_position: number;
  previous_position: number | null;
  market_value: number;
  creator?: { name: string; avatar_gradient: string | null; followers: number };
}

export function calculateMarketValue(creator: {
  followers: number;
  influence: number;
  net_worth: number;
  fame_score: number;
  level: number;
}): number {
  return Math.round(
    creator.followers * 0.01 +
      creator.influence * 1000 +
      Number(creator.net_worth) * 0.5 +
      creator.fame_score * 500 +
      creator.level * 2000
  );
}
