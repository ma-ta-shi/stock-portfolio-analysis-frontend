import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiQuery } from './api'
import { fetchAllPages } from './fetch-all-pages'

const fetchMock = vi.fn<typeof fetch>()

function page(data: unknown[], pageNo: number, pages: number) {
  const body = { data, meta: { total: 5, page: pageNo, per_page: 100, pages } }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('fetchAllPages', () => {
  it('follows meta.pages with per_page=100 and joins the rows', async () => {
    fetchMock.mockResolvedValueOnce(page([1, 2], 1, 2)).mockResolvedValueOnce(page([3], 2, 2))
    await expect(fetchAllPages<number>('/api/things?kind=a')).resolves.toEqual([1, 2, 3])
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/api/things?kind=a&page=1&per_page=100', '/api/things?kind=a&page=2&per_page=100'])
  })

  it('starts the query string when the path has none', async () => {
    fetchMock.mockResolvedValueOnce(page([], 1, 1))
    await fetchAllPages('/api/things')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/things?page=1&per_page=100')
  })

  it('stops after one request when there is one page', async () => {
    fetchMock.mockResolvedValueOnce(page([1], 1, 1))
    await fetchAllPages('/api/things')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('apiQuery', () => {
  it('reads through a POST with a JSON body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    await expect(apiQuery('/api/things/report', { preset: 'since_inception' })).resolves.toEqual({ ok: true })
    const init = fetchMock.mock.calls[0][1]!
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"preset":"since_inception"}')
  })

})
