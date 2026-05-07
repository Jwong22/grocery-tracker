# Grocery Tracker — Session Handoff

A single document to resume work on this project. Read this first.

---

## What we're building

A PWA for a small group of friends in Malaysia to:

1. **Record grocery prices** (manual / image / PDF / Excel; multi-image batch).
2. **Search the cheapest** option (mass like "carrot", or specific like "Australian carrot 500g packet"), travel-cost-adjusted from the user's location.
3. **Record purchases** and retrospectively flag whether each was the cheapest available at the time.

Full plan: `~/.claude/plans/i-am-starting-an-glimmering-knuth.md`.

---

## Locked-in decisions

| Concern | Decision |
|---|---|
| Distribution | PWA — installable to home screen on iOS + Android |
| Data model | Hybrid: shared price database, **private** purchase history |
| Auth | Google sign-in via Supabase Auth |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 |
| Backend / DB | Supabase (Postgres + Auth + Storage + RLS) — free tier |
| OCR (free path) | Tesseract.js (in-browser, no server) |
| Smart Parse (optional) | Google Gemini 1.5 Flash — free tier 1500 req/day |
| Maps | Leaflet + OpenStreetMap tiles |
| Geocoding | Nominatim (OSM) |
| Routing/distance | OSRM public demo (Mapbox free tier as fallback) |
| Hosting | Vercel free tier |
| Region/currency | Malaysia / MYR |
| Travel cost model | `price + (km × petrol_cost_per_km) + (hours × time_value_per_hour)` |
| Project location | `~/Projects/grocery-tracker` |

Deferred / skipped (intentional):
- **Serwist** for offline service worker — needs webpack config, but Next 16 defaults to Turbopack. Manifest alone makes the app installable; offline can be added later if wanted.
- **shadcn/ui** — using plain Tailwind for stubs; can layer shadcn primitives in later.
- **Push notifications** — not required for v1.

---

## CRITICAL: Next.js 16 deltas from training-data Next.js

The `AGENTS.md` in this project warns that Next 16 has breaking changes. Already-applied deltas:

- **`middleware.ts` is renamed to `proxy.ts`** — runs Node runtime only, not edge. Lives at `src/proxy.ts`.
- **`cookies()`, `headers()`, `params`, `searchParams` are async** — must be `await`ed. Done in `src/lib/supabase/server.ts`.
- **Turbopack is default** — no `--turbopack` flag needed; webpack-only plugins (Serwist) won't work without `next build --webpack`.
- **`next lint` is removed** — `package.json` script is `"lint": "eslint"`.
- **Image optimization blocks local IPs by default** — `dangerouslyAllowLocalIP: true` set in `next.config.ts` so dev URLs at LAN IPs work for phone testing.
- Use `PageProps<'/path'>` typegen helpers for route props. Run `npx next typegen` if needed.

Whenever editing Next.js code, **read the relevant file in `node_modules/next/dist/docs/`** before touching APIs. Do not trust prior Next.js memory.

---

## What's been built so far

```
~/Projects/grocery-tracker/
├── next.config.ts                              # ✅ allow local IP, security headers
├── package.json                                # ✅ deps installed (Supabase, Tesseract, Leaflet, SheetJS, pdfjs, TanStack Query, zod, lucide, leaflet types)
├── supabase/
│   └── migrations/0001_initial.sql             # ✅ full schema + RLS
└── src/
    ├── proxy.ts                                # ✅ Next 16 proxy (auth guard, redirects)
    ├── app/
    │   ├── layout.tsx                          # ✅ root layout, viewport, providers, top nav
    │   ├── manifest.ts                         # ✅ PWA manifest (programmatic icon)
    │   ├── icon.tsx                            # ✅ programmatic 256×256 icon via ImageResponse
    │   ├── page.tsx                            # ⚠️ still default scaffolding — needs replacing
    │   └── globals.css                         # default
    ├── components/
    │   ├── Providers.tsx                       # ✅ TanStack Query
    │   ├── TopNav.tsx                          # ✅ server component, hidden when signed out
    │   └── SignOutButton.tsx                   # ✅ client signOut
    └── lib/
        └── supabase/
            ├── client.ts                       # ✅ browser createBrowserClient
            ├── server.ts                       # ✅ async cookies createServerClient
            └── proxy.ts                        # ✅ updateSession used by src/proxy.ts
```

---

## What's still pending — pick up here

**Next session should start by reviewing this list, marking items via TodoWrite, and continuing.**

### 1. Sign-in flow (highest priority — nothing works without auth)

- `src/app/signin/page.tsx` — minimal page with a single "Continue with Google" button. Calls
  `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`${origin}/auth/callback\` } })`.
- `src/app/auth/callback/route.ts` — route handler that exchanges the `code` query param for a session via
  `supabase.auth.exchangeCodeForSession(code)`, then redirects to `next` query param or `/`.

### 2. Stub remaining route pages

All should render a placeholder with the page title and "TODO" so the navigation works end-to-end before features are built.

- `src/app/page.tsx` — Dashboard (replace existing default).
- `src/app/add/price/page.tsx`
- `src/app/add/purchase/page.tsx`
- `src/app/search/page.tsx`
- `src/app/history/page.tsx`
- `src/app/settings/page.tsx`

### 3. README with setup instructions

`README.md` (overwrite the create-next-app one) covering:
- Prerequisites: Node 20.9+, npm.
- **Supabase setup** — create project at supabase.com (free), copy URL + anon key, run `supabase/migrations/0001_initial.sql` in the SQL editor, create a private storage bucket named `receipts`.
- **Google OAuth setup** — in Supabase: Authentication → Providers → Google, add OAuth credentials from Google Cloud Console (configure authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`).
- **Gemini key (optional)** — for the future Smart Parse feature; users add their own in `/settings`.
- `.env.local` template:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- `npm run dev`, then phone-test at `http://<mac-LAN-ip>:3000`.

### 4. Verify end-to-end

- `npm run build` should succeed with no TS errors.
- `npm run dev` should start; visiting `/` should redirect to `/signin` (proxy guard).
- Once `.env.local` is filled, Google sign-in should redirect to Google → back to `/auth/callback` → `/`.

---

## Implementation order beyond this session (from the plan)

1. ⬜ Manual price-entry form (`/add/price`) with Product/Store autocomplete pickers + `react-hook-form` or `useActionState`.
2. ⬜ Cheapest search (`/search`) — first without travel adjustment, then add it.
3. ⬜ Manual purchase entry + history view + "did I buy the cheapest?" comparison badge.
4. ⬜ Image upload → Tesseract OCR → editable batch review table (`BatchReviewTable`).
5. ⬜ Smart Parse button (Gemini) — additive, same review UI.
6. ⬜ PDF + Excel ingest (pdfjs-dist + SheetJS).
7. ⬜ Settings page: home location, petrol/time costs, Gemini key, JSON export/import.
8. ⬜ Test PWA install on real iPhone + Android; verify camera capture and GPS.
9. ⬜ Deploy to Vercel; share URL with friends.

Reusable code locations once features start landing:
- `src/lib/ocr/{tesseract,smartParse,parseExcel,parsePdf}.ts`
- `src/lib/travel/cost.ts`
- `src/lib/geocode/nominatim.ts`
- `src/lib/search/cheapest.ts`
- `src/lib/purchase/compareToMarket.ts`

---

## External setup the user must do (one-time)

1. **Create Supabase project** at https://supabase.com (free tier).
2. **Run the migration** — open Supabase Studio → SQL Editor → paste `supabase/migrations/0001_initial.sql` → run.
3. **Create storage bucket** named `receipts` (private) in Supabase → Storage. Add a policy allowing authenticated users to insert into their own folder, e.g. `(auth.role() = 'authenticated')`.
4. **Configure Google OAuth**:
   - Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (web).
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Copy Client ID + Secret into Supabase → Authentication → Providers → Google.
5. **Fill `.env.local`** in the project root with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase → Project Settings → API).
6. (Later) **Gemini key** for Smart Parse — users supply their own in `/settings`; not required for core flows.

---

## Verification when picking up next session

```bash
cd ~/Projects/grocery-tracker
npm install            # in case anything new was added
npm run build          # should pass once stubs are in place
npm run dev            # http://localhost:3000
```

Then on phone (same Wi-Fi): `http://<mac-LAN-ip>:3000` — Add to Home Screen to test PWA install.

---

## Known issues / watch-outs

- **Node 21.1.0** is installed; Next.js 16 wants 20.9+ but it works. EBADENGINE warnings during install are non-blocking.
- **`pdfjs-dist`** + Turbopack: imports the worker via a special path; if it errors at runtime, configure `turbopack.resolveAlias` per `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.
- **Tesseract.js** ships large WASM/training-data files; lazy-import it only on the upload page.
- **OSRM public demo** has rate limits — for friend-group personal use it's fine, but if it starts 429-ing, switch to Mapbox Directions free tier (100k req/mo).
- **Nominatim** requires a custom `User-Agent` and ≤1 req/sec — wrap calls in `src/lib/geocode/nominatim.ts` with a simple queue.
- **iOS PWA caveats** — file `<input>` works but camera capture requires `accept="image/*" capture="environment"`. Geolocation requires HTTPS or `localhost` (LAN IPs over HTTP block GPS on iOS).
