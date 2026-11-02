import type { Holding } from '@/types'

/** Used only when the user profile hasn't loaded or has no marginal rate. */
export const FALLBACK_MARGINAL_RATE = 0.33
/** Canadian capital gains inclusion rate. */
export const CAPITAL_GAINS_INCLUSION_RATE = 0.5

export type TaxPreview =
  | { kind: 'none' }
  | { kind: 'no_fx_rate' }
  | {
      kind: 'estimate'
      capitalGainCad: number
      taxableGainCad: number
      estimatedTaxCad: number
      marginalRate: number
      rateIsAssumed: boolean
    }

export interface SellPreview {
  /** In the holding's currency: (price − avg cost) × shares − fees */
  realizedGainLoss: number
  /** Fraction of book cost sold */
  realizedGainLossPct: number
  tax: TaxPreview
  superficialLossDetail: string | null
  closesPosition: boolean
}

interface EstimateSellInput {
  holding: Holding
  shares: number
  price: number
  fees: number
  /** All of the user's holdings, used for the superficial-loss check. */
  otherHoldings: readonly Holding[]
  marginalTaxRate?: number
  /** Converts an amount in the holding's currency to CAD, or null if no rate is available. */
  toCad: (amount: number) => number | null
}

/**
 * Client-side estimate of a sell, shown live while the user types.
 *
 * The backend exposes the authoritative version at
 * `GET /api/portfolio/{user_id}/holdings/{holding_id}/sell/preview`. When it's wired up,
 * replace calls to this function with a query against that endpoint; the UI only
 * depends on the `SellPreview` shape.
 */
export function estimateSell({
  holding,
  shares,
  price,
  fees,
  otherHoldings,
  marginalTaxRate,
  toCad,
}: EstimateSellInput): SellPreview {
  const realizedGainLoss = (price - holding.average_cost_basis) * shares - fees
  const bookCost = holding.average_cost_basis * shares
  const realizedGainLossPct = bookCost > 0 ? realizedGainLoss / bookCost : 0
  const isTrading = holding.account_type === 'trading'

  let tax: TaxPreview = { kind: 'none' }
  if (isTrading && realizedGainLoss > 0) {
    const capitalGainCad = toCad(realizedGainLoss)
    if (capitalGainCad == null) {
      tax = { kind: 'no_fx_rate' }
    } else {
      const rateIsAssumed = marginalTaxRate == null
      const marginalRate = marginalTaxRate ?? FALLBACK_MARGINAL_RATE
      const taxableGainCad = capitalGainCad * CAPITAL_GAINS_INCLUSION_RATE
      tax = {
        kind: 'estimate',
        capitalGainCad,
        taxableGainCad,
        estimatedTaxCad: taxableGainCad * marginalRate,
        marginalRate,
        rateIsAssumed,
      }
    }
  }

  // Superficial loss: selling at a loss in Trading while the same stock is held elsewhere.
  let superficialLossDetail: string | null = null
  if (isTrading && realizedGainLoss < 0) {
    const otherAccounts = otherHoldings
      .filter(
        (h) =>
          h.stock.stock_id === holding.stock.stock_id &&
          h.holding_id !== holding.holding_id &&
          h.is_active !== false,
      )
      .map((h) => h.account_type.toUpperCase())
    if (otherAccounts.length > 0) {
      superficialLossDetail = `This stock is also held in your ${otherAccounts.join(' and ')}. If you repurchase within 30 days before or after this sale, the loss will be denied under the superficial loss rule.`
    }
  }

  return {
    realizedGainLoss,
    realizedGainLossPct,
    tax,
    superficialLossDetail,
    closesPosition: shares >= holding.shares,
  }
}
