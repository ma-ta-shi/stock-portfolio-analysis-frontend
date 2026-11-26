import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Plus, DollarSign, Pencil } from 'lucide-react'
import { useAnalysisResult } from '@/hooks/use-analysis'
import { useStock, useStockFundamentals, useStockHistory, useStockPrices, useStockSnapshot } from '@/hooks/use-stock-detail'
import { useHoldingActions } from '@/hooks/use-holding-actions'
import { usePortfolioHoldings, useTransactionHistory } from '@/hooks/use-portfolio'
import { DetailLoading } from '@/components/DetailLoading'
import { StockInfoSection } from '@/components/StockInfoSection'
import { FieldList } from '@/components/FieldList'
import { StockCall } from '@/components/StockCall'
import { SparklineChart } from '@/components/SparklineChart'
import { RegistryTable } from '@/components/RegistryTable'
import { HoldingActionDialogs } from '@/components/ledger/HoldingActionDialogs'
import { AddStockDialog } from '@/components/AddStockDialog'
import { LedgerTable } from '@/components/ledger/LedgerTable'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ButtonLink'
import { Badge } from '@/components/ui/badge'
import { PortfolioContextCard } from '@/components/PortfolioContextCard'
import { StockOutlookLayer } from '@/components/StockOutlookLayer'
import { QueryError } from '@/components/QueryError'
import { useFxRates } from '@/hooks/use-fx-rates'
import { isNotFound } from '@/lib/api'
import { fieldsFor } from '@/lib/fields'
import { formatDate, formatMoney, formatPct } from '@/lib/format'
import { notConnectedMessage } from '@/lib/gaps'
import { gainLossColor, TONE_TEXT } from '@/lib/labels'
import { buildHoldingSnapshot } from '@/lib/portfolio'
import { mapDrivers } from '@/lib/stock-detail'
import { isAwaitingAnalysis } from '@/lib/stock-snapshot'
import { EMPTY_FILTERS } from '@/lib/transactions'
import { cn } from '@/lib/utils'
import { CALL_DETAIL_FIELDS } from '@/screens/stock'
import { HISTORY_FIELDS } from '@/screens/stock-detail'

const HISTORY_COLUMNS = fieldsFor(HISTORY_FIELDS, 'column')

/** Every ledger row of one stock, in every account; nothing is drawn until there is one. */
function StockHistory({ ticker }: { ticker: string }) {
  const { data, isError, error, refetch } = useTransactionHistory({ ...EMPTY_FILTERS, ticker }, 'combined')
  // A stock the ledger has never heard of has no history, not an error.
  if (isError && !isNotFound(error)) {
    return <QueryError what="transaction history" error={error} onRetry={refetch} compact />
  }
  const rows = data?.filter((t) => t.stock?.ticker === ticker)
  if (!rows?.length) return null
  return (
    <section aria-label="Transactions and dividends" className="space-y-2">
      <h2 className="text-sm font-semibold">Transactions and dividends</h2>
      <LedgerTable rows={rows} oneStock />
    </section>
  )
}

export function StockPage() {
  const { stockId } = useParams<{ stockId: string }>()
  const id = stockId ?? ''
  const navigate = useNavigate()

  const detail = useStock(id)
  const stock = detail.data
  const snapshot = useStockSnapshot(id)
  const call = snapshot.data ?? null
  const fundamentals = useStockFundamentals(id)
  const prices = useStockPrices(id)
  const latest = useAnalysisResult(call?.analysis?.runId)
  const history = useStockHistory(id, stock)
  const { data: allHoldings } = usePortfolioHoldings()
  const { rates } = useFxRates()

  const holdingsForStock = allHoldings?.filter((h) => h.stock.stock_id === id) ?? []
  const holdingSnapshot = buildHoldingSnapshot(holdingsForStock, rates)

  const actions = useHoldingActions()
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  if (detail.isLoading) {
    return <DetailLoading />
  }

  if (detail.isError && !isNotFound(detail.error)) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <QueryError what="stock data" error={detail.error} onRetry={detail.refetch} />
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

  const supported = stock.pipeline_supported !== false
  const closes = prices.data ?? []
  const change = call?.changeDay ?? null
  const result = latest.data
  const drivers = mapDrivers(result?.key_drivers)
  const neverAnalysed = supported && !snapshot.isLoading && !snapshot.isError && isAwaitingAnalysis({ call }) && history.data?.length === 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="sr-only">
        {stock.ticker} — {stock.name}
      </h1>
      <StockInfoSection
        stock={stock}
        price={call?.price ?? null}
        priceNote={call?.priceDay ? `Close of ${formatDate(call.priceDay)}` : undefined}
        fundamentals={fundamentals.data}
        holdingSnapshot={holdingSnapshot}
      />
      {snapshot.isError && <QueryError what="price and latest call" error={snapshot.error} onRetry={snapshot.refetch} compact />}
      {fundamentals.isError && <QueryError what="fundamentals" error={fundamentals.error} onRetry={fundamentals.refetch} compact />}

      {/* Position Actions */}
      {holdingsForStock.length > 0 ? (
        <div className="bg-card border border-border rounded-lg px-4 py-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Position</p>
          {holdingsForStock.map((h) => {
            const annualDivEstimate = (h.expected_income_per_share ?? 0) > 0
              ? (h.expected_income_per_share ?? 0) * h.shares
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
                    onClick={() => actions.open('buy', h)}
                  >
                    <TrendingUp className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(TONE_TEXT.negative, 'border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30')}
                    onClick={() => actions.open('sell', h)}
                  >
                    <TrendingDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Sell
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => actions.open('dividend', h)}>
                    <DollarSign className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Log Dividend
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => actions.open('edit', h)}>
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

      <StockHistory ticker={stock.ticker} />

      {/* Price Chart */}
      {prices.isError && <QueryError what="price history" error={prices.error} onRetry={prices.refetch} compact />}
      {closes.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              90-Day Price
            </h2>
            {change != null && (
              <span className={cn('text-sm font-medium', gainLossColor(change))}>{formatPct(change)} today</span>
            )}
          </div>
          <SparklineChart data={closes} color={(change ?? 0) >= 0 ? '#10b981' : '#ef4444'} height={80} />
        </div>
      )}

      {!supported && (
        <div className="border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
          This security is not analysed{stock.unsupported_reason ? `: ${stock.unsupported_reason}` : ''}.
        </div>
      )}

      {neverAnalysed && (
        <div className="border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Awaiting analysis.</span> {stock.ticker} hasn’t
          been analysed yet. Results will appear here once it has been.
        </div>
      )}

      {/* Latest Analysis */}
      {supported && call?.analysis && (
        <div className="space-y-3">
          <section aria-label="Latest call" className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <StockCall call={call} link={false} />
              <ButtonLink variant="outline" size="sm" to={`/analysis/${call.analysis.runId}`}>
                Full Analysis
              </ButtonLink>
            </div>
            <FieldList fields={CALL_DETAIL_FIELDS} row={{ stock, call }} />
            {call.analysis.targetPrice != null && <p className="text-xs text-muted-foreground">Target and return are at the latest price.</p>}
          </section>

          <StockOutlookLayer
            date={call.analysis.asOf}
            drivers={drivers}
            narrative={result?.synthesis_narrative}
            error={latest.isError ? <QueryError what="latest analysis" error={latest.error} onRetry={latest.refetch} compact /> : null}
          />

          <PortfolioContextCard />
        </div>
      )}

      {/* Analysis History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Analysis History</h2>
          <Button size="sm" disabled title={notConnectedMessage('S-4')}>
            Run New Analysis
          </Button>
        </div>

        {history.isError ? (
          <QueryError what="analysis history" error={history.error} onRetry={history.refetch} />
        ) : !history.data ? (
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        ) : !history.data.length ? (
          <div className="border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
            No analyses yet for {stock.ticker}.
          </div>
        ) : (
          <RegistryTable
            dense
            columns={HISTORY_COLUMNS}
            rows={history.data}
            rowKey={(r) => r.analysis_id}
            rowLabel={(r) => `the analysis of ${formatDate(r.call.analysis!.asOf!)}`}
            detail={HISTORY_FIELDS}
            actions={(r) => (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                aria-label={`View analysis from ${formatDate(r.call.analysis!.asOf!)}`}
                onClick={() => navigate(`/analysis/${r.analysis_id}`)}
              >
                View
              </Button>
            )}
          />
        )}
      </div>

      <HoldingActionDialogs actions={actions} />
      {stock && (
        <AddStockDialog
          key={stock.stock_id}
          mode="portfolio"
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          defaultStock={stock}
        />
      )}
    </div>
  )
}
