import { useMutation } from '@tanstack/react-query'
import { apiFetch, USE_MOCK } from '@/lib/api'
import type { Stock } from '@/types'

/** A resolved stock from ticker / company-name search. */
export interface TickerResult extends Stock {
  current_price?: number
}

interface ResolveResponse {
  query: string
  data: TickerResult[]
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

/** Exact ticker match first (case-insensitive), then partial company-name match. */
export function findMockTicker(query: string, tickers: TickerResult[] = MOCK_TICKERS): TickerResult | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  return (
    tickers.find((t) => t.ticker.toLowerCase() === q) ??
    tickers.find((t) => t.name.toLowerCase().includes(q)) ??
    null
  )
}

/**
 * Resolve a ticker or company name to a single stock.
 * Returns `null` when nothing matches.
 */
export function useTickerSearch() {
  return useMutation({
    mutationFn: async (query: string): Promise<TickerResult | null> => {
      if (USE_MOCK) {
        await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
        return findMockTicker(query)
      }
      const res = await apiFetch<ResolveResponse>(
        '/mock-data/stocks/resolve.json',
        `/api/stocks/resolve?q=${encodeURIComponent(query.trim())}`,
      )
      return res.data[0] ?? null
    },
  })
}
