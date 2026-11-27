import { useMutation } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import type { StockLookup } from '@/screens/portfolio/lookup'
import type { Stock } from '@/types'

/** A stock found by its ticker. `lookup` is the backend's whole answer; a stock a page already holds has none. */
export interface TickerResult extends Stock {
  lookup?: StockLookup
}

/** The lookup answer as the stock the dialogs work with. A stock the record has not seen has no id yet, so its ticker stands in. */
export function fromLookup(lookup: StockLookup): TickerResult {
  return {
    stock_id: lookup.stock_id ?? lookup.ticker, // writes and the watchlist duplicate check go by ticker, never by this stand-in
    ticker: lookup.ticker,
    name: lookup.name,
    sector: lookup.sector ?? null,
    exchange: lookup.exchange,
    currency: lookup.currency as Stock['currency'],
    pipeline_supported: lookup.pipeline_supported,
    instrument_type: lookup.instrument_type,
    unsupported_reason: lookup.unsupported_reason,
    lookup,
  }
}

/**
 * Find a stock by its ticker. Returns `null` when nothing matches (`STOCK_NOT_FOUND`); any other failure (the data providers are
 * down, a bad ticker) is thrown for the dialog to show.
 */
export function useTickerSearch() {
  return useMutation({
    mutationFn: async (ticker: string): Promise<TickerResult | null> => {
      const q = ticker.trim()
      if (!q) return null
      try {
        return fromLookup(await apiFetch<StockLookup>(`/api/stocks/lookup?ticker=${encodeURIComponent(q)}`))
      } catch (error) {
        if (error instanceof ApiError && error.code === 'STOCK_NOT_FOUND') return null
        throw error
      }
    },
  })
}
