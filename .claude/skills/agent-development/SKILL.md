---
name: agent-development
description: "Guide for creating and modifying AI agents in the Stock Picker system. Use when building new agents or modifying existing agent prompts, schemas, or orchestration."
---

## Agent Development Guide

All agents follow this pattern:
1. Define input/output Pydantic schemas in `src/schemas/agents/`
2. Implement agent class in `src/agents/` inheriting from `BaseAgent`
3. Register agent in `src/services/orchestrator.py`
4. Create prompt template in `prompts/{agent_name}/v1.txt`
5. Add timeout handling for all LLM calls
6. Log all agent actions via structlog with correlation IDs (trace_id)
7. Write integration tests using mock LLM responses

## Pipeline Position
- **Pass 1 agents** (run in parallel, produce factual analysis — no buy/sell recommendations):
  Fundamental Analyst, Technical Analyst, Sentiment Analyst, Macro Economist, Stock Researcher
- **Pass 2 agents** (run in parallel after Pass 1, produce directional recommendations):
  Bull Advocate, Bear Advocate, Risk Advisor, Tax Strategist
- **Synthesis**: CIO — reconciles all perspectives into final recommendation

## Agent Communication
- Agents exchange typed messages via the orchestrator only
- Never call agents directly — always go through `src/services/orchestrator.py`
- Each agent run gets a unique `trace_id` for debugging
- Pass 1 outputs are compressed before being sent to Pass 2

## Output Schema Requirements
- Every agent output must be a valid Pydantic v2 model
- Pass 1: must include `analysis`, `key_findings`, `data_quality_flags`
- Pass 2: must include `recommendation` (BUY/HOLD/SELL), `confidence` (0.0–1.0), `rationale`
- CIO: must include `final_recommendation`, `confidence`, `executive_summary`, `dissenting_views`

## Prompt Template Format
File: `prompts/{agent_name}/v{n}.txt`
Structure: Role → Context → Analysis Instructions (Chain-of-Thought steps) → Output Format (JSON schema)
Never embed JSON examples inline in code — always load from prompt files.
