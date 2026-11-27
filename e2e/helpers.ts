import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/** The backend the run started (scripts/e2e.mjs). */
export const API = process.env.E2E_API_URL ?? ''

/** The number in a formatted figure: "$1,234.50", "-US$3.20", "31.48%" -> 1234.5, -3.2, 31.48. */
export function numberIn(text: string | null): number {
  const match = /-?\d[\d,]*\.?\d*/.exec((text ?? '').replace(/^[^\d-]*-/, '-'))
  return match ? Number(match[0].replace(/,/g, '')) : NaN
}

export async function portfolioId(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${API}/api/portfolios`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data[0].portfolio_id
}

/** What the API itself says an entry would do: the page's preview must agree with it. `path` is the preview route, `events/preview` by default. */
export async function apiPreview(request: APIRequestContext, body: unknown, path = 'events/preview') {
  const res = await request.post(`${API}/api/portfolios/${await portfolioId(request)}/${path}`, { data: body })
  expect(res.ok(), await res.text()).toBeTruthy()
  return res.json()
}

/** Records straight through the API (a spec's own starting entry, so it never depends on another spec's data); answers the body. */
export async function apiRecord(request: APIRequestContext, path: string, body: unknown) {
  const res = await request.post(`${API}/api/portfolios/${await portfolioId(request)}/${path}`, { data: body })
  expect(res.ok(), await res.text()).toBeTruthy()
  return res.json()
}

/** The id the backend gave a seeded stock. */
export async function stockId(request: APIRequestContext, ticker: string): Promise<string> {
  const res = await request.get(`${API}/api/stocks?q=${encodeURIComponent(ticker)}`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data.find((s: { ticker: string }) => s.ticker === ticker).stock_id
}

/** The newest ledger rows of a ticker, newest first. */
export async function ledgerOf(request: APIRequestContext, ticker: string) {
  const res = await request.get(`${API}/api/portfolios/${await portfolioId(request)}/transactions?ticker=${encodeURIComponent(ticker)}&per_page=50`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data as Record<string, unknown>[]
}

/** The value beside a preview label in the open dialog. */
export function previewValue(dialog: Locator, label: string): Locator {
  return dialog.getByText(label, { exact: true }).locator('xpath=following-sibling::dd')
}

/** Opens a holding's dialog from the Holdings table and waits for it. */
export async function openFromRow(page: Page, buttonName: string): Promise<Locator> {
  await page.goto('/portfolio')
  await page.getByRole('button', { name: buttonName }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

/** Opens a ledger row (found by a figure in it) on the Transactions tab and expands it. */
export async function openLedgerRow(page: Page, query: string, text: RegExp): Promise<Locator> {
  await page.goto(`/portfolio?tab=transactions${query}`)
  const row = page.getByRole('row').filter({ hasText: text }).first()
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Show details of this entry' }).click()
  return row
}
