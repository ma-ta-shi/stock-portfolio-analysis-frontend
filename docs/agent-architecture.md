# Agent Architecture — Multi-Agent Stock Analysis System

For the full agent specification (prompts, input/output contracts, per-agent detail), see the Notion Agents page: https://www.notion.so/325ea06798238004a793fc1720637698

---

## Pipeline Overview

Agents run in a two-pass pipeline plus a synthesis step.

```
DataBundle (pre-computed metrics)
    │
    ▼
┌─────────────────────────────────────────┐
│  Pass 1 — Research (5 agents, parallel) │
│  Fundamental Analyst                    │
│  Technical Analyst                      │
│  Sentiment Analyst                      │
│  Macro Economist                        │
│  Stock Researcher                       │
└─────────────────────────────────────────┘
    │
    ▼ (outputs compressed to token budget)
┌─────────────────────────────────────────┐
│  Pass 2 — Strategy (4 agents, parallel) │
│  Bull Advocate                          │
│  Bear Advocate                          │
│  Risk Advisor                           │
│  Tax Strategist                         │
└─────────────────────────────────────────┘
    │
    ▼ (disagreement score computed)
┌─────────────────────────────────────────┐
│  Synthesis — CIO (1 agent)             │
│  Final recommendation + executive brief │
└─────────────────────────────────────────┘
```

**Analysis context** flows through every agent:
- `account_type`: `tfsa` | `rrsp` | `trading` | `general`
- `timeline`: `short_term` (1–4 weeks) | `medium_term` (1–6 months) | `long_term` (6+ months)

---

## Agent Roles

### Pass 1 — Research Agents (factual analysis, no recommendations)

| Agent | Role |
|-------|------|
| **Fundamental Analyst** | Valuations, financial health, earnings quality, competitive position |
| **Technical Analyst** | Price action, trend, momentum indicators, support/resistance |
| **Sentiment Analyst** | News sentiment, social signals, analyst ratings, insider activity |
| **Macro Economist** | Interest rates, sector macro tailwinds/headwinds, currency exposure |
| **Stock Researcher** | Company-specific narrative, catalysts, risks, recent developments |

### Pass 2 — Strategy Agents (directional recommendations with confidence)

| Agent | Role |
|-------|------|
| **Bull Advocate** | Strongest case for buying; challenges bearish concerns |
| **Bear Advocate** | Strongest case against; challenges bullish assumptions |
| **Risk Advisor** | Position sizing, stop-loss levels, scenario analysis, tail risks |
| **Tax Strategist** | Account-specific tax optimization (TFSA/RRSP/Trading/General) |

### Synthesis

| Agent | Role |
|-------|------|
| **CIO** | Reconciles 4 Pass 2 perspectives into `stock_outlook` (5-point direction) + executive brief |

---

## Portfolio Optimizer — 3-Agent Chain

Architecturally distinct from the 10-agent stock analysis pipeline. Runs **after** all individual stock analyses complete, consuming CIO `stock_outlook` outputs as input rather than raw financial data. Three separate LLM calls per optimization (~25,300 tokens total, ~$0.05–0.15 on Claude).

Full specification: Notion Agents page (Portfolio Optimizer section).

### Pre-computation Layer (no LLM — pure math)

Runs before any agent call. Assembles:
- Per-stock summary matrix: outlook, projected return, risk-adjusted score, tax efficiency for every holding and watchlist stock
- Portfolio composition metrics: sector/geography/account concentration
- Pairwise correlation matrix across all positions
- Account state: cash, TFSA/RRSP contribution room, unrealized gains/losses
- User constraints from Settings (risk tolerance, account strategy preferences)

### Sub-agent 1 — Portfolio Health Assessor

Evaluates current holdings using the pre-computed matrix. Outputs: health rating (`strong` → `weak`), holdings ranked by risk-adjusted projected return, identified concentration/diversification issues, and top 3 problems to address.

Model: `llama3.1:70b` / `claude-sonnet-4-6`

### Sub-agent 2 — Opportunity Ranker

Evaluates watchlist stocks as potential additions. Scores each by outlook + diversification benefit + correlation analysis. Identifies which current holding each candidate would displace and calculates expected improvement net of transaction costs. Outputs: ranked opportunity list with specific funding paths.

The ranked list naturally provides **counterfactual alternatives** — the runner-up stocks that were evaluated but not recommended. These are stored alongside the primary recommendation in `counterfactual_records` and scored at prediction resolution time. See Feedback Learning doc (Notion) Part 5 for full schema and scoring design.

Model: `llama3.1:70b` / `claude-sonnet-4-6`

### Sub-agent 3 — Action Synthesizer

Highest-stakes output — produces final executable recommendations. Combines Health Assessor and Opportunity Ranker outputs into:
- Capital deployment (when "Available to Trade" is triggered)
- Swap recommendations (sell weak holding → buy strong watchlist candidate)
- Rebalance suggestions (shift allocation between existing positions)
- Account optimization (tax-efficient placement)

Every recommendation includes: confidence, expected improvement %, risk change, tax implications, account constraint verification.

**Hardcoded rules:**
- Never suggest RRSP withdrawals
- TFSA sells flagged with contribution room impact warning
- Cross-account moves limited to new capital deployment only
- Minimum 2% expected improvement after costs to justify a swap
- "No changes recommended" is a valid output

Model: `claude-sonnet-4-6` (strongly preferred over local Ollama for this agent)

### Trigger Modes

| Trigger | What runs |
|---------|-----------|
| Friday night batch (after all stock analyses) | Full 3-agent chain → Saturday morning briefing |
| "Available to Trade" user action | Action Synthesizer only (reuses cached Health/Opportunity outputs) |
| Manual "Re-optimize" button | Full 3-agent chain |

### Implementation Phasing

- **Milestone 2**: Simple single-agent version (Action Synthesizer only, no Health/Opportunity pre-agents)
- **Milestone 3**: Full 3-agent chain as specified above
- **Milestone 4**: Quantitative optimization (heuristic or Black-Litterman) integrated into pre-computation layer

### Feedback Integration

Every optimization recommendation generates trackable predictions fed into the same learning loop as individual stock predictions:
- Stocks recommended to sell → bearish prediction
- Stocks recommended to buy → bullish prediction
- "No changes" → hold-portfolio prediction

---

## Shadow CIO

Calibration benchmark agent introduced at **Milestone 2**. Runs non-blocking after the primary CIO, on the same compressed Pass 2 inputs, using a modified prompt that applies a deliberate directional bias:

- Bear weighting: **2×** (bearish arguments amplified)
- Bull weighting: **0.5×** (bullish arguments dampened)

Purpose: creates a structurally pessimistic alternative verdict. The divergence between primary and shadow CIO tracks how much bullish bias the primary carries. Over time, win-rate comparison (primary accuracy vs shadow accuracy) reveals which signals and regimes the primary CIO is over/underconfident on.

**Output schema**: same structure as primary CIO output but with shorter narrative. Stored to `shadow_predictions` table, not surfaced in the user-facing UI.

**Scoring**: at prediction resolution, both primary and shadow `direction_correct` are computed. Aggregate win rates are segmented by sector, market regime, and disagreement level. Used to auto-calibrate CIO prompt weights in later milestones.

**Model**: cheaper than primary CIO — `claude-sonnet-4-6` or local `llama3.1:13b`. Token budget: ~10,200 tokens per run.

Full specification: Notion Agents page (Shadow CIO section).

---

## Winning Patterns Brief

An agent-specific accuracy brief added to **Pass 2 agent context** (Milestone 3+). Unlike the standard accuracy brief (which shows recent performance metrics), the Winning Patterns Brief surfaces qualitative insight:

- Most accurate recent analysis for this stock with the key insight that was correct
- Reasoning patterns that consistently produce correct predictions (e.g. "Macro regime calls outperform when disagreement is high")
- Strongest stock characteristics that correlate with this agent's accuracy

**Identification**: the pattern detection engine is extended to flag success patterns in the learning journal (`pattern_type: "winning_pattern"`). These are injected into the relevant Pass 2 agent's context at analysis time.

Full design: Notion Feedback Learning doc Part 5.

---

## BaseAgent Interface

```python
class BaseAgent(ABC):
    name: str
    pass_number: int  # 1 or 2 (CIO is special)
    llm_provider: LLMProvider

    @abstractmethod
    async def build_messages(self, input: AgentInput) -> list[dict]: ...

    @abstractmethod
    async def parse_output(self, raw: str) -> AgentOutput: ...

    async def run(self, input: AgentInput, trace_id: str) -> AgentOutput:
        # Loads prompt template, calls LLM with timeout, validates output,
        # retries up to 3x with validation feedback injected
        ...
```

---

## Orchestrator Flow

File: `src/services/orchestrator.py`

```
1. Assemble DataBundle (pre-computed fundamentals + technicals + risk metrics)
2. asyncio.gather() — run all 5 Pass 1 agents in parallel
3. Validate all Pass 1 outputs against Pydantic schemas
4. Compress Pass 1 outputs to fit token budget
5. Compute disagreement score from Pass 1 key findings
6. asyncio.gather() — run all 4 Pass 2 agents in parallel
7. Validate all Pass 2 outputs
8. Compute final disagreement score across Pass 2 recommendations
9. Run CIO with compressed Pass 2 outputs
10. Persist full analysis to database
11. Create prediction tracking record
12. Run Shadow CIO (non-blocking — does not delay user-facing response; result stored to shadow_predictions)
```

---

## LLM Routing

- **Primary**: Ollama (local inference — zero marginal cost)
  - Pass 1 & 2: `llama3.1:8b-instruct-q5_K_M` (~30 tok/s on RTX 4070 Ti Super)
  - CIO: `llama3.1:70b-instruct-q4_K_M` (~5–8 tok/s, uses RAM offload)
- **Fallback**: Claude API (triggered on timeout or JSON parse failure)
  - Default: `claude-sonnet-4-6`
  - CIO fallback: `claude-opus-4-6` (~$0.10–0.30 per call)

---

## Output Compression (Pass 1 → Pass 2)

Each Pass 1 output is compressed to ~500 tokens before being passed to Pass 2 agents. The compressor extracts:
- Top 5 key findings
- Overall signal direction (bullish/neutral/bearish)
- Data quality flags
- Any critical risks or anomalies

---

## Disagreement Score

Computed after Pass 2 to inform the CIO context:
- `0.0–0.3`: Low disagreement — agents broadly aligned
- `0.3–0.6`: Moderate disagreement — mixed signals
- `0.6–1.0`: High disagreement — adversarial debate needed

The CIO receives the disagreement score and is instructed to address key disagreements explicitly in its executive summary.

---

## Trace ID Logging

Every agent run is tagged with a `trace_id` (UUID) that flows through all structlog events:
```python
log = structlog.get_logger().bind(trace_id=trace_id, agent=self.name, ticker=ticker)
log.info("agent_started")
log.info("llm_call_complete", tokens=response.usage.total_tokens, latency_ms=elapsed)
log.info("output_validated", valid=True)
```
This enables debugging a full pipeline run by filtering logs on `trace_id`.
