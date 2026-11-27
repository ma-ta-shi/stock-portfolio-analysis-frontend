/**
 * The Stock page against the seeded scratch backend: the latest call, the drivers, the price chart and the analysis history, each
 * compared with the API's own answer. The seed's RY.TO has two analyses, the earlier one with a resolved prediction. No analysis
 * is started.
 */
import type { APIRequestContext } from '@playwright/test'
import { axeViolations, expect, test } from './fixtures'
import { API, stockId } from './helpers'

const json = async (request: APIRequestContext, path: string) => (await request.get(`${API}${path}`)).json()

test('shows the latest call, its drivers and the history the API holds', async ({ page, request }) => {
  const id = await stockId(request, 'RY.TO')
  const snap = (await json(request, `/api/stocks/snapshots?stock_ids=${id}`)).data[0]
  const result = await json(request, `/api/analysis/${snap.analysis.run_id}`)
  const runs = (await json(request, `/api/analysis?stock_id=${id}&status=complete&from=2026-10-13`)).data // the page loads none from before the price band

  await page.goto(`/stocks/${id}`)
  const call = page.getByRole('region', { name: 'Latest call' })
  await expect(call).toContainText(`${snap.analysis.confidence}%`)
  await expect(call).toContainText(snap.analysis.target_price.toFixed(2))
  await expect(page.getByText(result.key_drivers[0].factor)).toBeVisible()
  await expect(page.getByText(result.synthesis_narrative)).toBeVisible()
  await expect(page.getByRole('table').last().locator('tbody tr')).toHaveCount(runs.length)
  await expect(page.getByRole('heading', { name: '90-Day Price' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run New Analysis' })).toBeDisabled()
  expect(await axeViolations(page)).toEqual([])
})

test('says a stock that was never analysed is awaiting one, and an ETF why it is not', async ({ page, request }) => {
  await page.goto(`/stocks/${await stockId(request, 'MSFT')}`)
  await expect(page.getByText('Awaiting analysis.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Latest call' })).toHaveCount(0)

  await page.goto(`/stocks/${await stockId(request, 'ZQQ.TO')}`)
  await expect(page.getByText(/This security is not analysed/)).toBeVisible()
})
