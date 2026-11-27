// Records the real responses a screen reads into src/test/fixtures/<screen>/, untrimmed. That one copy is what the test server answers with,
// what the mapper and render tests import, and what the field-coverage render test walks, so nothing is hand-built twice.
// Run it against a backend on a scratch copy of the database (never the real file), after `alembic upgrade head`:
//   API_URL=http://localhost:8010 npm run record:fixtures                 (every screen below)
//   API_URL=http://localhost:8010 npm run record:fixtures -- portfolio    (one screen)
//   ... -- --user <uuid>                                                  (a user other than the first owner of a portfolio)
//   ... -- portfolio --only dividends                                     (just those files of the screen, leaving the others as recorded)
// To record a new screen, add its routes to src/test/fixture-routes.json (step 6 of "Wiring a screen" in CLAUDE.md).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const base = (process.env.API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const args = process.argv.slice(2)
const userFlag = args.indexOf('--user')
const onlyFlag = args.indexOf('--only')
const only = onlyFlag >= 0 ? args[onlyFlag + 1].split(',') : []
// a flag's value is not a screen name (an absent flag has index -1, which must not drop the first argument)
const wanted = args.filter((a, i) => !a.startsWith('--') && !(userFlag >= 0 && i === userFlag + 1) && !(onlyFlag >= 0 && i === onlyFlag + 1))

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

// The routes, shared with the test server (`src/test/fixture-fetch.ts`) so a recording and what answers with it cannot drift.
// A `record: false` entry is not recorded: a database has no filled scorecard (those samples are the real scorer's output on
// made-up results), and `users` is kept as it is.
const table = JSON.parse(readFileSync(new URL('../src/test/fixture-routes.json', import.meta.url), 'utf8')).filter((r) => r.record !== false)
const SCREENS = [...new Set(table.map((r) => r.screen))]

/** `{userId}` and friends from the backend, `{day-30}` as a date. */
function fill(value, ctx) {
  if (typeof value === 'string')
    return value.replace(/\{(\w+?)(-?\d+)?\}/g, (whole, name, offset) => (name === 'day' ? day(Number(offset)) : (ctx[name] ?? whole)))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, ctx)]))
  return value
}

async function call({ path, method = 'GET', body }) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

try {
  const owners = (await call({ path: '/api/portfolios?per_page=100' })).data.filter((p) => p.kind === 'user')
  const chosen = userFlag >= 0 ? owners.find((p) => p.user_id === args[userFlag + 1]) : owners[0]
  if (!chosen) throw new Error('No user portfolio found to record from.')
  const ctx = { userId: chosen.user_id, portfolioId: chosen.portfolio_id }
  if (!wanted.length || wanted.includes('stocks')) {
    const stock = (await call({ path: '/api/stocks?q=RY.TO' })).data.find((s) => s.ticker === 'RY.TO')
    if (!stock) throw new Error('No RY.TO to record the Stock page from.')
    ctx.stockId = stock.stock_id
    ctx.runId = (await call({ path: `/api/analysis?stock_id=${stock.stock_id}&status=complete` })).data[0]?.analysis_id
  }
  for (const screen of SCREENS) {
    if (wanted.length && !wanted.includes(screen)) continue
    const dir = `src/test/fixtures/${screen}`
    mkdirSync(dir, { recursive: true })
    for (const route of table.filter((r) => r.screen === screen)) {
      if (only.length && !only.includes(route.file)) continue
      const request = { method: route.method, path: fill(route.path, ctx), body: fill(route.body, ctx) }
      writeFileSync(`${dir}/${route.file}.json`, JSON.stringify(await call(request), null, 2) + '\n')
      console.log(`recorded ${dir}/${route.file}.json`)
    }
  }
} catch (error) {
  console.error(`record:fixtures failed: ${error.message}`)
  process.exitCode = 1
}
