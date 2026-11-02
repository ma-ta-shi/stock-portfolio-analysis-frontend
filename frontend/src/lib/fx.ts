import type { CurrencyCode } from '@/types'

/** Multiplier that converts one unit of each currency into CAD. CAD is always 1. */
export type FxRatesToCad = Partial<Record<CurrencyCode, number>> & { CAD: 1 }

export const CAD_ONLY: FxRatesToCad = { CAD: 1 }

/** Convert an amount to CAD, or `null` when no rate is known for its currency. */
export function toCad(amount: number, currency: CurrencyCode, rates: FxRatesToCad): number | null {
  const rate = rates[currency]
  return rate == null ? null : amount * rate
}

export interface CadTotal {
  total: number
  /** Currencies that had no rate and were therefore left out of `total`. */
  missingCurrencies: CurrencyCode[]
}

/** Sum amounts in mixed currencies into a CAD total, reporting any that couldn't be converted. */
export function sumInCad(
  items: readonly { amount: number; currency: CurrencyCode }[],
  rates: FxRatesToCad,
): CadTotal {
  let total = 0
  const missing = new Set<CurrencyCode>()
  for (const { amount, currency } of items) {
    const cad = toCad(amount, currency, rates)
    if (cad == null) missing.add(currency)
    else total += cad
  }
  return { total, missingCurrencies: [...missing] }
}
