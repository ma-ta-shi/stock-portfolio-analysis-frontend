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
import { QueryError } from '@/components/QueryError'
import { clickableRowProps } from '@/lib/a11y'
import { formatDate, formatNumber, formatPct } from '@/lib/format'
import { FIT_SHORT_LABELS, FIT_TEXT_COLORS, gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { WatchlistItem } from '@/types'

type SortKey =
  | 'projected_return_pct'
  | 'confidence_score'
  | 'day_change_pct'
  | 'last_analyzed_at'

type SortDir = 'asc' | 'desc'

function sortItems(items: WatchlistItem[], key: SortKey, dir: SortDir) {
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

interface SortableHeadProps {
  label: string
  colKey: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}

function SortableHead({ label, colKey, sortKey, sortDir, onSort }: SortableHeadProps) {
  const active = sortKey === colKey
  return (
    <TableHead aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={cn(
          'flex items-center gap-1 text-xs font-medium',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
        onClick={() => onSort(colKey)}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
      </button>
    </TableHead>
  )
}

export function WatchlistPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch } = useWatchlist()
  const [sortKey, setSortKey] = useState<SortKey>('projected_return_pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {data.summary.bullish_count} bullish
            </span>
            {data.summary.changed_since_last_check > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                {data.summary.changed_since_last_check} changed
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      ) : isError ? (
        <QueryError what="watchlist" error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Your watchlist is empty.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Price</TableHead>
                <SortableHead label="Day Δ" colKey="day_change_pct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableHead>Outlook</TableHead>
                <SortableHead label="Confidence" colKey="confidence_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableHead>Disagreement</TableHead>
                <SortableHead label="Proj. Return" colKey="projected_return_pct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableHead>Portfolio Fit</TableHead>
                <TableHead>Account</TableHead>
                <SortableHead label="Last Analyzed" colKey="last_analyzed_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                return (
                <TableRow
                  key={item.watchlist_id}
                  {...clickableRowProps(() => navigate(`/stocks/${item.stock.stock_id}`), `View ${item.stock.ticker}`)}
                >
                  <TableCell>
                    <div className="font-medium">{item.stock.ticker}</div>
                    <div className="text-xs text-muted-foreground">{item.stock.name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.stock.sector}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatNumber(item.current_price)}{' '}
                    <span className="text-xs text-muted-foreground">{item.stock.currency}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-sm', gainLossColor(item.day_change_pct))}>
                      {formatPct(item.day_change_pct)}
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
                      {formatPct(item.projected_return_pct)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-sm font-medium', FIT_TEXT_COLORS[item.portfolio_fit])}>
                      {FIT_SHORT_LABELS[item.portfolio_fit]}
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
                  <TableCell onKeyDown={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`View ${item.stock.ticker}`}
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
