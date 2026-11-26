import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStockHistory } from './use-stock-detail'

const { read } = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/lib/fetch-all-pages', () => ({ fetchAllPages: read }))

describe('useStockHistory', () => {
  it('reads every run of the stock, whoever started it: pipeline runs are shared by all users', async () => {
    read.mockResolvedValue([])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

    renderHook(() => useStockHistory('s1', undefined), { wrapper })

    await waitFor(() => expect(read.mock.calls.map((c) => c[1])).toContain('/api/analysis?stock_id=s1&status=complete'))
  })
})
