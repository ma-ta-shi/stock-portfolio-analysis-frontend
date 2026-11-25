/**
 * The Holdings tab. Columns and the expanded detail come from the field registry (`screens/portfolio/holdings.tsx`), so every
 * API field the page can reach is either a column, a detail line, or listed there as not shown. The row buttons open the dialogs
 * of `useHoldingActions`; every one records through the ledger shell.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, Pencil, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { useHoldingActions } from '@/hooks/use-holding-actions'
import { HoldingActionDialogs } from '@/components/ledger/HoldingActionDialogs'
import { RegistryTable } from '@/components/RegistryTable'
import { ClosedPositions } from './ClosedPositions'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/QueryError'
import { fieldsFor } from '@/lib/fields'
import { filterByAccount, positionLabel } from '@/lib/portfolio'
import { HOLDING_FIELDS } from '@/screens/portfolio/holdings'
import type { PortfolioAccountView } from '@/types/portfolio'

/** Columns of figures, aligned right. */
const RIGHT = new Set(['target_price', 'shares', 'average_cost', 'price', 'book_cost', 'market_value', 'gain', 'dividend_yield', 'yield_on_cost'])

interface HoldingsTableProps {
  accountFilter?: PortfolioAccountView
}

export function HoldingsTable({ accountFilter }: HoldingsTableProps) {
  const navigate = useNavigate()
  const { data: allHoldings, isLoading, isError, error, refetch } = usePortfolioHoldings()
  const actions = useHoldingActions()

  const holdings = useMemo(() => filterByAccount(allHoldings, accountFilter), [allHoldings, accountFilter])
  const columns = useMemo(() => fieldsFor(HOLDING_FIELDS, 'column'), [])

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (isError) return <QueryError what="holdings" error={error} onRetry={refetch} />
  if (!holdings?.length) {
    return (
      <>
        <p className="text-muted-foreground text-sm py-8 text-center">No holdings found.</p>
        <ClosedPositions accountFilter={accountFilter} />
      </>
    )
  }

  return (
    <>
      <RegistryTable
        dense
        columns={columns}
        rows={holdings}
        rowKey={(h) => h.holding_id}
        rowLabel={(h) => positionLabel(h)}
        rightAligned={RIGHT}
        detail={HOLDING_FIELDS}
        onOpen={(h) => navigate(`/stocks/${h.stock.stock_id}`)}
        openLabel={(h) => `View ${h.stock.ticker}`}
        actions={(h) => {
          const label = positionLabel(h)
          return (
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="px-1.5 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
                title="Buy more shares"
                aria-label={`Buy more ${label}`}
                onClick={() => actions.open('buy', h)}
              >
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-1.5 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                title="Sell shares"
                aria-label={`Sell ${label}`}
                onClick={() => actions.open('sell', h)}
              >
                <TrendingDown className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-1.5 text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400"
                title="Log dividend"
                aria-label={`Log dividend for ${label}`}
                onClick={() => actions.open('dividend', h)}
              >
                <DollarSign className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-1.5 text-muted-foreground hover:text-foreground"
                title="Edit position"
                aria-label={`Edit ${label}`}
                onClick={() => actions.open('edit', h)}
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-1.5 text-muted-foreground hover:text-destructive"
                title="Remove"
                aria-label={`Remove ${label}`}
                onClick={() => actions.open('remove', h)}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          )
        }}
      />

      <ClosedPositions accountFilter={accountFilter} />
      <HoldingActionDialogs actions={actions} />
    </>
  )
}
