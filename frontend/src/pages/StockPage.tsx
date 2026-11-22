import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Pencil, Plus, DollarSign } from 'lucide-react'
import { useStockDetail, useStockAnalysisHistory } from '@/hooks/use-stock-detail'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { StockInfoSection } from '@/components/StockInfoSection'
import { OutlookBadge } from '@/components/OutlookBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { DisagreementIndicator } from '@/components/DisagreementIndicator'
import { SparklineChart } from '@/components/SparklineChart'
import { BuySharesDialog } from '@/components/BuySharesDialog'
import { SellPositionDialog } from '@/components/SellPositionDialog'
import { EditPositionDialog } from '@/components/EditPositionDialog'
import { LogDividendDialog } from '@/components/LogDividendDialog'
import { AddStockDialog } from '@/components/AddStockDialog'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ButtonLink'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PortfolioContextCard } from '@/components/PortfolioContextCard'
import { QueryError } from '@/components/QueryError'
import { useFxRates } from '@/hooks/use-fx-rates'
import { isNotFound } from '@/lib/api'
import { formatDate, formatEnumLabel, formatMoney, formatPct } from '@/lib/format'
import { gainLossColor, TONE_TEXT } from '@/lib/labels'
import { applyTemplate, buildHoldingSnapshot, disagreementLabel } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import type { Holding, StockAnalysisHistoryEntry } from '@/types'

function predictionStatusColor(status: StockAnalysisHistoryEntry['prediction_status']) {
  if (status === 'scored') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
  if (status === 'expired') return 'bg-muted text-muted-foreground'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
}

function ReturnCell({ entry }: { entry: StockAnalysisHistoryEntry }) {
  const value = entry.return_at_3m ?? entry.return_at_1m
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>
  return <span className={cn('text-sm font-medium', gainLossColor(value))}>{formatPct(value, 1)}</span>
}

export function StockPage() {
  const { stockId } = useParams<{ stockId: string }>()
  const id = stockId ?? ''

  const {
    data: stock,
    isLoading: stockLoading,
    isError: stockError,
    error: stockErrorValue,
    refetch: refetchStock,
  } = useStockDetail(id)
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorValue,
    refetch: refetchHistory,
  } = useStockAnalysisHistory(id)
  const { data: allHoldings } = usePortfolioHoldings()
  const { rates } = useFxRates()

  const holdingsForStock = allHoldings?.filter((h) => h.stock.stock_id === id) ?? []
  const holdingSnapshot = buildHoldingSnapshot(holdingsForStock, rates)
  const holdingsSharesByAccount = holdingsForStock.reduce<Record<string, number>>((acc, h) => {
    acc[h.account_type] = (acc[h.account_type] ?? 0) + h.shares
    return acc
  }, {})

  const [buyingHolding, setBuyingHolding] = useState<Holding | null>(null)
  const [sellingHolding, setSellingHolding] = useState<Holding | null>(null)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [dividendHolding, setDividendHolding] = useState<Holding | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  if (stockLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (stockError && !isNotFound(stockErrorValue)) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <QueryError what="stock data" error={stockErrorValue} onRetry={refetchStock} />
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 text-muted-foreground">
        Stock not found.
      </div>
    )
  }

  const dayPositive = (stock.day_change_pct ?? 0) >= 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="sr-only">
        {stock.ticker} — {stock.name}
      </h1>
      {/* Stock Info Section */}
      <StockInfoSection
        stock={stock}
        price={stock.current_price}
        marketCapCad={stock.market_cap_cad}
        fundamentals={stock.fundamentals}
        holdingSnapshot={holdingSnapshot}
      />

      {/* Position Actions */}
      {holdingsForStock.length > 0 ? (
        <div className="bg-card border border-border rounded-lg px-4 py-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Position</p>
          {holdingsForStock.map((h) => {
            const annualDivEstimate = h.annual_dividend_per_share > 0
              ? h.annual_dividend_per_share * h.shares
              : null
            return (
              <div key={h.holding_id} className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{h.account_type.toUpperCase()}</Badge>
                    <span>{h.shares} shares</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Avg cost </span>
                    <span>{formatMoney(h.average_cost_basis, h.stock.currency)}</span>
                  </div>
                  {annualDivEstimate !== null && (
                    <div>
                      <span className="text-muted-foreground text-xs">Annual div est. </span>
                      <span>{formatMoney(annualDivEstimate, h.stock.currency)}/yr</span>
                    </div>
                  )}
                  {(h.total_dividends_received ?? 0) > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs">Dividends received </span>
                      <span className={TONE_TEXT.info}>{formatMoney(h.total_dividends_received!, h.stock.currency)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(TONE_TEXT.positive, 'border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30')}
                    onClick={() => setBuyingHolding(h)}
                  >
                    <TrendingUp className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(TONE_TEXT.negative, 'border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30')}
                    onClick={() => setSellingHolding(h)}
                  >
                    <TrendingDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Sell
                  </Button>
                  {h.annual_dividend_per_share > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setDividendHolding(h)}>
                      <DollarSign className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Log Dividend
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingHolding(h)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Edit
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : allHoldings !== undefined ? (
        <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <span className="text-sm text-muted-foreground">Not in your portfolio</span>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Add to Portfolio
          </Button>
        </div>
      ) : null}

      {/* Price Chart */}
      {stock.price_history_90d && stock.price_history_90d.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              90-Day Price
            </h2>
            {stock.day_change_pct != null && (
              <span className={cn('text-sm font-medium', gainLossColor(stock.day_change_pct))}>
                {formatPct(stock.day_change_pct)} today
              </span>
            )}
          </div>
          <SparklineChart
            data={stock.price_history_90d}
            color={dayPositive ? '#10b981' : '#ef4444'}
            height={80}
          />
        </div>
      )}

      {/* Only when we know there are no analyses at all: a stock with history but no
          latest_analysis must not claim it "hasn't been analysed". */}
      {!stock.latest_analysis && !historyLoading && !historyError && history?.data.length === 0 && (
        <div className="border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Awaiting analysis.</span> {stock.ticker} hasn’t
          been analysed yet. Results will appear here once it has been.
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
                  label={disagreementLabel(a.disagreement_score)}
                  score={a.disagreement_score}
                />
              </div>
              <ButtonLink variant="outline" size="sm" to={`/analysis/${a.analysis_id}`}>
                Full Analysis
              </ButtonLink>
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

            {l2 && (
              <PortfolioContextCard
                context={l2}
                accountNote={
                  l2.account_note_template
                    ? applyTemplate(l2.account_note_template, {
                        shares: holdingSnapshot ? sharesForTemplate : 0,
                        account_type: accountTypeLabel,
                      })
                    : undefined
                }
              />
            )}
          </div>
        )
      })()}

      {/* Analysis History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Analysis History</h2>
          <Button size="sm" disabled title="Requires backend — POST /api/analysis">
            Run New Analysis
          </Button>
        </div>

        {historyLoading ? (
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        ) : historyError ? (
          <QueryError what="analysis history" error={historyErrorValue} onRetry={refetchHistory} />
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
                  <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
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
                      {formatMoney(entry.price_at_analysis, stock.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entry.account_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatEnumLabel(entry.timeline)}
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
                      <ReturnCell entry={entry} />
                    </TableCell>
                    <TableCell>
                      <ButtonLink
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        to={`/analysis/${entry.analysis_id}`}
                        aria-label={`View analysis from ${formatDate(entry.analyzed_at)}`}
                      >
                        View
                      </ButtonLink>
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

      <BuySharesDialog
        key={buyingHolding?.holding_id ?? 'none-buy'}
        holding={buyingHolding}
        onClose={() => setBuyingHolding(null)}
      />
      <SellPositionDialog
        key={sellingHolding?.holding_id ?? 'none-sell'}
        holding={sellingHolding}
        onClose={() => setSellingHolding(null)}
      />
      <EditPositionDialog
        key={editingHolding?.holding_id ?? 'none-edit'}
        holding={editingHolding}
        onClose={() => setEditingHolding(null)}
      />
      <LogDividendDialog
        key={dividendHolding?.holding_id ?? 'none-div'}
        holding={dividendHolding}
        onClose={() => setDividendHolding(null)}
      />
      {stock && (
        <AddStockDialog
          mode="portfolio"
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          defaultStock={{
            stock_id: stock.stock_id,
            ticker: stock.ticker,
            name: stock.name,
            sector: stock.sector ?? '',
            exchange: stock.exchange ?? '',
            currency: stock.currency ?? 'CAD',
          }}
        />
      )}
    </div>
  )
}
