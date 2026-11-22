import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAllocationAnalysis } from './use-allocation-analysis'
import { ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'user_01', setUserId: vi.fn() }) }))

describe('useAllocationAnalysis', () => {
  it('fails with a clear "not connected" error until ALLOCATION_ENDPOINT is set, leaving the optimizer cache untouched', async () => {
    const client = new QueryClient()
    const existing = { user_id: 'user_01', as_of: 'x', no_changes_needed: true, swap_suggestions: [], rebalance_suggestions: [] }
    client.setQueryData(queryKeys.portfolio.optimizer('user_01'), existing)
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useAllocationAnalysis(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ amount_cad: 5000, account_preference: 'any' })).rejects.toBeInstanceOf(ApiError)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'not_connected' })
    expect(client.getQueryData(queryKeys.portfolio.optimizer('user_01'))).toBe(existing)
  })
})
