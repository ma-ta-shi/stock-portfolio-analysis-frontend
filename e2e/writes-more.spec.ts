/**
 * The Portfolio write flows of the second PR against the seeded scratch backend, in the original forms: Add Stock (account, shares,
 * average cost), Log dividend (amount per share, DRIP), Remove, and the Transactions filters. Offline-safe: only seeded tickers are
 * looked up and only Canadian-dollar rows are recorded.
 */
import type { Page } from '@playwright/test'
import { axeViolations, expect, test } from './fixtures'
import { localDateInputValue } from '../src/lib/format'
import { apiPreview, ledgerOf, numberIn, openFromRow, previewValue } from './helpers'

const review = (page: Page) => page.getByRole('button', { name: 'Review' }).click()

async function lookUp(page: Page, ticker: string) {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: 'Add Stock' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ticker').fill(ticker)
  await dialog.getByRole('button', { name: 'Look up' }).click()
  await expect(dialog.getByLabel('Shares')).toBeVisible()
  return dialog
}

test('Add Stock records what you hold (account, shares, average cost) as an opening balance, with no cash taken', async ({ page, request, consoleErrors }) => {
  const dialog = await lookUp(page, 'bns.to')
  await expect(dialog).toContainText('Bank of Nova Scotia')
  await dialog.getByLabel('Account', { exact: true }).selectOption('rrsp')
  await dialog.getByLabel('Shares').fill('7')
  await dialog.getByLabel(/Avg cost/).fill('60')
  await review(page)

  const api = await apiPreview(request, {
    events: [{ account_type: 'rrsp', transaction_type: 'opening_balance', ticker: 'BNS.TO', shares: 7, price_per_share: 60, total_amount: 420, currency: 'CAD', transaction_date: localDateInputValue() }],
  }) // fmt: skip
  expect(api.cash_after.CAD).toBe(api.cash_before.CAD)
  await expect(previewValue(dialog, 'Shares after')).toContainText('7')
  expect(await axeViolations(page)).toEqual([])

  await dialog.getByRole('button', { name: 'Add to Portfolio' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('row', { name: 'View BNS.TO' })).toBeVisible()
  expect((await ledgerOf(request, 'BNS.TO'))[0]).toMatchObject({ transaction_type: 'opening_balance', account_type: 'rrsp' })
  expect(consoleErrors).toEqual([])
})

test('Log dividend with DRIP records the dividend and the full reinvestment in one call', async ({ page, request }) => {
  const dialog = await openFromRow(page, 'Log dividend for FTS.TO (RRSP)')
  const held = numberIn(await dialog.getByText('Shares held').locator('xpath=following-sibling::dd').textContent())
  await dialog.getByLabel(/Amount per share/).fill('2')
  await dialog.getByLabel(/DRIP/).check()
  const price = Number(await dialog.getByLabel(/Reinvestment price per share/).inputValue())
  const total = Math.round(2 * held * 100) / 100
  const dripShares = Math.round((total / price) * 1e6) / 1e6 // the whole dividend, in fractional shares
  expect(dripShares).toBeGreaterThan(0)
  await review(page)

  const day = localDateInputValue()
  const api = await apiPreview(request, {
    events: [
      { account_type: 'rrsp', transaction_type: 'dividend', ticker: 'FTS.TO', total_amount: total, currency: 'CAD', transaction_date: day },
      { account_type: 'rrsp', transaction_type: 'drip', ticker: 'FTS.TO', shares: dripShares, price_per_share: price, total_amount: Math.round(dripShares * price * 100) / 100, currency: 'CAD', transaction_date: day },
    ],
  }) // fmt: skip
  await expect(previewValue(dialog, 'Shares after')).toContainText(String(api.position.shares))
  await dialog.getByRole('button', { name: 'Log dividend' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded 2 entries')
  const types = (await ledgerOf(request, 'FTS.TO')).slice(0, 2).map((t) => t.transaction_type)
  expect(types.sort()).toEqual(['dividend', 'drip'])
})

test('Remove takes a position entered by mistake out of Holdings, with a confirmation and no review', async ({ page, request }) => {
  const dialog = await openFromRow(page, 'Remove MFC.TO (TRADING)')
  await expect(dialog.getByRole('button', { name: 'Review' })).toHaveCount(0)
  const before = (await ledgerOf(request, 'MFC.TO')).length
  await dialog.getByRole('button', { name: 'Remove' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('row', { name: 'View MFC.TO' })).toHaveCount(0)
  expect((await ledgerOf(request, 'MFC.TO')).length).toBeGreaterThan(before) // the history stays, with the reversal added
})

test('the Transactions filters narrow the list, and survive a reload', async ({ page }) => {
  await page.goto('/portfolio?tab=transactions')
  const rows = page.locator('tbody tr')
  await expect(rows.first()).toBeVisible()
  const all = await rows.count()

  await page.getByRole('combobox', { name: 'Ticker' }).selectOption('RY.TO')
  await expect(page).toHaveURL(/ticker=RY\.TO/)
  await expect.poll(() => rows.count()).toBeLessThan(all)
  const ofTicker = await rows.count()
  for (const row of await rows.all()) await expect(row).toContainText('RY.TO')

  await page.getByRole('combobox', { name: 'Type' }).selectOption('dividend')
  await expect.poll(() => rows.count()).toBeLessThan(ofTicker)
  const both = await rows.count()
  expect(both).toBeGreaterThan(0)

  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Ticker' })).toHaveValue('RY.TO')
  await expect.poll(() => rows.count()).toBe(both)
  expect(await axeViolations(page)).toEqual([])

  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page).not.toHaveURL(/ticker=/)
  await expect.poll(() => rows.count()).toBe(all)
})
