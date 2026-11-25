/**
 * The dividends the system found for the portfolio: the ones waiting for the owner to confirm or dismiss, and (behind a toggle) the
 * ones already decided, which can be reopened. Columns and detail come from the dividend registry (`screens/portfolio/dividends.tsx`);
 * the dialogs of `DividendActionDialogs` record through the ledger shell. The list route has no account filter, so the account the
 * page is showing narrows it here.
 */
import { useMemo, useState } from 'react'
import { DividendActionDialogs, type DividendAction } from '@/components/ledger/DividendActionDialogs'
import { QueryError } from '@/components/QueryError'
import { RegistryTable } from '@/components/RegistryTable'
import { Button } from '@/components/ui/button'
import { useDividends } from '@/hooks/use-portfolio'
import { useRowActions } from '@/hooks/use-row-actions'
import { fieldsFor } from '@/lib/fields'
import { formatDate, localDateInputValue } from '@/lib/format'
import { filterByAccount, positionLabel } from '@/lib/portfolio'
import { DIVIDEND_FIELDS, type DividendEvent } from '@/screens/portfolio/dividends'
import type { PortfolioAccountView } from '@/types/portfolio'

const COLUMNS = fieldsFor(DIVIDEND_FIELDS, 'column')
const RIGHT = new Set(['gross', 'net'])
const labelOf = (e: DividendEvent) => `${positionLabel(e)} dividend`

export function DividendsToConfirm({ accountFilter = 'combined' }: { accountFilter?: PortfolioAccountView }) {
  const { data, isError, error, refetch } = useDividends()
  const actions = useRowActions<DividendEvent, DividendAction>()
  const [showDecided, setShowDecided] = useState(false)

  const events = useMemo(() => filterByAccount(data, accountFilter) ?? [], [data, accountFilter])
  const waiting = events.filter((e) => e.status === 'expected')
  const decided = events.filter((e) => e.status !== 'expected')

  if (isError) return <QueryError what="dividends" error={error} onRetry={refetch} compact />
  if (!data) return <div className="h-24 rounded-lg bg-muted animate-pulse" />

  const today = localDateInputValue()

  return (
    <section aria-label="Dividends" className="space-y-2">
      {waiting.length === 0 && <p className="text-sm text-muted-foreground">No dividends waiting for you.</p>}
      {waiting.length > 0 && (
        <>
          <h2 className="text-sm font-semibold">
            Dividends waiting for you <span className="text-xs font-normal text-muted-foreground">({waiting.length})</span>
          </h2>
          <RegistryTable
            columns={COLUMNS}
            rows={waiting}
            rowKey={(e) => e.event_id}
            rowLabel={labelOf}
            rightAligned={RIGHT}
            detail={DIVIDEND_FIELDS}
            actionsHeader="Decide"
            actions={(e) => {
              const notPaid = e.payment_date > today
              return (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={notPaid} title={notPaid ? `Pays on ${formatDate(e.payment_date)}` : undefined} aria-label={`Confirm ${labelOf(e)}`} onClick={() => actions.open('confirm', e)}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Dismiss ${labelOf(e)}`} onClick={() => actions.open('dismiss', e)}>
                    Dismiss
                  </Button>
                  {notPaid && <span className="text-xs text-muted-foreground">Pays {formatDate(e.payment_date)}</span>}
                </div>
              )
            }}
          />
        </>
      )}
      {decided.length > 0 && (
        <>
          <Button type="button" variant="ghost" size="sm" aria-expanded={showDecided} onClick={() => setShowDecided((v) => !v)}>
            {showDecided ? 'Hide' : 'Show'} decided dividends ({decided.length})
          </Button>
          {showDecided && (
            <RegistryTable
              columns={COLUMNS}
              rows={decided}
              rowKey={(e) => e.event_id}
              rowLabel={labelOf}
              rightAligned={RIGHT}
              detail={DIVIDEND_FIELDS}
              actionsHeader="Reopen"
              actions={(e) => (
                <Button size="sm" variant="outline" aria-label={`Reopen ${labelOf(e)}`} onClick={() => actions.open('reopen', e)}>
                  Reopen
                </Button>
              )}
            />
          )}
        </>
      )}
      <DividendActionDialogs actions={actions} />
    </section>
  )
}
