import { axeViolations, expect, test } from './fixtures'

const ROUTES: [string, string | RegExp][] = [
  ['/', 'Home'],
  ['/watchlist', 'Watchlist'],
  ['/portfolio', 'Portfolio'],
  ['/portfolio?tab=dividends', 'Portfolio'],
  ['/portfolio?tab=transactions', 'Portfolio'],
  ['/portfolio?tab=optimizer', 'Portfolio'],
  ['/portfolio?tab=allocation', 'Portfolio'],
  ['/stocks/7e8b0f73-e2f1-4f3e-99e2-efa1c685ae39', /RY\.TO/], // mock mode serves the one recorded stock
  ['/analysis/4052936a-30c1-42d3-9ca7-1565de60a579', 'RY.TO'], // the recorded result
  ['/feedback', 'Feedback & Accuracy'],
  ['/settings', 'Settings'],
]

for (const [route, heading] of ROUTES) {
  test(`${route} loads cleanly and passes axe`, async ({ page, consoleErrors }) => {
    await page.goto(route)
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
