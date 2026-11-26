import { useId, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fieldText, fieldsFor, type FieldSpec } from '@/lib/fields'
import { formatCAD, formatDate, formatMoney, formatNumber, formatPct, formatPercent } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { FUNDAMENTAL_FIELDS } from '@/screens/stock-detail'
import type { CurrencyCode, Stock } from '@/types'
import type { StockFundamentals, HoldingSnapshot } from '@/types/analysis'

interface MetricProps {
  label: string
  value: React.ReactNode
  muted?: boolean
}
function Metric({ label, value, muted }: MetricProps) {
  return (
    <div className="text-center px-3 py-2 border-r border-border last:border-0">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={cn('text-sm font-semibold', muted && 'text-muted-foreground')}>{value}</div>
    </div>
  )
}

interface RangeBarProps {
  low: number
  high: number
  current: number
}
function RangeBar({ low, high, current }: RangeBarProps) {
  const pct = high > low ? ((current - low) / (high - low)) * 100 : 50
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
      <span className="shrink-0">{formatNumber(low)}</span>
      <div className="relative flex-1 h-1.5 rounded-full bg-muted">
        <div
          className="absolute top-0 h-1.5 w-1.5 rounded-full bg-primary -translate-x-1/2"
          style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="shrink-0">{formatNumber(high)}</span>
    </div>
  )
}

/** An unknown figure (NaN, drawn as "—") is neither a gain nor a loss. */
const toneOf = (value: number) => (Number.isFinite(value) ? gainLossColor(value) : 'text-muted-foreground')

interface HoldingPanelProps {
  snapshot: HoldingSnapshot
  /** Currency of the stock; share-based amounts are in this currency, `_cad` fields in CAD. */
  currency: CurrencyCode
}
function HoldingPanel({ snapshot, currency }: HoldingPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-2">
      <h2 className="text-sm font-semibold">Your Position</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Shares</div>
          <div className="text-sm font-medium">{snapshot.shares}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Cost</div>
          <div className="text-sm font-medium">{formatMoney(snapshot.average_cost, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Book Cost</div>
          <div className="text-sm font-medium">{formatMoney(snapshot.book_cost, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current Value</div>
          <div className="text-sm font-medium">{formatMoney(snapshot.current_value, currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Total Return{currency !== 'CAD' && ' (CAD)'}
          </div>
          <div className={cn('text-sm font-medium', toneOf(snapshot.total_return_cad))}>
            {formatCAD(snapshot.total_return_cad, { signed: true })} ({formatPct(snapshot.total_return_pct, 1)})
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Day Change{currency !== 'CAD' && ' (CAD)'}
          </div>
          <div className={cn('text-sm font-medium', toneOf(snapshot.day_change_cad))}>
            {formatCAD(snapshot.day_change_cad, { signed: true })}
          </div>
        </div>
        {snapshot.yield_on_cost != null && snapshot.yield_on_cost > 0 && (
          <div>
            <div className="text-xs text-muted-foreground">Yield on Cost</div>
            <div className="text-sm font-medium">{formatPercent(snapshot.yield_on_cost)}</div>
          </div>
        )}
        {snapshot.dividend_income_ytd != null && snapshot.dividend_income_ytd > 0 && (
          <div>
            <div className="text-xs text-muted-foreground">Dividends YTD</div>
            <div className="text-sm font-medium">{formatMoney(snapshot.dividend_income_ytd, currency)}</div>
          </div>
        )}
      </div>
      {snapshot.by_account && snapshot.by_account.length > 1 && (
        <div className="border-t border-border pt-2">
          <div className="text-xs text-muted-foreground mb-1">Held in multiple accounts</div>
          <div className="flex gap-4 flex-wrap">
            {snapshot.by_account.map((a) => (
              <div key={a.account_type} className="text-xs">
                <Badge variant="outline" className="text-xs mr-1">{a.account_type.toUpperCase()}</Badge>
                {a.shares} shares @ {formatMoney(a.avg_cost, currency)} · {formatMoney(a.value, currency)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface FundamentalsRead {
  values?: StockFundamentals
  marketCap: number | null
  currency: string | null
  asOf: string | null
}

interface StockInfoSectionProps {
  stock: Stock
  /** null when the stock hasn't been priced yet */
  price: number | null
  /** Which price that is, under it: stored closes can be days old, and an analysis shows the price it was made at. */
  priceNote?: string
  /** Said instead of a price when there is none. */
  noPrice?: string
  /** Said after the day of the fundamentals, where they are not the figures of what the page is about. */
  fundamentalsNote?: string
  /** The newest stored fundamentals (`useStockFundamentals`): the figures, the market cap and its currency, and their day. */
  fundamentals?: FundamentalsRead
  holdingSnapshot?: HoldingSnapshot
}

/** A bar or grid tile for one registry field. */
const tile = (spec: FieldSpec<StockFundamentals>, f: StockFundamentals) => {
  const value = fieldText(spec, f)
  return <Metric key={spec.id} label={spec.label} value={value} muted={value === '—'} />
}

export function StockInfoSection({
  stock,
  price,
  priceNote,
  noPrice = 'Price not available yet',
  fundamentalsNote,
  fundamentals,
  holdingSnapshot,
}: StockInfoSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const moreId = useId()
  const f = fundamentals?.values
  const marketCap = fundamentals?.marketCap
  const marketCapCurrency = (fundamentals?.currency as CurrencyCode | null) ?? stock.currency
  const fundamentalsAsOf = fundamentals?.asOf

  return (
    <div className="space-y-3">
      {/* Overview */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{stock.ticker}</span>
              <Badge variant="outline" className="text-xs">{stock.exchange}</Badge>
              <Badge variant="outline" className="text-xs">{stock.sector}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">{stock.name}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-semibold">
              {price == null ? (
                <span className="text-sm font-normal text-muted-foreground">{noPrice}</span>
              ) : (
                <>
                  {formatNumber(price)} <span className="text-xs text-muted-foreground">{stock.currency}</span>
                </>
              )}
            </div>
            {price != null && priceNote && <div className="text-xs text-muted-foreground">{priceNote}</div>}
            {marketCap != null && (
              <div className="text-xs text-muted-foreground">Mkt cap {formatMoney(marketCap, marketCapCurrency, { compact: true })}</div>
            )}
          </div>
        </div>
        {f?.business_description && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
            {f.business_description}
          </p>
        )}
      </div>

      {/* Key Metrics Bar */}
      {f && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex flex-wrap divide-x divide-border">
            {fieldsFor(FUNDAMENTAL_FIELDS, 'column').map((spec) => {
              if (spec.id !== 'week_52') return tile(spec, f)
              // the range is drawn, with the price's place in it
              if (f.week_52_high == null || f.week_52_low == null || price == null) return null
              return (
                <div key={spec.id} className="flex-1 min-w-40 px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-1">{spec.label}</div>
                  <RangeBar low={f.week_52_low} high={f.week_52_high} current={price} />
                </div>
              )
            })}
          </div>

          {/* Expandable additional fundamentals */}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={moreId}
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground border-t border-border transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
            {expanded ? 'Less' : 'More fundamentals'}
          </button>

          {expanded && (
            <div id={moreId} className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-border border-t border-border">
              {fieldsFor(FUNDAMENTAL_FIELDS, 'detail').map((spec) => tile(spec, f))}
            </div>
          )}
        </div>
      )}

      {f && fundamentalsAsOf && <p className="text-xs text-muted-foreground">Fundamentals as of {formatDate(fundamentalsAsOf)}{fundamentalsNote && `. ${fundamentalsNote}`}</p>}

      {/* Holding Panel */}
      {holdingSnapshot && <HoldingPanel snapshot={holdingSnapshot} currency={stock.currency} />}
    </div>
  )
}
