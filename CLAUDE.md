# Stock Picker — AI-Powered Stock Analysis Platform

Python FastAPI backend + React/Vite/TypeScript frontend monorepo.
Multi-agent system (10 agents, two-pass pipeline) for AI-powered stock analysis.
Target: Canadian investors optimizing TFSA/RRSP/Trading accounts for early retirement.

## Project Structure
- src/            — FastAPI API, 10-agent orchestration, data pipeline, LLM layer
- frontend/       — React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- prompts/        — Agent prompt templates (prompts/{agent_name}/v{n}.txt)
- tests/          — pytest backend tests + vitest frontend tests
- docs/           — Architecture decisions and API specs

## Commands
- Backend dev:    `uvicorn src.api.app:app --reload --port 8000`
- Frontend dev:   `cd frontend && npm run dev`
- Test backend:   `pytest -xvs`
- Test frontend:  `cd frontend && npm test`
- Lint:           `ruff check . && ruff format --check .`
- Type check:     `cd frontend && npx tsc --noEmit`
- Migration:      `alembic upgrade head`
- New migration:  `alembic revision --autogenerate -m "description"`
- CLI analysis:   `python -m stock_picker.cli analyze SHOP.TO --account tfsa --timeline medium_term`

## Architecture Rules
- Layer separation: Router → Service → Repository (never skip layers)
- No DB calls in routers; no HTTP types in services
- All agents are async, run via orchestrator only (never called directly)
- Use FastAPI Depends() for dependency injection everywhere
- Use structlog for all logging — never print()

## Code Conventions
- Python: 3.12+ typing (str | None, not Optional[str])
- Pydantic v2 only (model_validator, field_validator, ConfigDict)
- SQLAlchemy 2.0 async only (select() style, never legacy query())
- Frontend: functional components + hooks only, TanStack Query for data fetching
- All new code must have tests

## Common Mistakes to Avoid
- DON'T use sync SQLAlchemy Session — always AsyncSession
- DON'T use Pydantic v1 decorators (@validator) — use v2 (field_validator)
- DON'T use Optional[X] — use X | None
- DON'T use Dict/List/Union from typing — use dict/list/| syntax
- DON'T use print() — use structlog
- ALWAYS run tests with timeout to prevent hanging
- ALWAYS separate Create, Update, and Read Pydantic schemas

## Context
- For backend architecture: see src/CLAUDE.md
- For frontend conventions: see frontend/CLAUDE.md
- For agent architecture: see docs/agent-architecture.md
- For API conventions: see docs/api-conventions.md
- For living project docs: ask me to check Notion — search 'Project Stock Picker'
- Your context window will be automatically compacted. Do not stop tasks early.
