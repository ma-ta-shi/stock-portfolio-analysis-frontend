import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { ListResponse } from '@/types'
import type { components } from '@/types/openapi.gen'

type PortfolioResponse = components['schemas']['PortfolioResponse']

/**
 * The active user's own portfolio. Every portfolio route is keyed by this id, not the user id. `isEmpty` is true once the lookup
 * finished and the user has no portfolio yet (gap P-R1: creating one is the Settings ticket).
 */
export function usePortfolioId() {
  const { userId } = useUser()
  const query = useQuery({
    queryKey: queryKeys.portfolio.id(userId),
    queryFn: ({ signal }) =>
      apiFetch<ListResponse<PortfolioResponse>>(
        '/mock-data/portfolio/portfolios.json',
        `/api/portfolios?user_id=${encodeURIComponent(userId)}`,
        { signal },
      ),
    // The agent's portfolio (`kind: 'agent'`) is read-only and listed beside the owner's; this is the owner's.
    select: (res) => res.data.find((p) => p.kind === 'user') ?? null,
  })
  return {
    portfolio: query.data ?? null,
    portfolioId: query.data?.portfolio_id ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isEmpty: query.isSuccess && query.data === null,
  }
}
