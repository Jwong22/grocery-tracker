# Grocery Tracker

A small PWA for tracking grocery prices and purchases in Malaysia, with travel-cost-adjusted "where's the cheapest?" search. Built for a friends-only group — installable to the iOS / Android home screen, no app store required.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + Storage + RLS) · TanStack Query · Tesseract.js · Leaflet + OpenStreetMap.

---

## Prerequisites

- Node.js 20.9+ (Next 16 wants ≥ 20.9; 21.x works fine)
- npm (or pnpm / yarn — examples use npm)
- A free [Supabase](https://supabase.com) project
- A Google Cloud OAuth client (free) for sign-in

---

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project (free tier is fine).
2. From **Project Settings → API**, copy the **Project URL** and the **anon public** key.

### 3. Apply the database schema

Open the SQL editor in Supabase Studio and run [supabase/migrations/0001_initial.sql](supabase/migrations/0001_initial.sql). It creates the products / variants / stores / price_entries / purchases / user_settings tables and turns on row-level security.

### 4. Create the receipts storage bucket

In Supabase: **Storage → New bucket** → name it `receipts`, leave it **private**. Then under **Storage → Policies** add a policy on `storage.objects` allowing authenticated users to insert and read their own files (the simplest working pair):

```sql
-- INSERT
(bucket_id = 'receipts' and auth.role() = 'authenticated')
-- SELECT
(bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1])
```

Uploads should use a `${user.id}/...` prefix in the object name so the SELECT policy matches.

### 5. Configure Google OAuth

1. **Google Cloud Console** → APIs & Services → Credentials → **Create OAuth client ID** (web application).
2. Add an **Authorized redirect URI**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. In Supabase: **Authentication → Providers → Google** → paste the Client ID + Secret.
4. Under **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and any LAN dev URLs you'll use) to the **Redirect URLs** allowlist.

### 6. Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Running it

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

### Phone testing on the same Wi-Fi

The Mac's LAN IP works in dev (e.g. `http://192.168.1.42:3000`). On the phone, open that URL in Safari / Chrome and use **Add to Home Screen** to install the PWA.

> iOS caveat: Geolocation requires HTTPS or `localhost` — LAN IPs over plain HTTP block GPS. For full GPS testing on a phone, deploy to Vercel (HTTPS by default).

---

## Optional: Gemini Smart Parse

The "Smart Parse" path on the price-upload page can call Google Gemini 1.5 Flash for harder receipts. Each user supplies their own API key in **Settings** — the app stores it in the per-user `user_settings` row (RLS-locked). The free tier covers ~1500 requests / day.

---

## Project layout

```
src/
├── proxy.ts                       # Next 16 proxy (auth guard, replaces middleware.ts)
├── app/
│   ├── layout.tsx                 # root layout, providers, top nav
│   ├── page.tsx                   # dashboard
│   ├── manifest.ts                # PWA manifest
│   ├── icon.tsx                   # programmatic 256×256 icon
│   ├── signin/page.tsx            # Google OAuth button
│   ├── auth/callback/route.ts     # OAuth code → session exchange
│   ├── search/page.tsx
│   ├── add/price/page.tsx
│   ├── add/purchase/page.tsx
│   ├── history/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── Providers.tsx              # TanStack Query provider
│   ├── TopNav.tsx                 # server component, hidden when signed out
│   └── SignOutButton.tsx
└── lib/
    └── supabase/
        ├── client.ts              # browser client
        ├── server.ts              # server (RSC) client
        └── proxy.ts               # session refresh used by src/proxy.ts
supabase/
└── migrations/0001_initial.sql    # full schema + RLS policies
```

---

## Next.js 16 notes (read before editing)

This project uses Next 16. Several APIs differ from older versions:

- `middleware.ts` is renamed to **`proxy.ts`** (Node runtime only).
- `cookies()`, `headers()`, route `params`, and `searchParams` are **async** — `await` them.
- Turbopack is the default bundler (no `--turbopack` flag). Webpack-only plugins need `next build --webpack`.
- `next lint` is removed; lint via `eslint` directly.

When in doubt, read the matching guide under `node_modules/next/dist/docs/01-app/` rather than relying on prior Next.js memory.

---

## Deployment (Vercel)

1. **Push to a Git remote** (GitHub, GitLab, Bitbucket all work):
   ```bash
   git remote add origin git@github.com:<you>/grocery-tracker.git
   git push -u origin main
   ```
2. **Import on Vercel** — go to [vercel.com/new](https://vercel.com/new), pick the repo. Framework auto-detects as Next.js. No build-command override needed.
3. **Add environment variables** in Vercel → Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` — set to your Vercel production URL once known (e.g. `https://grocery-tracker.vercel.app`)
4. **Update Supabase redirect URLs** — Authentication → URL Configuration → add the Vercel production URL **and** any preview-deploy URL pattern (e.g. `https://*.vercel.app/auth/callback`).
5. **Update Google OAuth** — Cloud Console → Credentials → your OAuth client → Authorized redirect URIs → keep `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase still handles the OAuth handshake; the Vercel URL only matters via Supabase's allowlist).
6. **First deploy** kicks off automatically. Once green, open the URL on your phone → share menu → **Add to Home Screen**.

### Things that change between local dev and prod
- **Geolocation** works on `localhost` but not on plain-HTTP LAN IPs (iOS blocks GPS); Vercel is HTTPS so this just works.
- **Tesseract.js** downloads its WASM + language data on first use. Expect a one-time delay on the first photo OCR after install.
- **PDF.js worker** is loaded from cdnjs; offline / restricted-network users won't get PDF parsing.
