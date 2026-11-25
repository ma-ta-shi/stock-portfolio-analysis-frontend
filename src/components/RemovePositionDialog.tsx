import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRemoveFromPortfolio } from '@/hooks/use-portfolio'
import { getErrorMessage } from '@/lib/api'
import type { Holding } from '@/types/portfolio'

interface RemovePositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

/** Remove a position entered by mistake. (Not connected yet: the next PR gives it the real route and the shared shell.) */
export function RemovePositionDialog({ holding, onClose }: RemovePositionDialogProps) {
  const remove = useRemoveFromPortfolio()

  async function handleConfirm() {
    if (!holding) return
    try {
      await remove.mutateAsync(holding.holding_id)
      onClose()
    } catch {
      // Shown from remove.error below.
    }
  }

  return (
    <Dialog open={holding !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove from Portfolio</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Remove <span className="font-medium text-foreground">{holding?.stock.ticker}</span> ({holding?.account_type.toUpperCase()}) from your portfolio?
        </p>
        {remove.isError && (
          <p role="alert" className="text-xs text-destructive">
            {getErrorMessage(remove.error)}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={remove.isPending}>
            {remove.isPending ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
