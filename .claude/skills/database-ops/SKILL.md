---
name: database-ops
description: "Guide for database migrations, schema changes, and SQLAlchemy patterns. Use when creating migrations, modifying models, or debugging database issues."
---

## Database Operations Guide

## Migration Workflow
1. Modify SQLAlchemy model in `src/models/`
2. Generate migration: `alembic revision --autogenerate -m "description"`
3. Review generated migration in `alembic/versions/` — ALWAYS review before applying
4. Apply: `alembic upgrade head`
5. Run `.claude/skills/database-ops/scripts/check_migration.sh` to verify

## SQLAlchemy 2.0 Async Patterns

### Correct — async select() style:
```python
async def get_stock(db: AsyncSession, ticker: str) -> Stock | None:
    result = await db.execute(
        select(Stock).where(Stock.ticker == ticker)
    )
    return result.scalar_one_or_none()
```

### Wrong — never use legacy query():
```python
db.query(Stock).filter_by(ticker=ticker).first()  # NEVER
```

## Model Conventions
- Always include `id`, `created_at`, `updated_at` on all tables
- Use `Mapped[type]` annotations (SQLAlchemy 2.0 style)
- Use `relationship()` with `back_populates`, not `backref`
- Never use `lazy="select"` on relationships in async code — use `selectinload()` explicitly

## Key Tables
- `stocks` — canonical stock records (ticker, name, exchange, aliases)
- `analyses` — full analysis results with all agent outputs and CIO recommendation
- `predictions` — prediction tracking records for the feedback/learning system
- `user_profiles` — per-user financial profile (account types, risk tolerance, goals)
- `stock_analysis_memory` — inter-run memory for CIO reflexion briefs
