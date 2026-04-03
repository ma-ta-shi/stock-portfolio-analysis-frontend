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
- `useTickerSearch` in `use-ticker-search.ts` — mock lookup against 23 known tickers; matches exact ticker or partial name; 600ms delay; returns `TickerResult | null`
- `AddStockDialog` — `mode: 'watchlist' | 'portfolio'`; step 1 = search, step 2 = confirm (watchlist) or position input (portfolio)
- `EditPositionDialog` — pre-filled shares + avg cost; live book cost preview; calls `useUpdatePosition`
- When mocking `use-portfolio` in tests, always mock `useRemoveFromPortfolio`, `useUpdatePosition`, `useClosedPositions`, and `useSellPosition` in addition to `usePortfolioHoldings` (they are called by child components rendered inside `HoldingsTable`)

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
