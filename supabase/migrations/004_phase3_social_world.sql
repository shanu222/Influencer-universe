-- Phase 3: Social Network, Celebrity Relationships, Creator Marketplace

-- ============================================================================
-- ENUM EXTENSIONS
-- ============================================================================
DO $$ BEGIN
  ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'dating';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'ex_partner';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'feud';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE relationship_status AS ENUM ('pending', 'active', 'ended', 'declined');

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'post_like';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'post_comment';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'post_repost';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'relationship_request';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'relationship_update';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'marketplace_listing';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'marketplace_sale';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'marketplace_sale';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'marketplace_purchase';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE news_category ADD VALUE IF NOT EXISTS 'social';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE news_category ADD VALUE IF NOT EXISTS 'drama';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE news_category ADD VALUE IF NOT EXISTS 'market';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SOCIAL NETWORK
-- ============================================================================
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  topic_tag TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  engagement_score INTEGER NOT NULL DEFAULT 0,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_posts_creator ON public.social_posts(creator_id, created_at DESC);
CREATE INDEX idx_social_posts_trending ON public.social_posts(is_trending, created_at DESC) WHERE is_trending = TRUE;
CREATE INDEX idx_social_posts_topic ON public.social_posts(topic_tag, created_at DESC) WHERE topic_tag IS NOT NULL;
CREATE INDEX idx_social_posts_content ON public.social_posts(content_id) WHERE content_id IS NOT NULL;

CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, creator_id)
);

CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_comments_post ON public.post_comments(post_id, created_at DESC);

CREATE TABLE public.post_reposts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  reposter_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(original_post_id, reposter_creator_id)
);

CREATE TABLE public.trending_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  post_count INTEGER NOT NULL DEFAULT 0,
  momentum_score INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trending_topics_momentum ON public.trending_topics(momentum_score DESC) WHERE is_active = TRUE;

-- ============================================================================
-- CELEBRITY RELATIONSHIPS (extend + events)
-- ============================================================================
ALTER TABLE public.creator_relationships
  ADD COLUMN IF NOT EXISTS status relationship_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS story_summary TEXT,
  ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES public.creators(id) ON DELETE SET NULL;

CREATE TABLE public.relationship_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES public.creator_relationships(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_relationship_events_rel ON public.relationship_events(relationship_id, created_at DESC);

-- ============================================================================
-- CREATOR MARKETPLACE
-- ============================================================================
CREATE TABLE public.creator_valuations (
  creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  market_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  trend_direction TEXT NOT NULL DEFAULT 'stable',
  components JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE marketplace_listing_status AS ENUM ('active', 'sold', 'cancelled');

CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  asking_price NUMERIC(18, 2) NOT NULL,
  market_value_at_list NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status marketplace_listing_status NOT NULL DEFAULT 'active',
  listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  buyer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_marketplace_one_active ON public.marketplace_listings(creator_id) WHERE status = 'active';

CREATE INDEX idx_marketplace_listings_active ON public.marketplace_listings(status, listed_at DESC) WHERE status = 'active';

CREATE TABLE public.marketplace_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sale_price NUMERIC(18, 2) NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketplace_transfers_creator ON public.marketplace_transfers(creator_id, transferred_at DESC);

CREATE TABLE public.market_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  previous_position INTEGER,
  market_value NUMERIC(18, 2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, creator_id)
);

CREATE INDEX idx_market_rankings_lookup ON public.market_rankings(season_id, rank_position);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_posts_select ON public.social_posts FOR SELECT USING (TRUE);
CREATE POLICY social_posts_insert ON public.social_posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE POLICY post_likes_select ON public.post_likes FOR SELECT USING (TRUE);
CREATE POLICY post_likes_insert ON public.post_likes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY post_likes_delete ON public.post_likes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE POLICY post_comments_select ON public.post_comments FOR SELECT USING (TRUE);
CREATE POLICY post_comments_insert ON public.post_comments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE POLICY post_reposts_select ON public.post_reposts FOR SELECT USING (TRUE);
CREATE POLICY post_reposts_insert ON public.post_reposts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = reposter_creator_id AND c.user_id = auth.uid()));

CREATE POLICY trending_topics_select ON public.trending_topics FOR SELECT USING (TRUE);

CREATE POLICY relationship_events_select ON public.relationship_events FOR SELECT USING (TRUE);

CREATE POLICY creator_valuations_select ON public.creator_valuations FOR SELECT USING (TRUE);

CREATE POLICY marketplace_listings_select ON public.marketplace_listings FOR SELECT USING (TRUE);
CREATE POLICY marketplace_listings_insert ON public.marketplace_listings FOR INSERT
  WITH CHECK (seller_user_id = auth.uid());
CREATE POLICY marketplace_listings_update ON public.marketplace_listings FOR UPDATE
  USING (seller_user_id = auth.uid() OR buyer_user_id = auth.uid());

CREATE POLICY marketplace_transfers_select ON public.marketplace_transfers FOR SELECT USING (TRUE);

CREATE POLICY market_rankings_select ON public.market_rankings FOR SELECT USING (TRUE);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;

-- Seed trending topic placeholders
INSERT INTO public.trending_topics (slug, title, description, post_count, momentum_score) VALUES
  ('viral-moment', '#ViralMoment', 'Creators sharing their biggest viral hits', 0, 50),
  ('collab-drop', '#CollabDrop', 'New collaborations dropping daily', 0, 45),
  ('drama-alert', '#DramaAlert', 'Feuds, breakups, and celebrity gossip', 0, 60),
  ('market-moves', '#MarketMoves', 'Creator valuations and transfer rumors', 0, 40),
  ('house-pride', '#HousePride', 'Creator house loyalty and war stories', 0, 35)
ON CONFLICT (slug) DO NOTHING;

-- Backfill social posts from existing content
INSERT INTO public.social_posts (creator_id, content_id, body, topic_tag, likes_count, comments_count, reposts_count, engagement_score, is_trending, created_at)
SELECT
  c.creator_id,
  c.id,
  COALESCE(c.description, c.title),
  CASE WHEN c.is_trending THEN 'viral-moment' ELSE NULL END,
  c.likes::INTEGER,
  c.comments_count,
  c.shares::INTEGER,
  c.engagement_score,
  c.is_trending,
  c.published_at
FROM public.content c
WHERE NOT EXISTS (SELECT 1 FROM public.social_posts sp WHERE sp.content_id = c.id);

-- Initialize valuations for existing creators
INSERT INTO public.creator_valuations (creator_id, market_value, trend_direction, components)
SELECT
  c.id,
  GREATEST(1000, (c.followers * 0.01) + (c.influence * 1000) + (c.net_worth * 0.5) + (c.fame_score * 500) + (c.level * 2000)),
  'stable',
  jsonb_build_object('followers', c.followers, 'influence', c.influence, 'net_worth', c.net_worth)
FROM public.creators c
WHERE NOT EXISTS (SELECT 1 FROM public.creator_valuations cv WHERE cv.creator_id = c.id);
