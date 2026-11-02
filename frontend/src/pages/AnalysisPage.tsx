import { useParams } from 'react-router-dom'
import { useAnalysisRun, useAgentResults } from '@/hooks/use-analysis'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { OutlookBadge } from '@/components/OutlookBadge'
import { RecommendationBadge } from '@/components/RecommendationBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { DisagreementIndicator } from '@/components/DisagreementIndicator'
import { StockInfoSection } from '@/components/StockInfoSection'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { PortfolioContextCard } from '@/components/PortfolioContextCard'
import { QueryError } from '@/components/QueryError'
import { useFxRates } from '@/hooks/use-fx-rates'
import { isNotFound } from '@/lib/api'
import { formatAgentName, formatDate, formatEnumLabel, formatMoney } from '@/lib/format'
import { applyTemplate, buildHoldingSnapshot } from '@/lib/portfolio'
import { BADGE } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { SignalDirection } from '@/types'

const signalColors: Record<SignalDirection, string> = {
  bullish: BADGE.positiveSoft,
  neutral: BADGE.neutral,
  bearish: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-200',
}

export function AnalysisPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const id = analysisId ?? ''

  const runQuery = useAnalysisRun(id)
  const agentsQuery = useAgentResults(id)
  const { data: holdings } = usePortfolioHoldings()
  const { rates } = useFxRates()
  const run = runQuery.data
  const agents = agentsQuery.data
  const runLoading = runQuery.isLoading
  const agentsLoading = agentsQuery.isLoading

  if (runLoading || agentsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const failed = [runQuery, agentsQuery].find((q) => q.isError && !isNotFound(q.error))
  if (failed) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <QueryError
          what="analysis"
          error={failed.error}
          onRetry={() => {
            void runQuery.refetch()
            void agentsQuery.refetch()
          }}
        />
      </div>
    )
  }

  if (!run || !agents) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12 text-muted-foreground">
        Analysis not found
      </div>
    )
  }

  const rec = run.final_recommendation
  const l2 = run.layer2_context
  const keyDrivers = rec.stock_outlook.key_drivers ?? []

  // Prefer the position in the analysed account; fall back to all accounts holding this stock.
  const stockHoldings = holdings?.filter((h) => h.stock.stock_id === run.stock.stock_id) ?? []
  const fallbackHoldingSnapshot =
    buildHoldingSnapshot(stockHoldings.filter((h) => h.account_type === run.account_type), rates) ??
    buildHoldingSnapshot(stockHoldings, rates)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stock Info */}
      <StockInfoSection
        stock={run.stock}
        price={run.data_bundle_summary.price_at_analysis}
        marketCapCad={run.data_bundle_summary.market_cap_cad}
        fundamentals={run.stock_fundamentals}
        holdingSnapshot={fallbackHoldingSnapshot}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{run.stock.ticker}</h1>
            <OutlookBadge direction={rec.stock_outlook.direction} size="lg" />
          </div>
          <div className="text-muted-foreground mt-0.5">{run.stock.name}</div>
          <div className="flex items-center gap-4 mt-2">
            <ConfidenceMeter score={rec.confidence_score} />
            <DisagreementIndicator
              label={rec.disagreement_label}
              score={rec.disagreement_score}
            />
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>{run.account_type.toUpperCase()} · {formatEnumLabel(run.timeline)}</div>
          <div>{formatDate(run.completed_at)}</div>
        </div>
      </div>

      {/* Layer 1 — Stock Outlook */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Layer 1 — Stock Outlook
        </h2>
        {keyDrivers.length > 0 && (
          <ul className="space-y-1">
            {keyDrivers.map((driver, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-muted-foreground shrink-0">·</span>
                <span className="font-medium">{driver}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm leading-relaxed">{rec.executive_summary}</p>
        {rec.cio_rationale && (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Rationale</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{rec.cio_rationale}</p>
          </div>
        )}
      </div>

      {l2 && (
        <PortfolioContextCard
          context={l2}
          accountNote={
            agents.cio.account_specific_note
              ? applyTemplate(agents.cio.account_specific_note, {
                  shares: fallbackHoldingSnapshot?.shares ?? 0,
                  account_type: run.account_type.toUpperCase(),
                })
              : undefined
          }
        />
      )}

      {/* Agent Accordion */}
      <div>
        <h2 className="font-semibold mb-3">Agent Results</h2>
        <Accordion multiple className="space-y-2">
          {/* Pass 1 */}
          {Object.values(agents.pass_1 ?? {}).map((result) => {
            const keyFindings = result.key_findings ?? []
            const criticalRisks = result.critical_risks ?? []
            return (
            <AccordionItem
              key={result.agent}
              value={result.agent}
              className="border border-border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      signalColors[result.signal],
                    )}
                  >
                    {result.signal}
                  </span>
                  <span className="text-sm font-medium">{formatAgentName(result.agent)}</span>
                  <Badge variant="outline" className="text-xs">Pass 1</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-3">
                {keyFindings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Findings</p>
                    <ul className="space-y-1">
                      {keyFindings.map((f, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-muted-foreground shrink-0">·</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {criticalRisks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">Critical Risks</p>
                    <ul className="space-y-1">
                      {criticalRisks.map((r, i) => (
                        <li key={i} className="text-sm flex gap-2 text-red-700 dark:text-red-400">
                          <span className="shrink-0" aria-hidden="true">⚠</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            )
          })}

          {/* Pass 2 */}
          {Object.values(agents.pass_2 ?? {}).map((result) => {
            const keyArguments = result.key_arguments ?? []
            return (
            <AccordionItem
              key={result.agent}
              value={result.agent}
              className="border border-border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <RecommendationBadge recommendation={result.recommendation} />
                  <span className="text-xs text-muted-foreground">{result.confidence_score}%</span>
                  <span className="text-sm font-medium">{formatAgentName(result.agent)}</span>
                  <Badge variant="outline" className="text-xs">Pass 2</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                {keyArguments.length > 0 && (
                  <ul className="space-y-1">
                    {keyArguments.map((a, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-muted-foreground shrink-0">·</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4">
        <span>
          Price at analysis:{' '}
          <span className="font-medium text-foreground">
            {formatMoney(run.data_bundle_summary.price_at_analysis, run.stock.currency)}
          </span>
        </span>
        <span>
          Duration:{' '}
          <span className="font-medium text-foreground">{run.duration_seconds}s</span>
        </span>
        <span>
          Completed:{' '}
          <span className="font-medium text-foreground">{formatDate(run.completed_at)}</span>
        </span>
        <span>
          Trace: <span className="font-mono text-foreground">{run.trace_id}</span>
        </span>
      </div>
    </div>
  )
}
