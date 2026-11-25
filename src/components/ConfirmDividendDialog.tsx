import { AccountTitle } from '@/components/ledger/AccountTitle'
import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { useDividendDecisionForm } from '@/components/ledger/DividendForm'
import { SummaryCells } from '@/components/ledger/PositionSummary'
import { formatDate, formatMoney } from '@/lib/format'
import { LEDGER } from '@/lib/ledger-routes'
import type { DividendEvent } from '@/screens/portfolio/dividends'

/**
 * Confirm a dividend the system found: accept the calculated figures (leave everything blank) or type over what differs from the
 * broker's statement. The server's preview shows the cash and the position after, and warns of a probable duplicate.
 */
export function ConfirmDividendDialog({ event, onClose }: { event: DividendEvent | null; onClose: () => void }) {
  return event ? <ConfirmDividend event={event} onClose={onClose} /> : null
}

function ConfirmDividend({ event, onClose }: { event: DividendEvent; onClose: () => void }) {
  const form = useDividendDecisionForm(event)
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title={
        <AccountTitle account={event.account_type}>
          Confirm dividend {event.stock.ticker}
        </AccountTitle>
      }
      summary={
        <SummaryCells
          cells={[
            { label: 'Ex-date', value: formatDate(event.ex_date) },
            { label: 'Shares then', value: event.shares_at_ex },
            { label: 'Expected net', value: formatMoney(event.expected_net, event.currency) },
          ]}
        />
      }
      body={form.body}
      params={{ id: event.event_id }}
      previewRoute={LEDGER.dividendPreview}
      recordRoute={LEDGER.dividendConfirm}
      currency={form.currency}
      submitLabel="Confirm dividend"
    >
      {form.fields}
    </LedgerDialog>
  )
}
