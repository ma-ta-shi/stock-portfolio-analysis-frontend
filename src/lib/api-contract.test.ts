/**
 * Contract guard: every real API path the app calls must exist, with that method, in `openapi.snapshot.json`
 * (refresh it with `npm run gen:api`).
 *
 * Limits, so nobody reads more into a pass than it says: this reads source text. It sees a path written as a string
 * or template literal inside an `apiFetch(...)` call and the method from `jsonBody('POST', ...)`; a path built in a
 * variable (like the switched-off allocation endpoint) is not seen. It checks that the route exists, not that the
 * response shape matches what the hook expects (`/api/users/{}`, `/api/analysis/{}` and `/api/stocks/{}` exist but
 * their shapes differ from the hook types until their page tickets).
 */
import { describe, expect, it } from 'vitest'
import snapshot from '../../openapi.snapshot.json'

const openApiPaths = (snapshot as { paths: Record<string, Record<string, unknown>> }).paths

/**
 * Mock-era paths with no backend route, each owned by the page ticket that replaces it (epic 86bd5z6kr).
 * Ticket 8 deletes this list. A path that starts to exist must be removed from it (the second test enforces that).
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

function exists(route: string): boolean {
  const [method, path] = route.split(' ')
  // A path parameter matches only an interpolated `{}` segment: a literal word like `resolve` is not an id.
  const segs = path.split('/')
  return Object.entries(openApiPaths).some(([p, methods]) => {
    const parts = p.split('/')
    return (
      parts.length === segs.length &&
      parts.every((part, i) => (part.startsWith('{') ? segs[i] === '{}' : part === segs[i])) &&
      method.toLowerCase() in methods
    )
  })
}

describe('API contract', () => {
  const routes = usedRoutes()

  it('finds the hooks API calls (so the scan itself cannot silently break)', () => {
    expect(routes.length).toBeGreaterThan(10)
    expect(routes).toContain('GET /api/users')
  })

  it('matches a path parameter only against an interpolated segment, and checks the method', () => {
    expect(exists('GET /api/stocks/{}')).toBe(true)
    expect(exists('GET /api/stocks/lookup')).toBe(true)
    // "resolve" is a word, not an id: it must not match the `/api/stocks/{stock_id}` route.
    expect(exists('GET /api/stocks/resolve')).toBe(false)
    expect(exists('POST /api/analysis')).toBe(true)
    expect(exists('DELETE /api/analysis')).toBe(false)
  })

  it('every path the app calls exists in the OpenAPI snapshot, except the known mock-era ones', () => {
    const unknown = routes.filter((r) => !exists(r) && !KNOWN_DEAD.includes(r))
    expect(unknown).toEqual([])
  })

  it('the known-dead list holds only paths that are still missing and still used', () => {
    const nowExist = KNOWN_DEAD.filter((r) => exists(r))
    const unused = KNOWN_DEAD.filter((r) => !routes.includes(r))
    expect({ nowExist, unused }).toEqual({ nowExist: [], unused: [] })
  })
})
