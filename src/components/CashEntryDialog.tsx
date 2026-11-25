import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { useCashForm } from '@/components/ledger/CashForm'
import { LEDGER } from '@/lib/ledger-routes'
import type { AccountType } from '@/types/user'

interface CashEntryDialogProps {
  open: boolean
  onClose: () => void
  /** The account to start on (the switcher's, else the TFSA). */
  account?: AccountType
}

/** Record cash in or out of an account: a contribution, withdrawal, fee, interest or conversion. */
export function CashEntryDialog({ open, onClose, account }: CashEntryDialogProps) {
  return open ? <CashEntry onClose={onClose} account={account} /> : null
}

function CashEntry({ onClose, account }: { onClose: () => void; account?: AccountType }) {
  const form = useCashForm(account)
  return (
    <LedgerDialog open onClose={onClose} title="Record cash" body={form.body} previewRoute={LEDGER.eventsPreview} recordRoute={LEDGER.events} currency={form.currency} submitLabel="Record cash">
      {form.fields}
    </LedgerDialog>
  )
}
