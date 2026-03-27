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
- src/data/               — Data provider adapters (FMP primary, Alpha Vantage secondary)
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
- Shadow CIO: calibration benchmark agent, runs non-blocking after primary CIO (step 12 in orchestrator); same inputs, bear-biased prompt (bear 2×, bull 0.5×); result stored to shadow_predictions table only — not user-facing; phased to Milestone 2
- Every agent run has a unique trace_id logged via structlog
- LLM routing: Ollama primary, Claude API fallback on timeout/failure

## Key ORM Models (Learning System)
- `counterfactual_records` — stores runner-up alternatives from the Opportunity Ranker alongside the primary recommendation; scored at prediction resolution (`recommended_return`, `counterfactual_returns` JSON array, `was_best` bool, `rank_vs_counterfactuals`)
- `shadow_predictions` — stores Shadow CIO outputs; fields for primary vs shadow outlook (direction, confidence, return tier), `divergence_magnitude`, and scoring fields (`primary_accuracy`, `shadow_accuracy`, `which_was_closer`); indexed on `analysis_run_id` and composite `(which_was_closer, created_at)` for win-rate aggregation

## Testing
- pytest-asyncio auto mode (configured in pyproject.toml)
- httpx.AsyncClient for API tests, not TestClient
- SQLite in-memory for all database tests
- Mock LLM responses — never make real LLM calls in tests
- Pattern: Arrange → Act → Assert with explicit fixture setup
- All async — no sync test functions for async code
