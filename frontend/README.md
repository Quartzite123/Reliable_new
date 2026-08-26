# Reliable Fresh — Export Management System (Frontend)

Internal PWA for Reliable Fresh's grape export workflow — farmer registration through quality inspection, harvesting, packing, cold storage, and export documentation. See `../CLAUDE.md`, `../Business_Rules.md`, `../PHASE_MAP.md`, and `../Open_Questions.md` in the repository root for full project context; this file only covers running and deploying the frontend itself.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + React Hook Form + Zod + TanStack Query. PWA via `vite-plugin-pwa`. No `localStorage`/`sessionStorage` anywhere — auth session lives in React state only (CLAUDE.md §12).

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

The app runs entirely against an in-memory **mock API** by default (`VITE_USE_MOCK` unset or `"true"`) — no backend required for local development. Seeded demo logins (password `password123` for all):

| Role | Email |
|---|---|
| Admin | `admin@reliablefresh.test` |
| Field Worker | `field@reliablefresh.test` |
| Lab Worker | `lab@reliablefresh.test` |
| Office Worker | `office@reliablefresh.test` |
| Stock/Inventory Manager | `inventory@reliablefresh.test` |

One seeded farmer (Ajay Digambar Vadje, MH-NSK-00123) has a plot that's already passed Field QC, so you can walk the full pipeline (Lab → Contract → Harvest → Weighing → Arrival QC → Packaging → Palletisation → Pre-Cooling) without re-entering upstream data.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base URL the typed HTTP client (`src/api/httpClient.ts`) targets once a real backend exists. |
| `VITE_USE_MOCK` | `true` | Set to `"false"` to switch every feature's API module from its in-memory mock to `httpClient` calls against `VITE_API_BASE_URL`. |

Every feature (`src/features/*/index.ts`) picks mock vs. real per this single flag — no per-feature wiring needed when the backend is ready.

## Scripts

```bash
npm run dev         # start dev server
npm run build        # tsc -b && vite build -> dist/
npm run preview      # preview the production build locally
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint
npm run test         # vitest run
```

## Deployment

Per `CLAUDE.md` §5, this project targets a **managed platform (Render or Railway)** — no raw VPS, no AWS/GCP/Azure. Both build the same way:

1. Build command: `npm run build`
2. Output directory: `dist/`
3. Serve as a static site with SPA fallback (all non-file routes → `index.html`) — required for client-side routing to work on refresh/deep links.
4. Set `VITE_API_BASE_URL` and `VITE_USE_MOCK=false` as build-time environment variables once the FastAPI backend is deployed and reachable.
5. HTTPS is required for the PWA service worker and camera/geolocation permission prompts to work — both Render and Railway provide this by default on their generated domains.

No server-side runtime is needed — this is a static SPA build. No database, no secrets, no server process to keep alive.

## PWA notes

- Installable manifest + service worker are generated automatically at build time (`vite-plugin-pwa`, `registerType: 'autoUpdate'`).
- Offline **data entry** is explicitly out of scope for v1 (CLAUDE.md §9) — the service worker only precaches the app shell so navigation still resolves; it never caches API responses, so every screen still requires a live connection to load or save data. The `NetworkStatusBanner` (shown app-wide) tells the worker when they've lost connectivity.
- If you rename or replace `public/favicon.svg`, keep an `any`-sized SVG so it continues to satisfy the manifest icon entry in `vite.config.ts`.

## Testing

`npm run test` runs Vitest + React Testing Library. Integration-style tests (`src/features/*/*.test.tsx`) drive the app through `App` end-to-end — login, navigate, fill forms — the same way a worker would, rather than calling functions directly. `src/test/flowHelpers.tsx` has shared helpers (`login`, `logout`, `advanceSeedPlotToWeighed`, `advanceSeedPlotToPacked`) for building on top of the seeded demo data without re-deriving the upstream steps in every test file.
