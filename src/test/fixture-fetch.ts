import { vi } from 'vitest'
import served from '@/types/api-routes.gen.json'
import routes from './fixture-routes.json'

/** Every recorded API response, read as text by the bundler (no node modules needed). */
const FILES = import.meta.glob('../../public/mock-data/**/*.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

interface Route {
  screen: string
  file: string
  path: string
  method?: string
  body?: Record<string, unknown>
  /** Only for a request whose `from` is more than this many days back: picks this recording over its shorter sibling. */
  spanOver?: number
}

/** The paths the backend serves as written (`/api/stocks/lookup`): such a word is a route of its own, never an id. */
const NAMED = new Set((served as string[]).map((route) => route.split(' ')[1]).filter((path) => !path.includes('{}')))
/** Parameters that do not decide the recording: paging is the caller's business, and an end day defaults to today. */
const OPTIONAL = new Set(['page', 'per_page', 'to'])

export const recordingId = (route: { screen: string; file: string }) => (route.screen ? `${route.screen}/${route.file}` : route.file)

const isPlaceholder = (value: string) => /^\{.*\}$/.test(value)

/** How well a request fits a route (higher is more specific), or null when it does not. */
function fit(route: Route, method: string, url: URL, body: unknown): number | null {
  if ((route.method ?? 'GET') !== method) return null
  const [path, query = ''] = route.path.split('?')
  const want = path.split('/')
  const got = url.pathname.split('/')
  if (want.length !== got.length) return null
  let score = 0
  for (let i = 0; i < want.length; i++) {
    if (isPlaceholder(want[i])) {
      if (!got[i] || NAMED.has([...got.slice(0, i), got[i]].join('/'))) return null
    } else if (want[i] !== got[i]) return null
    else score += 2
  }
  // not URLSearchParams: it would read the `{day-30}` placeholders as they are, but also turn `+` into a space
  for (const pair of query.split('&').filter(Boolean)) {
    const [name, value] = pair.split('=')
    if (OPTIONAL.has(name)) continue
    const given = url.searchParams.getAll(name)
    if (!given.length || (!isPlaceholder(value) && !given.includes(value))) return null
    score += 1
  }
  if (route.spanOver !== undefined) {
    // a day of slack: `from` is a date, and counting from midnight adds up to one
    const days = (Date.now() - Date.parse(url.searchParams.get('from') ?? '')) / 86_400_000
    if (!(days > route.spanOver + 1)) return null
    score += 1
  }
  if (route.body) {
    const sent = Object.keys((body ?? {}) as object)
    if (!Object.keys(route.body).every((key) => sent.includes(key))) return null
    score += 1
  }
  return score
}

/** The recording that answers a request, as `screen/file`, or null. */
export function recordingFor(method: string, input: string, body?: unknown): string | null {
  const url = new URL(input, 'http://app.test')
  let best: { id: string; score: number } | null = null
  for (const route of routes as Route[]) {
    const score = fit(route, method, url, body)
    if (score !== null && (!best || score > best.score)) best = { id: recordingId(route), score }
  }
  return best?.id ?? null
}

const json = (body: string | object, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const refusal = (code: string, message: string, status = 404) => json({ error: { code, message } }, status)

/**
 * Answers `/api/...` requests with the recorded responses in `public/mock-data` (`npm run record:fixtures`), by the table in
 * `fixture-routes.json` that also records them. A request no recording answers fails and says which. Returns the stub so a
 * test can inspect calls.
 */
export function installFixtureFetch(
  /** Answers to use instead of a recording, by its id (`stocks/stock`): a body, or a status to fail with. */
  overrides: Record<string, unknown> = {},
) {
  // a mistyped key would be ignored, and the test would pass against the recording it meant to replace
  const unknown = Object.keys(overrides).filter((key) => !(`../../public/mock-data/${key}.json` in FILES))
  if (unknown.length) throw new Error(`No recording is called ${unknown.join(', ')}`)
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
    const id = recordingFor(method, String(input), body)
    if (id !== null && id in overrides) {
      const given = overrides[id]
      if (typeof given === 'number') return refusal(given === 404 ? 'STOCK_NOT_FOUND' : 'x', 'failed', given)
      return json(given as object)
    }
    const file = id === null ? undefined : FILES[`../../public/mock-data/${id}.json`]
    if (file === undefined) return refusal('not_found', `No recording answers ${method} ${String(input)}`)
    const page = Number(new URL(String(input), 'http://app.test').searchParams.get('page') ?? 1)
    if (page > 1 && page > ((JSON.parse(file) as { meta?: { pages?: number } }).meta?.pages ?? 1))
      return refusal('not_found', `No recording holds page ${page} of ${String(input)}`)
    return json(file)
  })
  vi.stubGlobal('fetch', stub)
  return stub
}
