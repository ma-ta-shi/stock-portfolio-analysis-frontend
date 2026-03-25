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
| **CIO** | Reconciles 4 Pass 2 perspectives into final BUY/HOLD/SELL recommendation |

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
