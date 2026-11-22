import { useState, type FormEvent } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { useTickerSearch, type TickerResult } from '@/hooks/use-ticker-search'
import { useAddToWatchlist, useWatchlist } from '@/hooks/use-watchlist'
import { useAddToPortfolio } from '@/hooks/use-portfolio'
import { getErrorMessage } from '@/lib/api'
import { formatMoney, parseAmount } from '@/lib/format'
import { TONE_TEXT } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { AccountType } from '@/types'

type Step = 'search' | 'found'

interface AddStockDialogProps {
  mode: 'watchlist' | 'portfolio'
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-populate with a known stock and skip the search step entirely */
  defaultStock?: TickerResult
}

export function AddStockDialog({ mode, open, onOpenChange, defaultStock }: AddStockDialogProps) {
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<Step>(() => defaultStock ? 'found' : 'search')
  const [found, setFound] = useState<TickerResult | null>(() => defaultStock ?? null)
  const [notFound, setNotFound] = useState(false)
  const [shares, setShares] = useState('')
  const [avgCost, setAvgCost] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('tfsa')

  const tickerSearch = useTickerSearch()
  const addToWatchlist = useAddToWatchlist()
  // Only needed for the duplicate check, so only fetched while adding to the watchlist.
  const { data: watchlist } = useWatchlist({ enabled: open && mode === 'watchlist' })
  const addToPortfolio = useAddToPortfolio()

  function reset() {
    setQuery('')
    setStep(defaultStock ? 'found' : 'search')
    setFound(defaultStock ?? null)
    setNotFound(false)
    setShares('')
    setAvgCost('')
    setAccountType('tfsa')
    tickerSearch.reset()
    addToWatchlist.reset()
    addToPortfolio.reset()
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

  const isSearching = tickerSearch.isPending
  const isAdding = addToWatchlist.isPending || addToPortfolio.isPending
  const addError = addToWatchlist.error ?? addToPortfolio.error
  const sharesNum = parseAmount(shares)
  const avgCostNum = parseAmount(avgCost)
  // A stock can be held in several accounts, but appears on the watchlist only once.
  const alreadyWatched =
    mode === 'watchlist' && !!found && !!watchlist?.data.some((i) => i.stock.stock_id === found.stock_id)
  const canConfirm = mode === 'portfolio' ? sharesNum > 0 && avgCostNum > 0 : !alreadyWatched

  async function handleConfirm(e: FormEvent) {
    e.preventDefault()
    if (!found || !canConfirm) return
    try {
      if (mode === 'watchlist') {
        await addToWatchlist.mutateAsync(found)
      } else {
        await addToPortfolio.mutateAsync({
          stock: found,
          shares: sharesNum,
          average_cost_basis: avgCostNum,
          account_type: accountType,
        })
      }
      handleClose()
    } catch {
      // Shown from addError below; keep the dialog open.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'watchlist' ? 'Add to Watchlist' : 'Add to Portfolio'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="add-stock-query" className="text-sm font-medium">Ticker or company name</label>
              <div className="flex gap-2">
                <Input
                  id="add-stock-query"
                  placeholder="e.g. RY.TO or Royal Bank"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setNotFound(false) }}
                  autoFocus
                />
                <Button type="submit" disabled={!query.trim() || isSearching}>
                  {isSearching ? 'Looking up…' : 'Look up'}
                </Button>
              </div>
              {notFound && (
                <p role="alert" className="text-sm text-destructive flex items-center gap-1.5 pt-0.5">
                  <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  No match found for &ldquo;{query}&rdquo;. Try a different ticker or name.
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

        {step === 'found' && found && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="border border-border rounded-lg p-4 space-y-2.5 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{found.ticker}</p>
                  <p className="text-sm text-muted-foreground">{found.name}</p>
                </div>
                <CheckCircle2 className={cn('w-5 h-5 shrink-0 mt-0.5', TONE_TEXT.positive)} aria-hidden="true" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{found.exchange}</Badge>
                <Badge variant="outline">{found.sector}</Badge>
                <Badge variant="outline">{found.currency}</Badge>
              </div>
            </div>

            {mode === 'portfolio' && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Your position</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Shares">
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        placeholder="e.g. 50"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        autoFocus
                      />
                    )}
                  </FormField>
                  <FormField label={`Avg cost (${found.currency})`}>
                    {(id) => (
                      <MoneyInput
                        id={id}
                        placeholder="0.00"
                        value={avgCost}
                        onChange={(e) => setAvgCost(e.target.value)}
                      />
                    )}
                  </FormField>
                </div>
                <FormField label="Account">
                  {(id) => (
                    <select
                      id={id}
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as AccountType)}
                      className="w-full py-2 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="tfsa">TFSA</option>
                      <option value="rrsp">RRSP</option>
                      <option value="trading">Trading</option>
                    </select>
                  )}
                </FormField>
                {sharesNum > 0 && avgCostNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Book cost: {formatMoney(sharesNum * avgCostNum, found.currency)}
                  </p>
                )}
              </div>
            )}

            {alreadyWatched && (
              <p role="status" className="text-sm text-muted-foreground">
                {found.ticker} is already on your watchlist.
              </p>
            )}

            {addError && (
              <p role="alert" className="text-sm text-destructive">
                {getErrorMessage(addError)}
              </p>
            )}

            <div className="flex justify-between pt-1">
              <Button type="button" variant="ghost" onClick={handleBack}>Back</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isAdding || !canConfirm}>
                  {isAdding
                    ? 'Adding…'
                    : mode === 'watchlist'
                    ? 'Add to Watchlist'
                    : 'Add to Portfolio'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
