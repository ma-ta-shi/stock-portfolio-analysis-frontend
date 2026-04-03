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

All Pass 1 agents use a structured CoT with a mandatory **DATA SANITY CHECK** step (based on FinCoT + FinChain research). Analysis memory (FinMem-based temporal decay) is injected when re-analyzing a stock with prior data.

**Pass 1 minimum data thresholds** — agents mark output `data_quality_assessment: "insufficient"` and `reliability_score < 20` below threshold:

| Agent | Minimum data required |
|-------|-----------------------|
| Stock Researcher | Company name + at least one recent filing or earnings transcript |
| Fundamental Analyst | At least 2 quarters of income statement + current price |
| Technical Analyst | At least 6 months of daily price data |
| Sentiment Analyst | At least 3 news articles from last 30 days |
| Macro Economist | Current interest rate + current inflation |

### Pass 2 — Strategy Agents (directional recommendations with confidence)

| Agent | Role |
|-------|------|
| **Bull Advocate** | Strongest case for buying; challenges bearish concerns |
| **Bear Advocate** | Strongest case against; challenges bullish assumptions |
| **Risk Advisor** | Position sizing, stop-loss levels, scenario analysis, tail risks |
| **Tax Strategist** | Account-specific tax optimization (TFSA/RRSP/Trading/General) |

Pass 2 `recommendation` field values: `"bullish"` | `"bearish"` | `"neutral"` — not BUY/HOLD/SELL (those are only in historical `Prediction` records).

After 20+ scored predictions, all Pass 2 agents receive an **agent-specific accuracy brief** in their context (FinCon NeurIPS 2024 pattern) + a **Winning Patterns Brief** (qualitative insight on their best-performing reasoning patterns).

**Risk Advisor**: receives pre-computed beta, volatility, max drawdown, liquidity metrics from the data pipeline. Passes these through with *interpretation* fields. Its unique contribution is scenario analysis — constructing specific downside scenarios with probability + magnitude. 7B–13B local model sufficient.

**Tax Strategist**: receives injected Canadian Tax Rules Reference (~400 tokens in system prompt). Covers TFSA/RRSP/Taxable accounts, withholding tax treaties, capital gains inclusion rate, superficial loss rule, contribution room constraints. 13B+ / Claude Sonnet recommended due to tax rule complexity.

### Synthesis

| Agent | Role |
|-------|------|
| **CIO** | Reconciles 4 Pass 2 perspectives into `stock_outlook` (5-point direction) + executive brief |

---

## CIO — Synthesis Details

**Confidence scoring** (applies to `overall_confidence` in output):
- 80–100: Strong consensus, one side clearly dominates, high data quality
- 60–79: Majority leans one direction with notable counterarguments
- 40–59: Mixed signals, strong arguments on both sides
- 20–39: Weak signal, limited data, or highly conflicting perspectives
- 0–19: Insufficient data

**Disagreement score behavior** (computed by orchestrator from Pass 2 output variance):
- Consensus (<20): CIO confidence aligns with consensus direction
- Mild dissent (20–40): CIO notes dissent, can still recommend with confidence
- Split decision (40–60): CIO confidence capped at 65 unless it can articulate a clear reason
- High conflict (60+): CIO defaults to neutral unless data overwhelmingly supports one direction

**Feedback-informed weighting** (injected after 20+ scored predictions): CIO receives an accuracy brief for each Pass 2 agent (direction accuracy %, sector-specific, timeline-specific, recent trend, notable pattern). Used to calibrate how much weight to give each perspective.

**Inter-run reflexion brief**: When re-analyzing a stock with a prior *scored* prediction, the CIO receives a reflexion brief (CryptoTrade Reflexion pattern, EMNLP 2024): prior action, expected return, actual outcome, diagnosis, lesson learned, and what changed since. Combines FinMem analysis memory with diagnostic feedback.

**Parallel short-term predictions**: Alongside the primary outlook, the CIO also produces lightweight 1-month and 3-month directional predictions (direction + confidence only, no narrative). These reuse the same reasoning at near-zero extra token cost, tripling prediction data accumulation. Weekly price-only checks run for 8 weeks after any prediction to detect early thesis deterioration.

**Model**: Cloud Claude (Opus) is strongly recommended as the **primary** model — most complex reasoning, longest context, highest-stakes output. Local 70B+ if cloud unavailable. Never fall back to a small model for the CIO.

---

## Portfolio Optimizer — 3-Agent Chain

Architecturally distinct from the 10-agent stock analysis pipeline. Runs **after** all individual stock analyses complete, consuming CIO `stock_outlook` outputs as input rather than raw financial data. Three separate LLM calls per optimization (~25,300 tokens total, ~$0.05–0.15 on Claude).

Full specification: Notion Agents page (Portfolio Optimizer section).

### Pre-computation Layer (no LLM — pure math)

Runs before any agent call. Assembles:
- Per-stock summary matrix: outlook, projected return, risk-adjusted return (projected return / volatility), dividend yield, tax efficiency score, sector, correlation to portfolio benchmark
- Portfolio composition metrics: sector/geography/account concentration (flags any sector >30%, any position >15%)
- Pairwise correlation matrix across all portfolio + watchlist stocks
- Account state: per-account value, available cash, contribution room remaining, holdings with cost basis and unrealized gain/loss
- User constraints from Settings (risk tolerance, max position size, sectors to avoid, time-sensitive cash needs, RRSP strategy, investment goals)
- Transaction cost estimates (per-stock round-trip cost from Settings)

### Sub-agent 1 — Portfolio Health Assessor

Evaluates current holdings using the pre-computed matrix. Outputs: health rating (`strong` → `weak`), holdings ranked by risk-adjusted projected return, identified concentration/diversification issues, and top 3 problems to address.

Model: `llama3.1:70b` / `claude-sonnet-4-6`

### Sub-agent 2 — Opportunity Ranker

Evaluates watchlist stocks as potential additions. Scoring formula: `(outlook score × 0.4) + (portfolio fit × 0.3) + (tax efficiency × 0.15) + (displacement improvement × 0.15)`. Identifies which current holding each candidate would replace and calculates expected improvement net of transaction costs. Outputs: ranked opportunity list with specific funding paths (available cash / displacement / rebalance / new capital).

The ranked list naturally provides **counterfactual alternatives** — runner-up stocks evaluated but not chosen. Stored in `counterfactual_records` alongside the primary recommendation and scored at prediction resolution. See Feedback Learning doc (Notion) Part 5 for full schema and scoring design.

Model: 13B local / `claude-sonnet-4-6`

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
| Portfolio change (add/remove holding) | Optional full chain — user-triggered "Re-optimize" |

### Token Budgets

| Sub-agent | Total |
|-----------|-------|
| Portfolio Health Assessor | ~7,000 |
| Opportunity Ranker | ~7,800 |
| Action Synthesizer | ~10,500 |
| **Total chain** | **~25,300** (~3 LLM calls) |

### Implementation Phasing

- **Milestone 1**: No portfolio optimization — CIO produces stock outlooks only
- **Milestone 2**: Single-agent Portfolio Optimizer (combines all 3 sub-agent roles into one prompt; less reliable but functional)
- **Milestone 3**: Full 3-agent chain as specified above
- **Milestone 4**: Quantitative optimization (heuristic or Black-Litterman) integrated into pre-computation layer

### Feedback Integration

Every optimization recommendation generates trackable predictions fed into the same learning loop as individual stock predictions:
- Stocks recommended to sell → bearish prediction
- Stocks recommended to buy → bullish prediction
- "No changes" → hold-portfolio prediction

Opportunity Ranker stores ranks 2–3 as counterfactual alternatives. Key metric: what % of the time does the system's top pick outperform the runner-up?

---

## Shadow CIO

Calibration benchmark agent introduced at **Milestone 2**. Runs non-blocking after the primary CIO, on the same compressed Pass 2 inputs, using a modified prompt that applies a deliberate directional bias:

- Bear weighting: **2×** (bearish arguments amplified)
- Bull weighting: **0.5×** (bullish arguments dampened)

Purpose: creates a structurally pessimistic alternative verdict. The divergence between primary and shadow CIO tracks how much bullish bias the primary carries. Over time, win-rate comparison (primary accuracy vs shadow accuracy) reveals which signals and regimes the primary CIO is over/underconfident on.

**Output schema**: same structure as primary CIO output but with shorter narrative (~1,000 tokens vs CIO's ~2,500). Stored to `shadow_predictions` table, not surfaced in the user-facing UI.

**Scoring**: at prediction resolution, both primary and shadow `direction_correct` are computed. Aggregate win rates segmented by sector, market regime, and disagreement level.

**High divergence flag**: when primary and shadow diverge by 2+ outlook grades (e.g. primary "bullish", shadow "somewhat_bearish" or worse), this is flagged in the primary CIO's accuracy brief: "Shadow CIO strongly disagreed on {ticker}. Historical data shows that at this divergence level, the primary outlook is correct only {X}% of the time. Consider reducing confidence."

**Model**: cheaper than primary CIO — `claude-sonnet-4-6` or local `llama3.1:13b`. Token budget: ~10,200 tokens per run.

---

## Accuracy Briefs and Winning Patterns Brief

After 20+ scored predictions, **all agents** (Pass 1 + Pass 2 + CIO) receive an **agent-specific accuracy brief** in their context:
```json
{
  "overall_direction_accuracy_pct": 62,
  "accuracy_this_sector_pct": 55,
  "accuracy_this_timeline_pct": 68,
  "recent_trend": "improving",
  "notable_pattern": "Tends to overweight momentum in tech stocks"
}
```

The **CIO** additionally receives accuracy data *about each of its input agents* (the Pass 2 agents), enabling it to calibrate trust in each perspective.

After 50+ predictions, a **Winning Patterns Brief** is also injected (qualitative insight):
- Most accurate recent analysis for this stock + the key insight that was correct
- Reasoning patterns that consistently produce correct predictions
- Strongest stock characteristics that correlate with this agent's accuracy

Pattern detection engine flags success patterns in the learning journal (`pattern_type: "winning_pattern"`).

Full design: Notion Feedback Learning doc Part 5.

---

## Calibration Speed & Learning Timeline

Full scenario analysis: Notion — "Calibration Speed & Learning System Scenario Analysis" (in project hub).

### Prediction thresholds for automated actions

| Threshold | Automated action unlocked |
|-----------|--------------------------|
| **5 scored predictions** | First diagnostic report; initial accuracy brief for agents |
| **20 scored predictions** | Shadow vs primary win-rate comparison; per-sector accuracy briefs |
| **50 scored predictions** | Full pattern detection; winning patterns brief injected into Pass 2 agents |

**Key nuance**: meaningful human-interpretable signals emerge before these thresholds:
- Equity curve draws from day one (every analysis adds a data point)
- Shadow CIO accumulates primary vs shadow comparisons from the first analysis
- Overconfidence patterns in the confidence calibration curve become visible by month 3–4

The thresholds govern *automated* decisions — a developer/PM can read the raw data meaningfully well before automation kicks in.

### The four portfolios are one compound system

Two users × two portfolios each is not four independent datasets. The shared overlap is the signal multiplier:
- ~20-stock overlap across both users creates double-scored predictions on the same tickers
- Agent vs manual divergence data (where the system disagreed with the user's own portfolio choices) feeds pattern detection
- Same stock held in different account types (e.g. RY.TO in RRSP vs TFSA) provides cross-account comparison data for tax-strategy agent calibration

By month 8–10, the combined system accumulates **80–100+ scored predictions**, far richer than any single portfolio in isolation.

### Warm-up backtest — highest-leverage pre-launch action

Running 30 historical analyses before going live provides:
1. A baseline accuracy measurement before live predictions begin
2. Multi-regime validation data (bull, bear, sideways periods) that would take 2+ years to accumulate naturally
3. An initial pool of predictions to enable automated action at the 5-prediction threshold immediately after launch

**Design deliberately** using the coverage targets in the Feedback Learning doc — not as 30 random analyses. Coverage targets include sector spread, market-cap spread, and at least one full correction/rally cycle in the backtest window.

### Real bottleneck: regime coverage, not prediction count

If the market stays in a single regime (e.g. extended bull run) for 18+ months post-launch, the system will accumulate predictions but be unable to validate bear-regime calls or promote regime-specific prompt changes. The warm-up backtest and deliberate sector diversification in both watchlists are the primary mitigations.

Implication for implementation: the `prediction_resolution` logic should tag each scored prediction with the market regime at prediction time (bull / bear / sideways / volatile) as a first-class field, so regime-segmented analysis is possible from the start.

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

### Output Validation and Error Tracking

Every agent output is validated against its Pydantic schema. Validation failures are captured via the centralized `ErrorService` with type `output_validation_failed` (severity: medium). Recurring failures (5+ occurrences) auto-escalate and are flagged as potentially auto-fixable prompt issues — a plain-English fix proposal is generated and surfaced on the System Health page for PM review.

See Technical Design doc (Notion) — Error Tracking and Monitoring System for full taxonomy, severity levels, and auto-fix workflow.

---

## Orchestrator Flow

File: `src/services/orchestrator.py`

```
1.  Assemble DataBundle (pre-computed fundamentals + technicals + risk metrics)
2.  Pre-flight data validation (check minimum data thresholds — fail early if insufficient)
3.  Load analysis memory for this stock (FinMem temporal decay — inject into relevant agents)
4.  asyncio.gather() — run all 5 Pass 1 agents in parallel
5.  Validate all Pass 1 outputs; evaluate Gate 1 (≥3/5 with reliability_score ≥30, including fundamental or stock researcher)
6.  Compress Pass 1 outputs (~500–800 tokens each; narrative →~300 tokens; reliability fields always preserved)
7.  Compute disagreement score from Pass 1 key findings
8.  asyncio.gather() — run all 4 Pass 2 agents in parallel
9.  Validate all Pass 2 outputs; evaluate Gate 2 (≥2/4 complete, including bull or bear)
10. Compute final disagreement score across Pass 2 recommendations
11. Run CIO with compressed Pass 2 outputs + accuracy briefs (if ≥20 scored predictions) + reflexion brief (if prior scored prediction exists)
12. Persist full analysis to database
13. Create prediction tracking records (primary timeline + parallel 1-month + 3-month predictions)
14. Capture analysis memory snapshot (key insights → stock_analysis_memory table)
15. Report any errors to ErrorService
16. Run Shadow CIO (non-blocking — result stored to shadow_predictions)
17. Trigger Portfolio Optimization chain if this was the last analysis in a batch run
```

**Gate failures**: Gate 1 failure → run marked `failed` with `insufficient_data`, user sees which data was missing. Gate 2 failure → run marked `completed_with_warnings`, CIO confidence capped at 35.

---

## LLM Routing

| Agent | Recommended local | Recommended cloud |
|-------|-------------------|-------------------|
| Pass 1 agents (all) | 7B–13B | Claude Sonnet |
| Bull / Bear advocates | 13B–70B | Claude Sonnet (cloud fallback recommended — local 7B produces shallow arguments) |
| Risk Advisor | 7B–13B | Claude Sonnet |
| Tax Strategist | 13B+ | Claude Sonnet |
| CIO | 70B+ | **Claude Opus** (primary recommendation — never use small model) |
| Shadow CIO | 13B | Claude Sonnet |
| Action Synthesizer | — | **Claude Sonnet minimum / Opus preferred** |

- **Primary**: Ollama local inference
  - Pass 1 & 2: `llama3.1:8b-instruct-q5_K_M` (~30 tok/s on RTX 4070 Ti Super)
  - CIO + large agents: `llama3.1:70b-instruct-q4_K_M` (~5–8 tok/s, uses RAM offload)
- **Fallback / Strongly preferred**: Claude API (triggered on timeout or JSON parse failure, or for CIO/Action Synthesizer)
  - Default: `claude-sonnet-4-6`
  - CIO: `claude-opus-4-6` (~$0.10–0.30 per call)

---

## Output Compression (Pass 1 → Pass 2)

Each Pass 1 output is compressed to ~500–800 tokens before being passed to Pass 2 agents:
- The full `structured_data` JSON is preserved (already compact)
- The `narrative` is truncated to ~300 tokens (key points only)
- The `reliability_score` and `reliability_factors` are **always preserved in full**
- Total Pass 1 input to each Pass 2 agent: ~3,000–4,000 tokens (5 agents × ~700 tokens each)

Raw data (filings, news, transcripts) is **never injected directly** into any agent. Always summarized/chunked by the data pipeline first.

---

## Disagreement Score

Computed after Pass 2 to inform the CIO context:
- `0.0–0.3`: Low disagreement — agents broadly aligned
- `0.3–0.6`: Moderate disagreement — mixed signals
- `0.6–1.0`: High disagreement — adversarial debate needed

The CIO receives the disagreement score and is instructed to address key disagreements explicitly in its executive summary.

---

## Token Budgets Per Agent

| Agent | System prompt | Data input | Expected output | Total |
|-------|--------------|------------|-----------------|-------|
| Stock Researcher | ~800 | ~3,000 | ~1,500 | ~5,300 |
| Fundamental Analyst | ~600 | ~2,000 | ~1,200 | ~3,800 |
| Technical Analyst | ~600 | ~1,500 | ~1,000 | ~3,100 |
| Sentiment Analyst | ~600 | ~2,500 | ~1,200 | ~4,300 |
| Macro Economist | ~600 | ~1,500 | ~1,000 | ~3,100 |
| Bull / Bear Advocate | ~800 | ~4,000 | ~1,500 | ~6,300 |
| Risk Advisor | ~800 | ~4,000 | ~1,500 | ~6,300 |
| Tax Strategist | ~1,200 | ~3,000 | ~1,500 | ~5,700 |
| **CIO** | ~1,500 | ~8,000 | ~2,500 | **~12,000** |

Pass 1 agents: fit within 8K context (local 7B–13B). Pass 2 agents: 8K–16K. CIO: 16K+ minimum.

---

## Feedback Analyst (meta-agent)

Not part of the analysis pipeline — runs after predictions are scored, as part of the learning system. Receives the original analysis (all agent outputs), the predicted return, actual outcome, and any events during the period.

**Outputs**: structured root cause diagnosis — which agent(s) contributed to prediction errors, error classification (direction wrong / magnitude over- / underestimate / timing error), agent-specific lessons, recurring pattern flags. Feeds the learning journal, which drives prompt improvements.

**Model**: Claude Sonnet or Opus recommended (diagnostic reasoning quality is critical).

Full specification: Notion Feedback Learning doc Part 3 (Stage 3: Diagnosis).

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
