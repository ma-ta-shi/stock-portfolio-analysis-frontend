/**
 * The Optimizer tab: a run of the portfolio optimizer (the stored one, or the answer to "where should this go"), its steps and
 * what waits. `STEP_FIELDS` are what a card draws; its `detail` ones are under "Details".
 */
import { defineFields, type ApiFieldKey, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { formatMoney, formatNumber } from '@/lib/format'
import { OUTLOOK_LABELS, TIER_LABELS, exclusionLabel } from '@/lib/labels'
import type { Run, Step, Waiting } from '@/lib/optimizer'
import { asFraction } from '@/lib/units'
import type { StockOutlookDirection } from '@/types'
import { cad, day, plainPct, text } from '../formatters'

const ACTIONS = { buy: 'Buy', sell: 'Sell', transfer: 'Move' } as const
const RUN_KINDS = { weekly: 'weekly run', adhoc: 'run on demand', inquiry: 'inquiry' } as const

const main = ['column' as const]
const detail = ['detail' as const]
// 'portfolio' is a limit across all accounts, not an account
const account = (a: string | null | undefined) => (a === 'portfolio' ? 'whole portfolio' : (a ?? '').toUpperCase())
const OPTIONS: Record<string, string> = { no_action: 'Leave as is', deploy: 'Buy' }

export const RUN_FIELDS = defineFields<Run>([
  { id: 'headline', label: 'Summary', source: 'RunViewResponse.headline', get: (r) => r.headline, format: text, places: main },
  {
    id: 'as_of',
    label: 'Run of',
    source: ['RunViewResponse.as_of', 'RunViewResponse.kind'],
    get: (r) => r.as_of,
    format: (v, r) => `${day(v)} (${RUN_KINDS[r.kind]})`,
    places: main,
  },
  {
    id: 'left_out',
    label: 'Left out because their analysis cannot be used',
    source: ['ReportBlockResponse.excluded', 'ExcludedViewResponse.ticker'],
    get: (r) => r.report?.excluded.map((e) => e.ticker) ?? [],
    places: main,
  },
])

export const STEP_FIELDS = defineFields<Step>([
  { id: 'ticker', label: 'Stock', source: 'OrderViewResponse.ticker', get: (s) => s.order.ticker, format: (v) => (v ? String(v) : 'Cash'), places: main },
  {
    id: 'account',
    label: 'Account',
    source: ['OrderViewResponse.account', 'OrderViewResponse.to_account'],
    get: (s) => s.order.account,
    format: (_v, s) => (s.order.to_account ? `${account(s.order.account)} to ${account(s.order.to_account)}` : account(s.order.account)),
    places: main,
  },
  {
    id: 'action',
    label: 'Action',
    source: ['OrderViewResponse.side', 'OrderViewResponse.amount_cad', 'OrderViewResponse.kind'],
    get: (s) => s.order.side,
    format: (_v, s) => `${ACTIONS[s.order.side]} ${cad(s.order.amount_cad)}`,
    places: main,
  },
  {
    id: 'shares',
    label: 'Shares',
    source: ['OrderViewResponse.shares', 'OrderViewResponse.price', 'OrderViewResponse.currency'],
    get: (s) => s.order.shares,
    format: (v, s) =>
      v == null ? '—' : `${formatNumber(v as number)} at ${formatMoney(s.order.price, s.order.currency === 'USD' ? 'USD' : 'CAD')}`,
    places: main,
  },
  {
    id: 'target',
    label: 'Held to target',
    source: ['DriftViewResponse.held_cad', 'DriftViewResponse.target_cad'],
    get: (s) => s.drift?.held_cad ?? null,
    format: (v, s) => (v == null ? '—' : `${cad(v)} held, target ${cad(s.drift?.target_cad)}`),
    places: main,
  },
  { id: 'rule', label: 'Why', source: 'OrderViewResponse.rule_text', get: (s) => s.order.rule_text, format: text, places: main },
  { id: 'reasons', label: 'Reasons', source: ['OrderViewResponse.reasons', 'ReasonLineResponse.text'], get: (s) => s.order.reasons.map((r) => r.text), places: main },
  { id: 'rebuy', label: 'Do not rebuy before', source: 'OrderViewResponse.rebuy_not_before', get: (s) => s.order.rebuy_not_before, format: day, places: main },
  {
    id: 'unusable',
    label: 'Analysis not usable',
    source: ['OrderViewResponse.view', 'ViewNoteResponse.exclusions'],
    get: (s) => (s.order.view?.exclusions.length ? s.order.view.exclusions.map(exclusionLabel).join('; ') : null),
    format: text,
    places: main,
  },

  { id: 'commission', label: 'Commission', source: ['OrderViewResponse.costs', 'OrderCostsResponse.commission_cad'], get: (s) => s.order.costs.commission_cad, format: (v) => cad(v), places: detail },
  { id: 'conversion', label: 'Currency conversion', source: 'OrderCostsResponse.conversion_cad', get: (s) => s.order.costs.conversion_cad, format: (v) => cad(v), places: detail },
  { id: 'cash_effect', label: 'Cash used or raised', source: 'OrderCostsResponse.cash_effect_cad', get: (s) => s.order.costs.cash_effect_cad, format: (v) => cad(v), places: detail },
  {
    id: 'benefit',
    label: 'Expected benefit',
    source: ['OrderViewResponse.value', 'OrderValueResponse.benefit_cad', 'OrderValueResponse.benefit_years'],
    get: (s) => s.order.value.benefit_cad ?? null,
    format: (v, s) => (v == null ? '—' : `${cad(v)} over ${s.order.value.benefit_years ?? '—'} year(s)`),
    places: detail,
  },
  { id: 'value_costs', label: 'Costs counted', source: 'OrderValueResponse.costs_cad', get: (s) => s.order.value.costs_cad, format: (v) => cad(v), places: detail },
  { id: 'tax', label: 'Tax on the sale', source: ['OrderValueResponse.tax_cad', 'OrderValueResponse.tax_exact'], get: (s) => s.order.value.tax_cad, format: (v, s) => (v == null ? '—' : `${cad(v)}${s.order.value.tax_exact === false ? ' (estimate)' : ''}`), places: detail },
  { id: 'noise', label: 'Noise margin', source: 'OrderValueResponse.noise_margin_cad', get: (s) => s.order.value.noise_margin_cad, format: (v) => cad(v), tooltip: 'The gain must be larger than this to count: how uncertain the views are, in dollars', places: detail },
  { id: 'gap', label: 'Wanted and not yet held', source: 'OrderValueResponse.gap_cad', get: (s) => s.order.value.gap_cad, format: (v) => cad(v), places: detail },
  { id: 'qualified', label: 'Weekly runs it has held for', source: 'OrderValueResponse.qualified_runs', get: (s) => s.order.value.qualified_runs, format: text, places: detail },
  {
    id: 'after_tax',
    label: 'Predicted after-tax return (12 months)',
    source: ['OrderViewResponse.predicted', 'PredictedLinesResponse.after_tax_12m'],
    get: (s) => asFraction('PredictedLinesResponse.after_tax_12m', s.order.predicted?.after_tax_12m),
    format: (v) => plainPct(v),
    places: detail,
  },
  { id: 'market_line', label: 'Market return at the same risk', source: 'PredictedLinesResponse.market_line_12m', get: (s) => asFraction('PredictedLinesResponse.market_line_12m', s.order.predicted?.market_line_12m), format: (v) => plainPct(v), places: detail },
  { id: 'sigma', label: 'Volatility', source: 'PredictedLinesResponse.sigma', get: (s) => asFraction('PredictedLinesResponse.sigma', s.order.predicted?.sigma), format: (v) => plainPct(v), places: detail },
  { id: 'changes', label: 'What would change the view', source: 'OrderViewResponse.what_would_change', get: (s) => s.whatWouldChange.join(' ') || null, format: text, places: detail },
  {
    id: 'alternatives',
    label: 'Not chosen',
    source: ['OrderViewResponse.alternatives', 'AlternativeViewResponse.action_type', 'AlternativeViewResponse.ticker', 'AlternativeViewResponse.account', 'AlternativeViewResponse.reason_not_chosen'],
    get: (s) => s.order.alternatives.map((a) => `${OPTIONS[a.action_type] ?? a.action_type.replaceAll('_', ' ')}: ${a.ticker} (${account(a.account)}), not chosen because ${a.reason_not_chosen}`).join('. ') || null,
    format: text,
    places: detail,
  },
  {
    id: 'note',
    label: 'Analysis',
    source: ['ViewNoteResponse.outlook', 'ViewNoteResponse.tier', 'ViewNoteResponse.confidence'],
    get: (s) => s.note?.outlook ?? null,
    format: (v, s) =>
      v
        ? [OUTLOOK_LABELS[v as StockOutlookDirection], s.note?.tier && TIER_LABELS[s.note.tier], s.note?.confidence != null && `${s.note.confidence}% confidence`].filter(Boolean).join(' · ')
        : '—',
    places: detail,
  },
  { id: 'note_text', label: 'Analysis summary', source: 'ViewNoteResponse.reason_text', get: (s) => s.note?.reason_text || null, format: text, places: detail },
])

export const WAITING_FIELDS = defineFields<Waiting>([
  {
    id: 'waiting_step',
    label: 'Step',
    source: ['WaitingViewResponse.side', 'WaitingViewResponse.ticker', 'WaitingViewResponse.account', 'WaitingViewResponse.amount_cad'],
    get: (w) => w.ticker,
    format: (_v, w) => `${ACTIONS[w.side as keyof typeof ACTIONS] ?? w.side}${w.ticker ? ` ${w.ticker}` : ''} ${cad(w.amount_cad)} (${account(w.account)})`,
    places: main,
  },
  { id: 'waiting_rule', label: 'Why', source: 'WaitingViewResponse.rule_text', get: (w) => w.rule_text, format: text, places: main },
  { id: 'waiting_reason', label: 'What would release it', source: 'WaitingViewResponse.reason', get: (w) => w.reason, format: text, places: main },
])

const keys = (schema: string, fields: readonly string[], entry: NotShown) => Object.fromEntries(fields.map((f) => [`${schema}.${f}`, entry]))
const record: NotShown = { reason: 'Record bookkeeping' }
const never: NotShown = { reason: 'The optimizer is advice only for the user: following a suggestion is never tracked (owner)' }
const report: NotShown = { reason: 'Report detail with no place in the design', gap: 'O-6' }
const unit: NotShown = { reason: 'The API declares no unit for it, so it is not drawn', gap: 'O-9' }

export const OPTIMIZER_NOT_SHOWN = {
  ...keys('RunViewResponse', ['run_id', 'portfolio_id', 'created_at', 'stored', 'superseded_proposal_ids'], record),
  ...keys('RunViewResponse', ['orders', 'transfers', 'waiting', 'drift'], { reason: 'The cards and the waiting list' }),
  ...keys('RunViewResponse', ['no_changes'], { reason: 'Says that nothing is proposed' }),
  ...keys('RunViewResponse', ['dry_run'], { reason: 'Says a run is not a basis for orders' }),
  ...keys('RunViewResponse', ['warnings', 'missing'], { reason: 'The warnings list' }),
  ...keys('RunViewResponse', ['settings'], { reason: 'The rules a run used; they are edited on Settings', gap: 'O-8' }),
  ...keys('RunViewResponse', ['report'], { reason: 'Only the stocks it left out are read, when a run has no orders' }),
  ...keys('ReportBlockResponse', ['caps', 'currency_share', 'room', 'ytd_gain_cad', 'run_sale_tax_cad', 'harvest', 'parked_share', 'fund_by_account', 'unfilled', 'breaches', 'view_notes'], report),
  ...keys('ExcludedViewResponse', ['reasons'], report),
  ...keys('OrderViewResponse', ['proposal_id', 'sequence', 'chain'], { reason: 'Orders the cards and groups the linked ones' }),
  ...keys('OrderViewResponse', ['status', 'followed_by'], never),
  ...keys('OrderViewResponse', ['rule'], { reason: 'The code of the rule; its words are shown' }),
  ...keys('ReasonLineResponse', ['field', 'value'], { reason: 'Where in the data the sentence comes from' }),
  ...keys('OrderValueResponse', ['held_return', 'utility', 'loss', 'jump', 'signal_to_noise'], { reason: 'Inputs of the rule, not shown', gap: 'O-6' }),
  ...keys('PredictedLinesResponse', ['view_applied', 'noise_margin_pts', 'tax_rate_pct', 'entry_cost', 'status', 'reason', 'flags', 'usable'], { reason: 'Inputs of the prediction, not shown', gap: 'O-6' }),
  ...keys('PredictedLinesResponse', ['total_return_cad', 'baseline_cad', 'score_12m', 'exit_tax_cad'], unit),
  ...keys('AlternativeViewResponse', ['rank', 'expected_return_at_time'], { reason: 'The rejected option and why are shown', gap: 'O-6' }),
  ...keys('ViewNoteResponse', ['ticker'], { reason: 'Repeats the card' }),
  ...keys('ViewNoteResponse', ['dissent_text', 'falsifier_text', 'falsifier'], { reason: 'Shown through what would change the view' }),
  ...keys('ViewNoteResponse', ['flags', 'status'], { reason: 'Why it is not usable is shown from its exclusions' }),
  ...keys('WaitingViewResponse', ['rule'], { reason: 'The code of the rule; its words are shown' }),
  ...keys('DriftViewResponse', ['account', 'ticker', 'ratio', 'status'], { reason: 'Joins the figure to its card' }),
} as Partial<Record<ApiFieldKey, NotShown>>

const matrix: NotShown = { reason: 'No place in the design', gap: 'O-3' }
const book: NotShown = { reason: 'No place in the design', gap: 'O-2' }
const history: NotShown = { reason: 'No place in the design', gap: 'O-1' }
const plan: NotShown = { reason: 'No place in the design', gap: 'O-5' }
const raise: NotShown = { reason: 'No place in the design', gap: 'O-4' }

export const OPTIMIZER_SCREEN: ScreenFieldSet = {
  screen: 'optimizer',
  schemas: ['RunViewResponse', 'OrderViewResponse', 'ReasonLineResponse', 'OrderCostsResponse', 'OrderValueResponse', 'PredictedLinesResponse', 'AlternativeViewResponse', 'ViewNoteResponse', 'WaitingViewResponse', 'DriftViewResponse', 'ReportBlockResponse', 'ExcludedViewResponse', 'AskCreate', 'ProposalRunCreate'],
  fields: [
    ...RUN_FIELDS,
    ...STEP_FIELDS,
    ...WAITING_FIELDS,
    { id: 'ask_amount', label: 'Available to trade', source: 'AskCreate.amount_cad', places: ['input'] },
    { id: 'ask_account', label: 'Account', source: 'AskCreate.account', places: ['input'] },
  ],
  notShown: {
    ...OPTIMIZER_NOT_SHOWN,
    'AskCreate.store': { reason: 'Always false: an answer is a look and nothing is saved' },
    'AskCreate.allow_stale': { reason: 'Not offered: analyses over a week old are left out', gap: 'O-7' },
    'ProposalRunCreate.store': { reason: 'Always true: the button runs and saves' },
    'ProposalRunCreate.allow_stale': { reason: 'Always false: a run on stale analyses is not a basis for orders', gap: 'O-7' },
  },
  notShownSchemas: {
    RunListResponse: history,
    RunSummaryResponse: history,
    TargetBookResponse: book,
    BookLineResponse: book,
    BookAccountResponse: book,
    AccountMatrixResponse: matrix,
    MatrixCellResponse: matrix,
    MarketLineResponse: matrix,
    MonthlyPlanResponse: plan,
    AccountPlanResponse: plan,
    RaiseCashResponse: raise,
    CapViewResponse: report,
    CurrencyShareResponse: report,
    RoomBlockResponse: report,
    HarvestLineResponse: report,
    FundSlotResponse: report,
    UnfilledLineResponse: report,
  },
}
