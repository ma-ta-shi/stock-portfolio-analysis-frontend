# API Conventions

REST API patterns for the Stock Picker backend. All routes are prefixed `/api/`.

---

## URL Structure

```
/api/stocks              — Stock resolution and search
/api/watchlist           — Watchlist CRUD
/api/analysis            — Trigger and retrieve analysis
/api/portfolio           — Holdings and transactions
/api/predictions         — Prediction tracking and scoring
/api/feedback            — Accuracy and learning data
/api/users               — User profile management
/api/health              — Health check
```

---

## Response Formats

### Single resource
```json
{
  "id": "uuid",
  "ticker": "SHOP.TO",
  "name": "Shopify Inc."
}
```

### Collection (paginated)
```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "pages": 3
  }
}
```

### Error
```json
{
  "error": {
    "code": "STOCK_NOT_FOUND",
    "message": "No stock found for ticker XYZ",
    "details": { "ticker": "XYZ" }
  }
}
```

---

## Pagination

Query parameters: `?page=1&per_page=20`
Defaults: page=1, per_page=20, max per_page=100

---

## Analysis Workflow

Analysis is async — the pipeline can take 30–120 seconds.

```
POST /api/analysis
  Body: { "ticker": "SHOP.TO", "account_type": "tfsa", "timeline": "medium_term" }
  Response: { "analysis_id": "uuid", "status": "queued" }

GET /api/analysis/{id}/status
  Response: { "status": "running" | "complete" | "failed", "progress": { "pass": 1, "agents_complete": 3 } }

GET /api/analysis/{id}
  Response: full analysis object with all agent outputs

WebSocket: ws://localhost:8000/ws/analysis/{id}
  Events: { "event": "agent_complete", "agent": "fundamental_analyst", "pass": 1 }
          { "event": "pass_complete", "pass": 1 }
          { "event": "analysis_complete", "analysis_id": "uuid" }
```

---

## Enum Values

**account_type**: `tfsa` | `rrsp` | `trading` | `general`
**timeline**: `short_term` | `medium_term` | `long_term`
**recommendation**: `BUY` | `HOLD` | `SELL`
**analysis_status**: `queued` | `running` | `complete` | `failed`

---

## TypeScript Types

TypeScript types in `frontend/src/types/` must mirror these schemas exactly.
Generated from FastAPI OpenAPI schema when possible:
```bash
cd frontend && npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts
```

---

## Authentication

MVP: No authentication (single-machine, local network only).
Multi-user: Simple user profile switching via `X-User-Id` header or query param `?user_id=`.
No passwords or sessions in MVP — user identity is just a UUID stored in localStorage.

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `STOCK_NOT_FOUND` | 404 | Ticker not in system |
| `ANALYSIS_IN_PROGRESS` | 409 | Analysis already running for this ticker |
| `DATA_FETCH_FAILED` | 502 | Could not fetch data from FMP/Alpha Vantage |
| `LLM_TIMEOUT` | 504 | All LLM providers timed out |
| `VALIDATION_ERROR` | 422 | Request body failed Pydantic validation |
