-- Production hardening: tighten RLS and add indexes for scale

-- Restrict users table: only read own profile (was public SELECT)
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update own profile
DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Performance indexes for social feed at scale
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_creator ON public.post_likes(creator_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status, listed_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_events_created ON public.relationship_events(created_at DESC);

-- Note: Game mutations use service-role client in API routes after JWT verification.
-- Direct browser writes to notifications, transactions, analytics remain blocked by RLS.
