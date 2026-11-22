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
- Mock mode (`VITE_USE_MOCK=true` in `.env.local`) reads `public/mock-data/`; otherwise `/api/...` is called and the Vite dev server proxies it to the backend (see `.env.example`)

## Component Patterns
- Prefer explicit props typing over React.FC
- Extract custom hooks for reusable data-fetching or business logic
- Use Tailwind utility classes — avoid @apply except in base styles
- Chart components: consistent pattern in src/components/charts/

## Data Fetching
- TanStack Query (useQuery, useMutation) for ALL server state
- No useEffect for data fetching — use TanStack Query
- Optimistic updates for watchlist and portfolio mutations
- Mock data: `public/mock-data/` with JSON matching every API response shape
- Query keys: always from `queryKeys` in `src/lib/query-keys.ts` (queries and cache updates)
- Pass TanStack Query's `signal` to `apiFetch`: `queryFn: ({ signal }) => apiFetch(mock, api, { signal })`
- Every query result must render an error state: `<QueryError what="…" error={error} onRetry={refetch} />`

## Formatting, Units & Currency
- Formatting lives in `src/lib/format.ts` (`src/lib/utils.ts` only has `cn`)
- API ratios are fractions (0.125 = 12.5%): `formatPct(x)` (signed) / `formatPercent(x)` (unsigned) — never `x * 100` at the call site
  - Exception: the optimizer's `expected_return_improvement_pct` / `*_weight_pct` are whole percents (backend inconsistency, displayed as-is)
- Per-holding money is in the holding's currency: `formatMoney(v, h.stock.currency)` (USD renders `US$`). `formatCAD` only for `_cad` fields
- Signed amounts: `formatMoney(v, cur, { signed: true })` — never prepend `'+'` manually (formatPct/signed money already sign)
- Combined cross-currency totals: convert with `toCad`/`sumInCad` (`src/lib/fx.ts`) using `useFxRates()`; unknown rates are reported, never summed as CAD
- Dates: display API date strings with `formatDate` / `parseDate` — never `new Date(apiString)` (date-only strings parse as UTC midnight = the previous day in Canada). Date inputs default to `localDateInputValue()` and are sent to the API as the `YYYY-MM-DD` string, not `toISOString()`
- Tests run with `TZ=America/Toronto` (vitest.config.ts) so timezone bugs surface

## Colour, Contrast & Theme
- Status colours come from `TONE_TEXT` / `BADGE` / `gainLossColor` in `src/lib/labels.ts` — every pair meets WCAG AA (≥ 4.5:1) in light and dark mode. Don't use raw Tailwind 400–600 shades for text or white-on-colour badges (they fail on white)
- Dark mode follows the OS setting (inline script in `index.html` toggles `.dark`); any new colour class needs a `dark:` counterpart
- `--destructive` is red-700 in light mode for contrast; don't revert to the shadcn default
- Verified with axe-core (0 violations on every page, both themes) — re-run after visual changes
- `src/test/contrast-guard.test.ts` fails the build on low-contrast shades and on `hover:text-x dark:text-y` (must be `dark:hover:text-y`, otherwise the colour applies permanently in dark mode)

## Pages (from Notion Front End Design spec)
- Home: morning briefing (alert types: outlook_change, portfolio_optimization, price_movement, etc.)
- Watchlist: outlook badge, projected return %, portfolio fit, full-row click → /stocks/:stockId; "Add Stock" button (ticker/name search → exchange confirm → add); trash icon per row with confirmation dialog to remove
- Stock: drill-down at /stocks/:stockId — StockInfoSection + 90d chart + Layer1/Layer2 analysis + history table
- Analysis: /analysis/:analysisId — full agent results; Layer 1 = stock outlook, Layer 2 = portfolio context
- Portfolio: Combined/TFSA/RRSP/Trading account switcher (session-persisted); subtabs **Holdings | Optimizer | Transactions | Allocation** (in that order); "Add Stock" button inline on right of subtab bar, visible only when Holdings is active; Holdings rows full-row click → /stocks/:stockId with pencil (edit position) and trash (remove/sell) icons; Optimizer subtab contains AvailableToTradeWidget above optimizer results; add stock flow: ticker/name search → exchange confirm → shares + avg cost + account → add
  - **Record Sell workflow**: modal shows current position (shares, avg cost basis, market value, unrealized P&L) → user enters shares to sell (validated ≤ current shares), price per share (defaults to market price), transaction date, fees → live realized P&L preview `(sell price - avg cost basis) × shares - fees` shown in green/red → Trading account: tax implications shown ("Realized gain of $X → taxable capital gain of $X/2 → estimated tax of $Y") → Trading account loss: superficial loss warning if stock also held in TFSA/RRSP or on watchlist → on confirm: creates `sell` transaction (negative shares), stores `realized_gain_loss`, reduces holding shares, recalculates unrealized P&L on remainder; if shares reach 0 sets `is_active: false` (soft close, NOT delete) and stock moves to Closed Positions
  - **Closed Positions**: collapsible section below active holdings table (within Holdings subtab); shows ticker, account type, total shares bought, avg buy price, total shares sold, avg sell price, total realized P&L ($ + %, colour-coded), holding period (first buy → last sell date), "View history" link to full transaction log
  - **Transactions subtab**: all buy/sell/dividend/DRIP transactions across all holdings; filterable by account type, transaction type, date range, ticker; sortable by date (default: newest first); CSV-exportable for tax records; each sell row shows realized P&L inline
  - **Portfolio Performance summary bar**: unrealized P&L + realized P&L + total P&L + dividend income + total return `(unrealized + realized + dividends - fees) / total capital invested`; available per-account and combined
  - **Remove holding**: only allowed for holdings with zero transaction history (accidental add); any holding with transactions must be exited via the sell workflow to preserve P&L history
  - **Record Dividend**: "Log Dividend" button → modal pre-populated with dividend per share and shares held; user confirms ex-date, payment date, total amount; option to mark as DRIP (auto-adds shares at reinvestment price, creates additional `drip` transaction)
  - **Edit holding (manual adjustment)**: "Adjust" button for correcting shares or cost basis (transfer in, stock splits, data entry fixes); requires mandatory `notes` field; creates `transfer_in` or `transfer_out` transaction for audit trail
  - **Export**: CSV of current holdings, CSV of transaction history (with realized P&L per sell), CSV of closed positions, PDF portfolio report
- Feedback: accuracy dashboard, prediction history, walk-forward equity curve; includes shadow vs primary comparison chart, counterfactual hit rate metric, per-agent winning patterns display
- System Health: section 6 (before Settings) — health check panel (Ollama/Claude API/FMP/Finnhub/FRED/DB/cron live status), error dashboard (summary cards + sortable/filterable error table with expandable details), auto-fix proposals (review/approve/reject + "Copy to Claude Code" button), error trends chart (30-day history, top error types, component breakdown)
- Settings: 4 tabs — Profile | Goals | Investment Preferences | Notifications

## Error Handling
- React Error Boundaries catch render errors and POST to `/api/errors` — frontend errors appear in the same System Health dashboard as backend errors
- Global header: green/yellow/red health indicator dot next to the notification bell (reflects worst active error severity)
- Error severity UI treatments: critical = red banner on all pages; high = warning on relevant page; medium/low = error dashboard only

## Watchlist & Portfolio Mutations
- `useAddToWatchlist`, `useRemoveFromWatchlist` in `use-watchlist.ts` — update TanStack Query cache directly (mock mode; no API call)
- `useAddToPortfolio`, `useRemoveFromPortfolio`, `useUpdatePosition` in `use-portfolio.ts` — same pattern; `useUpdatePosition` recalculates `market_value`, `total_gain_loss`, `total_gain_loss_pct`, `yield_on_cost`
- `useTickerSearch` in `use-ticker-search.ts` — mock lookup (exact ticker, then partial name; 600ms delay) in mock mode, `GET /api/stocks/resolve?q=` otherwise (endpoint path assumed — not yet in docs/api-conventions.md); returns `TickerResult | null`
- `useAllocationAnalysis` in `use-allocation-analysis.ts` — "Analyze allocation" on the Optimizer tab; set `ALLOCATION_ENDPOINT` to connect it to the backend
- Sell preview maths: `estimateSell()` in `src/lib/sell-preview.ts` (swap for the backend `sell/preview` endpoint when wired)
- `AddStockDialog` — `mode: 'watchlist' | 'portfolio'`; step 1 = search, step 2 = confirm (watchlist) or position input (portfolio); in watchlist mode a stock already on the watchlist can't be added again
- Transactions filters (type, ticker, from/to, holding) live in the URL query string via `useTransactionFilters()`; logic in `src/lib/transactions.ts`. Portfolio subtab is `?tab=`. Link to one position's history with `holdingHistoryHref(holdingId)`
- `EditPositionDialog` — pre-filled shares + avg cost; live book cost preview; calls `useUpdatePosition`
- When mocking `use-portfolio` in tests, always mock `useRemoveFromPortfolio`, `useUpdatePosition`, `useClosedPositions`, and `useSellPosition` in addition to `usePortfolioHoldings` (they are called by child components rendered inside `HoldingsTable`)
- Components rendering `SellPositionDialog` or building holding snapshots also need `use-user-profile` and `use-fx-rates` mocked

## Navigation Pattern
- Full-row clickable tables: spread `clickableRowProps(() => navigate(...), 'View TICKER')` (`src/lib/a11y.ts`) on `<TableRow>` — adds keyboard (Tab/Enter) support. Cells with buttons stop click *and* keydown propagation
- Link-styled buttons: `<ButtonLink to="…" variant="outline">` (`src/components/ButtonLink.tsx`) — renders a real `<a>`. Never nest `<Button>` inside `<Link>`, and never `<Button render={<Link />}>` (Base UI adds `role="button"`, so it's announced as a button)
- Icon-only buttons need `aria-label`; decorative icons get `aria-hidden="true"`
- Form fields: use `<FormField label="…">{(id) => <Input id={id} … />}</FormField>` so labels are linked
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
- `WatchlistItem` market and analysis fields are nullable: a newly added stock is `null` until priced / analysed (`isAwaitingAnalysis()` in `src/lib/watchlist.ts` = `last_analyzed_at == null`). Render "Awaiting analysis" / "—", never placeholder values; sorting puts nulls last

## Test Patterns
- Unit/component tests: `src/**/*.test.{ts,tsx}` (Vitest). End-to-end: `e2e/*.spec.ts` (Playwright, `npm run test:e2e`) — runs every route and key flow in light and dark mode, fails on axe-core violations or console errors. Add a flow there for any new user-facing feature
- `@playwright/test` is pinned to an exact version (each version needs its matching browser build). After changing it, run `npx playwright install chromium`
- Mock `useNavigate`: `vi.mock('react-router-dom', async (importOriginal) => ({ ...await importOriginal(), useNavigate: vi.fn() }))` then `vi.mocked(useNavigate).mockReturnValue(mockFn)` at module level
- Partial hook mocks: `{ data: [...], isLoading: false } as unknown as ReturnType<typeof useHook>`
