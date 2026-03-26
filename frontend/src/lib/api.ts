const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE = USE_MOCK ? '' : 'http://localhost:8000'
const API_TIMEOUT_MS = 15000

export class ApiError extends Error {
  status: number | null
  code: string
  url: string

  constructor(message: string, status: number | null, code: string, url: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.url = url
  }
}

export async function apiFetch<T>(
  mockPath: string,
  _apiPath: string,
  _options?: RequestInit,
): Promise<T> {
  const url = USE_MOCK ? mockPath : `${API_BASE}${_apiPath}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const mergedSignal = _options?.signal
      ? AbortSignal.any([_options.signal, controller.signal])
      : controller.signal

    const res = await fetch(url, {
      ...(USE_MOCK ? {} : _options),
      signal: mergedSignal,
    })

    if (!res.ok) {
      throw new ApiError(`API error ${res.status}: ${url}`, res.status, 'http_error', url)
    }

    return res.json() as Promise<T>
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`API timeout after ${API_TIMEOUT_MS}ms: ${url}`, null, 'timeout', url)
    }
    throw new ApiError(`Network error: ${url}`, null, 'network_error', url)
  } finally {
    clearTimeout(timeoutId)
  }
}
