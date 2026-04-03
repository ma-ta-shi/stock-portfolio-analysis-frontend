# Backend — FastAPI + SQLAlchemy + Multi-Agent System

## Stack Details
- Python 3.12, FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2
- SQLite (dev) / PostgreSQL (prod) via Pydantic Settings
- structlog for structured logging, httpx for async HTTP
- pytest + pytest-asyncio + httpx.AsyncClient for testing
- pandas + pandas-ta for financial data pre-computation

## Directory Layout
- src/api/routes/          — Thin route handlers (delegate to services)
- src/agents/             — AI agent classes (10 agents, BaseAgent subclasses)
- src/data/               — Data provider adapters (FMP primary, Finnhub supplementary, FRED + BoC Valet for macro)
- src/llm/                — LLM provider abstraction (Ollama + Claude API with fallback)
- src/models/             — SQLAlchemy ORM models
- src/schemas/            — Pydantic v2 request/response/agent message models
- src/schemas/agents/     — Per-agent input/output Pydantic schemas
- src/services/           — Business logic, agent orchestration
- src/services/orchestrator.py — Central agent runner (Pass 1 → compress → Pass 2 → CIO)
- src/core/config.py      — Pydantic Settings with all env vars
- src/core/exceptions.py  — Domain exceptions (converted to HTTP only in routes)
- src/deps.py             — Dependency injection (db session, agents)
- prompts/                — Agent prompt files (prompts/{agent_name}/v{n}.txt)

## Data Provider Strategy

| Provider | Purpose | Limit | Key detail |
|----------|---------|-------|------------|
| **FMP** (primary) | All stock data — fundamentals, prices, financials, peers | 250 calls/day free | Every call counts; use batch endpoints |
| **Finnhub** (supplementary) | News + AI sentiment, primarily US stocks | 60 calls/min free | Sentiment field saves a Pass 1 agent call |
| **FRED** | US macro data (rates, CPI, GDP) | 120 calls/min free | Free, no daily cap |
| **Bank of Canada Valet API** | Canadian macro data | No API key needed | Free, no cap |
| **pandas-ta** | Technical indicator computation (RSI, MACD, etc.) | Local — no API calls | Runs on price history already fetched from FMP |
| **yfinance** | Dev/test fallback only | — | Not used in production |

**Alpha Vantage is dropped** — 25 calls/day is too restrictive for a 50-stock watchlist.

### 50-stock batch schedule (stays within 250 FMP calls/day free tier)

| Day | Content | ~Calls |
|-----|---------|--------|
| Wednesday | Fundamentals batch 1 (stocks 1–25): income, balance sheet, cash flow, ratios | ~175 |
| Thursday | Fundamentals batch 2 (stocks 26–50) + peer comparisons | ~175 |
| Friday | Time-sensitive: prices, volume, recent news (all 50) | ~104 |

Total monthly FMP cost: **$0**. First paid upgrade: FMP Starter ($19/month) at 60–70+ stocks or heavy on-demand analysis.

### Env vars (src/core/config.py)
```
FMP_API_KEY
FINNHUB_API_KEY
FRED_API_KEY         # free at fred.stlouisfed.org
# Bank of Canada Valet: no key needed
```

## SQLAlchemy 2.0 Pattern
```python
# CORRECT — async select() style
async def get_stock(db: AsyncSession, ticker: str) -> Stock | None:
    result = await db.execute(
        select(Stock).where(Stock.ticker == ticker)
        .options(selectinload(Stock.analyses))
    )
    return result.scalar_one_or_none()

# WRONG — never use legacy query() style
db.query(Stock).filter_by(ticker=ticker).first()  # NO
```

## Agent Architecture
- Agents are async classes in src/agents/ inheriting from BaseAgent
- Each agent has Pydantic input/output schemas in src/schemas/agents/
- Stock analysis orchestrator: src/services/orchestrator.py — never bypass it
- Pass 1 (parallel): Fundamental Analyst, Technical Analyst, Sentiment Analyst, Macro Economist, Stock Researcher
- Pass 2 (parallel, after Pass 1 compression): Bull Advocate, Bear Advocate, Risk Advisor, Tax Strategist
- Synthesis: CIO — reconciles Pass 2 perspectives into `stock_outlook` (5-point direction) + executive brief
- Portfolio Optimizer: separate 3-agent chain in src/services/portfolio_optimizer.py — Health Assessor → Opportunity Ranker → Action Synthesizer; runs after stock analyses complete; Action Synthesizer strongly prefers Claude over local Ollama
- Shadow CIO: calibration benchmark agent, runs non-blocking after primary CIO (step 16 in orchestrator); same inputs, bear-biased prompt (bear 2×, bull 0.5×); result stored to shadow_predictions table only — not user-facing; phased to Milestone 2
- Every agent run has a unique trace_id logged via structlog
- LLM routing: Ollama primary, Claude API fallback on timeout/failure

## Key ORM Models (Learning System)
- `counterfactual_records` — stores runner-up alternatives from the Opportunity Ranker alongside the primary recommendation; scored at prediction resolution (`recommended_return`, `counterfactual_returns` JSON array, `was_best` bool, `rank_vs_counterfactuals`)
- `shadow_predictions` — stores Shadow CIO outputs; fields for primary vs shadow outlook (direction, confidence, return tier), `divergence_magnitude`, and scoring fields (`primary_accuracy`, `shadow_accuracy`, `which_was_closer`); indexed on `analysis_run_id` and composite `(which_was_closer, created_at)` for win-rate aggregation

## Key ORM Models (Portfolio)
- `PortfolioHolding` — `shares` = current count (reduced on sells); `average_cost_basis` = recomputed as `total_book_cost / total_shares`; `total_book_cost` = sum of (shares × price) across all buys; `is_active` (False when all shares sold — soft close, never delete); `total_realized_gain_loss` (accumulated from sell transactions); `total_dividends_received`; `total_fees_paid`; `first_buy_date`; `last_transaction_date`. Key indexes: composite `(user_id, stock_id, account_type)` for fast lookups; `(user_id, is_active)` for separating active from closed.
- `PortfolioTransaction` — `transaction_type`: `buy|sell|dividend|drip|transfer_in|transfer_out`; `shares` is Optional (null for cash dividends); sell-only fields: `cost_basis_at_sell` (avg cost basis snapshot at time of sell, for audit), `realized_gain_loss` = `(price_per_share - avg_cost_basis) × abs(shares) - fees`, `realized_gain_loss_pct`; feedback fields: `active_prediction_id`, `system_outlook_at_sell`, `sell_aligned_with_system` (True if system was bearish and user sold; False if system was bullish but user sold anyway — feeds the learning engine). Key indexes: composite `(user_id, stock_id, transaction_date DESC)` for chronological history; `(holding_id, transaction_type)` for cost basis computation.
- `DividendEvent` — linked to a `portfolio_transactions` record (type: `dividend`); fields: `ex_date`, `payment_date`, `amount_per_share`, `total_amount`, `withholding_tax` (e.g. 15% US WHT on TFSA), `net_amount`, `dividend_type` (`eligible_canadian|us_qualified|foreign|return_of_capital`), `is_drip`
- **On sell transaction creation** the service: (1) computes `realized_gain_loss`; (2) snapshots `cost_basis_at_sell`; (3) reduces `holding.shares`; (4) adds P&L to `holding.total_realized_gain_loss`; (5) sets `holding.is_active = False` if shares reach 0; (6) checks active predictions and writes `sell_aligned_with_system`

## Error Tracking System
- `ErrorRecord` ORM model — tracks every error: `severity` (critical/high/medium/low), `component`, `error_type`, run/agent/stock context, full stack trace, `context` JSON, `resolution_status` (open → acknowledged → resolved/auto_fixed/wont_fix), `auto_fix_proposal` text, `occurrence_count` (deduplication: same error within 24h increments count), `first_seen`/`last_seen`
- `ErrorService` (`src/services/error_service.py`) — every component captures errors here; handles deduplication, root cause linking (e.g. Ollama down → all agent timeouts linked), auto-fix proposal generation, and severity escalation (5+ occurrences → auto-escalate)
- Error type catalog: 20+ types across 7 components (agent, llm, data_pipeline, orchestrator, optimizer, feedback, api, frontend); each has defined severity and auto-fixable flag; key types: `output_validation_failed` (medium, sometimes auto-fixable), `ollama_connection_failed` (critical), `fmp_rate_limited` (medium), `render_error` (medium, auto-fixable)
- Auto-fix workflow: auto-fixable errors get a plain-English proposal → PM reviews on System Health page → approves → copies pre-formatted prompt into Claude Code
- Critical errors trigger a red banner on all pages; low errors are error-dashboard-only; 5+ occurrences auto-escalate severity
- Full specification: Notion Technical Design — Error Tracking and Monitoring System

## Testing
- pytest-asyncio auto mode (configured in pyproject.toml)
- httpx.AsyncClient for API tests, not TestClient
- SQLite in-memory for all database tests
- Mock LLM responses — never make real LLM calls in tests
- Pattern: Arrange → Act → Assert with explicit fixture setup
- All async — no sync test functions for async code
