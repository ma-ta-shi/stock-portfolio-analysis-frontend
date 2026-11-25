import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/** The backend the live run started (scripts/e2e-live.mjs). */
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

/** What the API itself says an entry would do: the page's preview must agree with it. */
export async function apiPreview(request: APIRequestContext, body: unknown) {
  const res = await request.post(`${API}/api/portfolios/${await portfolioId(request)}/events/preview`, { data: body })
  expect(res.ok(), await res.text()).toBeTruthy()
  return res.json()
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
