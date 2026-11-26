/**
 * The Settings page against the seeded scratch backend: stored values in the inputs, one save for the page that the API then
 * answers back, a warning before leaving with unsaved changes, and the profile put back as it was.
 */
import type { APIRequestContext } from '@playwright/test'
import { axeViolations, expect, test } from '../e2e/fixtures'
import { API, portfolioId } from './helpers'

const json = async (request: APIRequestContext, path: string) => (await request.get(`${API}${path}`)).json()

test('saves the page and the system uses the new values; warns before losing a change', async ({ page, request }) => {
  const me = (await json(request, '/api/users')).data[0] // the app's default user
  const portfolio = await portfolioId(request)
  const before = await json(request, `/api/users/${me.user_id}`)
  const account = async () => (await json(request, `/api/portfolios/${portfolio}/accounts/trading`)).commission_per_trade as number
  const commission = await account()

  await page.goto('/settings')
  const income = page.getByLabel('Annual income')
  await expect(income).toHaveValue(String(before.income_annual))
  const save = page.getByRole('button', { name: 'Save changes' })
  await expect(save).toBeDisabled()
  expect(await axeViolations(page)).toEqual([])

  // a mistyped amount stays as typed and cannot be saved
  await income.fill('12e')
  await expect(income).toHaveValue('12e')
  await expect(save).toBeDisabled()

  // leaving with a change asks first
  await income.fill('250000')
  await page.getByRole('link', { name: 'Watchlist' }).click()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page).toHaveURL(/\/settings$/)

  await page.getByLabel(/Max Single Position/).fill('12')
  await page.getByLabel(/Orders: minimum order/).fill('750')
  const trading = page.getByRole('group', { name: 'TRADING account' })
  await trading.getByLabel('Commission per trade').fill('4.95')
  await save.click()
  await expect(page.getByText('Saved.')).toBeVisible()

  const after = await json(request, `/api/users/${me.user_id}`)
  expect(after.income_annual).toBe(250000)
  expect(after.max_position_size_pct).toBe(12)
  expect(after.marginal_tax_rate_pct).not.toBe(before.marginal_tax_rate_pct) // worked out again from the new income
  await expect(page.getByText(`${after.marginal_tax_rate_pct.toFixed(2)}% (auto-calculated)`)).toBeVisible()
  expect(await account()).toBe(4.95)
  const rules = (await json(request, `/api/portfolios?user_id=${me.user_id}`)).data[0].settings
  expect(rules.orders.minimum_order).toBe(750)

  // put back what other specs read
  await income.fill(String(before.income_annual))
  await page.getByLabel(/Max Single Position/).fill(before.max_position_size_pct == null ? '' : String(before.max_position_size_pct))
  await page.getByLabel(/Orders: minimum order/).fill('')
  await trading.getByLabel('Commission per trade').fill(String(commission))
  await save.click()
  await expect(page.getByText('Saved.')).toBeVisible()

  // nothing unsaved: leaving is not stopped
  await page.getByRole('link', { name: 'Watchlist' }).click()
  await expect(page).toHaveURL(/\/watchlist$/)
})
