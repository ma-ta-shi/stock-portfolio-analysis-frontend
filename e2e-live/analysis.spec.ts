/**
 * The Analysis page against the seeded scratch backend, reached from the Stock page: the call, Layer 1, the agents and the footer
 * compared with the API's own answer. No analysis is started.
 */
import type { APIRequestContext } from '@playwright/test'
import { axeViolations, expect, test } from '../e2e/fixtures'
import { API } from './helpers'

const json = async (request: APIRequestContext, path: string) => (await request.get(`${API}${path}`)).json()

test('opens from the Stock page and shows what the API holds for the run', async ({ page, request }) => {
  const stocks = (await json(request, '/api/stocks?q=RY.TO')).data as { ticker: string; stock_id: string }[]
  const id = stocks.find((s) => s.ticker === 'RY.TO')!.stock_id
  const snap = (await json(request, `/api/stocks/snapshots?stock_ids=${id}`)).data[0]
  const result = await json(request, `/api/analysis/${snap.analysis.run_id}`)
  const output = (name: string) => (result.agent_outputs as { agent_name: string; structured_output: Record<string, string> }[]).find((o) => o.agent_name === name)!.structured_output

  await page.goto(`/stocks/${id}`)
  await page.getByRole('link', { name: 'Full Analysis' }).click()
  await expect(page).toHaveURL(new RegExp(`/analysis/${snap.analysis.run_id}$`))

  const call = page.getByRole('region', { name: 'Call' })
  await expect(call).toContainText(`${result.overall_confidence}%`)
  await expect(call).toContainText(result.price_band.target_price.toFixed(2))
  await expect(page.getByRole('region', { name: 'Layer 1 — Stock Outlook' })).toContainText(result.synthesis_narrative)

  await page.getByRole('button', { name: /Fundamental Analyst/ }).click()
  await expect(page.getByText(output('FUND').assessment_summary)).toBeVisible()
  await page.getByRole('button', { name: /Bull Advocate/ }).click()
  await expect(page.getByText(output('bull').strongest_argument)).toBeVisible()
  await expect(page.getByText(result.analysis_id)).toBeVisible()
  expect(await axeViolations(page)).toEqual([])
})

test('says an analysis that does not exist was not found', async ({ page }) => {
  await page.goto('/analysis/00000000-0000-4000-8000-000000000000')
  await expect(page.getByText('Analysis not found.')).toBeVisible()
})
