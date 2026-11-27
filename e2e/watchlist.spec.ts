/**
 * The Watchlist against the seeded scratch backend: the real list, adding (also a refused fund and a duplicate), removing and adding
 * again, each surviving a reload. The seed watches RY.TO (a usable analysis); TD.TO's is out of date and MSFT was never analysed.
 */
import type { APIRequestContext, Page } from '@playwright/test'
import { axeViolations, expect, test } from './fixtures'
import { API } from './helpers'

test.describe.configure({ mode: 'serial' })

async function watched(request: APIRequestContext) {
  const owners = (await (await request.get(`${API}/api/portfolios?per_page=100`)).json()).data as { kind: string; user_id: string }[]
  const user = owners.find((p) => p.kind === 'user')!.user_id
  const res = await request.get(`${API}/api/watchlist?user_id=${user}&include=snapshot&per_page=100`)
  return (await res.json()).data as { stock: { ticker: string }; snapshot: { price: number | null; analysis: { confidence: number } | null } }[]
}

async function add(page: Page, ticker: string) {
  await page.getByRole('button', { name: 'Add Stock' }).click()
  await page.getByLabel('Ticker').fill(ticker)
  await page.getByRole('button', { name: 'Look up' }).click()
  await page.getByRole('button', { name: 'Add to Watchlist' }).click()
}

const row = (page: Page, ticker: string) => page.getByRole('row', { name: `View ${ticker}` })

test('adds stocks, shows what the backend knows of each, and keeps them after a reload', async ({ page, request }) => {
  await page.goto('/watchlist')
  await expect(row(page, 'RY.TO')).toBeVisible()
  await add(page, 'TD.TO')
  await expect(row(page, 'TD.TO')).toBeVisible()
  await add(page, 'MSFT')
  await expect(row(page, 'MSFT').getByText('Awaiting analysis')).toBeVisible()
  await page.reload()
  await expect(row(page, 'MSFT')).toBeVisible()

  const api = await watched(request)
  expect(api.map((e) => e.stock.ticker).sort()).toEqual(['MSFT', 'RY.TO', 'TD.TO'])
  await expect(page.getByText(`${api.length} stocks`)).toBeVisible()
  const ry = api.find((e) => e.stock.ticker === 'RY.TO')!
  await expect(row(page, 'RY.TO')).toContainText(`${ry.snapshot.analysis!.confidence}%`)
  await expect(row(page, 'TD.TO').getByText('Analysis is out of date')).toHaveCount(1)
  expect(await axeViolations(page)).toEqual([])
})

test('refuses a fund and a stock already watched', async ({ page, request }) => {
  await page.goto('/watchlist')
  await add(page, 'ZQQ.TO')
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('cannot be watched')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Add Stock' }).click()
  await page.getByLabel('Ticker').fill('RY.TO')
  await page.getByRole('button', { name: 'Look up' }).click()
  await expect(page.getByText('RY.TO is already on your watchlist.')).toBeVisible()
  expect(await watched(request)).toHaveLength(3)
})

test('removes after confirming, stays removed, and can be added again', async ({ page, request }) => {
  await page.goto('/watchlist')
  await page.getByRole('button', { name: 'Remove TD.TO from watchlist' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
  await expect(row(page, 'TD.TO')).toHaveCount(0)
  await page.reload()
  await expect(row(page, 'RY.TO')).toBeVisible()
  await expect(row(page, 'TD.TO')).toHaveCount(0)
  expect((await watched(request)).map((e) => e.stock.ticker)).not.toContain('TD.TO')

  await add(page, 'TD.TO')
  await expect(row(page, 'TD.TO')).toBeVisible()
  expect(await watched(request)).toHaveLength(3)
})
