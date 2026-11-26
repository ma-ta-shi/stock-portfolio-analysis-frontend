import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { safeStorage } from '@/lib/storage'
import { AddStockDialog } from '@/components/AddStockDialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { DividendsTab } from './portfolio/DividendsTab'
import { HoldingsTable } from './portfolio/HoldingsTable'
import { AllocationCharts } from './portfolio/AllocationCharts'
import { AvailableToTrade } from './portfolio/AvailableToTrade'
import { PortfolioOptimizerSection } from './portfolio/PortfolioOptimizerSection'
import { TransactionsTab } from './portfolio/TransactionsTab'
import { notConnectedMessage } from '@/lib/gaps'
import { SummaryHeader } from './portfolio/SummaryHeader'; import { usePortfolioId } from '@/hooks/use-portfolio-id'; import { QueryError } from '@/components/QueryError'
import { cn } from '@/lib/utils'
import type { PortfolioAccountView } from '@/types'

const ACCOUNT_VIEW_STORAGE_KEY = 'portfolio_account_view'

const PORTFOLIO_TABS = ['holdings', 'dividends', 'optimizer', 'transactions', 'allocation'] as const
type PortfolioTab = (typeof PORTFOLIO_TABS)[number]

/** The active subtab lives in `?tab=` so links (e.g. "View history") can open a specific tab. */
function usePortfolioTab(): [PortfolioTab, (tab: PortfolioTab) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab = PORTFOLIO_TABS.includes(raw as PortfolioTab) ? (raw as PortfolioTab) : 'holdings'
  function setTab(next: PortfolioTab) {
    // Changing tab drops the previous tab's filters; the default tab needs no param.
    setParams(next === 'holdings' ? {} : { tab: next })
  }
  return [tab, setTab]
}

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

export function PortfolioPage() {
  const [accountView, setAccountView] = useState<PortfolioAccountView>(getSessionAccount)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = usePortfolioTab()
  const owner = usePortfolioId()

  function handleAccountChange(v: PortfolioAccountView) {
    setAccountView(v)
    safeStorage.session.set(ACCOUNT_VIEW_STORAGE_KEY, v)
  }

  if (owner.isError) return <QueryError what="portfolio" error={owner.error} onRetry={owner.refetch} />
  if (owner.isEmpty) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Portfolio</h1>
        <p role="status" className="text-sm text-muted-foreground">You have no portfolio yet. {notConnectedMessage('P-R1')}</p>
      </div>
    )
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PortfolioTab)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
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
        <TabsContent value="dividends">
          <DividendsTab accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab accountFilter={accountView} />
        </TabsContent>
        <TabsContent value="optimizer">
          <AvailableToTrade />
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
