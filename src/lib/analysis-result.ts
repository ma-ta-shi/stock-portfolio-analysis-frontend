/** One analysis result as the Analysis page draws it: its agents in reading order. */
import type { components } from '@/types/openapi.gen'

type Api = components['schemas']
export type ApiResult = Api['AnalysisResultResponse']
type ApiAgentOutput = ApiResult['agent_outputs'][number]

/** The agents the page lists, in order. The CIO is the page itself; the shadow CIO and the retired outputs are not listed. */
const AGENTS = [
  ['FUND', 'Fundamental Analyst', 1],
  ['TECH', 'Technical Analyst', 1],
  ['SENT', 'Sentiment Analyst', 1],
  ['MACRO', 'Macro Economist', 1],
  ['RSRCH', 'Stock Researcher', 1],
  ['bull', 'Bull Advocate', 2],
  ['bear', 'Bear Advocate', 2],
  ['risk', 'Risk Advisor', 2],
] as const

export interface AgentRisk {
  risk: string
  severity: string | null
}

export interface AgentView {
  key: string
  name: string
  pass: 1 | 2
  /** False when the agent did not finish; its sections are then empty. */
  completed: boolean
  /** Bull and Bear only; 0 to 100. */
  confidence: number | null
  /** Pass 1: the assessment and the narrative. */
  findings: string[]
  /** Pass 1 only: risks to the stock. */
  risks: AgentRisk[]
  /** Bull and Bear only: what would break their own case (for the Bear, often good news for the stock). */
  caseRisks: AgentRisk[]
  strongest: string | null
  weakest: string | null
  summary: string | null
  signal: string | null
}

const words = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)

/** `risks` and `thesis_risks` are untyped in the API: keep what has a risk in words. */
function mapRisks(raw: unknown): AgentRisk[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((r) => {
    const { risk, severity } = (r ?? {}) as { risk?: unknown; severity?: unknown }
    const text = words(risk)
    return text ? [{ risk: text, severity: words(severity) }] : []
  })
}

function mapAgent(output: ApiAgentOutput, name: string, pass: 1 | 2): AgentView {
  // The union is told apart by agent_name; every key read here is optional on every member.
  const s = (output.structured_output ?? {}) as Record<string, unknown>
  const findings = pass === 1 ? [words(s.assessment_summary), words(s.narrative) ?? words(output.narrative)] : []
  const advocate = output.agent_name === 'bull' || output.agent_name === 'bear'
  return {
    key: output.agent_name,
    name,
    pass,
    completed: output.status === 'completed',
    confidence: advocate && typeof s.confidence === 'number' ? s.confidence : null,
    findings: findings.filter((f): f is string => f != null),
    risks: pass === 1 ? mapRisks(s.risks) : [],
    caseRisks: advocate ? mapRisks(s.thesis_risks) : [],
    strongest: advocate ? words(s.strongest_argument) : null,
    weakest: advocate ? words(s.weakest_point) : null,
    summary: output.agent_name === 'risk' ? words(s.thesis_summary) : null,
    signal: output.agent_name === 'risk' ? words(s.strongest_signal) : null,
  }
}

export function mapAgents(outputs: ApiResult['agent_outputs']): AgentView[] {
  return AGENTS.flatMap(([key, name, pass]) => {
    const output = outputs.find((o) => o.agent_name === key)
    return output ? [mapAgent(output, name, pass)] : []
  })
}
