# Decision Log

Architecture Decision Records for Stock Picker. Update this file when making significant technical decisions. Claude will read this when planning features.

---

## 2025-12-15: SQLAlchemy 2.0 async over Tortoise ORM

**Context**: Need an async ORM for FastAPI with migration tooling.
**Decision**: SQLAlchemy 2.0 with aiosqlite (dev) / asyncpg (prod via Pydantic Settings).
**Reason**: Better ecosystem, mature Alembic migration tooling, team familiarity. Database-agnostic from day one — SQLite for zero-config MVP, PostgreSQL when batch scheduling requires concurrent reads.

---

## 2026-01-10: Agent message queue pattern over direct agent calls

**Context**: Early design had services calling agents directly, creating tight coupling.
**Decision**: Orchestrator pattern — all agent calls go through `src/services/orchestrator.py` with typed Pydantic message schemas.
**Reason**: Testability (mock orchestrator in tests), ability to add/remove agents without modifying callers, single place to manage parallelism and timeouts.

---

## 2026-01-10: SQLite (MVP) → PostgreSQL (production path)

**Context**: Need zero-config local setup for MVP; concurrent reads matter at scale.
**Decision**: SQLAlchemy ORM abstraction from day one. SQLite + WAL mode for MVP (single writer fine). PostgreSQL when Friday batch jobs + frontend polling create concurrency pressure.
**Migration trigger**: When batch analysis scheduler (Milestone 2) runs concurrently with frontend reads.

---

## 2026-01-10: Ollama primary LLM with Claude API fallback

**Context**: Cost minimization is a hard constraint (personal project, not corporate).
**Decision**: Ollama local inference as primary. Claude API as fallback on timeout or repeated JSON parse failures only.
**Cost model**: ~$0 for 95%+ of calls. Claude API ~$0.10–0.30 per CIO call when Ollama fails. Expected: $5–15/month at steady state.
**Hardware**: RTX 4070 Ti Super (16GB VRAM, 64GB RAM) — runs 8b models in VRAM, 70b with RAM offload.

---

## 2026-01-10: Two-pass pipeline architecture

**Context**: Need diverse perspectives without all agents seeing each other's outputs (anchoring bias).
**Decision**: Pass 1 (factual research, parallel) → compress → Pass 2 (strategic perspectives, parallel) → CIO synthesis.
**Reason**: Pass 1 agents produce unbiased factual analysis. Pass 2 agents receive compressed Pass 1 context, reducing token cost while maintaining signal. CIO synthesizes without anchoring to any single agent.

---

## 2026-01-10: Frontend-first development strategy

**Context**: Two-person team where PM (frontend) and Developer (backend) work weekends only.
**Decision**: PM builds frontend with mock JSON data before backend exists. Backend integration swaps mock fetches for real API calls.
**Reason**: Parallel workstreams — neither person blocks the other. UX validated before backend effort is committed. Mock data in `frontend/mock-data/` serves as implicit API contract.

---

*When Claude corrects a mistake or you make a new architectural decision, update this file.*
*Format: `## YYYY-MM-DD: Decision title` with Context, Decision, Reason.*
