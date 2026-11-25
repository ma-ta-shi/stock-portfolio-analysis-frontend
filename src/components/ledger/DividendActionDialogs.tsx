import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { ConfirmDividendDialog } from '@/components/ConfirmDividendDialog'
import type { RowActions } from '@/hooks/use-row-actions'
import { LEDGER } from '@/lib/ledger-routes'
import { positionLabel } from '@/lib/portfolio'
import type { DividendEvent } from '@/screens/portfolio/dividends'

export type DividendAction = 'confirm' | 'dismiss' | 'reopen'
export type DividendActions = RowActions<DividendEvent, DividendAction>

/** The dialog for the open action on a dividend the system found (`useRowActions<DividendEvent, DividendAction>()`). */
export function DividendActionDialogs({ actions }: { actions: DividendActions }) {
  const { current, close } = actions
  if (!current) return null
  const { action, row: event } = current
  const key = `${action}-${event.event_id}`
  const params = { id: event.event_id }
  const what = positionLabel(event)
  if (action === 'confirm') return <ConfirmDividendDialog key={key} event={event} onClose={close} />
  if (action === 'dismiss')
    return (
      <ConfirmActionDialog key={key} title="Dismiss dividend" route={LEDGER.dividendDismiss} params={params} submitLabel="Dismiss" onClose={close}>
        Dismiss the {what} dividend: it was not received, or it is already in the record. It is not found again unless you reopen it.
      </ConfirmActionDialog>
    )
  return (
    <ConfirmActionDialog key={key} title="Reopen dividend" route={LEDGER.dividendReopen} params={params} submitLabel="Reopen" onClose={close}>
      Take back the decision on the {what} dividend so it can be decided again.
      {event.status === 'confirmed' ? ' Its dividend and reinvestment entries are reversed (they stay in the record).' : ''}
    </ConfirmActionDialog>
  )
}
