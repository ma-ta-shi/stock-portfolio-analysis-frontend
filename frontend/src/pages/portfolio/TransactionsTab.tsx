import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { useTransactions } from '@/hooks/use-portfolio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { TransactionType } from '@/types'

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  drip: 'DRIP',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
}

const TX_TYPE_VARIANTS: Record<TransactionType, string> = {
  buy: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
  sell: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  dividend: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  drip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  transfer_in: 'bg-muted text-muted-foreground',
  transfer_out: 'bg-muted text-muted-foreground',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface TransactionsTabProps {
  accountFilter?: string
}

export function TransactionsTab({ accountFilter }: TransactionsTabProps) {
  const { data: allTransactions, isLoading, isError, refetch } = useTransactions()
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')

  const transactions = useMemo(() => {
    if (!allTransactions) return []
    return allTransactions
      .filter((t) => {
        if (accountFilter && accountFilter !== 'combined' && t.account_type !== accountFilter) return false
        if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false
        return true
      })
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
  }, [allTransactions, accountFilter, typeFilter])

  function handleExportCSV() {
    if (!transactions.length) return
    const headers = ['Date', 'Ticker', 'Account', 'Type', 'Shares', 'Price', 'Total', 'Fees', 'Realized P&L', 'Notes']
    const rows = transactions.map((t) => [
      formatDate(t.transaction_date),
      t.stock.ticker,
      t.account_type.toUpperCase(),
      TX_TYPE_LABELS[t.transaction_type],
      t.shares != null ? String(t.shares) : '',
      t.price_per_share.toFixed(2),
      t.total_amount.toFixed(2),
      t.fees.toFixed(2),
      t.realized_gain_loss != null ? t.realized_gain_loss.toFixed(2) : '',
      t.notes ?? '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transactions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (isError) {
    return (
      <div className="border border-border rounded-lg p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Failed to load transactions.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'buy', 'sell', 'dividend', 'drip'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md border transition-colors',
                typeFilter === type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {type === 'all' ? 'All' : TX_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!transactions.length}>
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {!transactions.length ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No transactions found.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Realized P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const gainPositive = (t.realized_gain_loss ?? 0) >= 0
                return (
                  <TableRow key={t.transaction_id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(t.transaction_date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{t.stock.ticker}</div>
                      <div className="text-xs text-muted-foreground">{t.stock.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.account_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
                          TX_TYPE_VARIANTS[t.transaction_type],
                        )}
                      >
                        {TX_TYPE_LABELS[t.transaction_type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {t.shares != null ? (
                        <span className={t.shares < 0 ? 'text-red-600' : undefined}>
                          {t.shares > 0 ? '+' : ''}{t.shares}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${t.price_per_share.toFixed(2)}{' '}
                      <span className="text-xs text-muted-foreground">{t.currency}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCAD(t.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {t.fees > 0 ? `$${t.fees.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {t.realized_gain_loss != null ? (
                        <>
                          <div
                            className={cn(
                              'text-sm font-medium',
                              gainPositive ? 'text-emerald-600' : 'text-red-600',
                            )}
                          >
                            {gainPositive ? '+' : ''}
                            {formatCAD(t.realized_gain_loss)}
                          </div>
                          {t.realized_gain_loss_pct != null && (
                            <div
                              className={cn(
                                'text-xs',
                                gainPositive ? 'text-emerald-600' : 'text-red-600',
                              )}
                            >
                              {gainPositive ? '+' : ''}
                              {formatPct(t.realized_gain_loss_pct * 100)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
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
