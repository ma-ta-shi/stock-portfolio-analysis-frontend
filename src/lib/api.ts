/**
 * Thin fetch wrapper shared by every TanStack Query hook.
 *
 * - Mock mode (`VITE_USE_MOCK=true`) reads static JSON from `public/mock-data/`.
 * - Real mode calls the FastAPI backend. `VITE_API_BASE_URL` is empty by default so
 *   requests go to same-origin `/api/...` (proxied to the backend by the Vite dev server).
 * - Errors are always thrown as `ApiError`, except caller cancellations, which are
 *   re-thrown untouched so TanStack Query can recognise them.
 */

import { notConnectedMessage, type GapId } from './gaps'
import { WRITE_ERRORS } from './labels'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
export const API_TIMEOUT_MS = 15_000

export type ApiErrorCode =
  | 'http_error'
  | 'timeout'
  | 'network_error'
  | 'invalid_json'
  | 'mock_mode_unsupported'
  | 'not_connected'
  // Backend domain codes (docs/api-conventions.md) are passed through as-is.
  | (string & {})

export class ApiError extends Error {
  readonly status: number | null
  readonly code: ApiErrorCode
  readonly url: string
  readonly details?: Record<string, unknown>

  constructor(
    message: string,
    status: number | null,
    code: ApiErrorCode,
    url: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.url = url
    this.details = details
  }
}

/** Backend error envelope: `{ "error": { "code", "message", "details" } }` */
interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: Record<string, unknown> }
}

async function toHttpError(res: Response, url: string): Promise<ApiError> {
  let envelope: ErrorEnvelope | null = null
  try {
    envelope = (await res.json()) as ErrorEnvelope
  } catch {
    // Non-JSON error body (e.g. proxy HTML page) — fall through to the generic message.
  }
  const err = envelope?.error
  return new ApiError(
    err?.message ?? `API error ${res.status}: ${url}`,
    res.status,
    err?.code ?? 'http_error',
    url,
    err?.details,
  )
}

/**
 * @param mockPath  Path of the static mock file, e.g. `/mock-data/watchlist/watchlist.json`
 * @param apiPath   Backend path, e.g. `/api/watchlist?user_id=…`
 * @param options   Standard fetch options. Pass TanStack Query's `signal` for cancellation.
 */
export async function apiFetch<T>(
  mockPath: string,
  apiPath: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const url = USE_MOCK ? mockPath : `${API_BASE}${apiPath}`

  if (USE_MOCK && method !== 'GET') {
    // Static JSON files can't accept writes; fail loudly instead of silently doing a GET.
    throw new ApiError(
      `${method} ${apiPath} is not available in mock mode`,
      null,
      'mock_mode_unsupported',
      apiPath,
    )
  }

  const timeoutController = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    timeoutController.abort()
  }, API_TIMEOUT_MS)

  const signal = options.signal
    ? AbortSignal.any([options.signal, timeoutController.signal])
    : timeoutController.signal

  try {
    const res = await fetch(url, { ...(USE_MOCK ? {} : options), signal })

    if (!res.ok) {
      throw await toHttpError(res, url)
    }
    if (res.status === 204) {
      return undefined as T
    }
    try {
      return (await res.json()) as T
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ApiError(`Invalid JSON response: ${url}`, res.status, 'invalid_json', url)
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timedOut) {
        throw new ApiError(`API timeout after ${API_TIMEOUT_MS}ms: ${url}`, null, 'timeout', url)
      }
      // Cancelled by the caller (e.g. TanStack Query unmount) — not an application error.
      throw error
    }
    throw new ApiError(`Network error: ${url}`, null, 'network_error', url)
  } finally {
    clearTimeout(timeoutId)
  }
}

/** JSON body helper for POST/PUT calls: `apiFetch(m, a, jsonBody('POST', payload))` */
export function jsonBody(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

/**
 * Read through a POST: a report names its period and scope in a body but changes nothing. Real mode sends the POST;
 * mock mode (which refuses writes) serves the recorded file. The contract test scans `apiQuery` calls as POSTs.
 */
export function apiQuery<T>(mockPath: string, apiPath: string, body: unknown, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(mockPath, apiPath, USE_MOCK ? options : { ...options, ...jsonBody('POST', body) })
}

/**
 * The error a control raises when what it does is not wired yet. The message comes from the gap registry (`lib/gaps.json`),
 * so it names the missing piece, the gap id and the ticket that closes it; never silently do nothing.
 */
export function notConnected(gap: GapId): ApiError {
  return new ApiError(notConnectedMessage(gap), null, 'not_connected', '', { gap })
}

export interface ErrorMessageOptions {
  /** A ledger write: show the backend's own explanation (including its 404s and field errors) instead of the read-side wording. */
  write?: boolean
}

/** What a failed request says for a write: the page's wording where it has some, else the backend's own message. */
function writeErrorMessage(error: ApiError): string {
  if (error.code === 'mock_mode_unsupported') return 'Writes need the real backend (run npm run dev:live).'
  if (error.code === 'VALIDATION_ERROR') {
    const errors = Array.isArray(error.details?.errors) ? (error.details.errors as { loc?: unknown[]; msg?: string }[]) : []
    const lines = errors.map((e) => {
      const field = [...(e.loc ?? [])].reverse().find((part) => typeof part === 'string' && part !== 'body')
      return field ? `${String(field)}: ${e.msg ?? 'is not valid'}` : (e.msg ?? 'is not valid')
    })
    if (lines.length) return lines.join('; ')
  }
  return WRITE_ERRORS[error.code] ?? error.message
}

/** User-facing message for any error thrown by a query or mutation. */
export function getErrorMessage(error: unknown, options: ErrorMessageOptions = {}): string {
  if (error instanceof ApiError) {
    if (error.code === 'timeout') return 'The server took too long to respond.'
    if (error.code === 'network_error') return 'Could not reach the server.'
    if (options.write) return writeErrorMessage(error)
    if (error.status === 404) return 'Not found.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
