import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { CorrectEntryDialog } from '@/components/CorrectEntryDialog'
import type { RowActions } from '@/hooks/use-row-actions'
import { formatDate, formatMoney } from '@/lib/format'
import { TX_TYPE_LABELS } from '@/lib/labels'
import { LEDGER } from '@/lib/ledger-routes'
import type { Transaction } from '@/types/portfolio'

export type TransactionAction = 'correct' | 'reverse'
export type TransactionActions = RowActions<Transaction, TransactionAction>

/** The dialog for the open action on a ledger entry (`useRowActions<Transaction, TransactionAction>()`), rendered once by the Transactions tab. */
export function TransactionActionDialogs({ actions }: { actions: TransactionActions }) {
  const { current, close } = actions
  if (!current) return null
  const { action, row: t } = current
  const key = `${action}-${t.transaction_id}`
  if (action === 'correct') return <CorrectEntryDialog key={key} transaction={t} onClose={close} />
  return (
    <ConfirmActionDialog key={key} title="Reverse entry" route={LEDGER.reverse} params={{ id: t.transaction_id }} submitLabel="Reverse entry" destructive onClose={close}>
      Reverse the {TX_TYPE_LABELS[t.transaction_type].toLowerCase()} of {formatDate(t.transaction_date)}
      {t.stock ? ` in ${t.stock.ticker}` : ''} for {formatMoney(t.total_amount, t.currency)}? A correcting row is added and the original stays in the record.
      {t.move_id ? ' This entry is one leg of a move, so reversing it reverses the whole move.' : ''}
    </ConfirmActionDialog>
  )
}
