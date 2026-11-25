// Records the real responses a screen reads into public/mock-data/<screen>/, untrimmed. That one copy is what mock mode serves,
// what the mapper and render tests import, and what the field-coverage render test walks, so nothing is hand-built twice.
// Run it against a backend on a scratch copy of the database (never the real file), after `alembic upgrade head`:
//   API_URL=http://localhost:8010 npm run record:fixtures                 (every screen below)
//   API_URL=http://localhost:8010 npm run record:fixtures -- portfolio    (one screen)
//   ... -- --user <uuid>                                                  (a user other than the first owner of a portfolio)
//   ... -- portfolio --only dividends                                     (just those files of the screen, leaving the others as recorded)
// To record a new screen, add it to SCREENS (step 6 of "Wiring a screen" in CLAUDE.md).
import { mkdirSync, writeFileSync } from 'node:fs'

const base = (process.env.API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const args = process.argv.slice(2)
const userFlag = args.indexOf('--user')
const onlyFlag = args.indexOf('--only')
const only = onlyFlag >= 0 ? args[onlyFlag + 1].split(',') : []
const wanted = args.filter((a, i) => !a.startsWith('--') && i !== userFlag + 1 && i !== onlyFlag + 1)

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

// file -> how to read it. `ctx` holds the ids found from the backend.
const SCREENS = {
  portfolio: (ctx) => [
    { file: 'portfolios', path: `/api/portfolios?user_id=${ctx.userId}` },
    { file: 'positions', path: `/api/portfolios/${ctx.portfolioId}/positions` },
    { file: 'holdings', path: `/api/portfolios/${ctx.portfolioId}/holdings?include=snapshot&include=position&include_closed=true&page=1&per_page=100` },
    { file: 'accounts', path: `/api/portfolios/${ctx.portfolioId}/accounts` },
    { file: 'room', path: `/api/portfolios/${ctx.portfolioId}/room` },
    { file: 'report', method: 'POST', path: `/api/portfolios/${ctx.portfolioId}/reports`, body: { preset: 'since_inception' } },
    { file: 'report-30d', method: 'POST', path: `/api/portfolios/${ctx.portfolioId}/reports`, body: { start: day(-30), end: day(0) } },
    { file: 'value-history', path: `/api/portfolios/${ctx.portfolioId}/value-history?from=${day(-30)}&to=${day(0)}` },
    { file: 'transactions', path: `/api/portfolios/${ctx.portfolioId}/transactions?page=1&per_page=100` },
    { file: 'exposure', path: `/api/portfolios/${ctx.portfolioId}/exposure` },
    { file: 'dividends', path: `/api/portfolios/${ctx.portfolioId}/dividends?page=1&per_page=100` },
  ],
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
  for (const [screen, routes] of Object.entries(SCREENS)) {
    if (wanted.length && !wanted.includes(screen)) continue
    const dir = `public/mock-data/${screen}`
    mkdirSync(dir, { recursive: true })
    for (const route of routes(ctx)) {
      if (only.length && !only.includes(route.file)) continue
      writeFileSync(`${dir}/${route.file}.json`, JSON.stringify(await call(route), null, 2) + '\n')
      console.log(`recorded ${dir}/${route.file}.json`)
    }
  }
} catch (error) {
  console.error(`record:fixtures failed: ${error.message}`)
  process.exitCode = 1
}
