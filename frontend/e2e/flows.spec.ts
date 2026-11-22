import { axeViolations, expect, test } from './fixtures'

test('USD holdings are shown in USD and sold in USD', async ({ page, consoleErrors }) => {
  await page.goto('/portfolio')
  await expect(page.getByText('US$9,968.75')).toBeVisible()
  await page.getByRole('button', { name: /^Sell MSFT/ }).click()
  await page.getByLabel(/Shares to sell/).fill('5')
  await expect(page.getByText(/Realized gain: \+US\$/)).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('holding rows open the stock page from the keyboard', async ({ page }) => {
  await page.goto('/watchlist')
  await page.locator('tbody tr').first().focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/stocks\/stk_/)
})

test('closed position "View history" opens its filtered transactions; Back returns', async ({ page }) => {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: /Closed Positions/ }).click()
  await page.getByRole('link', { name: /View history for TD\.TO/ }).click()
  await expect(page).toHaveURL(/tab=transactions&holding=/)
  await expect(page.getByText(/Showing full history for TD\.TO/)).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await page.goBack()
  await expect(page.getByRole('tab', { name: 'Holdings', selected: true })).toBeVisible()
})

test('transaction filters narrow the list and live in the URL', async ({ page }) => {
  await page.goto('/portfolio?tab=transactions')
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(14)
  await page.getByRole('combobox', { name: 'Ticker' }).selectOption('RY.TO')
  await expect(rows).toHaveCount(5)
  await page.getByLabel('From', { exact: true }).fill('2026-01-01')
  await expect(rows).toHaveCount(2)
  await expect(page).toHaveURL(/ticker=RY\.TO.*from=2026-01-01|from=2026-01-01.*ticker=RY\.TO/)
  await page.reload()
  await expect(rows).toHaveCount(2)
  expect(await axeViolations(page)).toEqual([])
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(rows).toHaveCount(14)
})

test('watchlist: add a stock (awaiting analysis), block duplicates, remove with confirmation', async ({ page, consoleErrors }) => {
  await page.goto('/watchlist')
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(4)

  await page.getByRole('button', { name: 'Add Stock' }).click()
  await page.getByLabel('Ticker or company name').fill('Royal Bank')
  await page.getByRole('button', { name: 'Look up' }).click()
  await page.getByRole('button', { name: 'Add to Watchlist' }).click()
  await expect(rows).toHaveCount(5)
  const added = page.getByRole('row', { name: 'View RY.TO' })
  await expect(added.getByText('Awaiting analysis')).toBeVisible()
  await expect(page.getByText('1 awaiting analysis')).toBeVisible()

  await page.getByRole('button', { name: 'Add Stock' }).click()
  await page.getByLabel('Ticker or company name').fill('TD.TO')
  await page.getByRole('button', { name: 'Look up' }).click()
  await expect(page.getByText('TD.TO is already on your watchlist.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add to Watchlist' })).toBeDisabled()
  expect(await axeViolations(page)).toEqual([])
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Remove RY.TO from watchlist' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
  await expect(rows).toHaveCount(4)
  expect(consoleErrors).toEqual([])
})

test('"Analyze allocation" explains it is not connected yet', async ({ page }) => {
  await page.goto('/portfolio?tab=optimizer')
  await page.getByLabel('Available to trade:').fill('5000')
  await page.getByRole('button', { name: 'Analyze allocation' }).click()
  await expect(page.getByRole('alert')).toContainText('isn’t connected to the backend yet')
})
