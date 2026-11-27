import type { DisagreementClass, Outlook, ReturnTier } from './stock-snapshot'
import type { components } from '@/types/openapi.gen'

type TransactionType = components['schemas']['TransactionResponse']['transaction_type']

/**
 * Colour tokens. Every pair here meets WCAG AA contrast (≥ 4.5:1 for small text)
 * in both light and dark mode — use these instead of raw Tailwind colours so the
 * guarantee holds everywhere. (Tailwind's 500/600 shades fail on white.)
 */
export const TONE_TEXT = {
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
} as const

/** Badge fills: solid (white text) for strong signals, tinted (dark text) for softer ones. */
export const BADGE = {
  positive: 'bg-emerald-700 text-white',
  positiveSoft: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200',
  warningSoft: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  cautionSoft: 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200',
  negative: 'bg-red-700 text-white',
  neutral: 'bg-muted text-foreground',
} as const

/** Text colour for a signed value: gains green, losses red. */
export function gainLossColor(value: number): string {
  return value >= 0 ? TONE_TEXT.positive : TONE_TEXT.negative
}

// --- Vocabularies of the API's calls and ledger. Each map is keyed by the generated union, so a value the backend adds
// --- fails `tsc` until it has a label here.

export const OUTLOOK_LABELS: Record<Outlook, string> = {
  bullish: 'Bullish',
  somewhat_bullish: 'Somewhat Bullish',
  neutral: 'Neutral',
  somewhat_bearish: 'Somewhat Bearish',
  bearish: 'Bearish',
}

export const OUTLOOK_BADGE: Record<Outlook, string> = {
  bullish: BADGE.positive,
  somewhat_bullish: BADGE.positiveSoft,
  neutral: BADGE.warningSoft,
  somewhat_bearish: BADGE.cautionSoft,
  bearish: BADGE.negative,
}

/** The tier is read against the stock's own valuation baseline, not the market (`data/reference/vocab.py`). The last three are the older scale still on old runs. */
export const TIER_LABELS: Record<ReturnTier, string> = {
  strong_outperform: 'Strong outperform',
  outperform: 'Outperform',
  market_perform: 'In line',
  underperform: 'Underperform',
  strong_underperform: 'Strong underperform',
  moderate: 'Moderate (older scale)',
  low: 'Low (older scale)',
  minimal: 'Minimal (older scale)',
}

export const TIER_EXPLANATIONS: Record<ReturnTier, string> = {
  strong_outperform: 'Expected to return decisively more than its own valuation baseline',
  outperform: 'Expected to return clearly more than its own valuation baseline',
  market_perform: 'Expected to return about its own valuation baseline',
  underperform: 'Expected to return less than its own valuation baseline',
  strong_underperform: 'Expected to return decisively less than its own valuation baseline',
  moderate: 'An older tier, from before the valuation baseline',
  low: 'An older tier, from before the valuation baseline',
  minimal: 'An older tier, from before the valuation baseline',
}

export const DISAGREEMENT_CLASS_LABELS: Record<DisagreementClass, { label: string; tone: string }> = {
  consensus: { label: 'Consensus', tone: TONE_TEXT.positive },
  mild_dissent: { label: 'Mild dissent', tone: TONE_TEXT.positive },
  split_decision: { label: 'Split decision', tone: TONE_TEXT.warning },
  high_conflict: { label: 'High conflict', tone: TONE_TEXT.negative },
}

/** Why a stock's call cannot be used (`StockSnapshotResponse.exclusions`). An unknown code is shown as written. */
export const EXCLUSION_LABELS: Record<string, string> = {
  stale: 'Analysis is out of date',
  earnings_since: 'Earnings reported since the analysis',
  trigger_crossed: "Price crossed the analysis's trigger",
  unsupported_instrument: 'Cannot be analysed (fund, preferred share or unsupported listing)',
  no_completed_run: 'Not analysed yet',
  band_unavailable: 'No price range available',
  split_since_analysis: 'Stock split since the analysis',
}

export function exclusionLabel(code: string): string {
  return EXCLUSION_LABELS[code] ?? code.replaceAll('_', ' ')
}

export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  drip: 'DRIP',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  contribution: 'Contribution',
  withdrawal: 'Withdrawal',
  fee: 'Fee',
  conversion: 'Conversion',
  opening_balance: 'Opening balance',
  interest: 'Interest',
  adjustment_in: 'Adjustment in',
  adjustment_out: 'Adjustment out',
}

const TX_TRADE = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
const TX_SELL = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400'
const TX_INCOME = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
const TX_OTHER = 'bg-muted text-foreground'

export const TX_TYPE_BADGE: Record<TransactionType, string> = {
  buy: TX_TRADE,
  sell: TX_SELL,
  dividend: TX_INCOME,
  drip: TX_INCOME,
  interest: TX_INCOME,
  transfer_in: TX_OTHER,
  transfer_out: TX_OTHER,
  contribution: TX_OTHER,
  withdrawal: TX_OTHER,
  fee: TX_OTHER,
  conversion: TX_OTHER,
  opening_balance: TX_OTHER,
  adjustment_in: TX_OTHER,
  adjustment_out: TX_OTHER,
}

/**
 * Backend error codes a ledger write can answer with that the page explains in its own words. Every other code shows the backend's
 * own message (it is already plain English: "The position holds 40 shares ..."). Used by `getErrorMessage(error, { write: true })`.
 */
export const WRITE_ERRORS: Readonly<Record<string, string>> = {
  DUPLICATE_ENTRY: 'This matches an entry recorded in the last 30 seconds (same stock, amount and day), so nothing was written. If you meant to record it twice, wait a moment and try again.',
  MISSING_FX_RATE: 'No USD/CAD rate was found for that day. Type the exchange rate your broker used, or try again later.',
  STOCK_LOOKUP_UNAVAILABLE: 'The stock could not be looked up just now. Try again in a moment.',
  NOT_REMOVABLE: 'This position cannot be removed: some entries are part of a move between accounts, or a later sale depends on them. Reverse those first.',
  NOT_CORRECTABLE: 'This entry cannot be corrected in one step (a reversal, one leg of a move, an entry of a detected dividend, or a correction that would leave a later sale short of shares). Reverse it and record it again.',
  NOT_REVERSIBLE: 'This entry cannot be reversed: it is itself a reversal, or undoing it would leave a later sale short of shares.',
  ALREADY_REVERSED: 'This entry was already reversed.',
  NOT_PAID_YET: 'This dividend has not been paid yet. It can be confirmed from its payment day.',
  EVENT_NOT_OPEN: 'This dividend was already decided. Reopen it to decide again.',
  EVENT_NOT_DECIDED: 'This dividend has not been decided, so there is nothing to reopen.',
  NO_SHARES_AT_EX: 'The record shows no shares held on the ex-date, so there is no dividend to confirm.',
  NO_REINVESTMENT_PRICE: 'There is no price to reinvest at. Type the reinvestment price, or choose not to reinvest.',
  INVALID_CORRECTION: 'One of the corrections is not valid (for example tax above the dividend, or a reinvestment above what was paid).',
}

/** The words for a dividend event's status. */
export const DIVIDEND_STATUS_LABELS = { expected: 'Waiting', confirmed: 'Confirmed', dismissed: 'Dismissed' } as const
