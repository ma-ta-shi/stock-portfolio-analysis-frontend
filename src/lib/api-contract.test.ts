/**
 * Contract guard: every real API path the app calls must be a route the backend serves, in
 * `src/types/api-routes.gen.json` (refresh it with `npm run gen:api`; each entry is `METHOD /path` with `{}` for a
 * path parameter, so `/api/stocks/{}` and `/api/stocks/lookup` are different routes).
 *
 * Limits, so nobody reads more into a pass than it says: this reads source text. It sees a path written as a string
 * or template literal inside an `apiFetch(...)` call and the method from `jsonBody('POST', ...)`; a path built in a
 * variable (like the switched-off allocation endpoint) is not seen. It checks that the route exists, not that the
 * response shape matches what the hook expects (`/api/users/{}`, `/api/analysis/{}` and `/api/stocks/{}` exist but
 * their shapes differ from the hook types until their page tickets).
 */
import { describe, expect, it } from 'vitest'
import servedRoutes from '@/types/api-routes.gen.json'

const served = new Set<string>(servedRoutes)

/**
 * Mock-era paths with no backend route, each owned by the page ticket that replaces it (epic 86bd5z6kr).
 * Ticket 8 deletes this list. A path that starts to exist must be removed from it (the third test enforces that).
 */
const KNOWN_DEAD: readonly string[] = [
  'GET /api/alerts/{}',
  'GET /api/alerts/{}/unread-count',
  'GET /api/market/overview',
  'GET /api/market/news',
  'GET /api/portfolio/{}',
  'GET /api/portfolio/{}/summary',
  'GET /api/portfolio/{}/optimizer',
  'GET /api/portfolio/{}/transactions',
  'GET /api/portfolio/{}/closed',
  'GET /api/predictions/{}',
  'GET /api/feedback/{}',
  'GET /api/watchlist/{}',
  'GET /api/analysis/{}/agents',
  'GET /api/stocks/{}/history',
  'GET /api/stocks/resolve',
]

const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

/** The text of the call starting at `start` (the index of `apiFetch`), up to its balanced closing parenthesis. */
function callText(text: string, start: number): string {
  const open = text.indexOf('(', start)
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++
    else if (text[i] === ')' && --depth === 0) return text.slice(open, i + 1)
  }
  return text.slice(open)
}

/** `METHOD /normalised/path` for every `apiFetch` call under src that names a real `/api/...` path. */
function usedRoutes(): string[] {
  const found = new Set<string>()
  for (const [file, text] of Object.entries(sources)) {
    if (/\.test\.tsx?$/.test(file) || file.includes('/test/') || file === '/src/lib/api.ts') continue
    for (const m of text.matchAll(/apiFetch\b/g)) {
      const call = callText(text, m.index!)
      const path = /[`'"](\/api\/[^`'"]*)[`'"]/.exec(call)?.[1]
      if (!path) continue
      const method = /jsonBody\(\s*'(\w+)'/.exec(call)?.[1] ?? 'GET'
      found.add(`${method.toUpperCase()} ${path.split('?')[0].replace(/\$\{[^}]*\}/g, '{}')}`)
    }
  }
  return [...found].sort()
}

describe('API contract', () => {
  const routes = usedRoutes()

  it('finds the hooks API calls (so the scan itself cannot silently break)', () => {
    expect(routes.length).toBeGreaterThan(10)
    expect(routes).toContain('GET /api/users')
  })

  it('every path the app calls is served by the backend, except the known mock-era ones', () => {
    const unknown = routes.filter((r) => !served.has(r) && !KNOWN_DEAD.includes(r))
    expect(unknown).toEqual([])
  })

  it('the known-dead list holds only paths that are still missing and still used', () => {
    const nowServed = KNOWN_DEAD.filter((r) => served.has(r))
    const unused = KNOWN_DEAD.filter((r) => !routes.includes(r))
    expect({ nowServed, unused }).toEqual({ nowServed: [], unused: [] })
  })

  it('tells a literal path from an id, and checks the method', () => {
    expect(served.has('GET /api/stocks/{}')).toBe(true)
    expect(served.has('GET /api/stocks/lookup')).toBe(true)
    expect(served.has('GET /api/stocks/resolve')).toBe(false) // a word, not an id
    expect(served.has('POST /api/analysis')).toBe(true)
    expect(served.has('DELETE /api/analysis')).toBe(false) // the path exists, this method does not
  })
})
