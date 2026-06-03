-- Phase 2: Multiplayer Game Systems
-- Influencer Universe

-- New enums
DO $$ BEGIN
  ALTER TYPE rivalry_type ADD VALUE IF NOT EXISTS 'fan_vote_battle';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'life_event';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'battle_challenge';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'house_war';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'news_breaking';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE life_event_type AS ENUM (
  'viral_moment', 'scandal', 'burnout', 'award_nomination',
  'sponsorship_offer', 'fan_controversy', 'comeback', 'collab_offer'
);

CREATE TYPE battle_status AS ENUM ('pending', 'active', 'voting', 'completed', 'cancelled');

CREATE TYPE news_category AS ENUM (
  'viral', 'scandal', 'award', 'battle', 'house_war', 'trend', 'agency', 'general'
);

-- ============================================================================
-- AGENCIES
-- ============================================================================
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 50),
  xp INTEGER NOT NULL DEFAULT 0,
  shared_energy_pool INTEGER NOT NULL DEFAULT 200 CHECK (shared_energy_pool >= 0),
  shared_funds NUMERIC(18, 2) NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 50 CHECK (reputation >= 0 AND reputation <= 100),
  max_creators INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agencies_owner ON public.agencies(owner_user_id);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;

CREATE TABLE public.agency_creators (
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  slot_order INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agency_id, creator_id),
  UNIQUE (creator_id)
);

CREATE TABLE public.agency_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  previous_position INTEGER,
  score NUMERIC(18, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, agency_id)
);

-- ============================================================================
-- CREATOR DNA
-- ============================================================================
CREATE TABLE public.creator_dna (
  creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  traits JSONB NOT NULL DEFAULT '{}',
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  growth_modifiers JSONB NOT NULL DEFAULT '{"followers":1,"revenue":1,"virality":1,"energy":1}',
  hidden_trait TEXT,
  is_partially_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  fully_revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AI PERSONALITY (goals, memory, preferences)
-- ============================================================================
CREATE TABLE public.creator_personality (
  creator_id UUID PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  goals JSONB NOT NULL DEFAULT '[]',
  memory JSONB NOT NULL DEFAULT '[]',
  preferences JSONB NOT NULL DEFAULT '{}',
  decision_style TEXT NOT NULL DEFAULT 'balanced',
  risk_tolerance INTEGER NOT NULL DEFAULT 50 CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
  last_decision_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LIFE EVENTS
-- ============================================================================
CREATE TABLE public.life_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type life_event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 50 CHECK (severity >= 1 AND severity <= 100),
  choices JSONB NOT NULL DEFAULT '[]',
  effects JSONB NOT NULL DEFAULT '{}',
  selected_choice TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_life_events_creator ON public.life_events(creator_id, is_resolved, created_at DESC);
CREATE INDEX idx_life_events_user ON public.life_events(user_id, is_resolved);

-- ============================================================================
-- BATTLES (extends rivalries pattern with votes)
-- ============================================================================
CREATE TABLE public.battle_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rivalry_id UUID NOT NULL REFERENCES public.rivalries(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  voted_for_creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rivalry_id, voter_user_id)
);

CREATE INDEX idx_battle_votes_rivalry ON public.battle_votes(rivalry_id);

-- ============================================================================
-- NEWS NETWORK
-- ============================================================================
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  category news_category NOT NULL DEFAULT 'general',
  related_creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  related_house_id UUID REFERENCES public.creator_houses(id) ON DELETE SET NULL,
  related_rivalry_id UUID REFERENCES public.rivalries(id) ON DELETE SET NULL,
  controversy_score INTEGER NOT NULL DEFAULT 0 CHECK (controversy_score >= 0 AND controversy_score <= 100),
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_news_published ON public.news_articles(published_at DESC);
CREATE INDEX idx_news_trending ON public.news_articles(is_trending) WHERE is_trending = TRUE;

-- ============================================================================
-- HOUSE WARS
-- ============================================================================
CREATE TABLE public.house_wars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL,
  house_a_id UUID NOT NULL REFERENCES public.creator_houses(id) ON DELETE CASCADE,
  house_b_id UUID NOT NULL REFERENCES public.creator_houses(id) ON DELETE CASCADE,
  house_a_score INTEGER NOT NULL DEFAULT 0,
  house_b_score INTEGER NOT NULL DEFAULT 0,
  winner_house_id UUID REFERENCES public.creator_houses(id) ON DELETE SET NULL,
  reward_pool NUMERIC(18, 2) NOT NULL DEFAULT 10000,
  theme TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (house_a_id != house_b_id)
);

CREATE TABLE public.house_war_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_war_id UUID NOT NULL REFERENCES public.house_wars(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES public.creator_houses(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (house_war_id, creator_id)
);

CREATE INDEX idx_house_wars_active ON public.house_wars(status, ends_at);

-- ============================================================================
-- XP / SKILL TREES / PERKS
-- ============================================================================
CREATE TABLE public.skill_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  branch TEXT NOT NULL CHECK (branch IN ('content', 'business', 'social', 'battle')),
  max_level INTEGER NOT NULL DEFAULT 5,
  xp_per_level INTEGER NOT NULL DEFAULT 500,
  effect_per_level JSONB NOT NULL DEFAULT '{}',
  required_creator_level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.creator_skills (
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_definitions(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  xp_in_skill INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  PRIMARY KEY (creator_id, skill_id)
);

CREATE TABLE public.perk_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  branch TEXT NOT NULL,
  required_creator_level INTEGER NOT NULL DEFAULT 1,
  required_skill_slug TEXT,
  required_skill_level INTEGER NOT NULL DEFAULT 0,
  effect JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.creator_perks (
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  perk_id UUID NOT NULL REFERENCES public.perk_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (creator_id, perk_id)
);

-- ============================================================================
-- SEASONAL CONTENT
-- ============================================================================
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS reward_tiers JSONB NOT NULL DEFAULT '[]';

CREATE TABLE public.season_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL,
  reward_label TEXT NOT NULL,
  reward_value JSONB NOT NULL DEFAULT '{}',
  rank_achieved INTEGER,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- HALL OF FAME
-- ============================================================================
CREATE TABLE public.hall_of_fame (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  record_value NUMERIC(18, 4) NOT NULL,
  record_label TEXT NOT NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  season_number INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_id, category)
);

CREATE INDEX idx_hall_of_fame_category ON public.hall_of_fame(category, record_value DESC);

ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS is_hall_of_fame BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_war_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perk_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

CREATE POLICY agencies_select ON public.agencies FOR SELECT USING (TRUE);
CREATE POLICY agencies_insert ON public.agencies FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY agencies_update ON public.agencies FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY agency_creators_select ON public.agency_creators FOR SELECT USING (TRUE);
CREATE POLICY agency_creators_insert ON public.agency_creators FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_user_id = auth.uid()));

CREATE POLICY agency_rankings_select ON public.agency_rankings FOR SELECT USING (TRUE);

CREATE POLICY creator_dna_select ON public.creator_dna FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND (c.user_id = auth.uid() OR is_partially_revealed = TRUE)));
CREATE POLICY creator_dna_insert ON public.creator_dna FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE POLICY creator_personality_select ON public.creator_personality FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY creator_personality_update ON public.creator_personality FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE POLICY life_events_select ON public.life_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY life_events_update ON public.life_events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY battle_votes_select ON public.battle_votes FOR SELECT USING (TRUE);
CREATE POLICY battle_votes_insert ON public.battle_votes FOR INSERT WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY news_select ON public.news_articles FOR SELECT USING (TRUE);

CREATE POLICY house_wars_select ON public.house_wars FOR SELECT USING (TRUE);
CREATE POLICY house_war_contrib_select ON public.house_war_contributions FOR SELECT USING (TRUE);
CREATE POLICY house_war_contrib_insert ON public.house_war_contributions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE POLICY skill_defs_select ON public.skill_definitions FOR SELECT USING (TRUE);
CREATE POLICY creator_skills_select ON public.creator_skills FOR SELECT USING (TRUE);
CREATE POLICY perk_defs_select ON public.perk_definitions FOR SELECT USING (TRUE);
CREATE POLICY creator_perks_select ON public.creator_perks FOR SELECT USING (TRUE);
CREATE POLICY season_rewards_select ON public.season_rewards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY hall_of_fame_select ON public.hall_of_fame FOR SELECT USING (TRUE);

ALTER PUBLICATION supabase_realtime ADD TABLE public.life_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.house_wars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rivalries;
