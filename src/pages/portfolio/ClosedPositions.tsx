/** Closed positions: holdings with no shares left, from the same registry as the active ones (`screens/portfolio/holdings.tsx`). */
import { Fragment, useId, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useClosedPositions } from '@/hooks/use-portfolio'
import { ButtonLink } from '@/components/ButtonLink'
import { FieldList } from '@/components/FieldList'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { holdingHistoryHref } from '@/hooks/use-transaction-filters'
import { fieldText } from '@/lib/fields'
import { filterByAccount } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import { HOLDING_FIELDS } from '@/screens/portfolio/holdings'
import type { PortfolioAccountView } from '@/types/portfolio'

/** The columns of this table, picked from the registry by id: what a closed position is read for. */
const COLUMN_IDS = ['ticker', 'account', 'total_shares_bought', 'total_shares_sold', 'average_buy_price', 'average_sell_price', 'realised', 'first_buy', 'last_activity']
const COLUMNS = COLUMN_IDS.map((id) => {
  const spec = HOLDING_FIELDS.find((s) => s.id === id)
  if (!spec) throw new Error(`Closed positions: no field "${id}" in the holdings registry`)
  return spec
})
const RIGHT = new Set(['total_shares_bought', 'total_shares_sold', 'average_buy_price', 'average_sell_price', 'realised'])

interface ClosedPositionsProps {
  accountFilter?: PortfolioAccountView
}

export function ClosedPositions({ accountFilter }: ClosedPositionsProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const panelId = useId()
  const { data: allClosed, isError, error, refetch } = useClosedPositions()
  const closed = filterByAccount(allClosed, accountFilter)

  if (isError) return <QueryError what="closed positions" error={error} onRetry={refetch} compact className="mt-4" />
  if (!closed?.length) return null

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
        <span className="font-medium">Closed Positions</span>
        <span className="text-xs">({closed.length})</span>
      </button>

      {open && (
        <div id={panelId} className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">Details</span>
                </TableHead>
                {COLUMNS.map((spec) => (
                  <TableHead key={spec.id} className={RIGHT.has(spec.id) ? 'text-right' : undefined} title={spec.tooltip}>
                    {spec.label}
                  </TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">History</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closed.map((pos) => {
                const label = `${pos.stock.ticker} (${pos.account_type.toUpperCase()})`
                const isOpen = expanded.has(pos.holding_id)
                return (
                  <Fragment key={pos.holding_id}>
                    <TableRow>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Hide' : 'Show'} details of ${label}`}
                          onClick={() => toggle(pos.holding_id)}
                        >
                          {isOpen ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                        </Button>
                      </TableCell>
                      {COLUMNS.map((spec) => (
                        <TableCell key={spec.id} className={cn('text-sm', RIGHT.has(spec.id) && 'text-right')}>
                          {spec.render ? spec.render(pos) : fieldText(spec, pos)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <ButtonLink variant="ghost" size="sm" className="text-xs" to={holdingHistoryHref(pos.holding_id)} aria-label={`View history for ${label}`}>
                          View history
                        </ButtonLink>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={COLUMNS.length + 2} className="bg-muted/30 py-3">
                          <FieldList fields={HOLDING_FIELDS} row={pos} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
