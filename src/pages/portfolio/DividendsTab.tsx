/**
 * The Dividends tab: what was received and what is expected over 30 days, the dividends waiting for the owner, and the history of
 * dividend and reinvestment rows.
 */
import { DividendsToConfirm } from './DividendsToConfirm'
import { LedgerTable } from '@/components/ledger/LedgerTable'
import { QueryError } from '@/components/QueryError'
import { useDividends, useDividendsReceived, useTransactionHistory } from '@/hooks/use-portfolio'
import { useFxRates } from '@/hooks/use-fx-rates'
import { dayFromToday, formatCAD, localDateInputValue } from '@/lib/format'
import { sumInCad } from '@/lib/fx'
import { filterByAccount } from '@/lib/portfolio'
import { EMPTY_FILTERS } from '@/lib/transactions'
import type { PortfolioAccountView } from '@/types/portfolio'

function Tile({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-xs text-muted-foreground mb-0.5" title={tooltip}>
        {label}
      </div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  )
}

export function DividendsTab({ accountFilter = 'combined' }: { accountFilter?: PortfolioAccountView }) {
  const received = useDividendsReceived(accountFilter)
  const events = useDividends()
  const { rates } = useFxRates()
  const history = useTransactionHistory(EMPTY_FILTERS, accountFilter)

  const today = localDateInputValue()
  const horizon = dayFromToday(30)
  const upcoming = filterByAccount(events.data, accountFilter)?.filter((e) => e.status === 'expected' && e.payment_date >= today && e.payment_date <= horizon)
  const expected = upcoming && sumInCad(upcoming.map((e) => ({ amount: e.expected_net, currency: e.currency })), rates)
  const rows = filterByAccount(history.data, accountFilter)?.filter((t) => t.transaction_type === 'dividend' || t.transaction_type === 'drip')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Dividends received (past 30 days)"
          tooltip="After tax withheld, in Canadian dollars"
          value={received.isError ? 'unavailable' : received.data == null ? '—' : formatCAD(received.data)}
        />
        <Tile
          label="Dividends expected (next 30 days)"
          tooltip="Dividends the system has found that pay within 30 days, after tax. A dividend is found only after its ex-date, so later ones may be missing."
          value={!expected ? '—' : expected.missingCurrencies.length ? 'unavailable' : formatCAD(expected.total)}
        />
      </div>

      <DividendsToConfirm accountFilter={accountFilter} />

      <section aria-label="Dividend history" className="space-y-2">
        <h2 className="text-sm font-semibold">Dividend history</h2>
        {history.isError ? (
          <QueryError what="dividend history" error={history.error} onRetry={history.refetch} compact />
        ) : !rows ? (
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dividends recorded yet.</p>
        ) : (
          <LedgerTable rows={rows} />
        )}
      </section>
    </div>
  )
}
