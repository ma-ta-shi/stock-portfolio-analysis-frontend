import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import { fromLookup, useTickerSearch } from './use-ticker-search'
import { ApiError } from '@/lib/api'
import type { StockLookup } from '@/screens/portfolio/lookup'

const bns: StockLookup = {
  stock_id: 'sid-1', ticker: 'BNS.TO', name: 'Bank of Nova Scotia', exchange: 'TSX', currency: 'CAD', sector: 'Financials',
  industry: 'Banks', instrument_type: null, pipeline_supported: true, unsupported_reason: null, source: 'database',
} // fmt: skip

describe('fromLookup', () => {
  it('turns the answer into the stock the dialogs use, keeping the whole answer', () => {
    expect(fromLookup(bns)).toMatchObject({ stock_id: 'sid-1', ticker: 'BNS.TO', name: 'Bank of Nova Scotia', currency: 'CAD', sector: 'Financials', lookup: bns })
  })

  it('stands the ticker in for the id of a stock the record has not seen', () => {
    expect(fromLookup({ ...bns, stock_id: null, source: 'provider' }).stock_id).toBe('BNS.TO')
  })

  it('carries the instrument kind and why an unsupported one is not analysed', () => {
    expect(fromLookup({ ...bns, instrument_type: 'etf', pipeline_supported: false, unsupported_reason: 'a fund' })).toMatchObject({ instrument_type: 'etf', pipeline_supported: false, unsupported_reason: 'a fund' })
  })
})

describe('useTickerSearch (live)', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: new QueryClient() }, children)

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('asks the backend for the ticker, encoded, and returns the stock', async () => {
    fetchMock.mockResolvedValueOnce(json(bns))
    const { result } = renderHook(() => useTickerSearch(), { wrapper })
    let found: unknown
    await act(async () => {
      found = await result.current.mutateAsync('  bns.to ')
    })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/stocks/lookup?ticker=bns.to')
    expect(found).toMatchObject({ ticker: 'BNS.TO', lookup: bns })
  })

  it('answers null when the backend says it does not know the ticker', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'STOCK_NOT_FOUND', message: 'No such stock', details: {} } }, 404))
    const { result } = renderHook(() => useTickerSearch(), { wrapper })
    let found: unknown = 'unset'
    await act(async () => {
      found = await result.current.mutateAsync('ZZZZ')
    })
    expect(found).toBeNull()
  })

  it('lets any other failure through, so the dialog can say the lookup failed', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { code: 'STOCK_LOOKUP_UNAVAILABLE', message: 'Providers are down', details: {} } }, 503))
    const { result } = renderHook(() => useTickerSearch(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync('RY.TO').catch(() => undefined)
    })
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError))
    expect((result.current.error as ApiError).code).toBe('STOCK_LOOKUP_UNAVAILABLE')
  })

  it('does not ask the backend for a blank ticker', async () => {
    const { result } = renderHook(() => useTickerSearch(), { wrapper })
    await act(async () => {
      expect(await result.current.mutateAsync('   ')).toBeNull()
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
