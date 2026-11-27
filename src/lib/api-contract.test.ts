/**
 * Contract guard: every real API path the app calls must be a route the backend serves, in
 * `src/types/api-routes.gen.json` (refresh it with `npm run gen:api`; each entry is `METHOD /path` with `{}` for a
 * path parameter, so `/api/stocks/{}` and `/api/stocks/lookup` are different routes).
 *
 * Limits, so nobody reads more into a pass than it says: this reads source text. It sees a path written as a string
 * or template literal inside an `apiFetch(...)` or `apiQuery(...)` call (a POST read) and the method from `jsonBody('POST', ...)`; a path built in a
 * variable (like the switched-off allocation endpoint) is not seen. It checks that the route exists, not that the
 * response shape matches what the hook expects (`/api/users/{}`, `/api/analysis/{}` and `/api/stocks/{}` exist but
 * their shapes differ from the hook types until their page tickets).
 */
import { describe, expect, it } from 'vitest'
import servedRoutes from '@/types/api-routes.gen.json'

const served = new Set<string>(servedRoutes)

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

/** `METHOD /normalised/path` for every `apiFetch`, `apiQuery` or `fetchAllPages` call under src that names a real `/api/...` path. */
function usedRoutes(): string[] {
  const found = new Set<string>()
  for (const [file, text] of Object.entries(sources)) {
    if (/\.test\.tsx?$/.test(file) || file.includes('/test/') || file === '/src/lib/api.ts') continue
    for (const m of text.matchAll(/\b(?:apiFetch|apiQuery|fetchAllPages)\b/g)) {
      const call = callText(text, m.index!)
      // A portfolio hook builds its path with `path('/positions')` (use-portfolio.ts adds `/api/portfolios/<id>`); read that as the full path.
      const viaHelper = /\bpath\(\s*[`'"](\/[^`'"]*)[`'"]/.exec(call)?.[1]
      const path = /[`'"](\/api\/[^`'"]*)[`'"]/.exec(call)?.[1] ?? (viaHelper ? `/api/portfolios/\${id}${viaHelper}` : undefined)
      if (!path) continue
      // `apiQuery` is a read made through a POST (lib/api.ts).
      const method = m[0] === 'apiQuery' ? 'POST' : (/jsonBody\(\s*'(\w+)'/.exec(call)?.[1] ?? /\bmethod:\s*'(\w+)'/.exec(call)?.[1] ?? 'GET')
      // A `${query}` glued to the end of a segment is a query string, not a path part.
      const clean = path.split('?')[0].replace(/([a-z_-])\$\{[^}]*\}/gi, '$1').replace(/\$\{[^}]*\}/g, '{}')
      found.add(`${method.toUpperCase()} ${clean}`)
    }
  }
  // Write routes are declared once, with a literal marker (lib/ledger-routes.ts): `ledgerRoute('POST', '/events/{id}/correct')`.
  for (const [file, text] of Object.entries(sources)) {
    if (/\.test\.tsx?$/.test(file) || file.includes('/test/')) continue
    for (const m of text.matchAll(/\bledgerRoute\(\s*'(GET|POST|PATCH|PUT|DELETE)'\s*,\s*'([^']+)'/g)) {
      found.add(`${m[1]} /api/portfolios/{}${m[2].replace(/\{id\}/g, '{}')}`)
    }
  }
  return [...found].sort()
}

describe('API contract', () => {
  const routes = usedRoutes()

  it('finds the hooks API calls (so the scan itself cannot silently break)', () => {
    expect(routes.length).toBeGreaterThan(10)
    expect(routes).toContain('GET /api/users')
    expect(routes).toContain('DELETE /api/watchlist/{}') // a method written in the options, not through jsonBody
    // Portfolio hooks build their path through `path(...)`; the scan must still see them.
    expect(routes).toEqual(expect.arrayContaining(['GET /api/portfolios/{}/positions', 'GET /api/portfolios/{}/holdings', 'POST /api/portfolios/{}/reports', 'GET /api/portfolios/{}/transactions', 'GET /api/portfolios/{}/exposure']))
  })

  it('every path the app calls is served by the backend', () => {
    expect(routes.filter((r) => !served.has(r))).toEqual([])
  })

  it('tells a literal path from an id, and checks the method', () => {
    expect(served.has('GET /api/stocks/{}')).toBe(true)
    expect(served.has('GET /api/stocks/lookup')).toBe(true)
    expect(served.has('GET /api/stocks/resolve')).toBe(false) // a word, not an id
    expect(served.has('POST /api/analysis')).toBe(true)
    expect(served.has('DELETE /api/analysis')).toBe(false) // the path exists, this method does not
  })
})
