-- Influencer Universe - Production Schema
-- Run via Supabase CLI: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE creator_niche AS ENUM (
  'singer', 'rapper', 'gamer', 'streamer', 'actor', 'comedian',
  'fashion', 'fitness', 'entrepreneur'
);

CREATE TYPE creator_gender AS ENUM ('male', 'female', 'non_binary', 'other');

CREATE TYPE content_type AS ENUM (
  'video', 'short', 'music', 'podcast', 'livestream', 'comedy', 'fashion', 'gaming'
);

CREATE TYPE trend_category AS ENUM (
  'dance', 'gaming', 'fashion', 'music', 'tech', 'food', 'lifestyle', 'challenge'
);

CREATE TYPE sponsorship_status AS ENUM ('pending', 'active', 'completed', 'declined', 'expired');

CREATE TYPE rivalry_type AS ENUM ('trend_battle', 'music_battle', 'popularity_battle', 'streaming_battle');

CREATE TYPE rivalry_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

CREATE TYPE relationship_type AS ENUM ('friend', 'rival', 'collaborator', 'house_member');

CREATE TYPE notification_type AS ENUM (
  'viral_content', 'follower_milestone', 'rival_surpassed', 'sponsorship_offer',
  'award_nomination', 'trend_joined', 'achievement_unlocked', 'season_start', 'system'
);

CREATE TYPE transaction_type AS ENUM (
  'content_revenue', 'sponsorship', 'business_revenue', 'award_bonus',
  'trend_reward', 'rivalry_prize', 'expense', 'season_reward'
);

CREATE TYPE business_type AS ENUM (
  'clothing_brand', 'music_label', 'restaurant', 'tech_startup', 'fitness_brand'
);

CREATE TYPE competition_level AS ENUM ('low', 'medium', 'high', 'very_high');

-- ============================================================================
-- USERS (player profiles linked to auth.users)
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  country_code TEXT DEFAULT 'US',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  active_creator_id UUID,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

CREATE INDEX idx_users_username ON public.users(username);

-- ============================================================================
-- SEASONS
-- ============================================================================
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATOR HOUSES (guilds)
-- ============================================================================
CREATE TABLE public.creator_houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_creator_id UUID,
  fame_score INTEGER NOT NULL DEFAULT 0,
  house_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  house_rank INTEGER,
  max_members INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATORS
-- ============================================================================
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  gender creator_gender NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 80),
  nationality TEXT NOT NULL,
  niche creator_niche NOT NULL,
  personality TEXT,
  avatar_url TEXT,
  avatar_gradient TEXT,
  mood TEXT DEFAULT 'neutral',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  followers BIGINT NOT NULL DEFAULT 0,
  subscribers BIGINT NOT NULL DEFAULT 0,
  net_worth NUMERIC(18, 2) NOT NULL DEFAULT 0,
  reputation NUMERIC(4, 2) NOT NULL DEFAULT 3.0 CHECK (reputation >= 0 AND reputation <= 5),
  energy INTEGER NOT NULL DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
  influence INTEGER NOT NULL DEFAULT 0 CHECK (influence >= 0 AND influence <= 100),
  trend_score INTEGER NOT NULL DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  fame_score INTEGER NOT NULL DEFAULT 0 CHECK (fame_score >= 0 AND fame_score <= 100),
  engagement_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  monthly_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_views BIGINT NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  house_id UUID REFERENCES public.creator_houses(id) ON DELETE SET NULL,
  consistency_score INTEGER NOT NULL DEFAULT 50 CHECK (consistency_score >= 0 AND consistency_score <= 100),
  content_count INTEGER NOT NULL DEFAULT 0,
  last_content_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT handle_format CHECK (handle ~ '^[a-z0-9_]{3,30}$')
);

CREATE INDEX idx_creators_user_id ON public.creators(user_id);
CREATE INDEX idx_creators_followers ON public.creators(followers DESC);
CREATE INDEX idx_creators_influence ON public.creators(influence DESC);
CREATE INDEX idx_creators_net_worth ON public.creators(net_worth DESC);
CREATE INDEX idx_creators_fame_score ON public.creators(fame_score DESC);
CREATE INDEX idx_creators_niche ON public.creators(niche);
CREATE INDEX idx_creators_nationality ON public.creators(nationality);

ALTER TABLE public.users
  ADD CONSTRAINT fk_users_active_creator
  FOREIGN KEY (active_creator_id) REFERENCES public.creators(id) ON DELETE SET NULL;

ALTER TABLE public.creator_houses
  ADD CONSTRAINT fk_houses_owner
  FOREIGN KEY (owner_creator_id) REFERENCES public.creators(id) ON DELETE SET NULL;

-- ============================================================================
-- CREATOR STATS (detailed attributes 1-100)
-- ============================================================================
CREATE TABLE public.creator_stats (
  creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  creativity INTEGER NOT NULL DEFAULT 50 CHECK (creativity >= 1 AND creativity <= 100),
  talent INTEGER NOT NULL DEFAULT 50 CHECK (talent >= 1 AND talent <= 100),
  looks INTEGER NOT NULL DEFAULT 50 CHECK (looks >= 1 AND looks <= 100),
  charisma INTEGER NOT NULL DEFAULT 50 CHECK (charisma >= 1 AND charisma <= 100),
  intelligence INTEGER NOT NULL DEFAULT 50 CHECK (intelligence >= 1 AND intelligence <= 100),
  discipline INTEGER NOT NULL DEFAULT 50 CHECK (discipline >= 1 AND discipline <= 100),
  confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 1 AND confidence <= 100),
  authenticity INTEGER NOT NULL DEFAULT 50 CHECK (authenticity >= 1 AND authenticity <= 100),
  humor INTEGER NOT NULL DEFAULT 50 CHECK (humor >= 1 AND humor <= 100),
  drama INTEGER NOT NULL DEFAULT 50 CHECK (drama >= 1 AND drama <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FOLLOWERS (individual follower records for analytics)
-- ============================================================================
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  follower_creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'organic',
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_followers_creator_id ON public.followers(creator_id);
CREATE INDEX idx_followers_acquired_at ON public.followers(acquired_at);

-- ============================================================================
-- TRENDS
-- ============================================================================
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category trend_category NOT NULL,
  popularity INTEGER NOT NULL DEFAULT 50 CHECK (popularity >= 0 AND popularity <= 100),
  growth_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  competition competition_level NOT NULL DEFAULT 'medium',
  duration_days INTEGER NOT NULL DEFAULT 7,
  reward_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  participant_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trends_active ON public.trends(is_active, ends_at);
CREATE INDEX idx_trends_category ON public.trends(category);

CREATE TABLE public.trend_participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performance_score INTEGER NOT NULL DEFAULT 0,
  followers_gained BIGINT NOT NULL DEFAULT 0,
  UNIQUE(trend_id, creator_id)
);

-- ============================================================================
-- CONTENT
-- ============================================================================
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  trend_id UUID REFERENCES public.trends(id) ON DELETE SET NULL,
  type content_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_prompt TEXT,
  thumbnail_gradient TEXT,
  quality_score INTEGER NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  trend_match_score INTEGER NOT NULL DEFAULT 0 CHECK (trend_match_score >= 0 AND trend_match_score <= 100),
  audience_match_score INTEGER NOT NULL DEFAULT 0 CHECK (audience_match_score >= 0 AND audience_match_score <= 100),
  virality_score INTEGER NOT NULL DEFAULT 0 CHECK (virality_score >= 0 AND virality_score <= 100),
  engagement_score INTEGER NOT NULL DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  followers_gained BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_creator_id ON public.content(creator_id);
CREATE INDEX idx_content_published_at ON public.content(published_at DESC);
CREATE INDEX idx_content_virality ON public.content(virality_score DESC);
CREATE INDEX idx_content_trending ON public.content(is_trending) WHERE is_trending = TRUE;

-- ============================================================================
-- SONGS
-- ============================================================================
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  song_name TEXT NOT NULL,
  album_name TEXT,
  genre TEXT NOT NULL,
  lyrics_concept TEXT,
  popularity_score INTEGER NOT NULL DEFAULT 0 CHECK (popularity_score >= 0 AND popularity_score <= 100),
  trend_score INTEGER NOT NULL DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  success_prediction INTEGER NOT NULL DEFAULT 0 CHECK (success_prediction >= 0 AND success_prediction <= 100),
  streams BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_songs_creator_id ON public.songs(creator_id);

-- ============================================================================
-- SPONSORSHIPS
-- ============================================================================
CREATE TABLE public.sponsorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name TEXT NOT NULL,
  brand_type TEXT NOT NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  contract_value NUMERIC(18, 2) NOT NULL,
  risk_level competition_level NOT NULL DEFAULT 'medium',
  min_followers BIGINT NOT NULL DEFAULT 0,
  min_influence INTEGER NOT NULL DEFAULT 0,
  required_niche creator_niche,
  duration_days INTEGER NOT NULL DEFAULT 30,
  benefits JSONB NOT NULL DEFAULT '[]',
  status sponsorship_status NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  total_earned NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sponsorships_creator ON public.sponsorships(creator_id, status);

-- ============================================================================
-- AWARDS
-- ============================================================================
CREATE TABLE public.awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL,
  ceremony_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.award_nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  award_id UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  growth_bonus INTEGER NOT NULL DEFAULT 0,
  nominated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(award_id, creator_id)
);

-- ============================================================================
-- BUSINESSES
-- ============================================================================
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type business_type NOT NULL,
  daily_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  launched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_creator ON public.businesses(creator_id);

-- ============================================================================
-- RELATIONSHIPS & RIVALRIES
-- ============================================================================
CREATE TABLE public.creator_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  related_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  strength INTEGER NOT NULL DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, related_creator_id, relationship_type),
  CHECK (creator_id != related_creator_id)
);

CREATE TABLE public.rivalries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  type rivalry_type NOT NULL,
  status rivalry_status NOT NULL DEFAULT 'pending',
  challenger_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (challenger_id != opponent_id)
);

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'trophy',
  requirement_type TEXT NOT NULL,
  requirement_value BIGINT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.creator_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, achievement_id)
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reward_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RANKINGS (materialized per season)
-- ============================================================================
CREATE TABLE public.rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  rank_type TEXT NOT NULL,
  rank_position INTEGER NOT NULL,
  previous_position INTEGER,
  score NUMERIC(18, 4) NOT NULL,
  country_code TEXT,
  niche creator_niche,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, creator_id, rank_type)
);

CREATE INDEX idx_rankings_lookup ON public.rankings(season_id, rank_type, rank_position);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_creator ON public.transactions(creator_id, created_at DESC);

-- ============================================================================
-- ANALYTICS (daily snapshots)
-- ============================================================================
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  followers BIGINT NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  views BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  trend_score INTEGER NOT NULL DEFAULT 0,
  influence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, date)
);

CREATE INDEX idx_analytics_creator_date ON public.analytics(creator_id, date DESC);

-- ============================================================================
-- ACTIVITY LOGS
-- ============================================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id, created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_creators_updated_at BEFORE UPDATE ON public.creators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_creator_stats_updated_at BEFORE UPDATE ON public.creator_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_houses_updated_at BEFORE UPDATE ON public.creator_houses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rivalries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_achievements ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY users_select ON public.users FOR SELECT USING (TRUE);
CREATE POLICY users_update_own ON public.users FOR UPDATE USING (auth.uid() = id);

-- Creators: public read, owner write
CREATE POLICY creators_select ON public.creators FOR SELECT USING (TRUE);
CREATE POLICY creators_insert ON public.creators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY creators_update ON public.creators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY creators_delete ON public.creators FOR DELETE USING (auth.uid() = user_id);

-- Creator stats
CREATE POLICY creator_stats_select ON public.creator_stats FOR SELECT USING (TRUE);
CREATE POLICY creator_stats_insert ON public.creator_stats FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY creator_stats_update ON public.creator_stats FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- Content: public read, owner write
CREATE POLICY content_select ON public.content FOR SELECT USING (TRUE);
CREATE POLICY content_insert ON public.content FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- Songs
CREATE POLICY songs_select ON public.songs FOR SELECT USING (TRUE);
CREATE POLICY songs_insert ON public.songs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- Trends: public read
CREATE POLICY trends_select ON public.trends FOR SELECT USING (TRUE);
CREATE POLICY trends_admin ON public.trends FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = TRUE));

-- Trend participations
CREATE POLICY trend_part_select ON public.trend_participations FOR SELECT USING (TRUE);
CREATE POLICY trend_part_insert ON public.trend_participations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- Sponsorships
CREATE POLICY sponsorships_select ON public.sponsorships FOR SELECT
  USING (creator_id IS NULL OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY sponsorships_update ON public.sponsorships FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

-- Notifications: own only
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Rankings, analytics, seasons, awards, events: public read
CREATE POLICY rankings_select ON public.rankings FOR SELECT USING (TRUE);
CREATE POLICY analytics_select ON public.analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY seasons_select ON public.seasons FOR SELECT USING (TRUE);
CREATE POLICY awards_select ON public.awards FOR SELECT USING (TRUE);
CREATE POLICY award_nom_select ON public.award_nominations FOR SELECT USING (TRUE);
CREATE POLICY events_select ON public.events FOR SELECT USING (TRUE);
CREATE POLICY businesses_select ON public.businesses FOR SELECT USING (TRUE);
CREATE POLICY businesses_insert ON public.businesses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY relationships_select ON public.creator_relationships FOR SELECT USING (TRUE);
CREATE POLICY relationships_insert ON public.creator_relationships FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY rivalries_select ON public.rivalries FOR SELECT USING (TRUE);
CREATE POLICY rivalries_insert ON public.rivalries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = challenger_id AND c.user_id = auth.uid()));
CREATE POLICY transactions_select ON public.transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY achievements_select ON public.achievements FOR SELECT USING (TRUE);
CREATE POLICY creator_achievements_select ON public.creator_achievements FOR SELECT USING (TRUE);
CREATE POLICY houses_select ON public.creator_houses FOR SELECT USING (TRUE);
CREATE POLICY followers_select ON public.followers FOR SELECT USING (TRUE);
CREATE POLICY activity_logs_select ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rankings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creators;
