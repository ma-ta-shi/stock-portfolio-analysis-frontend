/**
 * Correct a ledger entry: the same form the entry was made with (trade or dividend), starting from the entry's own values,
 * reviewed with the server's preview and recorded as a reversal plus the replacement. The account and the stock stay (the API keeps
 * them); to change either, reverse the entry and record it again.
 */
import type { ReactNode } from 'react'
import { AccountTitle } from '@/components/ledger/AccountTitle'
import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { useDividendForm } from '@/components/ledger/DividendForm'
import { useTradeForm } from '@/components/ledger/TradeForm'
import type { LedgerForm } from '@/components/ledger/common-values'
import { TX_TYPE_LABELS } from '@/lib/labels'
import { correctionFamily, initialOf } from '@/lib/ledger-correction'
import { LEDGER } from '@/lib/ledger-routes'
import { formatDate, formatMoney } from '@/lib/format'
import type { Transaction } from '@/types/portfolio'

/** The replacement entry the form made: the forms wrap their entries for `events`, a correction sends the one entry. */
const entryOf = (body: unknown) => (body ? (body as { events: unknown[] }).events[0] : null)

function Shell({ t, form, onClose }: { t: Transaction; form: LedgerForm; onClose: () => void }) {
  const what: ReactNode = (
    <>
      Replaces the {TX_TYPE_LABELS[t.transaction_type].toLowerCase()} of {formatDate(t.transaction_date)}
      {t.stock ? ` in ${t.stock.ticker}` : ''} for {formatMoney(t.total_amount, t.currency)}. The original stays in the record, reversed.
    </>
  )
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title={
        <AccountTitle account={t.account_type}>
          Correct {TX_TYPE_LABELS[t.transaction_type].toLowerCase()}
        </AccountTitle>
      }
      summary={<p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{what}</p>}
      body={entryOf(form.body)}
      params={{ id: t.transaction_id }}
      previewRoute={LEDGER.correctPreview}
      recordRoute={LEDGER.correct}
      currency={form.currency}
      submitLabel="Replace entry"
    >
      {form.fields}
    </LedgerDialog>
  )
}

function TradeCorrection({ t, onClose }: { t: Transaction; onClose: () => void }) {
  const form = useTradeForm({
    kind: t.transaction_type as 'buy' | 'sell' | 'opening_balance' | 'drip',
    ticker: t.stock?.ticker ?? '',
    currency: t.currency,
    account: t.account_type,
    initial: initialOf(t),
  })
  return <Shell t={t} form={form} onClose={onClose} />
}

function DividendCorrection({ t, onClose }: { t: Transaction; onClose: () => void }) {
  const form = useDividendForm({ account: t.account_type, ticker: t.stock?.ticker ?? '', currency: t.currency, initial: initialOf(t) })
  return <Shell t={t} form={form} onClose={onClose} />
}

export function CorrectEntryDialog({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  if (!transaction) return null
  switch (correctionFamily(transaction.transaction_type)) {
    case 'trade':
      return <TradeCorrection t={transaction} onClose={onClose} />
    case 'dividend':
      return <DividendCorrection t={transaction} onClose={onClose} />
    default:
      return null
  }
}
