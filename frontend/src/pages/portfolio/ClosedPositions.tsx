import { useState } from 'react'
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
import { formatCAD, formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function holdingPeriod(firstBuy: string, lastSell: string) {
  const ms = new Date(lastSell).getTime() - new Date(firstBuy).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  const years = Math.floor(days / 365)
  const months = Math.round((days % 365) / 30)
  return months > 0 ? `${years}y ${months}mo` : `${years}y`
}

export function ClosedPositions() {
  const [open, setOpen] = useState(false)
  const { data: closed } = useClosedPositions()

  if (!closed?.length) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span className="font-medium">Closed Positions</span>
        <span className="text-xs">({closed.length})</span>
      </button>

      {open && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Avg Buy</TableHead>
                <TableHead className="text-right">Avg Sell</TableHead>
                <TableHead className="text-right">Realized P&L</TableHead>
                <TableHead>Holding Period</TableHead>
                <TableHead>Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closed.map((pos) => {
                const gainPositive = pos.total_realized_gain_loss >= 0
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
                    <TableCell className="text-right text-sm">{pos.total_shares_sold}</TableCell>
                    <TableCell className="text-right text-sm">
                      ${pos.avg_buy_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${pos.avg_sell_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={cn(
                          'text-sm font-medium',
                          gainPositive ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {gainPositive ? '+' : ''}
                        {formatCAD(pos.total_realized_gain_loss)}
                      </div>
                      <div
                        className={cn(
                          'text-xs',
                          gainPositive ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {gainPositive ? '+' : ''}
                        {formatPct(pos.total_realized_gain_loss_pct * 100)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {holdingPeriod(pos.first_buy_date, pos.last_sell_date)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{formatDate(pos.first_buy_date)}</div>
                      <div>→ {formatDate(pos.last_sell_date)}</div>
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
