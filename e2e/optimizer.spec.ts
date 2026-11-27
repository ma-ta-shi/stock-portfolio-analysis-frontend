/**
 * The Optimizer tab against the seeded scratch backend. The seed cannot build a run (too little price history), so this checks
 * the two states it does give: no run stored, and a run refused with the server's own message.
 */
import { axeViolations, expect, test } from './fixtures'
import { API, portfolioId } from './helpers'

test('optimizer: no run yet, and a refused run shows what the server said', async ({ page, request }) => {
  const id = await portfolioId(request)
  const refusal = await request.post(`${API}/api/portfolios/${id}/proposal-runs`, { data: { store: false, allow_stale: false } })
  expect(refusal.status()).toBe(422)
  const { message } = (await refusal.json()).error

  await page.goto('/portfolio?tab=optimizer')
  await expect(page.getByText('No run has been saved for this portfolio yet.')).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
  await page.getByRole('button', { name: 'Run optimizer' }).click()
  await page.getByRole('button', { name: 'Run and save' }).click()
  await expect(page.getByRole('alert')).toContainText(`The run was not saved. ${message}`)
  expect((await request.get(`${API}/api/portfolios/${id}/proposals`)).status()).toBe(404)
})
