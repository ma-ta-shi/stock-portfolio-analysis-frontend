import { useMutation } from '@tanstack/react-query'
import { ApiError, apiFetch, USE_MOCK } from '@/lib/api'
import type { StockLookup } from '@/screens/portfolio/lookup'
import type { Stock } from '@/types'

/** A stock found by its ticker. `lookup` is the backend's whole answer (live mode only); a stock in the mock list has none. */
export interface TickerResult extends Stock {
  current_price?: number
  lookup?: StockLookup
}

const MOCK_DELAY_MS = 600

// Stocks that have mock detail pages under public/mock-data/stocks/.
const MOCK_TICKERS: TickerResult[] = [
  { stock_id: 'stk_ry_to', ticker: 'RY.TO', name: 'Royal Bank of Canada', sector: 'Financials', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_td_to', ticker: 'TD.TO', name: 'Toronto-Dominion Bank', sector: 'Financials', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_bmo_to', ticker: 'BMO.TO', name: 'Bank of Montreal', sector: 'Financials', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_shop_to', ticker: 'SHOP.TO', name: 'Shopify Inc.', sector: 'Technology', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_cnr_to', ticker: 'CNR.TO', name: 'Canadian National Railway', sector: 'Industrials', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_enb_to', ticker: 'ENB.TO', name: 'Enbridge Inc.', sector: 'Energy', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_wsp_to', ticker: 'WSP.TO', name: 'WSP Global Inc.', sector: 'Industrials', exchange: 'TSX', currency: 'CAD' },
  { stock_id: 'stk_aapl', ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD' },
  { stock_id: 'stk_msft', ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD' },
]

/** An exact ticker, case-insensitive. (The backend's lookup is by ticker only, so the mock is too: gap P-W9.) */
export function findMockTicker(ticker: string, tickers: TickerResult[] = MOCK_TICKERS): TickerResult | null {
  const q = ticker.trim().toLowerCase()
  if (!q) return null
  return tickers.find((t) => t.ticker.toLowerCase() === q) ?? null
}

/** The lookup answer as the stock the dialogs work with. A stock the record has not seen has no id yet, so its ticker stands in. */
export function fromLookup(lookup: StockLookup): TickerResult {
  return {
    stock_id: lookup.stock_id ?? lookup.ticker, // stopgap: the Watchlist ticket keys by ticker and removes this
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
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
        return findMockTicker(q)
      }
      try {
        return fromLookup(await apiFetch<StockLookup>('/mock-data/stocks/lookup.json', `/api/stocks/lookup?ticker=${encodeURIComponent(q)}`))
      } catch (error) {
        if (error instanceof ApiError && error.code === 'STOCK_NOT_FOUND') return null
        throw error
      }
    },
  })
}
