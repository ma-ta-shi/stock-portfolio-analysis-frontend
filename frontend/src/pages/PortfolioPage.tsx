import { useState } from 'react'
import { usePortfolioSummary } from '@/hooks/use-portfolio'
import { SparklineChart } from '@/components/SparklineChart'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { HoldingsTable } from './portfolio/HoldingsTable'
import { AllocationCharts } from './portfolio/AllocationCharts'
import { PortfolioOptimizerSection } from './portfolio/PortfolioOptimizerSection'
import { formatCAD, formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PortfolioAccountView } from '@/types'

const ACCOUNT_TABS: { value: PortfolioAccountView; label: string }[] = [
  { value: 'combined', label: 'Combined' },
  { value: 'tfsa', label: 'TFSA' },
  { value: 'rrsp', label: 'RRSP' },
  { value: 'trading', label: 'Trading' },
]

function getSessionAccount(): PortfolioAccountView {
  try {
    const stored = sessionStorage.getItem('portfolio_account_view')
    if (stored === 'combined' || stored === 'tfsa' || stored === 'rrsp' || stored === 'trading') {
      return stored
    }
  } catch {
    // ignore
  }
  return 'combined'
}

function SummaryHeader({
  accountView,
  onAccountChange,
}: {
  accountView: PortfolioAccountView
  onAccountChange: (v: PortfolioAccountView) => void
}) {
  const { data, isLoading } = usePortfolioSummary()

  if (isLoading) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse mb-4" />
  }
  if (!data) return null

  const isCombined = accountView === 'combined'
  const acct = !isCombined ? data.by_account?.[accountView] : null
  const value = acct?.value ?? data.total_value_cad
  const gainLoss = acct?.gain_loss ?? data.total_gain_loss_cad
  const gainPct = acct?.gain_loss_pct ?? data.total_gain_loss_pct
  const dayPositive = data.day_change_cad >= 0

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
            <div className="text-xs text-muted-foreground mb-0.5">Total Gain</div>
            <div className="text-sm font-medium text-emerald-600">
              {formatCAD(gainLoss)} ({formatPct(gainPct * 100)})
            </div>
          </div>
          {isCombined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Today</div>
              <div
                className={cn(
                  'text-sm font-medium',
                  dayPositive ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {dayPositive ? '+' : ''}
                {formatCAD(data.day_change_cad)} ({formatPct(data.day_change_pct * 100)})
              </div>
            </div>
          )}
          {data.annual_dividend_income_estimate_cad != null && isCombined && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Annual Dividends</div>
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
                key={acc}
                onClick={() => onAccountChange(acc)}
                className="bg-card border border-border rounded-lg px-4 py-3 text-left hover:border-primary transition-colors"
              >
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {acc.toUpperCase()}
                </div>
                <div className="text-base font-semibold">{formatCAD(a.value)}</div>
                <div
                  className={cn(
                    'text-xs mt-0.5',
                    a.gain_loss >= 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {a.gain_loss >= 0 ? '+' : ''}
                  {formatCAD(a.gain_loss)} ({formatPct(a.gain_loss_pct * 100)})
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
  const [account, setAccount] = useState<'tfsa' | 'rrsp' | 'trading' | 'any'>('any')

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap mb-4">
      <span className="text-sm font-medium text-muted-foreground shrink-0">Available to trade:</span>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <input
            type="number"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7 pr-3 py-1.5 text-sm border border-border rounded-md bg-background w-32 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-sm text-muted-foreground">in</span>
        <select
          value={account}
          onChange={(e) => setAccount(e.target.value as typeof account)}
          className="py-1.5 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="any">Any Account</option>
          <option value="tfsa">TFSA first</option>
          <option value="rrsp">RRSP</option>
          <option value="trading">Trading</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Analyze allocation
        </Button>
      </div>
      {account === 'any' && (
        <span className="text-xs text-muted-foreground">
          TFSA room used first, then RRSP suitability, then Trading as overflow.
        </span>
      )}
    </div>
  )
}

export function PortfolioPage() {
  const [accountView, setAccountView] = useState<PortfolioAccountView>(getSessionAccount)

  function handleAccountChange(v: PortfolioAccountView) {
    setAccountView(v)
    try {
      sessionStorage.setItem('portfolio_account_view', v)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Portfolio</h1>
        <div className="flex rounded-md border border-border overflow-hidden">
          {ACCOUNT_TABS.map(({ value, label }) => (
            <button
              key={value}
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
      <AvailableToTradeWidget />

      <Tabs defaultValue="holdings">
        <TabsList className="mb-4">
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
        </TabsList>
        <TabsContent value="holdings">
          <HoldingsTable accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="allocation">
          <AllocationCharts accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="optimizer">
          <PortfolioOptimizerSection accountFilter={accountView} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
