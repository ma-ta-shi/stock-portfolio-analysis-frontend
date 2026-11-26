import { usePortfolioSummary } from '@/hooks/use-portfolio'
import { SparklineChart } from '@/components/SparklineChart'
import { QueryError } from '@/components/QueryError'
import { formatCAD, formatDate, formatPct } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'

/** Home's value bar. It reads the same summary hook as the Portfolio header, so the two can never disagree. */
export function PortfolioSnapshotBar() {
  const { data, isLoading, isError, error, refetch } = usePortfolioSummary()

  if (isLoading) {
    return (
      <div className="h-16 rounded-lg bg-muted animate-pulse mb-6" />
    )
  }
  if (isError) {
    return <QueryError what="portfolio summary" error={error} onRetry={refetch} compact className="mb-6" />
  }
  if (!data) return null

  const change = data.day_change_cad
  const positive = (change ?? 0) >= 0

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-lg px-6 py-4 mb-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">
          {formatCAD(data.total_value_cad)}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">as of {formatDate(data.as_of)}</div>
        {change != null && (
          <div className={cn('text-sm font-medium mt-0.5', gainLossColor(change))}>
            {formatCAD(change, { signed: true })} ({formatPct(data.day_change_pct)}) from {formatDate(data.day_change_from ?? '')} to {formatDate(data.day_change_to ?? '')}
            {data.day_change_includes_flows ? ', includes cash or trades' : ''}
          </div>
        )}
      </div>
      {data.sparkline_30d.length > 1 && (
        <div className="w-40 h-10">
          <SparklineChart
            data={data.sparkline_30d}
            color={positive ? '#10b981' : '#ef4444'}
            height={40}
          />
        </div>
      )}
    </div>
  )
}
