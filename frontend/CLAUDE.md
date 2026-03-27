# Frontend — React + Vite + TypeScript + Tailwind CSS

## Stack
- React 18+ with TypeScript strict mode
- Vite for bundling and dev server
- Tailwind CSS for styling (no custom CSS unless necessary)
- shadcn/ui for component library
- TanStack Query for server state management
- Recharts for data visualization (stock charts, allocation charts)
- React Router for navigation

## Conventions
- Functional components with hooks only (no class components)
- Components: PascalCase files in src/components/
- Pages: in src/pages/ (one file per route)
- Hooks: use-prefixed files in src/hooks/
- TypeScript types in src/types/ — must match backend Pydantic schemas exactly
- TypeScript strict mode — no `any` without justification
- During frontend-first dev: fetch from /mock-data/ JSON files
- When backend ready: swap to real API at http://localhost:8000/api/

## Component Patterns
- Prefer explicit props typing over React.FC
- Extract custom hooks for reusable data-fetching or business logic
- Use Tailwind utility classes — avoid @apply except in base styles
- Chart components: consistent pattern in src/components/charts/

## Data Fetching
- TanStack Query (useQuery, useMutation) for ALL server state
- No useEffect for data fetching — use TanStack Query
- Optimistic updates for watchlist and portfolio mutations
- Mock data: frontend/mock-data/ with JSON matching every API response shape

## Pages (from Notion Front End Design spec)
- Home: morning briefing (alert types: outlook_change, portfolio_optimization, price_movement, etc.)
- Watchlist: outlook badge, projected return %, portfolio fit, full-row click → /stocks/:stockId
- Stock: drill-down at /stocks/:stockId — StockInfoSection + 90d chart + Layer1/Layer2 analysis + history table
- Analysis: /analysis/:analysisId — full agent results; Layer 1 = stock outlook, Layer 2 = portfolio context
- Portfolio: TFSA/RRSP/Trading/Combined tabs (session-persisted); holdings full-row click → /stocks/:stockId
- Feedback: accuracy dashboard, prediction history, walk-forward equity curve
- Settings: 4 tabs — Profile | Goals | Investment Preferences | Notifications

## Navigation Pattern
- Full-row clickable tables: use `onClick={() => navigate(...)}` on `<TableRow>`, NOT `<Link>` on one cell
- All stock links go to `/stocks/${stock_id}` (e.g. `stk_ry_to`, `stk_shop_to`)

## Mock Data Conventions
- Stock detail: `public/mock-data/stocks/{stockId}.json` + `public/mock-data/stocks/{stockId}/history.json`
- Stock IDs: `stk_` prefix + lowercased ticker with `.` → `_` (e.g. `RY.TO` → `stk_ry_to`, `MSFT` → `stk_msft`)
- `public/` prefix is dropped in fetch URLs — file at `public/mock-data/x.json` fetches as `/mock-data/x.json`

## Key Type Details
- `DisagreementLabel`: `'low' | 'moderate' | 'high'` (not consensus/mild/strong)
- `Recommendation` (`BUY|HOLD|SELL`) is kept only for Pass 2 agents and `Prediction` history — never on live display
- `StockOutlookDirection`: `'bullish' | 'somewhat_bullish' | 'neutral' | 'somewhat_bearish' | 'bearish'`
- A holding may exist in multiple accounts (e.g. RY.TO in RRSP + TFSA) — aggregate when building `HoldingSnapshot`

## Test Patterns
- Mock `useNavigate`: `vi.mock('react-router-dom', async (importOriginal) => ({ ...await importOriginal(), useNavigate: vi.fn() }))` then `vi.mocked(useNavigate).mockReturnValue(mockFn)` at module level
- Partial hook mocks: `{ data: [...], isLoading: false } as unknown as ReturnType<typeof useHook>`
