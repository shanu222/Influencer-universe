# Deployment Checklist — Influencer Universe

Use this checklist before pushing to production and going live.

---

## Pre-Push Verification

- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run build` passes
- [ ] No secrets in git history or committed files
- [ ] `.env.local` is gitignored
- [ ] All migrations 001–005 applied to Supabase

---

## Supabase Configuration

- [ ] Project created in target region
- [ ] Run `001_initial_schema.sql`
- [ ] Run `002_phase2_multiplayer.sql`
- [ ] Run `003_backfill_phase2.sql` (if upgrading)
- [ ] Run `004_phase3_social_world.sql`
- [ ] Run `005_production_hardening.sql`
- [ ] Run `npm run db:seed`
- [ ] Enable Realtime: notifications, rankings, social_posts, marketplace_listings
- [ ] Auth email templates configured
- [ ] Redirect URLs include production domain + `/auth/callback`
- [ ] Service role key stored securely (never in client)

---

## Vercel Configuration

- [ ] GitHub repo connected
- [ ] Production branch: `main`
- [ ] Environment variables set (all from `.env.example`)
- [ ] `CRON_SECRET` set for cron jobs
- [ ] Cron job active: `/api/cron/daily` at `0 0 * * *`
- [ ] Custom domain configured (optional)
- [ ] SSL automatic via Vercel

If splitting frontend/API:
- [ ] `NEXT_PUBLIC_API_BASE_URL` points to AWS ALB
- [ ] Vercel rewrites `/api/*` to AWS (optional)

---

## AWS Configuration

### S3 Storage

- [ ] Bucket created: `AWS_S3_BUCKET`
- [ ] IAM user/role with Put/Get/Delete permissions
- [ ] CORS policy allows your domain
- [ ] Optional CloudFront distribution for CDN
- [ ] `STORAGE_PROVIDER=s3` in env

### ECS (Backend API)

- [ ] ECR repository created
- [ ] Docker image built and pushed
- [ ] ECS task definition with env vars
- [ ] ECS service behind ALB
- [ ] Health check on port 3000
- [ ] Auto-scaling policy (min 2 tasks for HA)
- [ ] CloudWatch logs enabled
- [ ] Security group: 443 inbound, 3000 internal only

### Optional EC2

- [ ] Node 20 installed
- [ ] PM2 or systemd for `npm start`
- [ ] Nginx reverse proxy with SSL (Let's Encrypt)

---

## OpenAI Configuration

- [ ] API key with usage limits set
- [ ] Billing alerts configured
- [ ] Model: `gpt-4o-mini` (cost control)

---

## Domain & SSL

- [ ] DNS A/CNAME records configured
- [ ] SSL certificate active (Vercel auto or ACM on AWS)
- [ ] HTTPS enforced (security headers in `next.config.ts`)

---

## Production Verification (Smoke Test)

After deploy, verify:

- [ ] Register new account
- [ ] Create creator
- [ ] Create content in studio
- [ ] Post appears in social feed
- [ ] Like / comment / repost works
- [ ] Join trend
- [ ] Start battle
- [ ] View rankings (global + market)
- [ ] List creator on marketplace
- [ ] Admin panel accessible (admin user only)
- [ ] Cron endpoint rejects invalid Bearer token
- [ ] Cron endpoint accepts valid `CRON_SECRET`

---

## Post-Launch Monitoring

- [ ] Supabase dashboard: query performance
- [ ] Vercel/AWS: error rates and latency
- [ ] OpenAI usage dashboard
- [ ] Set up uptime monitoring (e.g. Better Stack, UptimeRobot)
- [ ] Plan Upstash Redis for rate limiting at scale

---

## Rollback Plan

- [ ] Vercel: instant rollback to previous deployment
- [ ] ECS: previous task definition revision ready
- [ ] Database: point-in-time recovery enabled in Supabase
- [ ] Document rollback contacts and procedures

---

## Scale Readiness (100k+ users)

- [ ] Redis rate limiting (replace in-memory)
- [ ] Supabase connection pooling (PgBouncer)
- [ ] CDN for static assets
- [ ] Read replicas if query load high
- [ ] Move daily cron to AWS EventBridge if Vercel timeout
- [ ] Load test API endpoints (k6 or Artillery)

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer | | | |
| DevOps | | | |
| Product | | | |
