# Stock Picker — Frontend

React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Base UI), with TanStack Query for server state.

## Getting started

```bash
npm ci
cp .env.example .env.local   # then edit as needed
npm run dev
```

Open http://localhost:5173.

### Mock mode vs. backend

| Setting (`.env.local`) | Behaviour |
|---|---|
| `VITE_USE_MOCK=true` | Reads static JSON from `public/mock-data/`. No backend needed. Portfolio and watchlist edits update the in-memory cache only and are lost on reload. |
| `VITE_USE_MOCK` unset/false | Calls the FastAPI backend at `/api/...`. In dev, Vite proxies `/api` to `VITE_API_PROXY_TARGET` (default `http://localhost:8000`). |
| `VITE_API_BASE_URL` | Backend origin for production builds served from a different host. Leave empty when the backend serves the built frontend itself. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (uses `.env`; mock data if it sets `VITE_USE_MOCK=true`) |
| `npm run dev:live` | Dev server against the real backend (`.env.live` sets `VITE_USE_MOCK=false`); point it elsewhere with `VITE_API_PROXY_TARGET=http://localhost:8010` |
| `npm run gen:api` | Refreshes `src/types/openapi.gen.ts` (the API types), `api-routes.gen.json` (every route the backend serves), `units.gen.ts` and `api-fields.gen.json` (every property of every response schema) from a running backend (`API_URL=http://localhost:8010` for another port). Commit all four after a backend change; `-- --check` fails when they are stale. The API itself is documented in the backend repo, `backend/docs/api-reference.md`, generated from the same schema; there is no frontend copy |
| `npm test` | Run the Vitest suite once |
| `npm run gen:gaps` | Writes `docs/gap-register.md` from `src/lib/gaps.json` (every missing or not-yet-connected piece, with its ticket); `-- --check` runs in `npm test` |
| `npm run coverage:api` | Lists the API response schemas no screen has claimed yet (the epic is done when it is empty or every entry has a reason) |
| `npm run record:fixtures` | Records the Portfolio screen's API responses from a backend on a scratch database into `public/mock-data/portfolio/` (`API_URL=...`) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright: every page and key flow in a real browser (mock mode), light + dark, with axe-core accessibility checks |
| `npm run lint` | ESLint |
| `npx tsc -b` | Type check |
| `npm run build` | Type check + production build to `dist/` |

CI (`.github/workflows/frontend.yml`) runs the type check, lint, unit tests and build, plus the end-to-end suite as a separate job, on every push that touches `frontend/`. Locally, the first `npm run test:e2e` may need `npx playwright install chromium`.

## Project layout

```
src/
  components/      Shared components (dialogs, badges, QueryError, FormField, MoneyInput…)
    ui/            shadcn/ui primitives — regenerate with the shadcn CLI, don't hand-edit
    layout/        App shell (header, profile switcher)
  context/         UserContext (active profile)
  hooks/           One TanStack Query hook module per API resource
  lib/
    api.ts         apiFetch + ApiError (backend error envelope, timeouts, cancellation)
    query-keys.ts  The only place query keys are defined
    format.ts      Money / percent / date formatting
    fx.ts          Currency → CAD conversion for combined totals
    portfolio.ts   Holding snapshots, allocations, template filling
    sell-preview.ts  Client-side sell estimate (stand-in for the backend preview endpoint)
  pages/           One component per route (lazy-loaded), with sub-sections in folders
  types/           API response types — must match the backend Pydantic schemas
  test/            Test setup and shared fixtures
public/mock-data/  Mock API responses, one JSON file per endpoint
```

## Conventions worth knowing

- **Percentages are fractions.** The API sends `0.125` for 12.5%. Pass it straight to `formatPct` (signed) or `formatPercent` (unsigned). Never multiply by 100 at the call site.
- **Money is shown in its own currency.** Use `formatMoney(value, holding.stock.currency)`; USD renders as `US$1,234.56`. Combined totals across currencies must be converted with `toCad`/`sumInCad` and the rate from `useFxRates()`. Don't add USD and CAD amounts directly.
- **Every query handles errors.** Render `<QueryError what="…" error={error} onRetry={refetch} />`.
- **Query keys come from `queryKeys`** so queries and cache updates can't drift apart.

## Known limitations / future work

- **Phones and small screens.** The app targets a desktop browser. At phone widths the header overflows and several wide tables need horizontal scrolling. A responsive pass (collapsible nav, stacked summary cards, card-style tables) would make it usable on phones without a separate build.
- **Dev tooling updates.** `@vitejs/plugin-react` 6.2 can't be installed yet because of an upstream `@babel/core` 8 peer conflict, which also blocks some dev-only minor updates (ESLint, Vitest, Vite). `npm audit --omit=dev` is clean; the remaining advisories are in dev tools only.
