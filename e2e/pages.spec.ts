/** Every route against the seeded backend: loads with no error panel and no console error, and passes axe. Light and dark. */
import type { APIRequestContext } from '@playwright/test'
import { axeViolations, expect, test } from './fixtures'
import { API, stockId } from './helpers'

const analysisId = async (request: APIRequestContext) => {
  const runs = await request.get(`${API}/api/analysis?stock_id=${await stockId(request, 'RY.TO')}&status=complete`)
  return (await runs.json()).data[0].analysis_id as string
}

type Path = string | ((request: APIRequestContext) => Promise<string>)
const ROUTES: [name: string, path: Path, heading: string | RegExp][] = [
  ['home', '/', 'Home'],
  ['watchlist', '/watchlist', 'Watchlist'],
  ['portfolio holdings', '/portfolio', 'Portfolio'],
  ['portfolio dividends', '/portfolio?tab=dividends', 'Portfolio'],
  ['portfolio transactions', '/portfolio?tab=transactions', 'Portfolio'],
  ['portfolio optimizer', '/portfolio?tab=optimizer', 'Portfolio'],
  ['portfolio allocation', '/portfolio?tab=allocation', 'Portfolio'],
  ['stock', async (request) => `/stocks/${await stockId(request, 'RY.TO')}`, /RY\.TO/],
  ['analysis', async (request) => `/analysis/${await analysisId(request)}`, 'RY.TO'],
  ['feedback', '/feedback', 'Feedback & Accuracy'],
  ['settings', '/settings', 'Settings'],
]

for (const [name, path, heading] of ROUTES) {
  test(`${name} loads cleanly and passes axe`, async ({ page, request, consoleErrors }) => {
    await page.goto(typeof path === 'string' ? path : await path(request))
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeAttached()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('alert')).toHaveCount(0) // no QueryError panels
    expect(await axeViolations(page)).toEqual([])
    expect(consoleErrors).toEqual([])
  })
}

test('unknown routes show the not-found page', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
