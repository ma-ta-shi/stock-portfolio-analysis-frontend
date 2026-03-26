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
import { formatDate, formatAgentName, formatCAD } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Holding, HoldingSnapshot, SignalDirection, PortfolioFit } from '@/types'

function applyTemplate(template: string, vars: Record<string, string | number>) {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, String(value))
  }
  return out
}

function buildHoldingSnapshot(holdings: Holding[]): HoldingSnapshot | undefined {
  if (!holdings.length) return undefined

  const totalShares = holdings.reduce((s, h) => s + h.shares, 0)
  if (totalShares <= 0) return undefined

  const bookCost = holdings.reduce((s, h) => s + h.shares * h.average_cost_basis, 0)
  const currentValue = holdings.reduce((s, h) => s + h.market_value, 0)
  const totalReturnCad = holdings.reduce((s, h) => s + h.total_gain_loss, 0)
  const dayChangeCad = holdings.reduce((s, h) => s + h.day_change * h.shares, 0)

  // Weighted average yield on cost
  const yieldOnCost = holdings.reduce((s, h) => s + h.yield_on_cost * h.shares, 0) / totalShares

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

const signalColors: Record<SignalDirection, string> = {
  bullish: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  neutral: 'bg-muted text-muted-foreground',
  bearish: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

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

export function AnalysisPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const id = analysisId ?? ''

  const { data: run, isLoading: runLoading } = useAnalysisRun(id)
  const { data: agents, isLoading: agentsLoading } = useAgentResults(id)
  const { data: holdings } = usePortfolioHoldings()

  if (runLoading || agentsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
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

  const holdingSnapshot = buildHoldingSnapshot(
    holdings?.filter((h) => h.stock.stock_id === run.stock.stock_id && h.account_type === run.account_type) ??
      [],
  )
  const fallbackHoldingSnapshot = holdingSnapshot
    ? holdingSnapshot
    : buildHoldingSnapshot(holdings?.filter((h) => h.stock.stock_id === run.stock.stock_id) ?? [])

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
          <div>{run.account_type.toUpperCase()} · {run.timeline.replace('_', ' ')}</div>
          <div>{formatDate(run.completed_at)}</div>
        </div>
      </div>

      {/* Layer 1 — Stock Outlook */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Layer 1 — Stock Outlook
        </h2>
        {rec.stock_outlook.key_drivers.length > 0 && (
          <ul className="space-y-1">
            {rec.stock_outlook.key_drivers.map((driver, i) => (
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

      {/* Layer 2 — Portfolio Context */}
      {l2 && (
        <div className={cn('border rounded-lg p-5 space-y-3', fitBoxColors[l2.portfolio_fit])}>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Layer 2 — Portfolio Context
          </h2>
          <div className="flex items-center gap-2">
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
          {agents.cio.account_specific_note && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Account Note</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {applyTemplate(agents.cio.account_specific_note, {
                  shares: fallbackHoldingSnapshot?.shares ?? 0,
                  account_type: run.account_type.toUpperCase(),
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

      {/* Agent Accordion */}
      <div>
        <h2 className="font-semibold mb-3">Agent Results</h2>
        <Accordion multiple className="space-y-2">
          {/* Pass 1 */}
          {Object.values(agents.pass_1).map((result) => (
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
                {result.key_findings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Findings</p>
                    <ul className="space-y-1">
                      {result.key_findings.map((f, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-muted-foreground shrink-0">·</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.critical_risks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-1.5">Critical Risks</p>
                    <ul className="space-y-1">
                      {result.critical_risks.map((r, i) => (
                        <li key={i} className="text-sm flex gap-2 text-red-700 dark:text-red-400">
                          <span className="shrink-0">⚠</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}

          {/* Pass 2 */}
          {Object.values(agents.pass_2).map((result) => (
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
                {result.key_arguments.length > 0 && (
                  <ul className="space-y-1">
                    {result.key_arguments.map((a, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-muted-foreground shrink-0">·</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4">
        <span>
          Price at analysis:{' '}
          <span className="font-medium text-foreground">
            ${run.data_bundle_summary.price_at_analysis}
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
