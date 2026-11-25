import { useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FieldList } from '@/components/FieldList'
import { LedgerPanel } from '@/components/ledger/LedgerPanel'
import { useTradeForm } from '@/components/ledger/TradeForm'
import { useTickerSearch, type TickerResult } from '@/hooks/use-ticker-search'
import { useAddToWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { getErrorMessage } from '@/lib/api'
import { LEDGER } from '@/lib/ledger-routes'
import { TONE_TEXT } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { LOOKUP_FIELDS } from '@/screens/portfolio/lookup'

type Step = 'search' | 'found'

interface AddStockDialogProps {
  mode: 'watchlist' | 'portfolio'
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-populate with a known stock and skip the search step entirely */
  defaultStock?: TickerResult
}

/** The stock the search found: the lookup's own fields when there are any, else the few the mock list has. */
function FoundCard({ found }: { found: TickerResult }) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-2.5 bg-muted/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-base">{found.ticker}</p>
          <p className="text-sm text-muted-foreground">{found.name}</p>
        </div>
        <CheckCircle2 className={cn('w-5 h-5 shrink-0 mt-0.5', TONE_TEXT.positive)} aria-hidden="true" />
      </div>
      {found.lookup ? (
        <FieldList fields={LOOKUP_FIELDS.filter((f) => f.id !== 'ticker' && f.id !== 'name')} row={found.lookup} className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs" />
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{found.exchange}</Badge>
          {found.sector && <Badge variant="outline">{found.sector}</Badge>}
          <Badge variant="outline">{found.currency}</Badge>
        </div>
      )}
    </div>
  )
}

/** Portfolio step 2: how the stock came to be held, then the trade form, reviewed and recorded through the shared shell. */
function PortfolioEntry({ found, summary, onDone }: { found: TickerResult; summary: ReactNode; onDone: () => void }) {
  const [kind, setKind] = useState<'buy' | 'opening_balance'>('buy')
  const form = useTradeForm({ kind, ticker: found.ticker, currency: found.currency })
  return (
    <LedgerPanel
      summary={
        <>
          {summary}
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Your position</legend>
            {(
              [
                ['buy', 'I bought it', 'Takes the cash from the account'],
                ['opening_balance', 'I already hold it', 'Records what you hold, with no cash taken'],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="radio" name="add-stock-kind" className="mt-1" checked={kind === value} onChange={() => setKind(value)} />
                <span>
                  {label} <span className="text-xs text-muted-foreground">({hint})</span>
                </span>
              </label>
            ))}
          </fieldset>
        </>
      }
      body={form.body}
      previewRoute={LEDGER.eventsPreview}
      recordRoute={LEDGER.events}
      currency={form.currency}
      submitLabel={kind === 'buy' ? 'Buy shares' : 'Add to Portfolio'}
      onDone={onDone}
    >
      {form.fields}
    </LedgerPanel>
  )
}

export function AddStockDialog({ mode, open, onOpenChange, defaultStock }: AddStockDialogProps) {
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<Step>(() => (defaultStock ? 'found' : 'search'))
  const [found, setFound] = useState<TickerResult | null>(() => defaultStock ?? null)
  const [notFound, setNotFound] = useState(false)

  const tickerSearch = useTickerSearch()
  const addToWatchlist = useAddToWatchlist()
  // Only needed for the duplicate check, so only fetched while adding to the watchlist.
  const { data: watchlist } = useWatchlist({ enabled: open && mode === 'watchlist' })

  function reset() {
    setQuery('')
    setStep(defaultStock ? 'found' : 'search')
    setFound(defaultStock ?? null)
    setNotFound(false)
    tickerSearch.reset()
    addToWatchlist.reset()
  }

  function handleClose() {
    onOpenChange(false)
    reset()
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setNotFound(false)
    try {
      const result = await tickerSearch.mutateAsync(query)
      if (result) {
        setFound(result)
        setStep('found')
      } else {
        setNotFound(true)
      }
    } catch {
      // Shown from tickerSearch.error below.
    }
  }

  function handleBack() {
    setStep('search')
    setFound(null)
    tickerSearch.reset()
  }

  // A stock can be held in several accounts, but appears on the watchlist only once.
  const alreadyWatched = mode === 'watchlist' && !!found && !!watchlist?.data.some((i) => i.stock.stock_id === found.stock_id)

  async function handleWatch(e: FormEvent) {
    e.preventDefault()
    if (!found || alreadyWatched) return
    try {
      await addToWatchlist.mutateAsync(found)
      handleClose()
    } catch {
      // Shown from addToWatchlist.error below; keep the dialog open.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'watchlist' ? 'Add to Watchlist' : 'Add to Portfolio'}</DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="add-stock-query" className="text-sm font-medium">Ticker</label>
              <div className="flex gap-2">
                <Input
                  id="add-stock-query"
                  placeholder="e.g. RY.TO"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setNotFound(false) }}
                  autoFocus
                />
                <Button type="submit" disabled={!query.trim() || tickerSearch.isPending}>
                  {tickerSearch.isPending ? 'Looking up…' : 'Look up'}
                </Button>
              </div>
              {notFound && (
                <p role="alert" className="text-sm text-destructive flex items-center gap-1.5 pt-0.5">
                  <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  No match found for &ldquo;{query}&rdquo;. Check the ticker (Canadian stocks end in .TO).
                </p>
              )}
              {tickerSearch.isError && (
                <p role="alert" className="text-sm text-destructive pt-0.5">
                  Lookup failed: {getErrorMessage(tickerSearch.error)}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            </div>
          </form>
        )}

        {step === 'found' && found && mode === 'portfolio' && (
          <PortfolioEntry
            key={found.ticker}
            found={found}
            onDone={handleClose}
            summary={
              <>
                <FoundCard found={found} />
                {found.pipeline_supported === false && (
                  <p role="status" className="text-xs text-muted-foreground">
                    The app does not analyse this security{found.unsupported_reason ? ` (${found.unsupported_reason})` : ''}. You can still record it.
                  </p>
                )}
                {!defaultStock && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                )}
              </>
            }
          />
        )}

        {step === 'found' && found && mode === 'watchlist' && (
          <form onSubmit={handleWatch} className="space-y-4">
            <FoundCard found={found} />
            {alreadyWatched && (
              <p role="status" className="text-sm text-muted-foreground">
                {found.ticker} is already on your watchlist.
              </p>
            )}
            {addToWatchlist.error && (
              <p role="alert" className="text-sm text-destructive">
                {getErrorMessage(addToWatchlist.error)}
              </p>
            )}
            <div className="flex justify-between pt-1">
              <Button type="button" variant="ghost" onClick={handleBack}>Back</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={addToWatchlist.isPending || alreadyWatched}>
                  {addToWatchlist.isPending ? 'Adding…' : 'Add to Watchlist'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
