/**
 * The Portfolio write flows against a real backend on a seeded scratch database (`npm run test:e2e`). Each flow uses its own
 * seeded holding, so the specs do not depend on each other's order. Where a figure is on screen, it is compared with the same
 * entry previewed straight from the API: the page must show the server's numbers, not its own.
 */
import { axeViolations, expect, test } from './fixtures'
import { localDateInputValue } from '../src/lib/format'
import { API, apiPreview, ledgerOf, numberIn, openFromRow, portfolioId, previewValue } from './helpers'

const review = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Review' }).click()

test('buying into a holding: review shows the server preview, record adds the shares', async ({ page, request, consoleErrors }) => {
  const dialog = await openFromRow(page, 'Buy more ENB.TO (TRADING)')
  await dialog.getByLabel(/Shares to buy/).fill('5')
  const price = Number(await dialog.getByLabel(/Price per share/).inputValue())
  const fees = Number((await dialog.getByLabel(/Fees/).inputValue()) || 0)
  await review(page)

  const api = await apiPreview(request, {
    events: [
      {
        account_type: 'trading', transaction_type: 'buy', ticker: 'ENB.TO', shares: 5, price_per_share: price,
        total_amount: Math.round(5 * price * 100) / 100, currency: 'CAD', transaction_date: localDateInputValue(), ...(fees > 0 ? { fees } : {}),
      },
    ],
  }) // fmt: skip
  expect(api.position.shares).toBe(105)
  expect(numberIn(await previewValue(dialog, 'Shares after').textContent())).toBe(105)
  expect(numberIn(await previewValue(dialog, 'Cash (CAD)').textContent())).toBeGreaterThan(0)
  expect(await axeViolations(page)).toEqual([])

  await dialog.getByRole('button', { name: 'Buy shares' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded 1 entry')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('row', { name: 'View ENB.TO' })).toContainText('105')
  expect(consoleErrors).toEqual([])
})

test('a US purchase with an exchange rate is recorded in USD at that rate', async ({ page, request }) => {
  const dialog = await openFromRow(page, 'Buy more MSFT (TRADING)')
  await dialog.getByLabel(/Shares to buy/).fill('2')
  await dialog.getByLabel(/Exchange rate/).fill('1.3')
  const price = Number(await dialog.getByLabel(/Price per share/).inputValue())
  const fees = Number((await dialog.getByLabel(/Fees/).inputValue()) || 0)
  await review(page)

  const api = await apiPreview(request, {
    events: [
      {
        account_type: 'trading', transaction_type: 'buy', ticker: 'MSFT', shares: 2, price_per_share: price,
        total_amount: Math.round(2 * price * 100) / 100, currency: 'USD', transaction_date: localDateInputValue(), fx_rate_to_cad: 1.3, ...(fees > 0 ? { fees } : {}),
      },
    ],
  }) // fmt: skip
  expect(numberIn(await previewValue(dialog, 'Book cost after (CAD)').textContent())).toBeCloseTo(api.position.total_book_cost_cad, 2)

  await dialog.getByRole('button', { name: 'Buy shares' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  const newest = (await ledgerOf(request, 'MSFT'))[0]
  expect(newest).toMatchObject({ transaction_type: 'buy', currency: 'USD', fx_rate_to_cad: 1.3 })
})

test('selling at a gain shows the tax estimate the server worked out, and records the sale', async ({ page, request }) => {
  const dialog = await openFromRow(page, 'Sell CNQ.TO (TRADING)')
  await dialog.getByLabel(/Shares to sell/).fill('20')
  const price = Number(await dialog.getByLabel(/Price per share/).inputValue())
  const fees = Number((await dialog.getByLabel(/Fees/).inputValue()) || 0)
  await review(page)

  const api = await apiPreview(request, {
    events: [
      {
        account_type: 'trading', transaction_type: 'sell', ticker: 'CNQ.TO', shares: -20, price_per_share: price,
        total_amount: Math.round(20 * price * 100) / 100, currency: 'CAD', transaction_date: localDateInputValue(), ...(fees > 0 ? { fees } : {}),
      },
    ],
  }) // fmt: skip
  expect(api.estimated_tax.estimated_tax).toBeGreaterThan(0)
  expect(numberIn(await previewValue(dialog, 'Estimated tax effect (CAD)').textContent())).toBeCloseTo(api.estimated_tax.estimated_tax, 2)
  expect(numberIn(await previewValue(dialog, 'Realised gain or loss').textContent())).toBeCloseTo(api.row.realized_gain_loss, 2)
  expect(await axeViolations(page)).toEqual([])

  await dialog.getByRole('button', { name: 'Sell shares' }).click()
  await expect(dialog.getByRole('status')).toContainText('Recorded')
  const newest = (await ledgerOf(request, 'CNQ.TO'))[0]
  expect(newest).toMatchObject({ transaction_type: 'sell' })
  expect(Number(newest.realized_gain_loss)).toBeGreaterThan(0)
})

test('a sale at a loss inside the 30-day window shows the denied loss; selling every share does not', async ({ page, request }) => {
  const dialog = await openFromRow(page, 'Sell BCE.TO (TRADING)')
  await dialog.getByLabel(/Shares to sell/).fill('50')
  await review(page)
  await expect(dialog.getByRole('list', { name: 'Notes' })).toContainText(/superficial/i)
  const denied = await previewValue(dialog, 'Loss denied (superficial loss, CAD)').textContent()
  expect(numberIn(denied)).toBeGreaterThan(0)

  const price = Number(await dialog.getByLabel(/Price per share/).inputValue())
  const fees = Number((await dialog.getByLabel(/Fees/).inputValue()) || 0)
  const api = await apiPreview(request, {
    events: [
      {
        account_type: 'trading', transaction_type: 'sell', ticker: 'BCE.TO', shares: -50, price_per_share: price,
        total_amount: Math.round(50 * price * 100) / 100, currency: 'CAD', transaction_date: localDateInputValue(), ...(fees > 0 ? { fees } : {}),
      },
    ],
  }) // fmt: skip
  expect(numberIn(denied)).toBeCloseTo(api.row.denied_loss_cad, 2)

  // every share: the purchase inside the window is sold too, so nothing is denied (and editing hid the old preview)
  await dialog.getByLabel(/Shares to sell/).fill('110')
  await expect(dialog.getByText('Loss denied (superficial loss, CAD)')).toHaveCount(0)
  await review(page)
  await expect(dialog.getByText('Loss denied (superficial loss, CAD)')).toHaveCount(0)
  await expect(dialog.getByText('Realised gain or loss')).toBeVisible()
})

test('recording the same entry twice in a row says it matches the last one and writes nothing', async ({ page, request }) => {
  const before = (await ledgerOf(request, 'FTS.TO')).length
  const record = async () => {
    const dialog = await openFromRow(page, 'Buy more FTS.TO (RRSP)')
    await dialog.getByLabel(/Shares to buy/).fill('1')
    await review(page)
    await dialog.getByRole('button', { name: 'Buy shares' }).click()
    return dialog
  }
  const first = await record()
  await expect(first.getByRole('status')).toContainText('Recorded')
  await first.getByRole('button', { name: 'Done' }).click()

  const second = await record()
  await expect(second.getByRole('alert')).toContainText(/last 30 seconds/)
  expect((await ledgerOf(request, 'FTS.TO')).length).toBe(before + 1)
})

test('a double click on Record records once', async ({ page, request }) => {
  const before = (await ledgerOf(request, 'TD.TO')).length
  const dialog = await openFromRow(page, 'Buy more TD.TO (TRADING)')
  await dialog.getByLabel(/Shares to buy/).fill('1')
  await review(page)
  await dialog.getByRole('button', { name: 'Buy shares' }).dblclick()
  await expect(dialog.getByRole('status')).toContainText('Recorded 1 entry')
  // however many clicks landed, the ledger got one entry
  await expect.poll(async () => (await ledgerOf(request, 'TD.TO')).length).toBe(before + 1)
})

test("the account's commission is the default fee, and a fee typed over it is the one recorded", async ({ page, request }) => {
  // The seeded accounts charge nothing, so give the TFSA a commission through the API and put it back afterwards.
  const account = `${API}/api/portfolios/${await portfolioId(request)}/accounts/tfsa`
  await request.patch(account, { data: { commission_per_trade: 4.99 } })
  try {
    const dialog = await openFromRow(page, 'Buy more RY.TO (TFSA)')
    await expect(dialog.getByLabel(/Fees/)).toHaveValue('4.99')
    await dialog.getByLabel(/Shares to buy/).fill('1')

    await review(page)
    const price = Number(await dialog.getByLabel(/Price per share/).inputValue())
    const api = await apiPreview(request, {
      events: [{ account_type: 'tfsa', transaction_type: 'buy', ticker: 'RY.TO', shares: 1, price_per_share: price, total_amount: price, currency: 'CAD', transaction_date: localDateInputValue(), fees: 4.99 }],
    }) // fmt: skip
    expect(numberIn(await previewValue(dialog, 'Fees paid to date (CAD)').textContent())).toBeCloseTo(api.position.total_fees_paid_cad, 2)

    await dialog.getByLabel(/Fees/).fill('6.5')
    await expect(dialog.getByRole('button', { name: 'Buy shares' })).toHaveCount(0) // the edit asks for a new review
    await review(page)
    await dialog.getByRole('button', { name: 'Buy shares' }).click()
    await expect(dialog.getByRole('status')).toContainText('Recorded')
    expect((await ledgerOf(request, 'RY.TO'))[0]).toMatchObject({ transaction_type: 'buy', fees: 6.5 })
  } finally {
    await request.patch(account, { data: { commission_per_trade: 0 } })
  }
})
