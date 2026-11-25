/**
 * The Portfolio header: the tiles of the original design, the value graph, and (in the combined view) one card for each account with
 * its contribution room. Every figure is drawn from the registries in `screens/portfolio/summary.tsx`; nothing here names an API field.
 */
import { AlertTriangle } from 'lucide-react'
import { QueryError } from '@/components/QueryError'
import { ValueChart } from '@/components/ValueChart'
import { usePortfolioHoldings, usePortfolioSummary } from '@/hooks/use-portfolio'
import { fieldText, fieldsFor, type FieldSpec } from '@/lib/fields'
import { formatCAD } from '@/lib/format'
import { gainLossColor, TONE_TEXT } from '@/lib/labels'
import { unavailableLabel } from '@/lib/gaps'
import { ACCOUNT_TYPES } from '@/lib/accounts'
import { annualIncomeEstimateCad } from '@/lib/portfolio-mappers'
import { cn } from '@/lib/utils'
import { ROOM_FIELDS, SUMMARY_FIELDS } from '@/screens/portfolio/summary'
import type { PortfolioAccountView, PortfolioSummary } from '@/types/portfolio'

/** Headline tiles that are gains or losses, so they are coloured by sign. */
const SIGNED = new Set(['unrealised', 'realised', 'total_return', 'day_change'])
/** The parts of the header that come from optional requests, and what is missing when each fails. */
const PART_FOR: Record<string, keyof PortfolioSummary['unavailable']> = { realised: 'report', total_return: 'report', dividends: 'report', day_change: 'history' }

function Tile({ spec, summary }: { spec: FieldSpec<PortfolioSummary>; summary: PortfolioSummary }) {
  const part = PART_FOR[spec.id]
  const missing = part ? summary.unavailable[part] : false
  const raw = spec.get(summary)
  const text = missing ? (part === 'history' ? unavailableLabel('P-D2') : 'unavailable') : fieldText(spec, summary)
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5" title={spec.tooltip}>
        {spec.label}
      </div>
      <div className={cn('text-sm font-medium', !missing && SIGNED.has(spec.id) && typeof raw === 'number' && gainLossColor(raw))}>{text}</div>
    </div>
  )
}

export function SummaryHeader({
  accountView,
  onAccountChange,
}: {
  accountView: PortfolioAccountView
  onAccountChange: (v: PortfolioAccountView) => void
}) {
  const { data, isLoading, isError, error, refetch } = usePortfolioSummary(accountView)
  const holdings = usePortfolioHoldings()

  if (isLoading) return <div className="h-32 rounded-lg bg-muted animate-pulse mb-4" />
  if (isError) return <QueryError what="portfolio summary" error={error} onRetry={refetch} className="mb-4" />
  if (!data) return null

  const income = holdings.data ? annualIncomeEstimateCad(holdings.data, accountView) : null
  const tiles = fieldsFor(SUMMARY_FIELDS, 'column')
  const points = (data.history?.points ?? []).map((p) => ({ day: p.day, value: p.value_cad }))
  const rising = points.length < 2 || points[points.length - 1].value >= points[0].value

  return (
    <div className="space-y-3 mb-4">
      <div className="bg-card border border-border rounded-lg px-6 py-4">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-end gap-x-8 gap-y-3 flex-wrap">
            {tiles.map((spec) => (
              <Tile key={spec.id} spec={spec} summary={data} />
            ))}
            <div>
              <div
                className="text-xs text-muted-foreground mb-0.5"
                title="For each holding, the analysis's expected dividends per share times your shares, summed in Canadian dollars"
              >
                Expected dividend income (next 12 months)
              </div>
              <div className="text-sm font-medium">{income == null ? '—' : formatCAD(income)}</div>
            </div>
          </div>
          <div className="w-64 shrink-0">
            <ValueChart points={points} color={rising ? '#059669' : '#dc2626'} />
          </div>
        </div>
        {data.unpriced.length > 0 && (
          <p role="status" className={cn('mt-3 text-xs flex items-center gap-1.5', TONE_TEXT.warning)}>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            No price recorded for {data.unpriced.join(', ')}; carried at cost.
          </p>
        )}
        {data.room_error && <p className="mt-2 text-xs text-muted-foreground">Contribution room unavailable: {data.room_error}</p>}
      </div>

      {accountView === 'combined' && (
        <div className="grid grid-cols-3 gap-3">
          {ACCOUNT_TYPES.map((acc) => {
            const a = data.by_account[acc]
            if (!a) return null
            const room = data.room?.accounts[acc]
            return (
              <button
                type="button"
                key={acc}
                onClick={() => onAccountChange(acc)}
                className="bg-card border border-border rounded-lg px-4 py-3 text-left hover:border-primary transition-colors"
              >
                <div className="text-xs font-medium text-muted-foreground mb-1">{acc.toUpperCase()}</div>
                <div className="text-base font-semibold">{formatCAD(a.value)}</div>
                <div className={cn('text-xs mt-0.5', gainLossColor(a.gain_loss))}>{formatCAD(a.gain_loss, { signed: true })}</div>
                {room && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Room {fieldText(ROOM_FIELDS.find((s) => s.id === 'room_today')!, room)}
                    {room.estimated ? ' (estimated)' : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
