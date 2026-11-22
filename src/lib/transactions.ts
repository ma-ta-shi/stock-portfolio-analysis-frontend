import type { Transaction, TransactionType } from '@/types'
import { localDateInputValue, parseDate } from './format'

export const TX_TYPE_FILTERS = ['all', 'buy', 'sell', 'dividend', 'drip'] as const
export type TxTypeFilter = (typeof TX_TYPE_FILTERS)[number]

export interface TransactionFilters {
  type: TxTypeFilter
  /** Exact ticker, e.g. "RY.TO"; null = all */
  ticker: string | null
  /** Inclusive local calendar dates, "YYYY-MM-DD"; null = open-ended */
  from: string | null
  to: string | null
  /** One position's full history (from Closed Positions "View history"); null = all */
  holdingId: string | null
}

export const EMPTY_FILTERS: TransactionFilters = {
  type: 'all',
  ticker: null,
  from: null,
  to: null,
  holdingId: null,
}

/** The local calendar day a transaction happened on, as "YYYY-MM-DD". */
export function transactionDay(t: Pick<Transaction, 'transaction_date'>): string {
  return localDateInputValue(parseDate(t.transaction_date))
}

export function isDateRangeInvalid(filters: Pick<TransactionFilters, 'from' | 'to'>): boolean {
  return filters.from != null && filters.to != null && filters.from > filters.to
}

/**
 * Apply the Transactions tab filters and sort newest first.
 * Dates compare as local calendar days ("YYYY-MM-DD" strings sort lexicographically),
 * so a 9pm trade on Nov 2 is included in a range ending Nov 2.
 */
export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  if (isDateRangeInvalid(filters)) return []
  return transactions
    .filter((t) => {
      if (filters.holdingId && t.holding_id !== filters.holdingId) return false
      if (filters.type !== 'all' && t.transaction_type !== (filters.type as TransactionType)) return false
      if (filters.ticker && t.stock.ticker !== filters.ticker) return false
      if (filters.from || filters.to) {
        const day = transactionDay(t)
        if (filters.from && day < filters.from) return false
        if (filters.to && day > filters.to) return false
      }
      return true
    })
    .sort((a, b) => parseDate(b.transaction_date).getTime() - parseDate(a.transaction_date).getTime())
}

/** Sorted unique tickers, for the ticker filter dropdown. */
export function tickersIn(transactions: readonly Transaction[]): string[] {
  return [...new Set(transactions.map((t) => t.stock.ticker))].sort()
}
