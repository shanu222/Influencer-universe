# Influencer Universe

AI-powered influencer management simulation game. Build AI celebrities, compete in battles, trade creators on the marketplace, and dominate the social network.

**Repository:** https://github.com/shanu222/Influencer-universe.git

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   AWS ECS    │     │  Supabase    │
│  (Frontend)  │────►│  (API/SSR)   │────►│  PostgreSQL  │
│  Next.js UI  │     │  Docker      │     │  + Realtime  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌────────────┐      ┌────────────┐
             │  AWS S3    │      │  OpenAI    │
             │  Storage   │      │    API     │
             └────────────┘      └────────────┘
```

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, Tailwind CSS 4, TanStack Query |
| Backend API | Next.js App Router (`/app/api/*`) — deployable on Vercel or AWS ECS |
| Database | Supabase PostgreSQL with Row Level Security |
| Realtime | Supabase Realtime (notifications, rankings) |
| Storage | AWS S3 (default) or Supabase Storage |
| AI | OpenAI (titles, trends, news — no media generation) |

Game logic (economy, XP, battles, marketplace) runs **server-side only** in `lib/services/`. React components consume APIs via `lib/api/client.ts`.

---

## Quick Start (Local)

```bash
npm install
cp .env.example .env.local
# Fill in Supabase + OpenAI keys

# Apply migrations (001–005) via Supabase CLI or SQL editor
npm run db:seed
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Copy `.env.example` to `.env.local`. Required:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (API mutations only) |
| `OPENAI_API_KEY` | OpenAI API key |
| `CRON_SECRET` | Bearer token for `/api/cron/daily` |
| `ADMIN_USER_IDS` | Comma-separated admin user UUIDs |

For AWS S3 storage:

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `AWS_S3_BUCKET` | Bucket name |
| `STORAGE_PROVIDER` | `s3` (default) or `supabase` |

For split deployment:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | AWS API URL when frontend on Vercel |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check |
| `npm run db:seed` | Seed seasons, skills, trends |

---

## Deployment

### Vercel (Frontend + API monolith)

1. Connect GitHub repo to Vercel
2. Set all environment variables
3. Deploy — cron configured in `vercel.json`
4. Set `CRON_SECRET` in Vercel env

### AWS ECS (Backend / full stack)

1. Build Docker image: `docker build -t influencer-universe .`
2. Push to ECR
3. Deploy ECS service with env vars from `.env.example`
4. Point ALB to container port 3000
5. Set Vercel `NEXT_PUBLIC_API_BASE_URL` to ALB URL (optional split)

### Supabase

1. Create project at supabase.com
2. Run migrations `001` through `005` in order
3. Enable Realtime on: notifications, rankings, social_posts
4. Copy URL and keys to env

### AWS S3

1. Create bucket with public read for assets (or CloudFront)
2. Configure CORS for your domain
3. Set IAM user with `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject`

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — game systems detail
- [Deployment Audit](DEPLOYMENT_AUDIT.md) — pre-production findings
- [Security Audit](SECURITY_AUDIT.md) — security controls
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) — launch checklist

---

## Routes

| Route | Description |
|-------|-------------|
| `/register` | Create manager account |
| `/login` | Sign in |
| `/create-creator` | Character creation |
| `/home` | Dashboard |
| `/feed` | Social network feed |
| `/studio` | Content creation |
| `/trends` | Trends & house wars |
| `/rankings` | Global & market rankings |
| `/profile` | Analytics & marketplace |
| `/admin` | Admin panel |

---

## License

Private — All rights reserved.
