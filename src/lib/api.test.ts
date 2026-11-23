import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_TIMEOUT_MS, ApiError, apiFetch, getErrorMessage, isNotFound, jsonBody } from './api'

// `.env` sets VITE_USE_MOCK=true for local dev; the real-mode tests below must not depend on it.
// (Hoisted so it runs before `./api` is imported and reads the flag.)
vi.hoisted(() => {
  vi.stubEnv('VITE_USE_MOCK', 'false')
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('apiFetch (real mode)', () => {
  it('calls the API path and returns parsed JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    await expect(apiFetch('/mock-data/x.json', '/api/x')).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/x')
  })

  it('passes request options through', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiFetch('/m', '/api/x', jsonBody('POST', { a: 1 }))
    const init = fetchMock.mock.calls[0][1]!
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
  })

  it('maps the backend error envelope onto ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'STOCK_NOT_FOUND', message: 'No stock found for ticker XYZ', details: { ticker: 'XYZ' } } }, 404),
    )
    const err = await apiFetch('/m', '/api/stocks/xyz').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 404, code: 'STOCK_NOT_FOUND', message: 'No stock found for ticker XYZ', details: { ticker: 'XYZ' } })
    expect(isNotFound(err)).toBe(true)
  })

  it('falls back to a generic http_error for non-JSON error bodies', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))
    await expect(apiFetch('/m', '/api/x')).rejects.toMatchObject({ status: 502, code: 'http_error' })
  })

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiFetch('/m', '/api/x')).resolves.toBeUndefined()
  })

  it('reports invalid JSON as invalid_json', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))
    await expect(apiFetch('/m', '/api/x')).rejects.toMatchObject({ code: 'invalid_json' })
  })

  it('reports network failures as network_error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiFetch('/m', '/api/x')).rejects.toMatchObject({ code: 'network_error', status: null })
  })

  it('reports a timeout as timeout', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const promise = apiFetch('/m', '/api/slow')
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS)
    await assertion
  })

  it('re-throws caller cancellation as AbortError (not a timeout) so TanStack Query can ignore it', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const controller = new AbortController()
    const promise = apiFetch('/m', '/api/x', { signal: controller.signal })
    controller.abort()
    const err = await promise.catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as DOMException).name).toBe('AbortError')
  })
})

describe('apiFetch (mock mode)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function loadMockModeApi() {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    vi.resetModules()
    return import('./api')
  }

  it('reads the static mock file', async () => {
    const api = await loadMockModeApi()
    fetchMock.mockResolvedValue(jsonResponse({ mocked: true }))
    await expect(api.apiFetch('/mock-data/x.json', '/api/x')).resolves.toEqual({ mocked: true })
    expect(fetchMock.mock.calls[0][0]).toBe('/mock-data/x.json')
  })

  it('refuses writes instead of silently turning them into GETs', async () => {
    const api = await loadMockModeApi()
    await expect(api.apiFetch('/m', '/api/x', { method: 'POST' })).rejects.toMatchObject({
      code: 'mock_mode_unsupported',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('getErrorMessage', () => {
  it('gives friendly text for transport errors', () => {
    expect(getErrorMessage(new ApiError('x', null, 'timeout', '/u'))).toMatch(/too long/)
    expect(getErrorMessage(new ApiError('x', null, 'network_error', '/u'))).toMatch(/reach the server/)
  })
  it('uses the backend message for domain errors', () => {
    expect(getErrorMessage(new ApiError('Analysis already running', 409, 'ANALYSIS_IN_PROGRESS', '/u'))).toBe(
      'Analysis already running',
    )
  })
  it('handles unknown values', () => {
    expect(getErrorMessage('boom')).toBe('Something went wrong.')
  })
})
