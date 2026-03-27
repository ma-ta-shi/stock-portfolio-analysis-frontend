import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { StockDetail, StockAnalysisHistory } from '@/types'

export function useStockDetail(stockId: string) {
  return useQuery({
    queryKey: ['stocks', stockId],
    queryFn: () =>
      apiFetch<StockDetail>(
        `/mock-data/stocks/${stockId}.json`,
        `/api/stocks/${stockId}`,
      ),
    enabled: !!stockId,
  })
}

export function useStockAnalysisHistory(stockId: string) {
  return useQuery({
    queryKey: ['stocks', stockId, 'history'],
    queryFn: () =>
      apiFetch<StockAnalysisHistory>(
        `/mock-data/stocks/${stockId}/history.json`,
        `/api/stocks/${stockId}/history`,
      ),
    enabled: !!stockId,
  })
}
