/**
 * The Portfolio write flows of the third PR against the seeded scratch backend: Correct, Reverse, and the dividends the system
 * found. Each spec starts from an entry it records itself through the API (or reads the current figures
 * first), so the order of the specs never matters, and it works offline (CAD rows, or USD with a stated rate). Where a figure is on
 * screen it is compared with the same request previewed straight from the API.
 */
import type { Page } from '@playwright/test'
import { axeViolations, expect, test } from './fixtures'
import { localDateInputValue } from '../src/lib/format'
import { API, apiPreview, apiRecord, ledgerOf, openLedgerRow, portfolioId, previewValue } from './helpers'

const today = () => localDateInputValue()
const review = (page: Page) => page.getByRole('button', { name: 'Review' }).click()
const money = (n: number) => n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const buyBody = (price: number, extra: Record<string, unknown> = {}) => ({
  account_type: 'trading', transaction_type: 'buy', ticker: 'SU.TO', shares: 1, price_per_share: price, total_amount: price, currency: 'CAD', transaction_date: today(), ...extra,
}) // fmt: skip
const idOf = (recorded: { transactions: { transaction_id: string }[] }) => recorded.transactions[0].transaction_id

test.describe('Correct and Reverse', () => {
  test('correcting a buy: the form starts from the entry, the preview is the server\'s, and the ledger gets a reversal and a replacement', async ({ page, request, consoleErrors }) => {
    const id = idOf(await apiRecord(request, 'events', { events: [buyBody(11.11)] }))
    await openLedgerRow(page, '&ticker=SU.TO', /\$11\.11/)
    await page.getByRole('button', { name: 'Correct' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Correct buy')
    await expect(dialog.getByLabel(/Price per share/)).toHaveValue('11.11')
    await dialog.getByLabel(/Price per share/).fill('12.22')
    await review(page)

    const api = await apiPreview(request, buyBody(12.22), `events/${id}/correct/preview`)
    await expect(previewValue(dialog, 'Shares after')).toContainText(String(api.position.shares))
    await expect(previewValue(dialog, 'Cash (CAD)')).toContainText(money(api.cash_after.CAD))
    expect(await axeViolations(page)).toEqual([])

    await dialog.getByRole('button', { name: 'Replace entry' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded 2 entries')
    await dialog.getByRole('button', { name: 'Done' }).click()
    const ledger = await ledgerOf(request, 'SU.TO')
    expect(ledger.find((t) => t.reverses_transaction_id === id)).toBeTruthy()
    expect(ledger.find((t) => t.supersedes_transaction_id === id)).toMatchObject({ transaction_type: 'buy', price_per_share: 12.22 })
    expect(consoleErrors).toEqual([])
  })

  test('correcting a manual dividend row keeps its gross and tax', async ({ page, request }) => {
    const divId = idOf(await apiRecord(request, 'events', { events: [{ account_type: 'rrsp', transaction_type: 'dividend', ticker: 'FTS.TO', total_amount: 12.34, withholding_tax: 1.5, currency: 'CAD', transaction_date: today() }] }))
    await openLedgerRow(page, '&ticker=FTS.TO&type=dividend', /\$12\.34/)
    await page.getByRole('button', { name: 'Correct' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel(/Tax withheld/)).toHaveValue('1.5')
    await expect(dialog.getByLabel(/DRIP/)).toHaveCount(0)
    await dialog.getByLabel(/Dividend before tax/).fill('13.45')
    await review(page)
    await dialog.getByRole('button', { name: 'Replace entry' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded 2 entries')
    expect((await ledgerOf(request, 'FTS.TO')).find((t) => t.supersedes_transaction_id === divId)).toMatchObject({ total_amount: 13.45, withholding_tax: 1.5 })
  })

  test('correcting a US entry resends its exchange rate', async ({ page, request }) => {
    const id = idOf(await apiRecord(request, 'events', { events: [{ account_type: 'trading', transaction_type: 'buy', ticker: 'MSFT', shares: 1, price_per_share: 400, total_amount: 400, currency: 'USD', fx_rate_to_cad: 1.3, transaction_date: today() }] }))
    await openLedgerRow(page, '&ticker=MSFT', /US\$400\.00/)
    await page.getByRole('button', { name: 'Correct' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel(/Exchange rate/)).toHaveValue('1.3')
    await dialog.getByLabel(/Price per share/).fill('401')
    await review(page)
    const api = await apiPreview(request, { account_type: 'trading', transaction_type: 'buy', ticker: 'MSFT', shares: 1, price_per_share: 401, total_amount: 401, currency: 'USD', fx_rate_to_cad: 1.3, transaction_date: today() }, `events/${id}/correct/preview`)
    await expect(previewValue(dialog, 'Book cost after (CAD)')).toContainText(money(api.position.total_book_cost_cad))
    await dialog.getByRole('button', { name: 'Replace entry' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded 2 entries')
    expect((await ledgerOf(request, 'MSFT')).find((t) => t.supersedes_transaction_id === id)).toMatchObject({ fx_rate_to_cad: 1.3, currency: 'USD' })
  })

  test('reversing an entry adds a reversal; a reversal row, and the row it reversed, then cannot be corrected or reversed', async ({ page, request }) => {
    const id = idOf(await apiRecord(request, 'events', { events: [buyBody(13.13)] }))
    await openLedgerRow(page, '&ticker=SU.TO', /\$13\.13/)
    await page.getByRole('button', { name: 'Reverse' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Review' })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Reverse entry' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded')
    await dialog.getByRole('button', { name: 'Done' }).click()
    expect((await ledgerOf(request, 'SU.TO')).find((t) => t.reverses_transaction_id === id)).toBeTruthy()

    // reloaded: the reversal row and the original (its reversal is on the page) are both locked
    await page.goto('/portfolio?tab=transactions&ticker=SU.TO')
    const rows = page.getByRole('row').filter({ hasText: /\$13\.13/ })
    await expect(rows.first()).toBeVisible()
    for (let i = 0; i < (await rows.count()); i += 1) {
      await rows.nth(i).getByRole('button', { name: 'Show details of this entry' }).click()
    }
    await expect(page.getByRole('button', { name: 'Correct' }).first()).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Reverse' }).first()).toBeDisabled()
    await expect(page.getByText(/Cannot correct:/).first()).toBeVisible()
  })
})

test.describe('Dividends the system found', () => {
  async function waitingEvent(request: import('@playwright/test').APIRequestContext, ticker: string) {
    const res = await request.get(`${API}/api/portfolios/${await portfolioId(request)}/dividends?per_page=100`)
    const all = (await res.json()).data as { event_id: string; status: string; stock: { ticker: string }; expected_gross: number }[]
    return all.find((e) => e.stock.ticker === ticker)!
  }

  test('confirming a paid dividend with a corrected gross, then reopening it', async ({ page, request }) => {
    const event = await waitingEvent(request, 'RY.TO')
    await page.goto('/portfolio?tab=dividends')
    await expect(page.getByRole('heading', { name: /Dividends waiting for you/ })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
    await page.getByRole('button', { name: 'Confirm RY.TO (TFSA) dividend' }).click()
    const dialog = page.getByRole('dialog')
    const gross = Math.round((event.expected_gross + 1) * 100) / 100
    await dialog.getByLabel(/Dividend before tax/).fill(String(gross))
    await review(page)
    const api = await apiPreview(request, { gross }, `dividends/${event.event_id}/preview`)
    // the account reinvests, so the preview shows the shares the whole dividend buys
    await expect(previewValue(dialog, 'Shares after')).toContainText(String(Number(api.position.shares.toFixed(4))))
    await dialog.getByRole('button', { name: 'Confirm dividend' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded')
    await dialog.getByRole('button', { name: 'Done' }).click()
    expect((await waitingEvent(request, 'RY.TO')).status).toBe('confirmed')

    await page.getByRole('button', { name: /Show decided dividends/ }).click()
    await page.getByRole('button', { name: 'Reopen RY.TO (TFSA) dividend' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reopen' }).click()
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('Recorded')
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click()
    expect((await waitingEvent(request, 'RY.TO')).status).toBe('expected')
  })

  test('a dividend not paid yet cannot be confirmed, but can be dismissed and reopened', async ({ page, request }) => {
    await page.goto('/portfolio?tab=dividends')
    await expect(page.getByRole('button', { name: 'Confirm ENB.TO (TRADING) dividend' })).toBeDisabled()
    await expect(page.getByText(/^Pays /).first()).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss ENB.TO (TRADING) dividend' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Dismiss' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded')
    await dialog.getByRole('button', { name: 'Done' }).click()
    const dismissed = await waitingEvent(request, 'ENB.TO')
    expect(dismissed.status).toBe('dismissed')

    await page.getByRole('button', { name: /Show decided dividends/ }).click()
    await page.getByRole('button', { name: 'Reopen ENB.TO (TRADING) dividend' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reopen' }).click()
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('Recorded')
    expect((await waitingEvent(request, 'ENB.TO')).status).toBe('expected')
  })
})
