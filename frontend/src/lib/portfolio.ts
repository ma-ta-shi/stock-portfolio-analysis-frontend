import type { DisagreementLabel, Holding, HoldingSnapshot } from '@/types'
import { toCad, type FxRatesToCad } from './fx'
import { parseDate } from './format'

/**
 * Aggregate one stock's holdings (possibly across TFSA/RRSP/Trading) into a snapshot.
 *
 * Share-based amounts (average_cost, book_cost, current_value, by_account) stay in the
 * stock's own currency. The `_cad` fields are converted with `rates`; if the rate isn't
 * available yet they are NaN, which the formatters render as "—" instead of mislabelling
 * a USD amount as CAD.
 */
export function buildHoldingSnapshot(
  holdings: readonly Holding[],
  rates: FxRatesToCad,
): HoldingSnapshot | undefined {
  const totalShares = holdings.reduce((s, h) => s + h.shares, 0)
  if (totalShares <= 0) return undefined

  const bookCost = holdings.reduce((s, h) => s + h.shares * h.average_cost_basis, 0)
  const currentValue = holdings.reduce((s, h) => s + h.market_value, 0)
  const totalReturn = holdings.reduce((s, h) => s + h.total_gain_loss, 0)
  const dayChange = holdings.reduce((s, h) => s + h.day_change * h.shares, 0)
  const yieldOnCost = holdings.reduce((s, h) => s + h.yield_on_cost * h.shares, 0) / totalShares

  const currency = holdings[0].stock.currency
  const cad = (amount: number) => toCad(amount, currency, rates) ?? Number.NaN

  return {
    shares: totalShares,
    average_cost: bookCost / totalShares,
    book_cost: bookCost,
    current_value: currentValue,
    total_return_cad: cad(totalReturn),
    total_return_pct: bookCost > 0 ? totalReturn / bookCost : 0,
    day_change_cad: cad(dayChange),
    yield_on_cost: yieldOnCost > 0 ? yieldOnCost : undefined,
    by_account:
      holdings.length > 1
        ? holdings.map((h) => ({
            account_type: h.account_type,
            shares: h.shares,
            value: h.market_value,
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

export interface AllocationSlice {
  name: string
  /** Value in CAD */
  value: number
  /** Fraction of the total (0–1) */
  share: number
}

export interface Allocations {
  bySector: AllocationSlice[]
  byAccount: AllocationSlice[]
  byGeography: AllocationSlice[]
  totalCad: number
  /** Currencies whose holdings were left out because no FX rate was available. */
  missingCurrencies: Holding['stock']['currency'][]
}

/**
 * Allocation weights across holdings in mixed currencies. Every market value is
 * converted to CAD first — adding USD and CAD amounts directly would overweight
 * USD holdings by the exchange rate.
 */
export function buildAllocations(holdings: readonly Holding[], rates: FxRatesToCad): Allocations {
  const missing = new Set<Holding['stock']['currency']>()
  const converted: { holding: Holding; cad: number }[] = []
  for (const h of holdings) {
    const cad = toCad(h.market_value, h.stock.currency, rates)
    if (cad == null) missing.add(h.stock.currency)
    else converted.push({ holding: h, cad })
  }
  const totalCad = converted.reduce((s, c) => s + c.cad, 0)

  function group(keyOf: (h: Holding) => string): AllocationSlice[] {
    const map = new Map<string, number>()
    for (const { holding, cad } of converted) {
      const key = keyOf(holding)
      map.set(key, (map.get(key) ?? 0) + cad)
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value, share: totalCad > 0 ? value / totalCad : 0 }))
      .sort((a, b) => b.value - a.value)
  }

  return {
    bySector: group((h) => h.stock.sector),
    byAccount: group((h) => h.account_type.toUpperCase()),
    byGeography: group((h) => (h.stock.currency === 'CAD' ? 'Canadian' : 'US')),
    totalCad,
    missingCurrencies: [...missing],
  }
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
