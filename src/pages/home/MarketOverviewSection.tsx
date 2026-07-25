import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { useMarketOverview } from '@/hooks/use-market'
import { SparklineChart } from '@/components/SparklineChart'
import { formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'

function DirectionArrow({ direction }: { direction: string }) {
  if (direction === 'up' || direction === 'hiking')
    return <ArrowUp className="w-3 h-3 text-red-500 inline" />
  if (direction === 'down' || direction === 'cutting')
    return <ArrowDown className="w-3 h-3 text-emerald-600 inline" />
  return <Minus className="w-3 h-3 text-muted-foreground inline" />
}

export function MarketOverviewSection() {
  const { data, isLoading } = useMarketOverview()

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 h-64 animate-pulse" />
    )
  }
  if (!data) return null

  const { indices, exchange_rate, interest_rates, market_sentiment } = data

  const sentimentColor =
    market_sentiment.score >= 60
      ? 'bg-emerald-500'
      : market_sentiment.score >= 40
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h2 className="font-semibold">Market Overview</h2>

      {/* Index grid */}
      <div className="grid grid-cols-2 gap-3">
        {indices.slice(0, 4).map((idx) => {
          const positive = idx.day_change >= 0
          return (
            <div key={idx.symbol} className="space-y-1">
              <div className="text-xs text-muted-foreground truncate">{idx.name}</div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {idx.value.toLocaleString('en-CA', { maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={cn(
                      'text-xs',
                      positive ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {positive ? '+' : ''}
                    {formatPct(idx.day_change_pct * 100)}
                  </div>
                </div>
                <div className="w-16 h-8 shrink-0">
                  <SparklineChart
                    data={idx.sparkline_5d}
                    color={positive ? '#10b981' : '#ef4444'}
                    height={32}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-border pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">CAD/USD</span>
          <span className="font-medium">
            {exchange_rate.cad_usd.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            BoC Rate <DirectionArrow direction={interest_rates.boc_direction} />
          </span>
          <span className="font-medium">
            {(interest_rates.boc_rate * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Fed Rate <DirectionArrow direction={interest_rates.fed_direction} />
          </span>
          <span className="font-medium">
            {(interest_rates.fed_funds_rate * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Sentiment</span>
          <span className="text-xs capitalize font-medium">
            {market_sentiment.label} ({market_sentiment.score}/100)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 relative">
          <div
            className={cn('absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background', sentimentColor)}
            style={{ left: `calc(${market_sentiment.score}% - 5px)` }}
          />
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">
          VIX {market_sentiment.vix} · {market_sentiment.description}
        </div>
      </div>
    </div>
  )
}
