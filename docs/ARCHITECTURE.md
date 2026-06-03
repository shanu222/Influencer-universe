# Influencer Universe

Production-grade AI influencer management simulation game.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS 4, ShadCN UI, Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage-ready)
- **AI:** OpenAI API (titles, metadata, trends, creator decisions — no media generation in v1)
- **Deploy:** Vercel

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`
- `ADMIN_USER_IDS` (comma-separated Supabase user UUIDs)

### 3. Run database migrations

Using Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste migrations from `supabase/migrations/` into the Supabase SQL editor (001–004 in order).

### 4. Seed initial data

```bash
pnpm db:seed
```

Seeds: Season 1 (themed), skill trees, perks, creator houses, achievements, trends, sponsorship templates, news articles.

### 5. Backfill existing creators (if upgrading from Phase 1)

Migration `003_backfill_phase2.sql` auto-generates DNA, personality, agency links, and skill progress for creators created before Phase 2.

### 5. Start development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## User Flow

1. **Register** — email, password, username
2. **Create Creator** — name, gender, age, nationality, niche, personality, stats (500 points total)
3. **Play** — home dashboard, content studio, viral feed, trends, rankings, profile analytics

## Game Systems

### Core (Phase 1)

| System | Implementation |
|--------|----------------|
| Follower growth | `lib/services/economy.ts` — creativity, trend match, quality, virality, diminishing returns |
| Virality engine | Quality, trend match, audience match, engagement scores → views, likes, shares |
| Content creation | AI-generated titles/descriptions (v1), stored in `content` table |
| Music studio | AI song name/album/concept (v1), performance calculated server-side |
| Trends | Admin + AI generated, joinable, affects growth multiplier |
| Rankings | Per-season, refreshed on cron + admin action |
| Economy | Energy costs, revenue transactions, business daily cron |
| Notifications | Supabase Realtime on `notifications` table |
| Achievements | Auto-unlock on milestones |

### Multiplayer Game (Phase 2)

| System | Service | Tables |
|--------|---------|--------|
| Creator DNA | `lib/services/dna.ts` | `creator_dna` — hidden traits, strengths/weaknesses, growth modifiers |
| Life Events | `lib/services/life-events.ts` | `life_events` — viral moments, scandals, burnout, awards, sponsorships, controversies |
| Battles | `lib/services/battles.ts` | `rivalries`, `battle_votes` — music, trend, streaming, popularity, fan vote |
| News Network | `lib/services/news.ts` | `news_articles` — AI + manual headlines, trending feed |
| House Wars | `lib/services/house-wars.ts` | `house_wars`, `house_war_contributions`, `creator_houses` |
| XP & Leveling | `lib/services/xp.ts` | `skill_definitions`, `creator_skills`, `perk_definitions`, `creator_perks` |
| Agency | `lib/services/agency.ts` | `agencies`, `agency_creators`, `agency_rankings` |
| Seasons | `lib/services/hall-of-fame.ts` | `seasons`, `season_rewards` — 30-day themed seasons |
| Hall of Fame | `lib/services/hall-of-fame.ts` | `hall_of_fame` — all-time records, legacy achievements |
| AI Personalities | `lib/services/personality.ts` | `creator_personality` — goals, memory, preferences, decisions |

### Social World (Phase 3)

| System | Service | Tables |
|--------|---------|--------|
| Social Network | `lib/services/social.ts` | `social_posts`, `post_likes`, `post_comments`, `post_reposts`, `trending_topics` |
| Celebrity Relationships | `lib/services/relationships.ts` | `creator_relationships`, `relationship_events` — friends, dating, collabs, feuds, breakups |
| Creator Marketplace | `lib/services/marketplace.ts` | `creator_valuations`, `marketplace_listings`, `marketplace_transfers`, `market_rankings` |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/creator` | GET | Active creator + stats |
| `/api/creators` | POST | Create new creator |
| `/api/content` | GET/POST | Feed + create content |
| `/api/songs` | GET/POST | Songs list + record song |
| `/api/trends` | GET/POST | List trends + join |
| `/api/rankings` | GET | Global/country/niche rankings |
| `/api/analytics` | GET | Profile charts data |
| `/api/ai/suggestions` | POST | AI content suggestions |
| `/api/admin` | GET/POST | Admin dashboard (protected) |
| `/api/cron/daily` | GET | Daily economy + Phase 2 cron (Bearer CRON_SECRET) |
| `/api/game/state` | GET | Dashboard bundle: life events, news, battles, season, DNA |
| `/api/life-events` | GET/POST | List + resolve life event choices |
| `/api/battles` | GET/POST | Active battles, create battle, fan vote |
| `/api/news` | GET | Global news feed (public) |
| `/api/houses` | GET/POST | House leaderboard, join house, contribute |
| `/api/agency` | GET/POST | Agency info, rankings, switch active creator |
| `/api/progression` | GET | XP, skills, perks, DNA, personality |
| `/api/hall-of-fame` | GET | All-time records (public) |
| `/api/social` | GET/POST | Social feed, likes, comments, reposts, trending topics |
| `/api/relationships` | GET/POST | Celebrity relationships, collabs, feuds, drama feed |
| `/api/marketplace` | GET/POST | Listings, buy/sell, valuations, market rankings |

## Admin Panel

Navigate to `/admin` (requires `is_admin = true` on user profile or ID in `ADMIN_USER_IDS`).

Actions: generate AI trends, refresh rankings, start new season.

## Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 0 * * *" }]
}
```

Set `CRON_SECRET` in Vercel environment variables.

## Security

- Row Level Security on all tables
- Middleware auth guards
- Rate limiting on content/creator creation
- Service role only for cron jobs
- Admin route protected by profile flag + env allowlist

## v1 AI Scope (Cost Control)

Included: titles, descriptions, trends, song metadata, content suggestions, creator decisions, news headlines.

Excluded: actual video/audio/image generation (add in v2).

## Phase 2 UI Integration

Existing screens extended without redesign:

- **Home** — season banner, life events, news, battles (incl. fan votes), DNA hint, XP bar
- **Feed** — News Network section
- **Trends** — house war card, join house, start trend battle
- **Rankings** — Agency, Hall of Fame, Houses tabs
- **Profile** — XP/skill tree, DNA, AI goals, agency switcher, relationships, marketplace listing

### Phase 3 UI Integration

- **Home** — trending topics, celebrity drama, marketplace hot listings, valuation
- **Feed** — interactive likes/comments/reposts, trending topic filters, social posts
- **Profile** — relationship requests, active relationships, market valuation, list for sale
- **Rankings** — Market tab (creator valuations)
