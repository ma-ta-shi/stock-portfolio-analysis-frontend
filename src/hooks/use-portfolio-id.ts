import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { ListResponse } from '@/types'
import type { components } from '@/types/openapi.gen'

type PortfolioResponse = components['schemas']['PortfolioResponse']

/**
 * The active user's own portfolio id. Everything portfolio-shaped in the API is keyed by this id, not the user id.
 * `isEmpty` is true once the lookup finished and the user has no portfolio yet (a portfolio is created in Settings).
 */
export function usePortfolioId() {
  const { userId } = useUser()
  const query = useQuery({
    queryKey: queryKeys.portfolios(userId),
    queryFn: ({ signal }) =>
      apiFetch<ListResponse<PortfolioResponse>>(
        `/mock-data/portfolios/${userId}.json`,
        `/api/portfolios?user_id=${encodeURIComponent(userId)}`,
        { signal },
      ),
    // The agent's portfolio (`kind: 'agent'`) is read-only and listed beside the owner's; this is the owner's.
    select: (res) => res.data.find((p) => p.kind === 'user')?.portfolio_id ?? null,
  })
  return {
    portfolioId: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isEmpty: query.isSuccess && query.data === null,
  }
}
