import { vi } from 'vitest'

/** Every recorded API response, read as text by the bundler (no node modules needed). */
const FILES = import.meta.glob('../../public/mock-data/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/**
 * Serves `/mock-data/...` requests from `public/mock-data`, the recorded API responses (`npm run record:fixtures`), so a hook
 * test runs in mock mode against the same files the dev server serves. Returns the stub so a test can inspect calls.
 */
export function installFixtureFetch(
  /** Answers to use instead of a recorded file, by its path: a body, or a status to fail with. */
  overrides: Record<string, unknown> = {},
) {
  const stub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input).split('?')[0]
    if (url in overrides) {
      const given = overrides[url]
      if (typeof given === 'number') return new Response(JSON.stringify({ error: { code: given === 404 ? 'STOCK_NOT_FOUND' : 'x', message: 'failed' } }), { status: given })
      return new Response(JSON.stringify(given), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const body = FILES[`../../public${url}`]
    if (body === undefined) return new Response(JSON.stringify({ error: { code: 'not_found', message: `No fixture ${url}` } }), { status: 404 })
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', stub)
  return stub
}
