/**
 * The Analysis page's reads: one result and its agents' outputs. The stock, position, fundamentals and call are drawn by what the
 * Stock page uses (`../stock`, `../stock-detail`); this registry declares the agent sections and the footer.
 */
import { cn } from '@/lib/utils'
import { defineFields, type ApiFieldKey, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { formatDate, formatMoney } from '@/lib/format'
import { TONE_TEXT } from '@/lib/labels'
import type { AgentRisk, AgentView } from '@/lib/analysis-result'

const paragraphs = (texts: readonly string[]) => texts.map((t, i) => <p key={i} className="text-sm leading-relaxed whitespace-pre-line">{t}</p>)
const text = (value: string | null) => (value ? paragraphs([value]) : null)
const riskText = (r: AgentRisk) => (r.severity ? `${r.risk} (${r.severity})` : r.risk)

const riskList = (risks: readonly AgentRisk[], mark: string, tone?: string) => (
  <ul className="space-y-1">
    {risks.map((r, i) => (
      <li key={i} className={cn('text-sm flex gap-2', tone)}>
        <span className="shrink-0" aria-hidden="true">{mark}</span>
        <span>{riskText(r)}</span>
      </li>
    ))}
  </ul>
)

const section = ['detail' as const]

/** The sections of one agent, in order; the page draws a section only when it has something. */
export const AGENT_FIELDS = defineFields<AgentView>([
  {
    id: 'findings',
    label: 'Key Findings',
    source: ['Pass1Output.assessment_summary', 'Pass1Output.narrative', 'Pass1DataOutput.assessment_summary', 'Pass1DataOutput.narrative'],
    get: (a) => a.findings.join('\n\n') || null,
    places: section,
    render: (a) => (a.findings.length ? paragraphs(a.findings) : null),
  },
  { id: 'strongest', label: 'Strongest argument', source: 'AdvocateOutput.strongest_argument', get: (a) => a.strongest, places: section, render: (a) => text(a.strongest) },
  { id: 'weakest', label: 'Weakest point', source: 'AdvocateOutput.weakest_point', get: (a) => a.weakest, places: section, render: (a) => text(a.weakest) },
  { id: 'summary', label: 'Summary', source: 'RiskOutput.thesis_summary', get: (a) => a.summary, places: section, render: (a) => text(a.summary) },
  { id: 'signal', label: 'Strongest signal', source: 'RiskOutput.strongest_signal', get: (a) => a.signal, places: section, render: (a) => text(a.signal) },
  {
    id: 'risks',
    label: 'Critical Risks',
    source: ['Pass1Output.risks', 'Pass1DataOutput.risks'],
    get: (a) => a.risks.map(riskText).join('; ') || null,
    places: section,
    render: (a) => (a.risks.length ? riskList(a.risks, '⚠', TONE_TEXT.negative) : null),
  },
  // Not a warning about the stock: the Bear's list is what would make the Bear wrong.
  {
    id: 'case_risks',
    label: 'Risks to this case',
    source: 'AdvocateOutput.thesis_risks',
    get: (a) => a.caseRisks.map(riskText).join('; ') || null,
    places: section,
    render: (a) => (a.caseRisks.length ? riskList(a.caseRisks, '·') : null),
  },
  {
    id: 'confidence',
    label: 'Confidence',
    source: 'AdvocateOutput.confidence',
    get: (a) => a.confidence,
    format: (v) => (v == null ? '—' : `${v as number}%`),
    places: ['column'],
  },
])

export interface AnalysisFooter {
  analysisId: string
  currency: 'CAD' | 'USD'
  price: number | null
  durationS: number | null
  completedAt: string | null
}

export const FOOTER_FIELDS = defineFields<AnalysisFooter>([
  { id: 'price', label: 'Price at analysis', source: 'PriceBand.current_price', get: (f) => f.price, format: (v, f) => formatMoney(v as number | null, f.currency), places: section },
  { id: 'duration', label: 'Duration', source: 'AnalysisResultResponse.duration_s', get: (f) => f.durationS, format: (v) => (v == null ? '—' : `${Math.round(v as number)}s`), places: section },
  { id: 'completed', label: 'Completed', source: 'AnalysisResultResponse.completed_at', get: (f) => f.completedAt, format: (v) => (v ? formatDate(v as string) : '—'), places: section },
  { id: 'trace', label: 'Trace', source: 'AnalysisResultResponse.analysis_id', get: (f) => f.analysisId, places: section },
])

const missing: NotShown = { reason: 'Not in the original design', gap: 'S-9' }
const signal: NotShown = { reason: 'No BUY, HOLD or SELL badge or signal is drawn', gap: 'S-7' }
const keys = (schema: string, fields: readonly string[], entry: NotShown) => Object.fromEntries(fields.map((f) => [`${schema}.${f}`, entry]))

/** The envelope every agent output shares; the page reads the name, the status and the structured output. */
const ENVELOPE = ['agent_pass', 'analysis_confidence', 'confidence', 'latency_ms', 'model_used', 'prompt_version', 'recommendation', 'tokens_used']
const envelope = (schema: string) => ({
  ...keys(schema, ENVELOPE, missing),
  ...keys(schema, ['agent_name', 'status', 'structured_output'], { reason: 'Decides which agent a section is, whether it finished, and holds its text' }),
  ...keys(schema, ['narrative'], { reason: 'The same text as the structured output holds; read when that has none' }),
})

export const ANALYSIS_NOT_SHOWN = {
  ...envelope('FundTechOutput'),
  ...envelope('DataAnalystOutput'),
  ...envelope('AdvocateAgentOutput'),
  ...envelope('RiskAgentOutput'),
  ...envelope('CioAgentOutput'),
  ...keys('Pass1Output', ['analysis_confidence', 'caveats', 'interpretive_fields', 'key_factors'], missing),
  ...keys('Pass1DataOutput', ['analysis_confidence', 'caveats', 'structured_data', 'key_factors'], missing),
  ...keys('AdvocateOutput', ['caveats', 'key_factors', 'narrative', 'structured_data', 'thesis_summary', 'weakest_point_type'], missing),
  ...keys('AdvocateOutput', ['recommendation'], signal),
  ...keys('RiskOutput', ['caveats', 'groundedness_score', 'key_factors', 'narrative', 'risk_profile', 'stage_b'], missing),
  ...keys(
    'CioOutput',
    [
      'accuracy_influence_note', 'advocate_check', 'bear_case_assessment', 'bear_confidence', 'bull_case_assessment', 'bull_confidence', 'disagreement_score',
      'dissent_note', 'key_decision_factors', 'parallel_predictions', 'position_sizing_recommendation', 'risk_profile_summary', 'risk_reward_consumed_as',
      'synthesis_narrative', 'tail_risk_cross_check', 'tail_risk_note', 'tax_summary', 'technical_trigger', 'what_would_change_my_mind',
    ],
    missing,
  ),
  ...keys('CioOutput', ['confidence', 'disagreement_category', 'expected_return_tier', 'stock_outlook'], { reason: "The result's own call fields are drawn" }),
  ...keys('CioOutput', ['thesis_summary'], { reason: 'The Layer 1 summary holds it word for word' }),
  ...keys('AnalysisResultResponse', ['agent_outputs'], { reason: 'The agent sections' }),
  ...keys('AnalysisResultResponse', ['key_drivers', 'synthesis_narrative'], { reason: 'Layer 1 (the same block the Stock page draws)' }),
  ...keys('AnalysisResultResponse', ['stock_outlook_direction', 'overall_confidence', 'expected_return_tier', 'disagreement_class', 'price_band'], { reason: 'The call, drawn with the shared stock fields (../stock)' }),
  ...keys('AnalysisResultResponse', ['stock', 'timeline', 'triggered_at'], { reason: 'The page header' }),
  ...keys('AnalysisResultResponse', ['status', 'failure'], { reason: 'Say that a run is still running, or why it failed' }),
  ...keys('AnalysisResultResponse', ['bear_case_strength', 'bull_case_strength', 'business_profile', 'disagreement_score', 'pass1_completed_at', 'pass2_completed_at', 'pipeline_version'], missing),
  ...keys('PriceBand', ['target_price', 'expected_total_return_pct', 'range'], { reason: 'The call, drawn with the shared stock fields (../stock)' }),
  ...keys(
    'PriceBand',
    ['as_of_date', 'by_horizon', 'currency', 'flags', 'horizon_years', 'income_per_share', 'inputs', 'market_reference_pct', 'model_range', 'price_source', 'reason', 'risk_profile', 'settings', 'slider', 'status', 'stock_baseline_pct', 'stretch', 'ticker', 'timeline', 'view_per_unit_risk', 'view_pts', 'vs_current_pct'],
    missing,
  ),
  ...keys('PriceRange', ['low', 'high'], { reason: 'The call, drawn with the shared stock fields (../stock)' }),
  ...keys('PriceRange', ['high_percentile', 'low_percentile', 'median'], missing),
  ...keys('AnalysisStock', ['currency', 'exchange', 'name', 'stock_id', 'ticker'], { reason: 'Names the stock; the header reads the directory row for its sector' }),
  ...keys('AnalysisFailure', ['message', 'stage'], { reason: 'Say why a run failed' }),
} as Partial<Record<ApiFieldKey, NotShown>>

const retired: NotShown = { reason: 'A retired agent, on old runs only', gap: 'S-9' }

export const ANALYSIS_SCREEN: ScreenFieldSet = {
  screen: 'analysis',
  schemas: [
    'AnalysisResultResponse', 'AnalysisStock', 'AnalysisFailure', 'PriceBand', 'PriceRange', 'FundTechOutput', 'DataAnalystOutput', 'AdvocateAgentOutput',
    'RiskAgentOutput', 'CioAgentOutput', 'Pass1Output', 'Pass1DataOutput', 'AdvocateOutput', 'RiskOutput', 'CioOutput',
  ],
  fields: [...AGENT_FIELDS, ...FOOTER_FIELDS],
  notShown: ANALYSIS_NOT_SHOWN,
  notShownSchemas: {
    ShadowCioAgentOutput: { reason: 'The shadow call is for calibration, not the reader', gap: 'S-9' },
    ShadowCioOutput: { reason: 'The shadow call is for calibration, not the reader', gap: 'S-9' },
    TaxAgentOutput: retired,
    TaxOutput: retired,
    CioStageBAgentOutput: retired,
    CioStageBOutput: retired,
    PriceSlider: missing,
    PriceVsCurrent: missing,
    BusinessProfileRead: missing,
  },
}
