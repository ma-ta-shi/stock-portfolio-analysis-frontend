Run the complete test suite for Stock Picker and report results.

1. Backend tests: `pytest -xvs --timeout=60`
2. Frontend tests: `cd frontend && npm test -- --run`
3. Lint check: `ruff check .`
4. Type check: `cd frontend && npx tsc --noEmit`

Report: pass/fail counts, any failures with file:line references, and suggested fixes.
