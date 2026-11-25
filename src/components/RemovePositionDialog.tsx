import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { LEDGER } from '@/lib/ledger-routes'
import type { Holding } from '@/types/portfolio'

interface RemovePositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

/** Remove a position entered by mistake: the server reverses every entry of it. Confirm-only, there is nothing to review. */
export function RemovePositionDialog({ holding, onClose }: RemovePositionDialogProps) {
  if (!holding) return null
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title="Remove from Portfolio"
      body={undefined}
      params={{ id: holding.holding_id }}
      previewRoute={null}
      recordRoute={LEDGER.remove}
      submitLabel="Remove"
      destructive
    >
      <p className="text-sm text-muted-foreground">
        Remove <span className="font-medium text-foreground">{holding.stock.ticker}</span> ({holding.account_type.toUpperCase()}) from your portfolio? Every entry of the position is reversed; the history stays in Transactions.
      </p>
    </LedgerDialog>
  )
}
