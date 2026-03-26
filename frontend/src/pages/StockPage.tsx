import { useParams, Link } from 'react-router-dom'
import { useStockDetail, useStockAnalysisHistory } from '@/hooks/use-stock-detail'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { StockInfoSection } from '@/components/StockInfoSection'
import { OutlookBadge } from '@/components/OutlookBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { DisagreementIndicator } from '@/components/DisagreementIndicator'
import { SparklineChart } from '@/components/SparklineChart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatCAD } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { StockAnalysisHistoryEntry, HoldingSnapshot, Holding, PortfolioFit } from '@/types'

const fitBoxColors: Record<PortfolioFit, string> = {
  strong_candidate: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  worth_monitoring: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  poor_fit: 'bg-muted border-border',
}

const fitBadgeColors: Record<PortfolioFit, string> = {
  strong_candidate: 'bg-emerald-600 text-white',
  worth_monitoring: 'bg-amber-500 text-white',
  poor_fit: 'bg-muted-foreground text-white',
}

const FIT_LABELS: Record<PortfolioFit, string> = {
  strong_candidate: 'Strong Candidate',
  worth_monitoring: 'Worth Monitoring',
  poor_fit: 'Poor Fit',
}

function buildHoldingSnapshot(holdings: Holding[]): HoldingSnapshot | undefined {
  if (!holdings.length) return undefined

  const totalShares = holdings.reduce((s, h) => s + h.shares, 0)
  const bookCost = holdings.reduce((s, h) => s + h.shares * h.average_cost_basis, 0)
  const currentValue = holdings.reduce((s, h) => s + h.market_value, 0)
  const totalReturnCad = holdings.reduce((s, h) => s + h.total_gain_loss, 0)
  const dayChangeCad = holdings.reduce((s, h) => s + h.day_change * h.shares, 0)
  // weighted average yield on cost
  const yieldOnCost = totalShares > 0
    ? holdings.reduce((s, h) => s + h.yield_on_cost * h.shares, 0) / totalShares
    : 0

  return {
    shares: totalShares,
    average_cost: bookCost / totalShares,
    book_cost: bookCost,
    current_value: currentValue,
    total_return_cad: totalReturnCad,
    total_return_pct: bookCost > 0 ? totalReturnCad / bookCost : 0,
    day_change_cad: dayChangeCad,
    yield_on_cost: yieldOnCost > 0 ? yieldOnCost : undefined,
    by_account: holdings.length > 1
      ? holdings.map((h) => ({
          account_type: h.account_type,
          shares: h.shares,
          value: h.market_value,
          avg_cost: h.average_cost_basis,
        }))
      : undefined,
  }
}

function predictionStatusColor(status: StockAnalysisHistoryEntry['prediction_status']) {
  if (status === 'scored') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  if (status === 'expired') return 'bg-muted text-muted-foreground'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
}

function applyTemplate(template: string, vars: Record<string, string | number>) {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, String(value))
  }
  return out
}

export function StockPage() {
  const { stockId } = useParams<{ stockId: string }>()
  const id = stockId ?? ''

  const { data: stock, isLoading: stockLoading } = useStockDetail(id)
  const { data: history, isLoading: historyLoading } = useStockAnalysisHistory(id)
  const { data: allHoldings } = usePortfolioHoldings()

  const holdingsForStock = allHoldings?.filter((h) => h.stock.stock_id === id) ?? []
  const holdingSnapshot = buildHoldingSnapshot(holdingsForStock)
  const holdingsSharesByAccount = holdingsForStock.reduce<Record<string, number>>((acc, h) => {
    acc[h.account_type] = (acc[h.account_type] ?? 0) + h.shares
    return acc
  }, {})

  if (stockLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 text-muted-foreground">
        Stock not found
      </div>
    )
  }

  const dayPositive = stock.day_change_pct >= 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stock Info Section */}
      <StockInfoSection
        stock={stock}
        price={stock.current_price}
        marketCapCad={stock.market_cap_cad}
        fundamentals={stock.fundamentals}
        holdingSnapshot={holdingSnapshot}
      />

      {/* Price Chart */}
      {stock.price_history_90d && stock.price_history_90d.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              90-Day Price
            </h2>
            <span
              className={cn(
                'text-sm font-medium',
                dayPositive ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {dayPositive ? '+' : ''}
              {(stock.day_change_pct * 100).toFixed(2)}% today
            </span>
          </div>
          <SparklineChart
            data={stock.price_history_90d}
            color={dayPositive ? '#10b981' : '#ef4444'}
            height={80}
          />
        </div>
      )}

      {/* Latest Analysis */}
      {stock.latest_analysis && (() => {
        const a = stock.latest_analysis!
        const l2 = a.layer2_context
        const analysisAccountType = a.account_type ?? (holdingsForStock.length === 1 ? holdingsForStock[0].account_type : null)
        const accountTypeLabel =
          analysisAccountType != null ? analysisAccountType.toUpperCase() : 'Your accounts'
        const sharesForTemplate = analysisAccountType
          ? holdingsSharesByAccount[analysisAccountType] ?? 0
          : holdingSnapshot?.shares ?? holdingsForStock.reduce((s, h) => s + h.shares, 0)
        return (
          <div className="space-y-3">
            {/* Section header with link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OutlookBadge direction={a.stock_outlook} size="lg" />
                <ConfidenceMeter score={a.confidence_score} />
                <DisagreementIndicator
                  label={
                    a.disagreement_score < 0.25
                      ? 'low'
                      : a.disagreement_score < 0.5
                        ? 'moderate'
                        : 'high'
                  }
                  score={a.disagreement_score}
                />
              </div>
              <Link to={`/analysis/${a.analysis_id}`}>
                <Button variant="outline" size="sm">
                  Full Analysis
                </Button>
              </Link>
            </div>

            {/* Layer 1 — Stock Outlook */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Layer 1 — Stock Outlook
                </h2>
                <span className="text-xs text-muted-foreground">
                  {formatDate(a.analyzed_at)}
                </span>
              </div>
              {a.key_drivers && a.key_drivers.length > 0 && (
                <ul className="space-y-1">
                  {a.key_drivers.map((driver, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-muted-foreground shrink-0">·</span>
                      <span className="font-medium">{driver}</span>
                    </li>
                  ))}
                </ul>
              )}
              {a.executive_summary && (
                <p className="text-sm leading-relaxed">{a.executive_summary}</p>
              )}
            </div>

            {/* Layer 2 — Portfolio Context */}
            {l2 && (
              <div className={cn('border rounded-lg p-5 space-y-3', fitBoxColors[l2.portfolio_fit])}>
                <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Layer 2 — Portfolio Context
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', fitBadgeColors[l2.portfolio_fit])}>
                    {FIT_LABELS[l2.portfolio_fit]}
                  </span>
                  <span className="text-sm text-muted-foreground">{l2.portfolio_fit_rationale}</span>
                </div>
                <div className={cn('rounded-md border p-3', fitBoxColors[l2.portfolio_fit])}>
                  <p className="text-sm font-medium">{l2.suggested_action}</p>
                  {l2.suggested_amount_cad != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Suggested amount: {formatCAD(l2.suggested_amount_cad)}
                    </p>
                  )}
                </div>
                {l2.account_note_template && holdingSnapshot && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Account Note</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {applyTemplate(l2.account_note_template, {
                        shares: sharesForTemplate,
                        account_type: accountTypeLabel,
                      })}
                    </p>
                  </div>
                )}
                {l2.account_note_template && !holdingSnapshot && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Account Note</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {applyTemplate(l2.account_note_template, {
                        shares: 0,
                        account_type: accountTypeLabel,
                      })}
                    </p>
                  </div>
                )}
                {l2.would_replace && (
                  <p className="text-xs text-muted-foreground">
                    Would replace: <span className="font-medium text-foreground">{l2.would_replace}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Analysis History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Analysis History</h2>
          <Link to={`/analysis/new?stock=${stock.stock_id}`}>
            <Button size="sm">Run New Analysis</Button>
          </Link>
        </div>

        {historyLoading ? (
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        ) : !history?.data.length ? (
          <div className="border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            No analyses yet for {stock.ticker}.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Outlook</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Prediction</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((entry) => (
                  <TableRow key={entry.analysis_id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(entry.analyzed_at)}
                    </TableCell>
                    <TableCell>
                      <OutlookBadge direction={entry.stock_outlook} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceMeter score={entry.confidence_score} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      ${entry.price_at_analysis.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.account_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.timeline.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          predictionStatusColor(entry.prediction_status),
                        )}
                      >
                        {entry.prediction_status === 'scored' && entry.direction_correct != null
                          ? entry.direction_correct
                            ? '✓ Correct'
                            : '✗ Incorrect'
                          : entry.prediction_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.return_at_3m != null ? (
                        <span
                          className={cn(
                            'text-sm font-medium',
                            entry.return_at_3m >= 0 ? 'text-emerald-600' : 'text-red-600',
                          )}
                        >
                          {entry.return_at_3m >= 0 ? '+' : ''}
                          {(entry.return_at_3m * 100).toFixed(1)}%
                        </span>
                      ) : entry.return_at_1m != null ? (
                        <span
                          className={cn(
                            'text-sm font-medium',
                            entry.return_at_1m >= 0 ? 'text-emerald-600' : 'text-red-600',
                          )}
                        >
                          {entry.return_at_1m >= 0 ? '+' : ''}
                          {(entry.return_at_1m * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to={`/analysis/${entry.analysis_id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Company Info Footer */}
      {(stock.headquarters || stock.employees || stock.website) && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4">
          {stock.headquarters && (
            <span>HQ: <span className="text-foreground">{stock.headquarters}</span></span>
          )}
          {stock.employees && (
            <span>Employees: <span className="text-foreground">{stock.employees.toLocaleString()}</span></span>
          )}
          {stock.website && (
            <span>Web: <span className="text-foreground">{stock.website}</span></span>
          )}
        </div>
      )}
    </div>
  )
}
