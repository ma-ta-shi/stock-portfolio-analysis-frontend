import { useId, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useClosedPositions } from '@/hooks/use-portfolio'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { QueryError } from '@/components/QueryError'
import { holdingHistoryHref } from '@/hooks/use-transaction-filters'
import { formatDate, formatMoney, formatPct } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { filterByAccount, holdingPeriod } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import { ButtonLink } from '@/components/ButtonLink'
import type { PortfolioAccountView } from '@/types'

interface ClosedPositionsProps {
  accountFilter?: PortfolioAccountView
}

export function ClosedPositions({ accountFilter }: ClosedPositionsProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { data: allClosed, isError, error, refetch } = useClosedPositions()
  const closed = filterByAccount(allClosed, accountFilter)

  if (isError) {
    return <QueryError what="closed positions" error={error} onRetry={refetch} compact className="mt-4" />
  }
  if (!closed?.length) return null

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
                <TableHead>Stock</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Bought</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Avg Buy</TableHead>
                <TableHead className="text-right">Avg Sell</TableHead>
                <TableHead className="text-right">Realized P&L</TableHead>
                <TableHead>Holding Period</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>
                  <span className="sr-only">History</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closed.map((pos) => {
                const currency = pos.stock.currency
                const gainClass = gainLossColor(pos.total_realized_gain_loss)
                return (
                  <TableRow key={pos.holding_id}>
                    <TableCell>
                      <div className="font-medium">{pos.stock.ticker}</div>
                      <div className="text-xs text-muted-foreground">{pos.stock.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {pos.account_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{pos.total_shares_bought}</TableCell>
                    <TableCell className="text-right text-sm">{pos.total_shares_sold}</TableCell>
                    <TableCell className="text-right text-sm">
                      {formatMoney(pos.avg_buy_price, currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatMoney(pos.avg_sell_price, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn('text-sm font-medium', gainClass)}>
                        {formatMoney(pos.total_realized_gain_loss, currency, { signed: true })}
                      </div>
                      <div className={cn('text-xs', gainClass)}>
                        {formatPct(pos.total_realized_gain_loss_pct)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {holdingPeriod(pos.first_buy_date, pos.last_sell_date)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatDate(pos.first_buy_date)}</div>
                      <div>→ {formatDate(pos.last_sell_date)}</div>
                    </TableCell>
                    <TableCell>
                      <ButtonLink
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        to={holdingHistoryHref(pos.holding_id)}
                        aria-label={`View history for ${pos.stock.ticker} (${pos.account_type.toUpperCase()})`}
                      >
                        View history
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
