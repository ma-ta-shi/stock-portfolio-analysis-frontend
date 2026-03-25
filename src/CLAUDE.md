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
- Orchestrator: src/services/orchestrator.py — never bypass it
- Pass 1 (parallel): Fundamental Analyst, Technical Analyst, Sentiment Analyst, Macro Economist, Stock Researcher
- Pass 2 (parallel, after Pass 1 compression): Bull Advocate, Bear Advocate, Risk Advisor, Tax Strategist
- Synthesis: CIO — reconciles all Pass 2 perspectives into final recommendation
- Every agent run has a unique trace_id logged via structlog
- LLM routing: Ollama primary, Claude API fallback on timeout/failure

## Testing
- pytest-asyncio auto mode (configured in pyproject.toml)
- httpx.AsyncClient for API tests, not TestClient
- SQLite in-memory for all database tests
- Mock LLM responses — never make real LLM calls in tests
- Pattern: Arrange → Act → Assert with explicit fixture setup
- All async — no sync test functions for async code
