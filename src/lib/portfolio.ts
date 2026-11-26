import type { DisagreementLabel, Holding, HoldingSnapshot } from '@/types'
import { toCad, type FxRatesToCad } from './fx'
import { parseDate } from './format'

/**
 * Aggregate one stock's holdings (possibly across TFSA/RRSP/Trading) into a snapshot.
 *
 * Share-based amounts (average_cost, book_cost, current_value, by_account) stay in the
 * stock's own currency. The return is the server's CAD gain, which includes the exchange
 * rate's effect (the figure Holdings shows). The day change is converted with `rates`; if
 * the rate isn't available it is NaN, which the formatters render as "—".
 */
export function buildHoldingSnapshot(
  holdings: readonly Holding[],
  rates: FxRatesToCad,
): HoldingSnapshot | undefined {
  const totalShares = holdings.reduce((s, h) => s + h.shares, 0)
  if (totalShares <= 0) return undefined

  const bookCost = holdings.reduce((s, h) => s + h.shares * h.average_cost_basis, 0)
  // A holding with no price or call makes the sum unknown (NaN, which the formatters show as a dash), never zero.
  const sum = (value: (h: Holding) => number | null) =>
    holdings.reduce((s, h) => s + (value(h) ?? Number.NaN), 0)
  const currentValue = sum((h) => h.market_value)
  const totalReturn = sum((h) => h.unrealised_cad)
  const costCad = sum((h) => h.value_cad) - totalReturn
  const dayChange = sum((h) =>
    h.current_price != null && h.change_day != null ? h.shares * (h.current_price - h.current_price / (1 + h.change_day)) : null,
  )
  const yieldOnCost = holdings.reduce((s, h) => s + (h.yield_on_cost ?? 0) * h.shares, 0) / totalShares

  const currency = holdings[0].stock.currency
  const cad = (amount: number) => toCad(amount, currency, rates) ?? Number.NaN

  return {
    shares: totalShares,
    average_cost: bookCost / totalShares,
    book_cost: bookCost,
    current_value: currentValue,
    total_return_cad: totalReturn,
    total_return_pct: costCad > 0 ? totalReturn / costCad : Number.NaN,
    day_change_cad: cad(dayChange),
    yield_on_cost: yieldOnCost > 0 ? yieldOnCost : undefined,
    by_account:
      holdings.length > 1
        ? holdings.map((h) => ({
            account_type: h.account_type,
            shares: h.shares,
            value: h.market_value ?? Number.NaN,
            avg_cost: h.average_cost_basis,
          }))
        : undefined,
  }
}

/** Fill `{{name}}` placeholders. Unknown placeholders are left untouched. */
export function applyTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

/** Same thresholds the backend uses for `disagreement_label`. */
export function disagreementLabel(score: number): DisagreementLabel {
  if (score < 0.25) return 'low'
  if (score < 0.5) return 'moderate'
  return 'high'
}

/** Filter holdings by the Portfolio page's account switcher value. */
export function filterByAccount<T extends { account_type: string }>(
  items: readonly T[] | undefined,
  account: string | undefined,
): T[] | undefined {
  if (!items) return undefined
  if (!account || account === 'combined') return [...items]
  return items.filter((i) => i.account_type === account)
}

/**
 * Human-readable time between two dates: "12d", "5mo", "1y", "2y 3mo".
 * Works in whole months so the remainder can never round up to "12mo".
 */
export function holdingPeriod(firstBuy: string, lastSell: string): string {
  const days = Math.max(0, Math.round((parseDate(lastSell).getTime() - parseDate(firstBuy).getTime()) / 86_400_000))
  if (days < 30) return `${days}d`
  const months = Math.round(days / 30.4375)
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest > 0 ? `${years}y ${rest}mo` : `${years}y`
}

/** A position as the owner names it: "RY.TO (RRSP)". Also the name screen readers get for its buttons and rows. */
export function positionLabel(item: { stock: { ticker: string }; account_type: string }): string {
  return `${item.stock.ticker} (${item.account_type.toUpperCase()})`
}
