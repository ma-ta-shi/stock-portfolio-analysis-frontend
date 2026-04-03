import { useState } from 'react'
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
import { useTickerSearch, type TickerResult } from '@/hooks/use-ticker-search'
import { useAddToWatchlist } from '@/hooks/use-watchlist'
import { useAddToPortfolio } from '@/hooks/use-portfolio'

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
  const [accountType, setAccountType] = useState<'tfsa' | 'rrsp' | 'trading'>('tfsa')

  const tickerSearch = useTickerSearch()
  const addToWatchlist = useAddToWatchlist()
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setNotFound(false)
    const result = await tickerSearch.mutateAsync(query)
    if (result) {
      setFound(result)
      setStep('found')
    } else {
      setNotFound(true)
    }
  }

  function handleBack() {
    setStep('search')
    setFound(null)
    tickerSearch.reset()
  }

  async function handleConfirm() {
    if (!found) return
    if (mode === 'watchlist') {
      await addToWatchlist.mutateAsync(found)
    } else {
      const sharesNum = parseFloat(shares)
      const avgCostNum = parseFloat(avgCost)
      if (!sharesNum || !avgCostNum) return
      await addToPortfolio.mutateAsync({
        stock: found,
        shares: sharesNum,
        average_cost_basis: avgCostNum,
        account_type: accountType,
      })
    }
    handleClose()
  }

  const isSearching = tickerSearch.isPending
  const isAdding = addToWatchlist.isPending || addToPortfolio.isPending
  const sharesNum = parseFloat(shares)
  const avgCostNum = parseFloat(avgCost)
  const canConfirm = mode === 'portfolio' ? sharesNum > 0 && avgCostNum > 0 : true

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
              <label className="text-sm font-medium">Ticker or company name</label>
              <div className="flex gap-2">
                <Input
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
                <p className="text-sm text-destructive flex items-center gap-1.5 pt-0.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  No match found for &ldquo;{query}&rdquo;. Try a different ticker or name.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            </div>
          </form>
        )}

        {step === 'found' && found && (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4 space-y-2.5 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">{found.ticker}</p>
                  <p className="text-sm text-muted-foreground">{found.name}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
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
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Shares</label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 50"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Avg cost ({found.currency})</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        className="pl-7"
                        value={avgCost}
                        onChange={(e) => setAvgCost(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Account</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as typeof accountType)}
                    className="w-full py-2 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="tfsa">TFSA</option>
                    <option value="rrsp">RRSP</option>
                    <option value="trading">Trading</option>
                  </select>
                </div>
                {sharesNum > 0 && avgCostNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Book cost:{' '}
                    {found.currency} ${(sharesNum * avgCostNum).toLocaleString('en-CA', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={isAdding || !canConfirm}>
                  {isAdding
                    ? 'Adding…'
                    : mode === 'watchlist'
                    ? 'Add to Watchlist'
                    : 'Add to Portfolio'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
