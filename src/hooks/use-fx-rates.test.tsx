import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFxRates } from './use-fx-rates'
import { installFixtureFetch } from '@/test/fixture-fetch'
import file from '@/test/fixtures/market/exchange-rates.json'

const FILE = 'market/exchange-rates'

function read(overrides: Record<string, unknown> = {}) {
  installFixtureFetch(overrides)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useFxRates(), { wrapper })
}

afterEach(() => vi.unstubAllGlobals())

describe('useFxRates', () => {
  it('takes the newest observation of the recorded response (the API lists oldest first)', async () => {
    const { result } = read()
    const newest = file.data[file.data.length - 1]
    await waitFor(() => expect(result.current.rates.USD).toBe(newest.rate))
    expect(result.current.asOf).toBe(newest.date)
  })

  it('knows only CAD when the rate cannot be read', async () => {
    const { result } = read({ [FILE]: 503 })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rates).toEqual({ CAD: 1 })
  })
})
