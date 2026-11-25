/**
 * The Portfolio header: the headline figures, the per-account cards with their contribution room, and the performance
 * panel. Every figure is drawn from the registries in `screens/portfolio/summary.tsx`; nothing here names an API field.
 */
import { AlertTriangle } from 'lucide-react'
import { FieldList } from '@/components/FieldList'
import { QueryError } from '@/components/QueryError'
import { SparklineChart } from '@/components/SparklineChart'
import { usePortfolioHoldings, usePortfolioSummary } from '@/hooks/use-portfolio'
import { fieldText, fieldsFor, type FieldSpec } from '@/lib/fields'
import { formatCAD, formatDate } from '@/lib/format'
import { gainLossColor, TONE_TEXT } from '@/lib/labels'
import { unavailableLabel } from '@/lib/gaps'
import { annualIncomeEstimateCad } from '@/lib/portfolio-mappers'
import { cn } from '@/lib/utils'
import { ACCOUNT_FIELDS, ROOM_EVENT_FIELDS, ROOM_FIELDS, SUMMARY_FIELDS } from '@/screens/portfolio/summary'
import type { PortfolioAccountView, PortfolioSummary } from '@/types/portfolio'
import type { AccountType } from '@/types/user'

const ACCOUNTS: AccountType[] = ['tfsa', 'rrsp', 'trading']
/** Headline tiles that are gains or losses, so they are coloured by sign. */
const SIGNED = new Set(['unrealised', 'unrealised_pct', 'profit', 'return_period', 'return_annualised', 'fund_difference', 'profit_realised_cad', 'day_change'])
/** The parts of the header that come from optional requests, and what is missing when each fails. */
const PART_FOR: Record<string, keyof PortfolioSummary['unavailable']> = {
  profit: 'report', return_period: 'report', return_annualised: 'report', fund_difference: 'report', tax_total: 'report',
  profit_realised_cad: 'report', profit_dividends_net_cad: 'report', profit_fees_cad: 'report', day_change: 'history',
}

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
  const overdue = data.confirmations.filter((c) => c.overdue)
  const headline = fieldsFor(SUMMARY_FIELDS, 'column')
  const detail = fieldsFor(SUMMARY_FIELDS, 'detail').filter((s) => !headline.includes(s))
  const roomRows = Object.values(data.room?.accounts ?? {}).filter((r) => accountView === 'combined' || r.account === accountView)
  const accountRows = data.accounts.filter((a) => accountView === 'combined' || a.account_type === accountView)
  const rising = (data.day_change_cad ?? data.total_gain_loss_cad) >= 0

  return (
    <div className="space-y-3 mb-4">
      <div className="bg-card border border-border rounded-lg px-6 py-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-end gap-x-8 gap-y-3 flex-wrap">
            {headline.map((spec) => (
              <Tile key={spec.id} spec={spec} summary={data} />
            ))}
            <div>
              <div className="text-xs text-muted-foreground mb-0.5" title="What the held stocks are expected to pay over the next 12 months">
                Expected income (12 months)
              </div>
              <div className="text-sm font-medium">{income == null ? '—' : formatCAD(income)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Holdings</div>
              <div className="text-sm font-medium">{holdings.data?.filter((h) => accountView === 'combined' || h.account_type === accountView).length ?? '—'}</div>
            </div>
          </div>
          <div className="w-40 h-10 shrink-0">
            <SparklineChart data={data.sparkline_30d} color={rising ? '#10b981' : '#ef4444'} height={40} />
          </div>
        </div>
        {data.unpriced.length > 0 && (
          <p role="status" className={cn('mt-3 text-xs flex items-center gap-1.5', TONE_TEXT.warning)}>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            No price recorded for {data.unpriced.join(', ')}; carried at cost.
          </p>
        )}
        {overdue.length > 0 && (
          <p role="status" className={cn('mt-2 text-xs flex items-center gap-1.5', TONE_TEXT.warning)}>
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            Not confirmed with the broker for a while: {overdue.map((c) => `${c.what} (${c.age_days} days)`).join('; ')}.
          </p>
        )}
        {data.room_error && <p className="mt-2 text-xs text-muted-foreground">Contribution room unavailable: {data.room_error}</p>}

        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-primary">Performance, tax and accounts</summary>
          <div className="mt-3 space-y-4">
            <FieldList fields={detail} row={data} />
            {accountRows.map((a) => (
              <section key={a.account_id} aria-label={`${a.account_type.toUpperCase()} account`}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">{a.account_type.toUpperCase()}</h3>
                <FieldList fields={ACCOUNT_FIELDS} row={a} />
              </section>
            ))}
            {roomRows.map((r) => (
              <section key={r.account} aria-label={`${r.account.toUpperCase()} contribution room`}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">{r.account.toUpperCase()} contribution room</h3>
                <FieldList fields={ROOM_FIELDS} row={r} />
                {r.events.length > 0 && (
                  <ul className="mt-2 text-xs space-y-0.5">
                    {r.events.map((e, i) => (
                      <li key={i}>{fieldsFor(ROOM_EVENT_FIELDS, 'column').map((s) => fieldText(s, e)).join(' · ')}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <p className="text-xs text-muted-foreground">Prices as of {formatDate(data.as_of)}.</p>
          </div>
        </details>
      </div>

      {accountView === 'combined' && (
        <div className="grid grid-cols-3 gap-3">
          {ACCOUNTS.map((acc) => {
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
                <div className={cn('text-xs mt-0.5', gainLossColor(a.gain_loss))}>
                  {formatCAD(a.gain_loss, { signed: true })}
                </div>
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
