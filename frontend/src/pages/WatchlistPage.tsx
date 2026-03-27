import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import { useWatchlist } from '@/hooks/use-watchlist'
import { OutlookBadge } from '@/components/OutlookBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { DisagreementIndicator } from '@/components/DisagreementIndicator'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PortfolioFit, WatchlistItem } from '@/types'

type SortKey =
  | 'projected_return_pct'
  | 'confidence_score'
  | 'day_change_pct'
  | 'last_analyzed_at'

const FIT_COLORS: Record<PortfolioFit, string> = {
  strong_candidate: 'text-emerald-600 dark:text-emerald-400',
  worth_monitoring: 'text-amber-600 dark:text-amber-400',
  poor_fit: 'text-red-600 dark:text-red-400',
}

const FIT_LABELS: Record<PortfolioFit, string> = {
  strong_candidate: 'Strong',
  worth_monitoring: 'Monitor',
  poor_fit: 'Poor Fit',
}

function sortItems(items: WatchlistItem[], key: SortKey, dir: 'asc' | 'desc') {
  return [...items].sort((a, b) => {
    let cmp = 0
    if (key === 'projected_return_pct') {
      cmp = a.projected_return_pct - b.projected_return_pct
    } else if (key === 'confidence_score') {
      cmp = a.confidence_score - b.confidence_score
    } else if (key === 'day_change_pct') {
      cmp = a.day_change_pct - b.day_change_pct
    } else if (key === 'last_analyzed_at') {
      cmp = new Date(a.last_analyzed_at).getTime() - new Date(b.last_analyzed_at).getTime()
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

interface SortHeaderProps {
  label: string
  colKey: SortKey
  activeKey: SortKey
  onSort: (key: SortKey) => void
}

function SortHeader({ label, colKey, activeKey, onSort }: SortHeaderProps) {
  return (
    <button
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        activeKey === colKey ? 'text-foreground' : 'text-muted-foreground',
      )}
      onClick={() => onSort(colKey)}
    >
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  )
}

export function WatchlistPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useWatchlist()
  const [sortKey, setSortKey] = useState<SortKey>('projected_return_pct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const items = data ? sortItems(data.data, sortKey, sortDir) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Watchlist</h1>
        {data?.summary && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{data.summary.total} stocks</span>
            <span className="text-emerald-600 font-medium">
              {data.summary.bullish_count} bullish
            </span>
            {data.summary.changed_since_last_check > 0 && (
              <span className="text-blue-500">
                {data.summary.changed_since_last_check} changed
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>
                  <SortHeader label="Day Δ" colKey="day_change_pct" activeKey={sortKey} onSort={handleSort} />
                </TableHead>
                <TableHead>Outlook</TableHead>
                <TableHead>
                  <SortHeader label="Confidence" colKey="confidence_score" activeKey={sortKey} onSort={handleSort} />
                </TableHead>
                <TableHead>Disagreement</TableHead>
                <TableHead>
                  <SortHeader label="Proj. Return" colKey="projected_return_pct" activeKey={sortKey} onSort={handleSort} />
                </TableHead>
                <TableHead>Portfolio Fit</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>
                  <SortHeader label="Last Analyzed" colKey="last_analyzed_at" activeKey={sortKey} onSort={handleSort} />
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                return (
                <TableRow
                  key={item.watchlist_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/stocks/${item.stock.stock_id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{item.stock.ticker}</div>
                    <div className="text-xs text-muted-foreground">{item.stock.name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.stock.sector}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.current_price.toFixed(2)}{' '}
                    <span className="text-xs text-muted-foreground">{item.stock.currency}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'text-sm',
                        item.day_change_pct >= 0 ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {formatPct(item.day_change_pct * 100)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <OutlookBadge direction={item.stock_outlook} />
                  </TableCell>
                  <TableCell>
                    <ConfidenceMeter score={item.confidence_score} />
                  </TableCell>
                  <TableCell>
                    <DisagreementIndicator
                      label={item.disagreement_label}
                      score={item.disagreement_score}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {formatPct(item.projected_return_pct * 100)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-sm font-medium', FIT_COLORS[item.portfolio_fit])}>
                      {FIT_LABELS[item.portfolio_fit]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.suggested_account.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(item.last_analyzed_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/stocks/${item.stock.stock_id}`)
                      }}
                    >
                      View
                    </Button>
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
