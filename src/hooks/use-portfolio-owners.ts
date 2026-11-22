import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { ListResponse } from '@/types'
import type { components } from '@/types/openapi.gen'

type PortfolioResponse = components['schemas']['PortfolioResponse']

/**
 * The ids of the users who own a portfolio, used to pick the default user before any user is selected (so it takes no
 * user id). A failure is not fatal: the default falls back to the first user.
 */
export function usePortfolioOwners() {
  return useQuery({
    queryKey: queryKeys.portfolioOwners,
    queryFn: ({ signal }) =>
      apiFetch<ListResponse<PortfolioResponse>>('/mock-data/portfolios.json', '/api/portfolios?per_page=100', { signal }),
    select: (res) => new Set(res.data.filter((p) => p.kind === 'user').map((p) => p.user_id)),
  })
}
