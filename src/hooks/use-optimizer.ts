/** The Optimizer tab's server state: the latest stored run, a new saved run, and "where should this money go". */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import { apiFetch, apiQuery, jsonBody } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { Run } from '@/lib/optimizer'

const DIR = '/mock-data/portfolio'

/** The latest weekly or on-demand run. A portfolio with none answers 404 `NO_RUN_STORED`. */
export function useLatestRun() {
  const { portfolioId } = usePortfolioId()
  return useQuery({
    queryKey: queryKeys.portfolio.optimizer(portfolioId ?? ''),
    enabled: !!portfolioId,
    retry: false, // "no run" is an answer, not a glitch
    queryFn: ({ signal }) => apiFetch<Run>(`${DIR}/proposals.json`, `/api/portfolios/${portfolioId}/proposals`, { signal }),
  })
}

/** Runs the optimizer now and saves the run, which replaces the open suggestions. Analyses over a week old are left out. */
export function useRunOptimizer() {
  const { portfolioId } = usePortfolioId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<Run>(`${DIR}/proposals.json`, `/api/portfolios/${portfolioId}/proposal-runs`, jsonBody('POST', { store: true, allow_stale: false })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.optimizer(portfolioId ?? '') }),
  })
}

export type AskAccount = 'any' | 'tfsa' | 'rrsp' | 'trading'

/** A look, never saved: a read made through a POST (mock mode serves the recorded answer). */
export function useAsk() {
  const { portfolioId } = usePortfolioId()
  return useMutation({
    mutationFn: ({ amount_cad, account }: { amount_cad: number; account: AskAccount }) =>
      apiQuery<Run>(`${DIR}/ask.json`, `/api/portfolios/${portfolioId}/ask`, { amount_cad, account: account === 'any' ? null : account, store: false }),
  })
}
