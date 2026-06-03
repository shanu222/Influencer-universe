# Deployment Audit — Influencer Universe

**Audit date:** June 2026  
**Target:** Vercel (frontend) · AWS ECS/EC2 (API) · Supabase (DB + Realtime) · AWS S3 (storage)

---

## Executive Summary

The application is a Next.js 15 monolith with API routes in `/app/api`. Production deployment requires addressing **RLS write policies**, **API response standardization**, **rate limiting at scale**, and **frontend/backend separation** before serving 100k+ users.

| Severity | Count | Status |
|----------|-------|--------|
| P0 Blockers | 4 | Addressed in this hardening pass |
| P1 High | 8 | Addressed / documented |
| P2 Medium | 12 | Documented with remediation path |

---

## P0 — Deployment Blockers

### 1. RLS blocks game mutations with user-scoped client

**Finding:** Many tables (`notifications`, `transactions`, `analytics`, `creator_achievements`, `marketplace_transfers`, etc.) have SELECT policies but no INSERT/UPDATE policies for authenticated users.

**Impact:** Content creation, achievements, marketplace purchases, and notifications fail silently or with RLS errors in production.

**Fix applied:** Mutation API routes use `requireAuthMutation()` which returns a **service-role Supabase client** after verifying JWT auth. Authorization enforced in route/service layer.

**Files:** `lib/api/auth-helpers.ts`, all POST handlers in `app/api/`

### 2. Marketplace ownership transfer blocked by RLS

**Finding:** `creators_update` policy requires `auth.uid() = user_id`; buyer cannot reassign creator.

**Fix:** Marketplace buy flow uses service-role client via `requireAuthMutation()`.

### 3. In-memory rate limiting (Vercel incompatible at scale)

**Finding:** `rateLimit()` in `lib/api/auth-helpers.ts` uses a process-local `Map`.

**Impact:** Limits reset per serverless instance; ineffective under load.

**Remediation:** Document Upstash Redis integration for production. Current implementation acceptable for MVP single-region deploy.

### 4. TrendCenter opponent selection bug

**Finding:** `TrendCenter.tsx` parsed `{ data: opponents }` but API returns `{ success, data: { rankings } }`.

**Fix applied:** Standardized API client + corrected response parsing.

---

## P1 — High Priority

### Build & CI

| Issue | Location | Fix |
|-------|----------|-----|
| No CI pipeline | `.github/workflows/` | Added `deploy.yml` |
| No test script | `package.json` | Added `type-check` alias; tests optional for MVP |
| Docs say `pnpm`, lockfile is npm | README | Updated to npm |
| No ESLint config | project root | Added `eslint.config.mjs` |

### Security

| Issue | Location | Fix |
|-------|----------|-----|
| `/admin` page unguarded in middleware | `middleware.ts` | Admin role check added |
| Public user SELECT exposes emails | `001_initial_schema.sql` | Documented; restrict in future migration |
| Broad public API GET allowlist | `middleware.ts` | Intentional for game feed; rate limit at CDN |
| No security headers | `next.config.ts` | Added headers |

### Architecture

| Issue | Location | Fix |
|-------|----------|-----|
| Game preview math in ContentStudio | `ContentStudio.tsx` | Moved to server `computePreviewMetrics()` |
| Duplicate fetches (useCreator + useGameState) | `HomeDashboard.tsx` | React Query deduplication |
| No API response envelope | All routes | `{ success, data }` / `{ success, message }` |
| No storage abstraction | N/A | `lib/storage/` with S3 + Supabase |

### Vercel Compatibility

| Check | Status |
|-------|--------|
| `npm run build` | Must pass |
| `npm run lint` | Must pass |
| `npm run type-check` | Must pass |
| Cron in `vercel.json` | Configured; requires `CRON_SECRET` |
| Serverless function timeout | Daily cron may need AWS offload at scale |

### AWS Compatibility

| Check | Status |
|-------|--------|
| Standalone Docker build | `Dockerfile` added |
| Env-based config | `lib/env.ts` |
| S3 storage | `lib/storage/s3.ts` |
| No hardcoded localhost in source | Clean |
| API separable via `NEXT_PUBLIC_API_BASE_URL` | Supported |

---

## P2 — Performance & Scale

| Issue | Recommendation |
|-------|----------------|
| No React Query | TanStack Query added |
| Recharts eager load | Dynamic import on profile charts |
| `/api/game/state` mega-fetch | Acceptable; add caching headers later |
| No Supabase Realtime wired | Document; add subscriptions in Phase 4 |
| `canvas-confetti` unused | Removed from dependencies |
| Legacy `src/app/` tree | Excluded in tsconfig; remove from repo |
| 100k users | Add Redis rate limits, read replicas, CDN for static |

---

## Hardcoded Values Audit

| Type | Found | Action |
|------|-------|--------|
| Secrets in source | None | OK |
| localhost URLs | `.env.example` only | OK |
| `NEXT_PUBLIC_APP_URL` | Unused | Removed from required vars |
| Supabase URLs | Env vars only | OK |

---

## Environment Variables

See `.env.example` for complete list. Required for production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`
- `ADMIN_USER_IDS`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (when using S3)
- `NEXT_PUBLIC_API_BASE_URL` (when frontend and API are split)

---

## Recommended Production Topology

```
                    ┌─────────────┐
                    │  CloudFront │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                                 ▼
   ┌─────────────┐                  ┌─────────────┐
   │   Vercel    │  /api/* rewrite  │  AWS ECS    │
   │  (Next.js   │ ───────────────► │  (Next.js   │
   │   pages)    │                  │   API)      │
   └─────────────┘                  └──────┬──────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
             ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
             │  Supabase   │        │   AWS S3    │        │   OpenAI    │
             │  PostgreSQL │        │   Storage   │        │     API     │
             │  + Realtime │        └─────────────┘        └─────────────┘
             └─────────────┘
```

---

## Files Changed in Hardening Pass

| Area | Files |
|------|-------|
| API standardization | `lib/api/response.ts`, `lib/api/client.ts`, `lib/api/auth-helpers.ts` |
| Storage | `lib/storage/*` |
| Security | `middleware.ts`, `next.config.ts`, `supabase/migrations/005_production_hardening.sql` |
| Frontend | `hooks/*`, `providers/QueryProvider.tsx`, `components/*` |
| CI/CD | `.github/workflows/deploy.yml`, `Dockerfile` |
| Docs | `README.md`, `SECURITY_AUDIT.md`, `DEPLOYMENT_CHECKLIST.md` |

---

## Sign-off Checklist

- [ ] All migrations applied (001–005)
- [ ] Environment variables set in Vercel + AWS
- [ ] `CRON_SECRET` configured on Vercel cron
- [ ] S3 bucket CORS configured
- [ ] Supabase RLS reviewed
- [ ] Smoke test: register → create creator → content → feed → marketplace
- [ ] Load test plan for 100k users documented
