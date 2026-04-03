# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Stock Picker — AI-Powered Stock Analysis Platform

Python FastAPI backend + React/Vite/TypeScript frontend monorepo.
Multi-agent system (10 agents, two-pass pipeline) for AI-powered stock analysis.
Target: Canadian investors optimizing TFSA/RRSP/Trading accounts for early retirement.

## Project Structure
- `src/`            — FastAPI API, 10-agent orchestration, data pipeline, LLM layer
- `frontend/`       — React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- `prompts/`        — Agent prompt templates (`prompts/{agent_name}/v{n}.txt`)
- `tests/`          — pytest backend tests + vitest frontend tests
- `docs/`           — Architecture decisions and API specs

## Commands

### Backend
```bash
uvicorn src.api.app:app --reload --port 8000   # dev server
pytest -xvs                                     # all tests
pytest tests/path/to/test_file.py -xvs         # single file
pytest -xvs -k "test_name"                      # single test
ruff check . && ruff format --check .           # lint
alembic upgrade head                            # run migrations
alembic revision --autogenerate -m "desc"       # new migration
python -m stock_picker.cli analyze SHOP.TO --account tfsa --timeline medium_term
```

### Frontend
```bash
cd frontend && npm run dev                      # dev server
cd frontend && npm test                         # all tests
cd frontend && npx tsc --noEmit                 # type check
cd frontend && npm run lint                     # lint (no output = clean)
cd frontend && npm run build                    # full build verification
cd frontend && npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
```

## Architecture Rules
- Layer separation: Router → Service → Repository (never skip layers)
- No DB calls in routers; no HTTP types in services
- All agents are async, run via orchestrator only (`src/services/orchestrator.py`) — never called directly
- Use `FastAPI Depends()` for dependency injection everywhere
- Use `structlog` for all logging — never `print()`

## Agent Pipeline

Two-pass pipeline — analysis takes 30–120 seconds; use async status polling or WebSocket:

```
Pass 1 (parallel): Fundamental Analyst, Technical Analyst, Sentiment Analyst, Macro Economist, Stock Researcher
    → compress each output to ~500 tokens
Pass 2 (parallel): Bull Advocate, Bear Advocate, Risk Advisor, Tax Strategist
    → compute disagreement score (0.0–1.0)
Synthesis: CIO → stock_outlook (5-point: bullish → bearish) + executive brief
Shadow CIO (non-blocking, step 12): same inputs, bear-biased prompt → stored to shadow_predictions for calibration
```

Analysis API flow:
```
POST /api/analysis          → { analysis_id, status: "queued" }
GET  /api/analysis/{id}/status
GET  /api/analysis/{id}     → full results
WS   ws://localhost:8000/ws/analysis/{id}  → real-time agent_complete / pass_complete events
```

## Portfolio Optimizer

Separate 3-agent chain that runs **after** stock analyses complete, consuming CIO outlooks as input. Architecturally distinct from the 10-agent pipeline. ~25,300 tokens / ~$0.05–0.15 per run.

```
Pre-computation (no LLM): portfolio matrix, correlations, account state, user constraints
    ↓
Sub-agent 1: Portfolio Health Assessor — ranks holdings, identifies concentration/diversification issues
    ↓
Sub-agent 2: Opportunity Ranker — scores watchlist stocks as additions, identifies displacement targets
    ↓
Sub-agent 3: Action Synthesizer — final executable recommendations (swap/rebalance/deploy/no-action)
```

Trigger modes: (1) Friday night batch → full chain; (2) "Available to Trade" → Action Synthesizer only (reuses cached outputs); (3) Manual re-optimize → full chain.

Action Synthesizer hardcoded rules: no RRSP withdrawals; TFSA sells flagged with contribution room impact; cross-account moves only for new capital; minimum 2% improvement threshold after costs; "no changes" is a valid output.

Implementation phasing: Milestone 2 = single-agent version; Milestone 3 = full 3-agent chain; Milestone 4 = quantitative pre-computation (Black-Litterman).

## LLM Routing
- **Primary**: Ollama local inference (RTX 4070 Ti Super)
  - Pass 1 & 2: `llama3.1:8b-instruct-q5_K_M`
  - CIO + Portfolio Health/Opportunity: `llama3.1:70b-instruct-q4_K_M` (RAM offload)
- **Fallback / Strongly preferred for CIO + Action Synthesizer**: Claude API
  - Pass 1/2: `claude-sonnet-4-6` | CIO: `claude-opus-4-6` (**primary recommendation** — never use small model for CIO)
  - Tax Strategist: Claude Sonnet preferred (tax rule complexity)
  - Action Synthesizer: `claude-sonnet-4-6` minimum / `claude-opus-4-6` preferred

## Data Providers
- **FMP** — primary, all stock data (fundamentals, prices, peers); 250 calls/day free; batch schedule Wed/Thu/Fri keeps 50-stock watchlist within free tier
- **Finnhub** — supplementary; news + AI sentiment for US stocks; 60 calls/min free
- **FRED** — US macro data; 120 calls/min free
- **Bank of Canada Valet API** — Canadian macro data; free, no API key
- **pandas-ta** — local technical indicator computation; no API calls
- **yfinance** — dev/test fallback only; not used in production
- **Alpha Vantage** — dropped; 25 calls/day is too restrictive
- First paid upgrade: FMP Starter ($19/month) at 60–70+ stocks. Full batch schedule and env vars: `src/CLAUDE.md`.

## Database
- Dev: SQLite + aiosqlite (zero config)
- Prod: PostgreSQL + asyncpg (set via `DATABASE_URL` env var)
- Always use `AsyncSession` — never sync `Session`

## Frontend Development Strategy
Frontend uses mock JSON files (`frontend/mock-data/`) before backend is ready.
- During frontend-first dev: fetch from `/mock-data/` JSON files
- When backend ready: swap to `http://localhost:8000/api/`
- TypeScript types in `frontend/src/types/` must mirror backend Pydantic schemas exactly

## Code Conventions
- Python 3.12+ typing: `str | None` not `Optional[str]`, `dict`/`list` not `Dict`/`List`
- Pydantic v2 only: `model_validator`, `field_validator`, `ConfigDict` — not `@validator`
- SQLAlchemy 2.0: `select()` style only — never legacy `db.query()`
- Frontend: functional components + hooks only; TanStack Query for all server state (no `useEffect` for fetching)
- Always separate Create, Update, and Read Pydantic schemas
- All new code must have tests; always run tests with `--timeout` to prevent hanging

## Common Mistakes
- DON'T use sync `Session` — always `AsyncSession`
- DON'T use Pydantic v1 `@validator` — use `field_validator`
- DON'T use `Optional[X]` — use `X | None`
- DON'T use `Dict`/`List`/`Union` from `typing` — use `dict`/`list`/`|` syntax
- DON'T call agents directly — always go through the orchestrator

## Calibration & Learning System

Prediction thresholds for automated actions: **5** (first diagnostic/accuracy brief) → **20** (shadow vs primary win-rate comparison) → **50** (full pattern detection + Winning Patterns Brief injected into Pass 2 agents). Meaningful human-readable signals appear before these thresholds — equity curve and shadow comparisons accumulate from day one.

The two users × two portfolios are **one compound system**: ~20-stock overlap creates double-scored predictions; same stock in different account types feeds tax-strategy calibration. Combined system reaches 80–100+ scored predictions by month 8–10.

**Pre-launch warm-up backtest** (30 historical analyses) is the highest-leverage action — provides multi-regime validation that would take 2+ years naturally. Design against coverage targets in the Feedback Learning doc (sector spread, market-cap spread, at least one correction/rally cycle).

Real bottleneck: **regime coverage, not prediction count**. Tag each `prediction_resolution` record with market regime (bull/bear/sideways/volatile) from day one to enable regime-segmented analysis.

Full scenario analysis: Notion — "Calibration Speed & Learning System Scenario Analysis". Full spec: `docs/agent-architecture.md` (Calibration Speed & Learning Timeline section).

## Further Context
- Backend architecture details: `src/CLAUDE.md`
- Frontend conventions: `frontend/CLAUDE.md`
- Full agent spec (prompts, I/O contracts): `docs/agent-architecture.md`
- API conventions and error codes: `docs/api-conventions.md`
- Architecture decisions: `docs/decision-log.md`
- Living project docs: Notion — search 'Project Stock Picker'
- Context window will be automatically compacted. Do not stop tasks early.
