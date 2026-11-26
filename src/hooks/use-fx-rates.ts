import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { CAD_ONLY, type FxRatesToCad } from '@/lib/fx'
import { queryKeys } from '@/lib/query-keys'
import type { components } from '@/types/openapi.gen'

/**
 * Currency → CAD conversion rates for building combined cross-currency totals: the newest Bank of Canada USD/CAD observation
 * (`GET /api/exchange-rates`, the last 30 days, oldest first).
 *
 * Until the rate loads, `rates` contains CAD only, so USD amounts are reported as
 * missing by `sumInCad` rather than being silently added as if they were CAD.
 */
export function useFxRates(): { rates: FxRatesToCad; isLoading: boolean; asOf?: string } {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.market.exchangeRates,
    // The server asks the Bank on every request, and the Bank publishes once a business day.
    staleTime: 60 * 60 * 1000,
    queryFn: ({ signal }) =>
      apiFetch<components['schemas']['ExchangeRateListResponse']>('/mock-data/market/exchange-rates.json', '/api/exchange-rates', { signal }),
  })
  const latest = data?.data.at(-1)
  const usdCad = latest?.rate
  // Stable identity so consumers' useMemo dependencies don't recompute every render.
  const rates = useMemo<FxRatesToCad>(
    () => (usdCad == null ? CAD_ONLY : { CAD: 1, USD: usdCad }),
    [usdCad],
  )
  return { rates, isLoading, asOf: latest?.date }
}
