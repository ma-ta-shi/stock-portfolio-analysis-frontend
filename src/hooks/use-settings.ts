import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import { apiFetch, getErrorMessage, jsonBody } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { buildSave, type Change, type OptimizerSettings, type SavePart } from '@/lib/settings-form'
import type { components } from '@/types/openapi.gen'

type Api = components['schemas']
/** The optimizer rules a portfolio may carry, with their ranges and defaults. The same table the update is checked against. */
export function useOrderSettingsSchema() {
  return useQuery({
    queryKey: queryKeys.orderSettings,
    queryFn: ({ signal }) => apiFetch<Api['OrderSettingsSchemaResponse']>('/api/order-settings/schema', { signal }),
  })
}

export interface SaveResult {
  /** Keys of the inputs the server accepted. */
  saved: string[]
  failed: { label: string; message: string }[]
}

/**
 * Saves each part on its own (there is no one request for all of it), so a refused part leaves the others saved. Never
 * optimistic: what the page shows afterwards is what the server answers.
 */
export function useSaveSettings() {
  const { userId } = useUser()
  const { portfolioId, refetch: readPortfolio } = usePortfolioId()
  const queryClient = useQueryClient()

  const send = (part: SavePart) => {
    if (part.to === 'profile') return apiFetch(`/api/users/${userId}`, jsonBody('PATCH', part.body))
    if (part.to === 'portfolio') return apiFetch(`/api/portfolios/${portfolioId}`, jsonBody('PATCH', part.body))
    return apiFetch(`/api/portfolios/${portfolioId}/accounts/${part.account}`, jsonBody('PATCH', part.body))
  }

  return useMutation({
    mutationFn: async ({ changes, today }: { changes: readonly Change[]; today: string }): Promise<SaveResult> => {
      const result: SaveResult = { saved: [], failed: [] }
      // The server replaces the optimizer's `settings` whole, and they change outside this page (a command
      // line): so they are read again now, and not saved at all if that read fails.
      let settings: OptimizerSettings = {}
      let toSave = changes
      if (changes.some((c) => c.input.target.part === 'rule')) {
        const fresh = await readPortfolio()
        if (fresh.isError || !fresh.data) {
          toSave = changes.filter((c) => c.input.target.part !== 'rule')
          result.failed.push({ label: 'Optimizer rules', message: 'The current rules could not be read, so nothing was changed.' })
        } else {
          settings = (fresh.data.settings ?? {}) as OptimizerSettings
        }
      }
      for (const part of buildSave(toSave, settings, today)) {
        try {
          await send(part)
          result.saved.push(...part.keys)
        } catch (error) {
          result.failed.push({ label: part.label, message: getErrorMessage(error, { write: true }) })
        }
      }
      // the names in the switcher, the profile, and everything worked out from them or from the portfolio
      await Promise.all(
        [queryKeys.users.all, queryKeys.users.profile(userId), queryKeys.portfolio.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
      return result
    },
  })
}
