import { usePortfolioSummary } from '@/hooks/use-portfolio'
import { SparklineChart } from '@/components/SparklineChart'
import { formatCAD, formatPct } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function PortfolioSnapshotBar() {
  const { data, isLoading } = usePortfolioSummary()

  if (isLoading) {
    return (
      <div className="h-16 rounded-lg bg-muted animate-pulse mb-6" />
    )
  }
  if (!data) return null

  const dayPositive = data.day_change_cad >= 0

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-lg px-6 py-4 mb-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">
          {formatCAD(data.total_value_cad)}
        </div>
        <div
          className={cn(
            'text-sm font-medium mt-0.5',
            dayPositive ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {dayPositive ? '+' : ''}
          {formatCAD(data.day_change_cad)} ({formatPct(data.day_change_pct * 100)}) today
        </div>
      </div>
      <div className="w-40 h-10">
        <SparklineChart
          data={data.sparkline_30d}
          color={dayPositive ? '#10b981' : '#ef4444'}
          height={40}
        />
      </div>
    </div>
  )
}
