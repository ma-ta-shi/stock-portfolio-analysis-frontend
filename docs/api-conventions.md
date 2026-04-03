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

## Portfolio Endpoints

```
GET /api/portfolio/{user_id}
  Response: all active holdings with current prices and unrealized P&L

GET /api/portfolio/{user_id}/summary
  Response: aggregated totals by account (unrealized P&L, realized P&L, total return, dividend income)

GET /api/portfolio/{user_id}/closed
  Response: closed positions with total_realized_gain_loss, avg_buy_price, avg_sell_price, holding_period per holding

POST /api/portfolio/{user_id}/holdings
  Body: { "ticker": "RY.TO", "account_type": "tfsa", "shares": 10, "price": 130.00, "transaction_date": "..." }
  Response: created holding with initial buy transaction

POST /api/portfolio/{user_id}/holdings/{holding_id}/buy
  Body: { "shares": 5, "price": 138.00, "transaction_date": "2026-04-02", "fees": 4.99 }
  Response: updated holding

GET /api/portfolio/{user_id}/holdings/{holding_id}/sell/preview?shares={n}&price={p}
  Response: { "realized_gain_loss": 420.00, "realized_gain_loss_pct": 12.5,
              "tax_impact": { "capital_gain": 210.00, "estimated_tax": 54.60 },
              "superficial_loss_warning": bool, "superficial_loss_detail": "..." }

POST /api/portfolio/{user_id}/holdings/{holding_id}/sell
  Body: { "shares": 10, "price": 145.50, "transaction_date": "2026-04-02", "fees": 4.99 }
  Response: updated holding (or closed holding with is_active: false if shares reach 0)

GET /api/portfolio/{user_id}/transactions
  Query: ?account_type=tfsa&transaction_type=sell&ticker=RY.TO&page=1&per_page=50
  Response: paginated list of all buy/sell/dividend/DRIP transactions; sell rows include realized P&L

GET /api/portfolio/{user_id}/holdings/{holding_id}/transactions
  Response: transaction history for a specific holding

POST /api/portfolio/{user_id}/holdings/{holding_id}/dividend
  Body: { "ex_date": "...", "payment_date": "...", "amount_per_share": 1.36, "is_drip": false }
  Response: created dividend_event + transaction record

PUT /api/portfolio/{user_id}/holdings/{holding_id}
  Body: { "shares_adjustment": 10, "notes": "Transfer in from Questrade" }
  Response: updated holding with transfer_in/transfer_out transaction
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
| `DATA_FETCH_FAILED` | 502 | Could not fetch data from FMP/Finnhub/FRED/BoC Valet |
| `LLM_TIMEOUT` | 504 | All LLM providers timed out |
| `VALIDATION_ERROR` | 422 | Request body failed Pydantic validation |
