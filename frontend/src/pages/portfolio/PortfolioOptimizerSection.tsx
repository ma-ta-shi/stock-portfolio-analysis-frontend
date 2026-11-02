import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePortfolioOptimizer } from '@/hooks/use-portfolio'
import { Badge } from '@/components/ui/badge'
import { QueryError } from '@/components/QueryError'
import { formatCAD } from '@/lib/format'
import { BADGE } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { PortfolioAccountView, SwapSuggestion, RebalanceSuggestion } from '@/types'

const riskColors = {
  lower: 'text-emerald-700 dark:text-emerald-400',
  neutral: 'text-muted-foreground',
  higher: 'text-red-600 dark:text-red-400',
}

const riskIcons = {
  lower: TrendingDown,
  neutral: Minus,
  higher: TrendingUp,
}

function SwapCard({ swap }: { swap: SwapSuggestion }) {
  const RiskIcon = riskIcons[swap.risk_change]
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Sell</div>
          <div className="font-semibold text-red-600 dark:text-red-400">{swap.sell.ticker}</div>
          <Badge variant="outline" className="text-xs mt-1">{swap.sell.account_type.toUpperCase()}</Badge>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Buy</div>
          <div className="font-semibold text-emerald-700 dark:text-emerald-400">{swap.buy.ticker}</div>
          <Badge variant="outline" className="text-xs mt-1">{swap.buy.account_type.toUpperCase()}</Badge>
        </div>
        <div className="ml-auto text-right space-y-0.5">
          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            +{(swap.expected_return_improvement_pct).toFixed(1)}% expected
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(swap.confidence * 100)}% confidence
          </div>
          <div className={cn('text-xs flex items-center gap-1 justify-end', riskColors[swap.risk_change])}>
            <RiskIcon className="w-3 h-3" aria-hidden="true" />
            {swap.risk_change} risk
          </div>
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-2">
        <p><span className="font-medium text-foreground">Sell rationale:</span> {swap.sell.rationale}</p>
        <p><span className="font-medium text-foreground">Buy rationale:</span> {swap.buy.rationale}</p>
      </div>
    </div>
  )
}

function RebalanceCard({ suggestion }: { suggestion: RebalanceSuggestion }) {
  const isIncrease = suggestion.action === 'increase'
  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{suggestion.ticker}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {suggestion.current_weight_pct.toFixed(1)}% → {suggestion.target_weight_pct.toFixed(1)}%
          </div>
        </div>
        <div className="text-right">
          <Badge
            className={cn(
              'text-xs',
              isIncrease
                ? BADGE.positive
                : 'bg-orange-700 text-white',
            )}
          >
            {isIncrease ? '▲' : '▼'} {isIncrease ? 'Add' : 'Trim'} {formatCAD(suggestion.amount_cad)}
          </Badge>
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(suggestion.confidence * 100)}% confidence
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
    </div>
  )
}

interface PortfolioOptimizerSectionProps {
  accountFilter?: PortfolioAccountView
}

export function PortfolioOptimizerSection({ accountFilter }: PortfolioOptimizerSectionProps) {
  const { data: rawData, isLoading, isError, error, refetch } = usePortfolioOptimizer()

  const data = rawData && accountFilter && accountFilter !== 'combined'
    ? {
        ...rawData,
        swap_suggestions: rawData.swap_suggestions.filter(
          (s) => s.sell.account_type === accountFilter || s.buy.account_type === accountFilter,
        ),
        // RebalanceSuggestion has no account_type yet, so these can't be filtered per account.
        rebalance_suggestions: rawData.rebalance_suggestions,
      }
    : rawData

  if (isLoading) {
    return <div className="h-32 rounded-lg bg-muted animate-pulse" />
  }

  if (isError) {
    return <QueryError what="optimizer suggestions" error={error} onRetry={refetch} />
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Portfolio Optimizer</h2>

      {data.no_changes_needed ? (
        <div className="border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
          Your portfolio is well-positioned — no changes suggested.
        </div>
      ) : (
        <div className="space-y-6">
          {data.swap_suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Swap Suggestions
              </h3>
              {data.swap_suggestions.map((swap, i) => (
                <SwapCard key={`${swap.sell.ticker}-${swap.buy.ticker}-${i}`} swap={swap} />
              ))}
            </div>
          )}
          {data.rebalance_suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Rebalance Suggestions
              </h3>
              {data.rebalance_suggestions.map((s, i) => (
                <RebalanceCard key={`${s.ticker}-${i}`} suggestion={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
