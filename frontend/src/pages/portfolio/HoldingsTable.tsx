import { useNavigate } from 'react-router-dom'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { OutlookBadge } from '@/components/OutlookBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
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

function pctDisplay(value: number) {
  return value > 0 ? `${(value * 100).toFixed(2)}%` : '—'
}

interface HoldingsTableProps {
  accountFilter?: string
}

export function HoldingsTable({ accountFilter }: HoldingsTableProps) {
  const navigate = useNavigate()
  const { data: allHoldings, isLoading } = usePortfolioHoldings()
  const holdings =
    accountFilter && accountFilter !== 'combined'
      ? allHoldings?.filter((h) => h.account_type === accountFilter)
      : allHoldings

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (!holdings?.length) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No holdings found.</p>
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stock</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            <TableHead className="text-right">Gain / Loss</TableHead>
            <TableHead>Outlook</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Div Yield</TableHead>
            <TableHead className="text-right">YoC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const gainPositive = h.total_gain_loss >= 0
            return (
              <TableRow
                key={h.holding_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/stocks/${h.stock.stock_id}`)}
              >
                <TableCell>
                  <div className="font-medium">{h.stock.ticker}</div>
                  <div className="text-xs text-muted-foreground">{h.stock.name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {h.account_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">{h.shares}</TableCell>
                <TableCell className="text-right text-sm">
                  {h.average_cost_basis.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {h.current_price.toFixed(2)}{' '}
                  <span className="text-xs text-muted-foreground">{h.stock.currency}</span>
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCAD(h.market_value)}
                </TableCell>
                <TableCell className="text-right">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      gainPositive ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {formatCAD(h.total_gain_loss)}
                  </div>
                  <div
                    className={cn(
                      'text-xs',
                      gainPositive ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {formatPct(h.total_gain_loss_pct * 100)}
                  </div>
                </TableCell>
                <TableCell>
                  <OutlookBadge direction={h.stock_outlook} />
                </TableCell>
                <TableCell>
                  <ConfidenceMeter score={h.confidence_score} />
                </TableCell>
                <TableCell className="text-right text-sm">
                  {pctDisplay(h.annual_dividend_yield)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {pctDisplay(h.yield_on_cost)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
