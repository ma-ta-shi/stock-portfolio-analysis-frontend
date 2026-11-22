import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch, jsonBody } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { PortfolioOptimizerResult } from '@/types'

export type AllocationAccountPreference = 'any' | 'tfsa' | 'rrsp' | 'trading'

export interface AllocationAnalysisRequest {
  /** New cash available to invest, in CAD. */
  amount_cad: number
  /** 'any' = TFSA room first, then RRSP suitability, then Trading as overflow. */
  account_preference: AllocationAccountPreference
}

/**
 * Assumed to be the optimizer result re-run with the new capital.
 * Confirm against the backend schema when connecting.
 */
export type AllocationAnalysisResult = PortfolioOptimizerResult

/**
 * Backend path for "Analyze allocation". Set this to connect the feature;
 * nothing else in the UI needs to change. `null` = not connected yet.
 * e.g. (userId) => `/api/portfolio/${userId}/allocation`
 */
const ALLOCATION_ENDPOINT: ((userId: string) => string) | null = null

export function useAllocationAnalysis() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: AllocationAnalysisRequest): Promise<AllocationAnalysisResult> => {
      if (!ALLOCATION_ENDPOINT) {
        throw new ApiError(
          'Allocation analysis isn’t connected to the backend yet.',
          null,
          'not_connected',
          '',
        )
      }
      const path = ALLOCATION_ENDPOINT(userId)
      return apiFetch<AllocationAnalysisResult>(path, path, jsonBody('POST', request))
    },
    onSuccess: (result) => {
      // Show the new suggestions in the Optimizer section directly below the widget.
      queryClient.setQueryData(queryKeys.portfolio.optimizer(userId), result)
    },
  })
}
