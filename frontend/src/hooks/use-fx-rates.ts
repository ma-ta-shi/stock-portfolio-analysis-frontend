import { useMemo } from 'react'
import { useMarketOverview } from './use-market'
import { CAD_ONLY, type FxRatesToCad } from '@/lib/fx'

/**
 * Currency → CAD conversion rates for building combined cross-currency totals.
 * Sourced from the market overview's exchange rate; if a dedicated FX endpoint is
 * added to the backend, only this hook needs to change.
 *
 * Until the rate loads, `rates` contains CAD only, so USD amounts are reported as
 * missing by `sumInCad` rather than being silently added as if they were CAD.
 */
export function useFxRates(): { rates: FxRatesToCad; isLoading: boolean; asOf?: string } {
  const { data, isLoading } = useMarketOverview()
  const usdCad = data?.exchange_rate.usd_cad
  // Stable identity so consumers' useMemo dependencies don't recompute every render.
  const rates = useMemo<FxRatesToCad>(
    () => (usdCad == null ? CAD_ONLY : { CAD: 1, USD: usdCad }),
    [usdCad],
  )
  return { rates, isLoading, asOf: data?.as_of }
}
