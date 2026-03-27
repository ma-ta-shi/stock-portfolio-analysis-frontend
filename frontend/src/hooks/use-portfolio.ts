import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { PortfolioSummary, PortfolioHoldingsResponse, PortfolioOptimizerResult } from '@/types'

export function usePortfolioSummary() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'summary', userId],
    queryFn: () =>
      apiFetch<PortfolioSummary>(
        `/mock-data/portfolio/${userId}/summary.json`,
        `/api/portfolio/${userId}/summary`,
      ),
  })
}

export function usePortfolioHoldings() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'holdings', userId],
    queryFn: () =>
      apiFetch<PortfolioHoldingsResponse>(
        `/mock-data/portfolio/${userId}.json`,
        `/api/portfolio/${userId}`,
      ),
    select: (res) => res.data,
  })
}

export function usePortfolioOptimizer() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'optimizer', userId],
    queryFn: () =>
      apiFetch<PortfolioOptimizerResult>(
        `/mock-data/portfolio/${userId}/optimizer.json`,
        `/api/portfolio/${userId}/optimizer`,
      ),
  })
}
