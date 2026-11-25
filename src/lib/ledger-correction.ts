/**
 * What the Transactions tab needs to offer Correct and Reverse: whether a row can be corrected at all (and why not), and the values a
 * correction form starts from. Pure. The server stays the authority: this only avoids offering what it is known to refuse
 * (`NOT_CORRECTABLE`, `ALREADY_REVERSED`); "already reversed" is known only when the reversing row is among those loaded (gap P-T1).
 */
import { isDay } from '@/lib/ledger-entry'
import type { Transaction, TransactionType } from '@/types/portfolio'

/** Which form a correction uses: the trade form (stock rows) or the dividend form (one dividend row). */
export type CorrectionFamily = 'trade' | 'dividend'

const TRADE: readonly TransactionType[] = ['buy', 'sell', 'opening_balance', 'drip']

export function correctionFamily(type: TransactionType): CorrectionFamily | null {
  if (TRADE.includes(type)) return 'trade'
  if (type === 'dividend') return 'dividend'
  return null
}

/** Why this row cannot be reversed, or null. */
export function reversibleReason(t: Transaction): string | null {
  if (t.reverses_transaction_id) return 'This row is itself a reversal'
  if (t.reversed_by_transaction_id) return 'Already reversed'
  return null
}

/** Why this row cannot be corrected, or null. A move leg is reversed (which reverses the move), then recorded again. */
export function correctableReason(t: Transaction): string | null {
  const why = reversibleReason(t)
  if (why) return why
  if (t.move_id) return 'One leg of a move: reverse the move and record it again'
  if (!correctionFamily(t.transaction_type)) return 'A cash entry, transfer or adjustment has no correction form: reverse it instead'
  return null
}

/** The values a correction form starts from: the row's own, in the shape the forms type them (a sale's shares positive). */
export interface CorrectionInitial {
  shares?: number
  price?: number
  /** The gross of a dividend. */
  amount?: number
  fees: number
  withholding?: number
  /** `YYYY-MM-DD`. */
  date: string
  /** CAD per USD, resent for a USD row (the API otherwise uses the Bank of Canada rate of the day). */
  rate?: number
}

export function initialOf(t: Transaction): CorrectionInitial {
  const date = t.transaction_date.slice(0, 10)
  return {
    shares: t.shares != null ? Math.abs(t.shares) : undefined,
    price: t.price_per_share ?? undefined,
    amount: t.total_amount,
    fees: t.fees,
    withholding: t.withholding_tax ?? undefined,
    date: isDay(date) ? date : '',
    // A USD row resends the rate it was recorded with (the API otherwise uses the Bank of Canada rate of the day).
    rate: t.currency === 'USD' && t.fx_rate_to_cad != null ? t.fx_rate_to_cad : undefined,
  }
}
