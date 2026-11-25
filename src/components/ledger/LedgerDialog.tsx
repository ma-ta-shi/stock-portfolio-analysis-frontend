import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LedgerPanel, type LedgerPanelProps } from '@/components/ledger/LedgerPanel'

interface LedgerDialogProps extends Omit<LedgerPanelProps, 'onDone'> {
  open: boolean
  onClose: () => void
  title: ReactNode
}

/** A `Dialog` around a `LedgerPanel`: opens, shows the form, closes when cancelled or when the recording is closed. */
export function LedgerDialog({ open, onClose, title, ...panel }: LedgerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <LedgerPanel {...panel} onDone={onClose} />
      </DialogContent>
    </Dialog>
  )
}
