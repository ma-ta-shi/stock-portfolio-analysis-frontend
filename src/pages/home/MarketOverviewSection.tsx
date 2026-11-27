/** The market figures the app has: the Bank of Canada's exchange rate, and the rates and VIX of the newest analysis. */
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { QueryError } from '@/components/QueryError'
import { useFxRates } from '@/hooks/use-fx-rates'
import { useMacro } from '@/hooks/use-home'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import { asFraction } from '@/lib/units'

const TREND = {
  tightening: { Icon: ArrowUp, word: 'rising' },
  easing: { Icon: ArrowDown, word: 'falling' },
  pausing: { Icon: Minus, word: 'holding' },
} as const

function Row({ label, value, note }: { label: ReactNode; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {value}
        {note && <span className="font-normal text-muted-foreground"> · {note}</span>}
      </dd>
    </div>
  )
}

export function MarketOverviewSection() {
  const fx = useFxRates()
  const { data, isLoading, isError, error, refetch } = useMacro()
  const trend = data?.boc_rate_trend ? TREND[data.boc_rate_trend] : null
  const cadUsd = fx.rates.USD ? 1 / fx.rates.USD : null

  return (
    <section aria-labelledby="market-heading" className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h2 id="market-heading" className="font-semibold">Market Overview</h2>
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row label="CAD/USD" value={cadUsd != null ? formatNumber(cadUsd, 4) : fx.isLoading ? '…' : 'unavailable'} note={cadUsd != null && fx.asOf ? formatDate(fx.asOf) : undefined} />
        <Row
          label={
            <>
              BoC Rate {trend && <trend.Icon className="w-3 h-3 inline" aria-label={trend.word} />}
            </>
          }
          value={formatPercent(asFraction('MacroSnapshotResponse.boc_rate', data?.boc_rate))}
        />
        <Row label="Fed Rate" value={formatPercent(asFraction('MacroSnapshotResponse.fed_funds_rate', data?.fed_funds_rate))} />
        <Row label="VIX" value={formatNumber(data?.vix ?? null)} note={data?.vix_regime ?? undefined} />
      </dl>
      {isError ? (
        <QueryError what="rates" error={error} onRetry={refetch} compact />
      ) : (
        !isLoading && (
          <p className="text-xs text-muted-foreground">
            {data?.run_day ? `Rates and VIX from the analysis of ${formatDate(data.run_day)}.` : 'No analysis on record yet, so no rates.'}
          </p>
        )
      )}
    </section>
  )
}
