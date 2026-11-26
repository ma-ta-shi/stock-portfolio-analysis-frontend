import { ConfirmDialog } from '@/components/ConfirmDialog'

/** Asked before unsaved changes would be lost: on leaving the page, and on switching profile. */
export function DiscardChangesDialog({ open, onStay, onDiscard }: { open: boolean; onStay: () => void; onDiscard: () => void }) {
  return (
    <ConfirmDialog open={open} title="Discard unsaved changes?" confirmLabel="Discard changes" cancelLabel="Keep editing" destructive onCancel={onStay} onConfirm={onDiscard}>
      Your changes on this page have not been saved.
    </ConfirmDialog>
  )
}
