---
name: deploy
description: "Deployment checklist and procedures for Stock Picker. Use when preparing a release or deploying to production on the Windows desktop."
---

## Deployment Checklist

### Pre-deploy verification
- [ ] All tests passing: `pytest` and `cd frontend && npm test`
- [ ] No linting errors: `ruff check . && ruff format --check .`
- [ ] TypeScript clean: `cd frontend && npx tsc --noEmit`
- [ ] Migration applied: `alembic upgrade head`
- [ ] `.env` has production values (real API keys, PostgreSQL URL when migrating)

### Deploy steps (Windows desktop — primary production machine)
1. Pull latest: `git pull origin main`
2. Install Python deps: `pip install -e .`
3. Install Node deps: `cd frontend && npm install`
4. Run migrations: `alembic upgrade head`
5. Build frontend: `cd frontend && npm run build`
6. Start backend: `uvicorn src.api.app:app --host 0.0.0.0 --port 8000`
7. Serve frontend from `frontend/dist/`

### Ollama model setup (RTX 4070 Ti Super, 64GB RAM)
Pull commands to run once on the Windows desktop:
```bash
# Pass 1 & 2 agents (~6GB VRAM, ~30 tok/s)
ollama pull llama3.1:8b-instruct-q5_K_M

# CIO primary (~40GB with RAM offload, ~5-8 tok/s)
ollama pull llama3.1:70b-instruct-q4_K_M
```
Verify Ollama is running: `curl http://localhost:11434/api/tags`

### Mac laptop (Developer — development only)
```bash
ollama pull llama3.1:8b-instruct-q4_K_M  # Fits in M1 unified memory
```
