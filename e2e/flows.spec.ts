/** The navigation and reading flows no other spec drives. */
import { axeViolations, expect, test } from './fixtures'
import { API, apiRecord, portfolioId, stockId } from './helpers'

test('a US holding is shown in US dollars', async ({ page }) => {
  await page.goto('/portfolio')
  await expect(page.getByRole('row', { name: 'View MSFT' })).toContainText('US$')
})

test('watchlist rows expand, and open the stock page from the keyboard', async ({ page, request }) => {
  await page.goto('/watchlist')
  await page.getByRole('button', { name: 'Show details of RY.TO' }).click()
  await expect(page.getByText('Why not usable')).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
  await page.getByRole('row', { name: 'View RY.TO' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/stocks/${await stockId(request, 'RY.TO')}$`))
})

test('closed position "View history" opens its filtered transactions; Back returns', async ({ page, request }) => {
  // the seed has no closed position: one is made here, in an account and stock no other spec holds, dated before their entries
  const row = (type: string, shares: number, day: string) => ({
    account_type: 'tfsa', transaction_type: type, ticker: 'BNS.TO', shares, price_per_share: 50, total_amount: 100, currency: 'CAD', transaction_date: day,
  }) // fmt: skip
  await apiRecord(request, 'events', { events: [row('opening_balance', 2, '2026-01-05')] })
  await apiRecord(request, 'events', { events: [row('sell', -2, '2026-01-06')] })

  await page.goto('/portfolio')
  await page.getByRole('button', { name: /Closed Positions/ }).click()
  await page.getByRole('link', { name: /View history for BNS\.TO/ }).click()
  await expect(page).toHaveURL(/tab=transactions&holding=/)
  await expect(page.getByText(/Showing full history for BNS\.TO/)).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('tab', { name: 'Holdings', selected: true })).toBeVisible()
})

// The seed has an incomplete profile and no benchmark history, so the server can only refuse here: the answer itself is
// covered by the component test (PortfolioOptimizerSection) against its recording.
test('"Analyze allocation" shows why the server refused, and saves nothing', async ({ page, request }) => {
  const id = await portfolioId(request)
  const refused = await request.post(`${API}/api/portfolios/${id}/ask`, { data: { amount_cad: 5000, account: null, store: false } })
  expect(refused.status()).toBe(422)

  await page.goto('/portfolio?tab=optimizer')
  await page.getByLabel('Available to trade:').fill('5000')
  await page.getByRole('button', { name: 'Analyze allocation' }).click()
  await expect(page.getByRole('alert')).toContainText((await refused.json()).error.message)
  expect(await axeViolations(page)).toEqual([])
  expect((await request.get(`${API}/api/portfolios/${id}/proposals`)).status()).toBe(404)
})
