import { vi } from 'vitest'

/** Every recorded API response, read as text by the bundler (no node modules needed). */
const FILES = import.meta.glob('../../public/mock-data/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/**
 * Serves `/mock-data/...` requests from `public/mock-data`, the recorded API responses (`npm run record:fixtures`), so a hook
 * test runs in mock mode against the same files the dev server serves. Returns the stub so a test can inspect calls.
 */
export function installFixtureFetch() {
  const stub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input).split('?')[0]
    const body = FILES[`../../public${url}`]
    if (body === undefined) return new Response(JSON.stringify({ error: { code: 'not_found', message: `No fixture ${url}` } }), { status: 404 })
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', stub)
  return stub
}
