import type { ReactNode } from 'react'
import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import type { LedgerRoute } from '@/lib/ledger-routes'

interface ConfirmActionDialogProps {
  title: ReactNode
  /** What will happen, in words. */
  children: ReactNode
  route: LedgerRoute
  /** The placeholders of the route (`{ id: ... }`). */
  params?: Record<string, string>
  submitLabel: string
  destructive?: boolean
  onClose: () => void
}

/**
 * An action with nothing to review: remove a position, reverse an entry, dismiss or reopen a dividend. The owner confirms, the server
 * does it, and the shell shows what was recorded. One dialog for all of them; the callers only say what it does and which route it is.
 */
export function ConfirmActionDialog({ title, children, route, params, submitLabel, destructive = false, onClose }: ConfirmActionDialogProps) {
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title={title}
      body={undefined}
      params={params}
      previewRoute={null}
      recordRoute={route}
      submitLabel={submitLabel}
      destructive={destructive}
    >
      <p className="text-sm text-muted-foreground">{children}</p>
    </LedgerDialog>
  )
}
