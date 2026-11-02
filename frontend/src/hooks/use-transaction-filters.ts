import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMPTY_FILTERS, TX_TYPE_FILTERS, type TransactionFilters, type TxTypeFilter } from '@/lib/transactions'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const PARAM: Record<keyof TransactionFilters, string> = {
  type: 'type',
  ticker: 'ticker',
  from: 'from',
  to: 'to',
  holdingId: 'holding',
}

/**
 * Transactions tab filters, stored in the URL query string so they survive reloads,
 * work with Back/Forward, and can be linked to (e.g. "View history" on a closed position).
 * Invalid values in the URL are ignored rather than trusted.
 */
export function useTransactionFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<TransactionFilters>(() => {
    const type = params.get(PARAM.type)
    const from = params.get(PARAM.from)
    const to = params.get(PARAM.to)
    return {
      type: TX_TYPE_FILTERS.includes(type as TxTypeFilter) ? (type as TxTypeFilter) : 'all',
      ticker: params.get(PARAM.ticker) || null,
      from: from && DATE.test(from) ? from : null,
      to: to && DATE.test(to) ? to : null,
      holdingId: params.get(PARAM.holdingId) || null,
    }
  }, [params])

  const setFilters = useCallback(
    (patch: Partial<TransactionFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch) as [keyof TransactionFilters, string | null][]) {
            const isDefault = value == null || value === '' || value === EMPTY_FILTERS[key]
            if (isDefault) next.delete(PARAM[key])
            else next.set(PARAM[key], value)
          }
          return next
        },
        // Typing in a date field shouldn't add a history entry per keystroke.
        { replace: true },
      )
    },
    [setParams],
  )

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), [setFilters])

  const isFiltered =
    filters.type !== 'all' || !!filters.ticker || !!filters.from || !!filters.to || !!filters.holdingId

  return { filters, setFilters, clearFilters, isFiltered }
}

/** Link target for one position's full transaction history. */
export function holdingHistoryHref(holdingId: string): string {
  return `/portfolio?tab=transactions&${PARAM.holdingId}=${encodeURIComponent(holdingId)}`
}
