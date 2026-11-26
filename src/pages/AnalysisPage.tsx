import { useParams } from 'react-router-dom'
import { useAnalysisResult } from '@/hooks/use-analysis'
import { useStock, useStockFundamentals, useStockHistory } from '@/hooks/use-stock-detail'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { useFxRates } from '@/hooks/use-fx-rates'
import { DetailLoading } from '@/components/DetailLoading'
import { StockInfoSection } from '@/components/StockInfoSection'
import { StockCall } from '@/components/StockCall'
import { StockOutlookLayer } from '@/components/StockOutlookLayer'
import { FieldList } from '@/components/FieldList'
import { PortfolioContextCard } from '@/components/PortfolioContextCard'
import { QueryError } from '@/components/QueryError'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { mapAgents, type AgentView, type ApiResult } from '@/lib/analysis-result'
import { isNotFound } from '@/lib/api'
import { fieldText, fieldsFor } from '@/lib/fields'
import { formatDate, formatEnumLabel } from '@/lib/format'
import { unavailableLabel } from '@/lib/gaps'
import { TONE_TEXT } from '@/lib/labels'
import { buildHoldingSnapshot } from '@/lib/portfolio'
import { mapDrivers } from '@/lib/stock-detail'
import { mapResultCall, predatesPriceBand } from '@/lib/stock-snapshot'
import { cn } from '@/lib/utils'
import { AGENT_FIELDS, FOOTER_FIELDS, type AnalysisFooter } from '@/screens/analysis'
import { CALL_DETAIL_FIELDS } from '@/screens/stock'

const SECTIONS = fieldsFor(AGENT_FIELDS, 'detail')
const [CONFIDENCE] = fieldsFor(AGENT_FIELDS, 'column')

function AgentItem({ agent }: { agent: AgentView }) {
  const sections = SECTIONS.map((spec) => ({ spec, content: spec.render?.(agent) })).filter((s) => s.content)
  return (
    <AccordionItem value={agent.key} className="border border-border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 text-left">
          <span className="text-sm font-medium">{agent.name}</span>
          <Badge variant="outline" className="text-xs">Pass {agent.pass}</Badge>
          {agent.confidence != null && (
            <span className="text-xs text-muted-foreground">
              {CONFIDENCE.label} {fieldText(CONFIDENCE, agent)}
            </span>
          )}
          {!agent.completed && <span className={cn('text-xs', TONE_TEXT.warning)}>Did not finish</span>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 space-y-3">
        {sections.map(({ spec, content }) => (
          <div key={spec.id} className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">{spec.label}</h3>
            {content}
          </div>
        ))}
        {sections.length === 0 && <p className="text-sm text-muted-foreground">Nothing was recorded.</p>}
      </AccordionContent>
    </AccordionItem>
  )
}

/** What a run that is not complete says instead of a call. */
function RunState({ result }: { result: ApiResult }) {
  if (result.status === 'complete') return null
  return (
    <div role="status" className="border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground">
      {result.status === 'failed'
        ? `This analysis failed${result.failure ? ` at ${result.failure.stage}: ${result.failure.message}` : '.'}`
        : 'This analysis is still running. Reload the page to check again.'}
    </div>
  )
}

export function AnalysisPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const query = useAnalysisResult(analysisId)
  const result = query.data
  const old = predatesPriceBand(result?.triggered_at)
  // nothing else is read for a run that is not shown
  const stockId = old ? '' : (result?.stock?.stock_id ?? '')

  // The result names the stock without its sector, so the header reads the directory row, as the Stock page does.
  const detail = useStock(stockId)
  const stock = detail.data
  const fundamentals = useStockFundamentals(stockId)
  // Where the price band was unavailable, the price of the run is the one its prediction recorded.
  const history = useStockHistory(stockId, stock)
  const { data: holdings } = usePortfolioHoldings()
  const { rates } = useFxRates()

  if (query.isLoading || detail.isLoading) {
    return <DetailLoading />
  }

  const failed = [query, detail].find((q) => q.isError && !isNotFound(q.error))
  if (failed) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <QueryError what="analysis" error={failed.error} onRetry={failed.refetch} />
      </div>
    )
  }

  if (old) {
    return (
      <div role="status" className="max-w-3xl mx-auto text-center py-12 text-muted-foreground">
        This analysis was made before the price range was introduced and is no longer shown.
      </div>
    )
  }

  if (!result?.stock || !stock) {
    return <div className="max-w-3xl mx-auto text-center py-12 text-muted-foreground">Analysis not found.</div>
  }

  const call = mapResultCall(result, result.stock)
  const price = result.price_band?.current_price ?? history.data?.find((r) => r.analysis_id === result.analysis_id)?.priceAtAnalysis ?? null
  const footer: AnalysisFooter = {
    analysisId: result.analysis_id,
    currency: stock.currency,
    price,
    durationS: result.duration_s ?? null,
    completedAt: result.completed_at ?? null,
  }
  const holdingSnapshot = buildHoldingSnapshot(holdings?.filter((h) => h.stock.stock_id === stockId) ?? [], rates)
  const agents = mapAgents(result.agent_outputs ?? [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StockInfoSection
        stock={stock}
        price={price}
        priceNote="Price at analysis"
        noPrice={history.isLoading ? 'Loading price' : 'No price recorded'}
        fundamentalsNote={`These and the market cap are the newest. Those at the time of this analysis: ${unavailableLabel('S-6')}`}
        fundamentals={fundamentals.data}
        holdingSnapshot={holdingSnapshot}
      />
      {fundamentals.isError && <QueryError what="fundamentals" error={fundamentals.error} onRetry={fundamentals.refetch} compact />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{stock.ticker}</h1>
          <div className="text-muted-foreground mt-0.5">{stock.name}</div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>
            Account: {unavailableLabel('S-3')}
            {result.timeline && ` · ${formatEnumLabel(result.timeline)}`}
          </div>
          {call.analysis?.asOf && <div>{formatDate(call.analysis.asOf)}</div>}
        </div>
      </div>

      <RunState result={result} />

      {result.status === 'complete' && (
        <>
          <section aria-label="Call" className="space-y-2">
            <StockCall call={call} link={false} />
            <FieldList fields={CALL_DETAIL_FIELDS} row={{ stock, call }} />
            {call.analysis?.targetPrice != null && <p className="text-xs text-muted-foreground">Target and return are at the price at analysis.</p>}
          </section>

          <StockOutlookLayer drivers={mapDrivers(result.key_drivers)} narrative={result.synthesis_narrative} />

          <PortfolioContextCard />
        </>
      )}

      {agents.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Agent Results</h2>
          <Accordion multiple className="space-y-2">
            {agents.map((agent) => (
              <AgentItem key={agent.key} agent={agent} />
            ))}
          </Accordion>
        </div>
      )}

      <dl className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4">
        {FOOTER_FIELDS.map((spec) => (
          <div key={spec.id} className="flex gap-1">
            <dt>{spec.label}:</dt>
            <dd className={cn('text-foreground', spec.id === 'trace' ? 'font-mono break-all' : 'font-medium')}>{fieldText(spec, footer)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
