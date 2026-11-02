import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { usePortfolioSummary } from '@/hooks/use-portfolio'
import {
  useAllocationAnalysis,
  type AllocationAccountPreference,
} from '@/hooks/use-allocation-analysis'
import { QueryError } from '@/components/QueryError'
import { getErrorMessage } from '@/lib/api'
import { safeStorage } from '@/lib/storage'
import { SparklineChart } from '@/components/SparklineChart'
import { AddStockDialog } from '@/components/AddStockDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { HoldingsTable } from './portfolio/HoldingsTable'
import { AllocationCharts } from './portfolio/AllocationCharts'
import { PortfolioOptimizerSection } from './portfolio/PortfolioOptimizerSection'
import { TransactionsTab } from './portfolio/TransactionsTab'
import { formatCAD, formatPct, parseAmount } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { PortfolioAccountView } from '@/types'

const ACCOUNT_VIEW_STORAGE_KEY = 'portfolio_account_view'

const ACCOUNT_TABS: { value: PortfolioAccountView; label: string }[] = [
  { value: 'combined', label: 'Combined' },
  { value: 'tfsa', label: 'TFSA' },
  { value: 'rrsp', label: 'RRSP' },
  { value: 'trading', label: 'Trading' },
]

function getSessionAccount(): PortfolioAccountView {
  const stored = safeStorage.session.get(ACCOUNT_VIEW_STORAGE_KEY)
  return ACCOUNT_TABS.find((t) => t.value === stored)?.value ?? 'combined'
}

function SummaryHeader({
  accountView,
  onAccountChange,
}: {
  accountView: PortfolioAccountView
  onAccountChange: (v: PortfolioAccountView) => void
}) {
  const { data, isLoading, isError, error, refetch } = usePortfolioSummary()

  if (isLoading) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse mb-4" />
  }
  if (isError) {
    return <QueryError what="portfolio summary" error={error} onRetry={refetch} className="mb-4" />
  }
  if (!data) return null

  const isCombined = accountView === 'combined'
  const acct = !isCombined ? data.by_account?.[accountView] : null
  const value = acct?.value ?? data.total_value_cad
  const unrealizedGainLoss = acct?.gain_loss ?? data.total_gain_loss_cad
  const unrealizedGainPct = acct?.gain_loss_pct ?? data.total_gain_loss_pct
  const dayPositive = data.day_change_cad >= 0

  const hasRealizedData = data.total_realized_gain_loss_cad != null

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-6 py-4">
        <div className="flex items-end gap-8 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">
              {isCombined ? 'Total Value' : `${accountView.toUpperCase()} Value`}
            </div>
            <div className="text-2xl font-semibold tracking-tight">{formatCAD(value)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Unrealized</div>
            <div className={cn('text-sm font-medium', gainLossColor(unrealizedGainLoss))}>
              {formatCAD(unrealizedGainLoss, { signed: true })} ({formatPct(unrealizedGainPct)})
            </div>
          </div>
          {isCombined && hasRealizedData && (
            <>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Realized</div>
                <div className={cn('text-sm font-medium', gainLossColor(data.total_realized_gain_loss_cad ?? 0))}>
                  {formatCAD(data.total_realized_gain_loss_cad, { signed: true })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Total Return</div>
                <div className={cn('text-sm font-medium', gainLossColor(data.total_return_cad ?? 0))}>
                  {formatCAD(data.total_return_cad, { signed: true })} ({formatPct(data.total_return_pct)})
                </div>
              </div>
              {data.total_dividends_received_cad != null && (
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Dividends Received</div>
                  <div className="text-sm font-medium">{formatCAD(data.total_dividends_received_cad)}</div>
                </div>
              )}
            </>
          )}
          {isCombined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Today</div>
              <div className={cn('text-sm font-medium', gainLossColor(data.day_change_cad))}>
                {formatCAD(data.day_change_cad, { signed: true })} ({formatPct(data.day_change_pct)})
              </div>
            </div>
          )}
          {data.annual_dividend_income_estimate_cad != null && isCombined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Annual Div Est.</div>
              <div className="text-sm font-medium">
                {formatCAD(data.annual_dividend_income_estimate_cad)}/yr
              </div>
            </div>
          )}
          {data.dividend_by_account?.[accountView] != null && !isCombined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Annual Dividends</div>
              <div className="text-sm font-medium">
                {formatCAD(data.dividend_by_account[accountView])}/yr
              </div>
            </div>
          )}
          {data.holdings_count != null && isCombined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Holdings</div>
              <div className="text-sm font-medium">{data.holdings_count}</div>
            </div>
          )}
        </div>
        {isCombined && (
          <div className="w-40 h-10 shrink-0">
            <SparklineChart
              data={data.sparkline_30d}
              color={dayPositive ? '#10b981' : '#ef4444'}
              height={40}
            />
          </div>
        )}
      </div>

      {/* Per-account breakdown cards (Combined only) */}
      {isCombined && data.by_account && (
        <div className="grid grid-cols-3 gap-3">
          {(['tfsa', 'rrsp', 'trading'] as const).map((acc) => {
            const a = data.by_account?.[acc]
            if (!a) return null
            return (
              <button
                type="button"
                key={acc}
                onClick={() => onAccountChange(acc)}
                aria-label={`Show ${acc.toUpperCase()} account`}
                className="bg-card border border-border rounded-lg px-4 py-3 text-left hover:border-primary transition-colors"
              >
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {acc.toUpperCase()}
                </div>
                <div className="text-base font-semibold">{formatCAD(a.value)}</div>
                <div className={cn('text-xs mt-0.5', gainLossColor(a.gain_loss))}>
                  {formatCAD(a.gain_loss, { signed: true })} ({formatPct(a.gain_loss_pct)})
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AvailableToTradeWidget() {
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState<AllocationAccountPreference>('any')
  const analyze = useAllocationAnalysis()
  const amountNum = parseAmount(amount)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (amountNum <= 0) return
    analyze.mutate({ amount_cad: amountNum, account_preference: account })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap mb-4"
    >
      <label htmlFor="available-to-trade" className="text-sm font-medium text-muted-foreground shrink-0">
        Available to trade:
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <input
            id="available-to-trade"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7 pr-3 py-1.5 text-sm border border-border rounded-md bg-background w-32 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <label htmlFor="available-to-trade-account" className="text-sm text-muted-foreground">in</label>
        <select
          id="available-to-trade-account"
          value={account}
          onChange={(e) => setAccount(e.target.value as AllocationAccountPreference)}
          className="py-1.5 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="any">Any Account</option>
          <option value="tfsa">TFSA first</option>
          <option value="rrsp">RRSP</option>
          <option value="trading">Trading</option>
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={amountNum <= 0 || analyze.isPending}>
          {analyze.isPending ? 'Analyzing…' : 'Analyze allocation'}
        </Button>
      </div>
      {account === 'any' && (
        <span className="text-xs text-muted-foreground">
          TFSA room used first, then RRSP suitability, then Trading as overflow.
        </span>
      )}
      {analyze.isError && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {getErrorMessage(analyze.error)}
        </p>
      )}
    </form>
  )
}

export function PortfolioPage() {
  const [accountView, setAccountView] = useState<PortfolioAccountView>(getSessionAccount)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('holdings')

  function handleAccountChange(v: PortfolioAccountView) {
    setAccountView(v)
    safeStorage.session.set(ACCOUNT_VIEW_STORAGE_KEY, v)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Portfolio</h1>
        <div role="group" aria-label="Account" className="flex rounded-md border border-border overflow-hidden">
          {ACCOUNT_TABS.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={accountView === value}
              onClick={() => handleAccountChange(value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                accountView === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SummaryHeader accountView={accountView} onAccountChange={handleAccountChange} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>
          {activeTab === 'holdings' && (
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
              Add Stock
            </Button>
          )}
        </div>
        <TabsContent value="holdings">
          <HoldingsTable accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="optimizer">
          <AvailableToTradeWidget />
          <PortfolioOptimizerSection accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="allocation">
          <AllocationCharts accountFilter={accountView} />
        </TabsContent>
      </Tabs>

      <AddStockDialog
        mode="portfolio"
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  )
}
