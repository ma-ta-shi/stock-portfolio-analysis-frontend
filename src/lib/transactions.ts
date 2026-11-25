import { TX_TYPE_LABELS } from './labels'
import { accountParam } from './portfolio-mappers'
import type { PortfolioAccountView, TransactionType } from '@/types/portfolio'

/** Every ledger type, from the label map (which the compiler keeps in step with the API). */
export const TRANSACTION_TYPES = Object.keys(TX_TYPE_LABELS) as TransactionType[]
export type TxTypeFilter = 'all' | TransactionType

export interface TransactionFilters {
  type: TxTypeFilter
  /** Exact ticker, e.g. "RY.TO"; null = all */
  ticker: string | null
  /** Inclusive days as the owner wrote them, "YYYY-MM-DD"; null = open-ended */
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

export function isDateRangeInvalid(filters: Pick<TransactionFilters, 'from' | 'to'>): boolean {
  return filters.from != null && filters.to != null && filters.from > filters.to
}

/**
 * The transactions request for the current filters: the server filters and orders (newest first) and pages. A single
 * position's history ignores the account switcher: the position belongs to exactly one account, and hiding it because
 * another account is selected would be confusing.
 */
export function transactionsQuery(
  filters: TransactionFilters,
  view: PortfolioAccountView,
  paging?: { page: number; perPage: number },
): string {
  const params = new URLSearchParams()
  const account = filters.holdingId ? undefined : accountParam(view)
  if (account) params.set('account_type', account)
  if (filters.holdingId) params.set('holding_id', filters.holdingId)
  if (filters.type !== 'all') params.set('type', filters.type)
  if (filters.ticker) params.set('ticker', filters.ticker)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (paging) {
    params.set('page', String(paging.page))
    params.set('per_page', String(paging.perPage))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}
