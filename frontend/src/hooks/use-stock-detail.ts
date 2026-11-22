import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { StockDetail, StockAnalysisHistory } from '@/types'

export function useStockDetail(stockId: string) {
  return useQuery({
    queryKey: queryKeys.stocks.detail(stockId),
    queryFn: ({ signal }) =>
      apiFetch<StockDetail>(
        `/mock-data/stocks/${stockId}.json`,
        `/api/stocks/${stockId}`,
        { signal },
      ),
    enabled: !!stockId,
  })
}

export function useStockAnalysisHistory(stockId: string) {
  return useQuery({
    queryKey: queryKeys.stocks.history(stockId),
    queryFn: ({ signal }) =>
      apiFetch<StockAnalysisHistory>(
        `/mock-data/stocks/${stockId}/history.json`,
        `/api/stocks/${stockId}/history`,
        { signal },
      ),
    enabled: !!stockId,
  })
}
