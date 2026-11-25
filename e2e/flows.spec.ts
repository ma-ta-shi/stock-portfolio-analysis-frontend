import { axeViolations, expect, test } from './fixtures'

test('USD holdings are shown in USD; in mock mode a write says it needs the real backend', async ({ page, consoleErrors }) => {
  await page.goto('/portfolio')
  await expect(page.getByText('US$3,413.20')).toBeVisible() // RDDT: 40 shares at US$85.33, from the recorded API response
  await page.getByRole('button', { name: /^Sell RDDT/ }).click()
  await page.getByLabel(/Shares to sell/).fill('5')
  expect(await axeViolations(page)).toEqual([])
  await page.getByRole('dialog').getByRole('button', { name: 'Review' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('real backend')
  expect(consoleErrors).toEqual([])
})

test('watchlist rows open the stock page from the keyboard', async ({ page }) => {
  await page.goto('/watchlist')
  await page.locator('tbody tr').first().focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/stocks\/[0-9a-f-]{36}$/) // the recorded ids
})

test('closed position "View history" opens its filtered transactions; Back returns', async ({ page }) => {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: /Closed Positions/ }).click()
  await page.getByRole('link', { name: /View history for XOM/ }).click()
  await expect(page).toHaveURL(/tab=transactions&holding=/)
  await expect(page.getByText(/Showing full history for XOM/)).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('tab', { name: 'Holdings', selected: true })).toBeVisible()
})

test('transaction filters live in the URL and survive a reload', async ({ page }) => {
  await page.goto('/portfolio?tab=transactions')
  await page.getByRole('combobox', { name: 'Ticker' }).selectOption('RY.TO')
  await page.getByLabel('From', { exact: true }).fill('2026-01-01')
  await expect(page).toHaveURL(/ticker=RY.TO.*from=2026-01-01|from=2026-01-01.*ticker=RY.TO/)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Ticker' })).toHaveValue('RY.TO')
  expect(await axeViolations(page)).toEqual([])
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page).not.toHaveURL(/ticker=/)
})

test('watchlist: lists the recorded stocks, expands a row, and says adding needs the real backend', async ({ page }) => {
  await page.goto('/watchlist')
  await expect(page.locator('tbody tr')).toHaveCount(3)
  await page.getByRole('button', { name: 'Show details of TD.TO' }).click()
  await expect(page.getByText('Why not usable')).toBeVisible()
  expect(await axeViolations(page)).toEqual([])

  await page.getByRole('button', { name: 'Add Stock' }).click()
  await page.getByLabel('Ticker').fill('BMO.TO')
  await page.getByRole('button', { name: 'Look up' }).click()
  await page.getByRole('button', { name: 'Add to Watchlist' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Writes need the real backend')
})

test('"Analyze allocation" explains it is not connected yet', async ({ page }) => {
  await page.goto('/portfolio?tab=optimizer')
  await page.getByLabel('Available to trade:').fill('5000')
  await page.getByRole('button', { name: 'Analyze allocation' }).click()
  await expect(page.getByRole('alert')).toContainText('isn’t connected to the backend yet')
})
