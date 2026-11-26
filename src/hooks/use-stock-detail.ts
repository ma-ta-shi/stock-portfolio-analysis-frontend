/** What the Stock page reads about one stock. Each read is its own query, so one failing does not blank the page. */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { dayFromToday } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { mapFundamentals, mapHistory, type ApiFundamentals, type ApiPrediction, type ApiRunSummary } from '@/lib/stock-detail'
import { mapStockSnapshot } from '@/lib/stock-snapshot'
import type { components } from '@/types/openapi.gen'
import type { Stock } from '@/types/stock'

type Api = components['schemas']
const DIR = '/mock-data/stocks'

export function useStock(stockId: string) {
  return useQuery({
    queryKey: queryKeys.stocks.detail(stockId),
    enabled: !!stockId,
    queryFn: ({ signal }) => apiFetch<Api['StockResponse']>(`${DIR}/stock.json`, `/api/stocks/${stockId}`, { signal }),
  })
}

/** The newest price and call of the stock (the call repriced at that price). */
export function useStockSnapshot(stockId: string) {
  const result = useQuery({
    queryKey: queryKeys.stocks.snapshot(stockId),
    enabled: !!stockId,
    queryFn: ({ signal }) => apiFetch<Api['StockSnapshotListResponse']>(`${DIR}/snapshot.json`, `/api/stocks/snapshots?stock_ids=${stockId}`, { signal }),
  })
  const data = useMemo(() => (result.data?.data[0] ? mapStockSnapshot(result.data.data[0]) : null), [result.data])
  return { ...result, data }
}

export function useStockFundamentals(stockId: string) {
  return useQuery({
    queryKey: queryKeys.stocks.fundamentals(stockId),
    enabled: !!stockId,
    queryFn: ({ signal }) => apiFetch<ApiFundamentals>(`${DIR}/fundamentals.json`, `/api/stocks/${stockId}/fundamentals`, { signal }),
    select: (f) => ({ values: mapFundamentals(f), marketCap: f.price?.market_cap ?? null, currency: f.price?.currency ?? null, asOf: f.run_day ?? null }),
  })
}

/** The closes of the last 90 days, oldest first (the API serves newest first). */
export function useStockPrices(stockId: string) {
  return useQuery({
    queryKey: queryKeys.stocks.prices(stockId),
    enabled: !!stockId,
    queryFn: ({ signal }) => fetchAllPages<Api['PriceResponse']>(`${DIR}/prices.json`, `/api/stocks/${stockId}/prices?from=${dayFromToday(-90)}`, { signal }),
    select: (rows) => rows.map((r) => r.close).reverse(),
  })
}

/**
 * Every completed analysis of the stock, each with its prediction, newest first, whoever started it: a pipeline run is shared by all
 * users (owner rule) and holds nothing about one. Everything else about a user (portfolio, watchlist, settings) is read for them alone.
 */
export function useStockHistory(stockId: string, stock: Stock | undefined) {
  const result = useQuery({
    queryKey: queryKeys.stocks.history(stockId),
    enabled: !!stockId,
    queryFn: async ({ signal }) => {
      const [runs, predictions] = await Promise.all([
        fetchAllPages<ApiRunSummary>(`${DIR}/runs.json`, `/api/analysis?stock_id=${stockId}&status=complete`, { signal }),
        fetchAllPages<ApiPrediction>(`${DIR}/predictions.json`, `/api/predictions?stock_id=${stockId}`, { signal }),
      ])
      return { runs, predictions }
    },
  })
  const data = useMemo(() => (result.data && stock ? mapHistory(stock, result.data.runs, result.data.predictions) : undefined), [result.data, stock])
  return { ...result, data }
}
