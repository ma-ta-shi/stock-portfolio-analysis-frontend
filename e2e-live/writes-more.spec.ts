/**
 * The Portfolio write flows of the second PR against the seeded scratch backend: Add Stock, Record cash, Log dividend, Remove, and the
 * Transactions filters. Offline-safe: only seeded tickers are looked up and only Canadian-dollar rows (or a stated rate) are recorded;
 * an unknown ticker, a conversion and US cash without a rate would need the data providers or the Bank of Canada, so they are unit-tested.
 */
import type { Page } from '@playwright/test'
import { axeViolations, expect, test } from '../e2e/fixtures'
import { localDateInputValue } from '../src/lib/format'
import { API, apiPreview, ledgerOf, portfolioId, previewValue } from './helpers'

const review = (page: Page) => page.getByRole('button', { name: 'Review' }).click()
const money = (n: number) => n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function lookUp(page: Page, ticker: string) {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: 'Add Stock' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ticker').fill(ticker)
  await dialog.getByRole('button', { name: 'Look up' }).click()
  await expect(dialog.getByText('Your position')).toBeVisible()
  return dialog
}

test('Add Stock: "I bought it" takes the cash and opens a position in the chosen account', async ({ page, request, consoleErrors }) => {
  const dialog = await lookUp(page, 'bns.to')
  await expect(dialog).toContainText('Bank of Nova Scotia')
  await dialog.getByLabel('Account', { exact: true }).selectOption('tfsa')
  await dialog.getByLabel(/Shares to buy/).fill('10')
  await dialog.getByLabel(/Price per share/).fill('80')
  await review(page)

  const api = await apiPreview(request, {
    events: [{ account_type: 'tfsa', transaction_type: 'buy', ticker: 'BNS.TO', shares: 10, price_per_share: 80, total_amount: 800, currency: 'CAD', transaction_date: localDateInputValue() }],
  }) // fmt: skip
  expect(api.position.shares).toBe(10)
  await expect(previewValue(dialog, 'Shares after')).toContainText('10')
  await expect(previewValue(dialog, 'Cash (CAD)')).toContainText(money(api.cash_after.CAD))
  expect(await axeViolations(page)).toEqual([])

  await dialog.getByRole('button', { name: 'Buy shares' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('row', { name: 'View BNS.TO' })).toBeVisible()
  expect((await ledgerOf(request, 'BNS.TO'))[0]).toMatchObject({ transaction_type: 'buy', account_type: 'tfsa' })
  expect(consoleErrors).toEqual([])
})

test('Add Stock: "I already hold it" records an opening balance and takes no cash', async ({ page, request }) => {
  const dialog = await lookUp(page, 'BNS.TO')
  await dialog.getByRole('radio', { name: /I already hold it/ }).check()
  await dialog.getByLabel('Account', { exact: true }).selectOption('rrsp')
  await dialog.getByLabel(/Shares held/).fill('7')
  await dialog.getByLabel(/Average cost per share/).fill('60')
  await review(page)

  const api = await apiPreview(request, {
    events: [{ account_type: 'rrsp', transaction_type: 'opening_balance', ticker: 'BNS.TO', shares: 7, price_per_share: 60, total_amount: 420, currency: 'CAD', transaction_date: localDateInputValue() }],
  }) // fmt: skip
  expect(api.cash_after.CAD).toBe(api.cash_before.CAD)
  await expect(previewValue(dialog, 'Shares after')).toContainText('7')

  await dialog.getByRole('button', { name: 'Add to Portfolio' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  expect((await ledgerOf(request, 'BNS.TO'))[0]).toMatchObject({ transaction_type: 'opening_balance', account_type: 'rrsp' })
})

test('Record cash: a contribution shows the room it uses; a withdrawal, a fee and interest are recorded', async ({ page, request }) => {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: 'Record cash' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Account', { exact: true }).selectOption('tfsa')
  await dialog.getByLabel('Type').selectOption('contribution')
  await dialog.getByLabel('Amount').fill('500')
  await review(page)

  const api = await apiPreview(request, {
    events: [{ account_type: 'tfsa', transaction_type: 'contribution', total_amount: 500, currency: 'CAD', transaction_date: localDateInputValue() }],
  }) // fmt: skip
  expect(api.cash_after.CAD - api.cash_before.CAD).toBe(500)
  await expect(previewValue(dialog, 'Cash (CAD)')).toContainText(money(api.cash_after.CAD))
  await expect(dialog.getByText('TFSA room', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Record cash' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  await dialog.getByRole('button', { name: 'Done' }).click()

  for (const [type, amount] of [['withdrawal', '25'], ['fee', '3.5'], ['interest', '1.25']] as const) {
    await page.getByRole('button', { name: 'Record cash' }).click()
    const next = page.getByRole('dialog')
    await next.getByLabel('Account', { exact: true }).selectOption('trading')
    await next.getByLabel('Type').selectOption(type)
    await next.getByLabel('Amount').fill(amount)
    await review(page)
    await next.getByRole('button', { name: 'Record cash' }).click()
    await expect(next.getByRole('status')).toContainText('Recorded')
    await next.getByRole('button', { name: 'Done' }).click()
  }
  const res = await request.get(`${API}/api/portfolios/${await portfolioId(request)}/transactions?per_page=20`)
  const types = ((await res.json()).data as { transaction_type: string }[]).map((t) => t.transaction_type)
  for (const type of ['contribution', 'withdrawal', 'fee', 'interest']) expect(types).toContain(type)
})

test('Log dividend with a reinvestment records the dividend and the drip in one call', async ({ page, request }) => {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: 'Show details of FTS.TO (RRSP)' }).click()
  await page.getByRole('group', { name: 'Actions for FTS.TO (RRSP)' }).getByRole('button', { name: 'Log dividend' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/Dividend before tax/).fill('20')
  await dialog.getByLabel('Reinvested as new shares').check()
  const price = Number(await dialog.getByLabel(/Price per share/).inputValue())
  const shares = Number(await dialog.getByLabel('Shares bought').inputValue())
  expect(shares).toBeGreaterThan(0)
  await review(page)

  const day = localDateInputValue()
  const api = await apiPreview(request, {
    events: [
      { account_type: 'rrsp', transaction_type: 'dividend', ticker: 'FTS.TO', total_amount: 20, currency: 'CAD', transaction_date: day },
      { account_type: 'rrsp', transaction_type: 'drip', ticker: 'FTS.TO', shares, price_per_share: price, total_amount: Math.round(shares * price * 100) / 100, currency: 'CAD', transaction_date: day },
    ],
  }) // fmt: skip
  await expect(previewValue(dialog, 'Shares after')).toContainText(String(api.position.shares))
  await dialog.getByRole('button', { name: 'Log dividend' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded 2 entries')
  const types = (await ledgerOf(request, 'FTS.TO')).slice(0, 2).map((t) => t.transaction_type)
  expect(types.sort()).toEqual(['dividend', 'drip'])
})

test('Remove takes a position entered by mistake out of Holdings, with a confirmation and no review', async ({ page, request }) => {
  await page.goto('/portfolio')
  await expect(page.getByRole('row', { name: 'View MFC.TO' })).toBeVisible()
  await page.getByRole('button', { name: 'Show details of MFC.TO (TRADING)' }).click()
  await page.getByRole('group', { name: 'Actions for MFC.TO (TRADING)' }).getByRole('button', { name: 'Remove' }).click()
  const dialog = page.getByRole('dialog')
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
})
