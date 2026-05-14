# CineMind - AI Movie Recommendation System

Premium OTT-style movie recommendation app with hybrid ranking:

- Collaborative filtering from user interactions
- Content-based filtering from onboarding preferences + metadata
- Cold-start onboarding for first-time users
- Modern Next.js UI with cinematic cards and animated sections

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion
- Auth: Clerk
- Backend: Next.js Route Handlers
- DB: PostgreSQL + Prisma
- Cache: Upstash Redis (optional)
- Movie source: TMDB API
- Recommendation: Python microservice (optional) + TypeScript fallback hybrid engine

## Implemented Features

- Clerk auth (sign up, sign in, protected dashboard routes)
- First-login onboarding with:
  - genres
  - moods
  - languages
  - searchable actors
  - searchable favorite movies (min 3)
- Hybrid recommendation endpoint and dashboard sections
- Like/dislike/watchlist/rating/watch interactions
- Movie details page with:
  - trailer
  - cast
  - similar titles
  - recommendation reason
  - review posting/listing
- Search page with movie / actor / genre discovery

## Project Structure

`src/app` - pages + API routes  
`src/components` - UI components  
`src/lib` - TMDB client, recommendation logic, utilities  
`prisma` - schema + seed script

## Environment Setup

1. Copy `.env.example` to `.env` (or `.env.local`; Next.js prefers `.env.local` for secrets).
2. Fill Clerk, TMDB, and database credentials.
3. (Optional) add Upstash Redis keys for caching.

### Publishable key not valid (Clerk)

That error means `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing, truncated, or still a placeholder. Clerk does **not** accept fake values like `pk_test_xxx`.

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your application → **Configure** → **API keys**.
2. Copy **Publishable key** into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. Copy **Secret key** into `CLERK_SECRET_KEY` (must be from the **same** Clerk app).
4. Save the file and **restart** `npm run dev` (env vars load at startup).

If you use both `.env` and `.env.local`, Next.js loads `.env.local` last — remove duplicates or wrong keys there.

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

- `GET /api/health`
- `POST /api/onboarding`
- `GET /api/recommendations`
- `GET /api/search?type=movie|person|genre&q=...`
- `POST /api/interactions`
- `GET /api/reviews?movieTmdbId=...`
- `POST /api/reviews`

## Recommendation Logic

- New users: prioritize onboarding/content signals.
- Active users: blend collaborative + content scores dynamically.
- Sparse activity fallback: trending within user-selected genres.

## Deployment

- Frontend/App: Vercel
- PostgreSQL: Railway/Neon/Supabase
- Redis cache: Upstash
- Optional Python recommender microservice: Railway/Render

### Vercel: 500 "Middleware invocation failed" (Clerk)

1. In **Vercel → Project → Settings → Environment Variables**, set the same keys as local:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `TMDB_API_KEY`, `DATABASE_URL`, etc.
2. Set **`NEXT_PUBLIC_APP_URL`** to your live URL, e.g. `https://movie-recommendation012.vercel.app` (no trailing slash). Redeploy after saving.
3. In **Clerk Dashboard → Configure → Domains**, add your production and preview URLs if Clerk asks (some setups require the exact Vercel hostname).

The app middleware whitelists Clerk internal routes (`/__clerk`, `/clerk-sync-keyless`) and passes **`authorizedParties`** including the current origin and `VERCEL_URL` so sessions validate on deployed hosts.
