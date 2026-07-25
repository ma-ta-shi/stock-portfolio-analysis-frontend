import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Force non-mock mode so apiFetch hits the _apiPath and exercises error handling
vi.stubEnv('VITE_USE_MOCK', 'false')

// Import after stubbing env
const { apiFetch, ApiError } = await import('@/lib/api')

describe('ApiError', () => {
  it('has correct name, status, code, and url properties', () => {
    const err = new ApiError('oops', 404, 'http_error', '/api/test')
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.code).toBe('http_error')
    expect(err.url).toBe('/api/test')
    expect(err.message).toBe('oops')
    expect(err).toBeInstanceOf(Error)
  })

  it('accepts null status for network-level errors', () => {
    const err = new ApiError('timeout', null, 'timeout', '/api/test')
    expect(err.status).toBeNull()
  })
})

describe('apiFetch — non-2xx response', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws ApiError with http_error code on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }))

    await expect(apiFetch('/mock', '/api/resource')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'http_error',
    })
  })

  it('throws ApiError with http_error code on 500', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }))

    await expect(apiFetch('/mock', '/api/resource')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      code: 'http_error',
    })
  })
})

describe('apiFetch — network error', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws ApiError with network_error code on TypeError', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(apiFetch('/mock', '/api/resource')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'network_error',
      status: null,
    })
  })
})

describe('apiFetch — timeout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('throws ApiError with timeout code when request exceeds 15s', async () => {
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )

    const promise = apiFetch('/mock', '/api/resource')
    vi.advanceTimersByTime(15001)

    await expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      code: 'timeout',
      status: null,
    })
  })
})

describe('apiFetch — happy path', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on 200', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    const result = await apiFetch<{ ok: boolean }>('/mock', '/api/resource')
    expect(result).toEqual({ ok: true })
  })
})
