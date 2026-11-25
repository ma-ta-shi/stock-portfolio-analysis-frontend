/**
 * The Watchlist: the original table, drawn by the shared `RegistryTable` from `screens/watchlist`, with sort headers, a row that
 * opens the stock page, View and Remove, and Add Stock.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { AddStockDialog } from '@/components/AddStockDialog'
import { QueryError } from '@/components/QueryError'
import { RegistryTable } from '@/components/RegistryTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRemoveFromWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { getErrorMessage } from '@/lib/api'
import { fieldsFor, sortRows, type SortDir } from '@/lib/fields'
import { TONE_TEXT } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { watchlistCounts } from '@/lib/watchlist'
import { WATCHLIST_FIELDS, WATCHLIST_SORTABLE } from '@/screens/watchlist'
import type { WatchlistItem } from '@/types/watchlist'

const COLUMNS = fieldsFor(WATCHLIST_FIELDS, 'column')

export function WatchlistPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useWatchlist()
  const [sort, setSort] = useState<{ id: string; dir: SortDir }>({ id: 'expected_return', dir: 'desc' })
  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<WatchlistItem | null>(null)
  const removeFromWatchlist = useRemoveFromWatchlist()

  async function handleConfirmRemove() {
    if (!removing) return
    try {
      await removeFromWatchlist.mutateAsync(removing.watchlist_id)
      setRemoving(null)
    } catch {
      // Shown from removeFromWatchlist.error in the dialog.
    }
  }

  function closeRemoveDialog() {
    setRemoving(null)
    removeFromWatchlist.reset()
  }

  const sortBy = COLUMNS.find((c) => c.id === sort.id)!
  const items = data ? sortRows(data, sortBy, sort.dir) : []
  const counts = data ? watchlistCounts(data) : null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Watchlist</h1>
        <div className="flex flex-wrap items-center gap-4">
          {counts && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{counts.total} stocks</span>
              <span className={cn(TONE_TEXT.positive, 'font-medium')}>{counts.bullish} bullish</span>
              {counts.awaiting > 0 && <span>{counts.awaiting} awaiting analysis</span>}
              {counts.changed > 0 && (
                <span className={TONE_TEXT.info} title="The outlook differs from the analysis before">
                  {counts.changed} changed
                </span>
              )}
            </div>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Add Stock
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      ) : isError ? (
        <QueryError what="watchlist" error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <div className="border border-border rounded-lg py-10 text-center space-y-3">
          <p className="text-muted-foreground text-sm">Your watchlist is empty.</p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Add your first stock
          </Button>
        </div>
      ) : (
        <RegistryTable
          dense
          columns={COLUMNS}
          rows={items}
          rowKey={(i) => i.watchlist_id}
          rowLabel={(i) => i.stock.ticker}
          detail={WATCHLIST_FIELDS}
          sort={{
            ids: WATCHLIST_SORTABLE,
            ...sort,
            onSort: (id) => setSort((s) => ({ id, dir: s.id === id && s.dir === 'desc' ? 'asc' : 'desc' })),
          }}
          onOpen={(i) => navigate(`/stocks/${i.stock.stock_id}`)}
          openLabel={(i) => `View ${i.stock.ticker}`}
          actions={(i) => (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" aria-label={`View ${i.stock.ticker}`} onClick={() => navigate(`/stocks/${i.stock.stock_id}`)}>
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                title="Remove from watchlist"
                aria-label={`Remove ${i.stock.ticker} from watchlist`}
                onClick={() => setRemoving(i)}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        />
      )}

      <AddStockDialog mode="watchlist" open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open) closeRemoveDialog() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from Watchlist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">{removing?.stock.ticker}</span> ({removing?.stock.name}) from your
            watchlist?
          </p>
          {removeFromWatchlist.isError && (
            <p role="alert" className="text-xs text-destructive">
              {getErrorMessage(removeFromWatchlist.error, { write: true })}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={closeRemoveDialog}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={removeFromWatchlist.isPending}>
              {removeFromWatchlist.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
