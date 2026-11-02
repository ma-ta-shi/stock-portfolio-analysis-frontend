import { useFeedback } from '@/hooks/use-feedback'
import { cn } from '@/lib/utils'
import { formatPct, formatPercent } from '@/lib/format'
import { gainLossColor } from '@/lib/labels'

interface StatCardProps {
  label: string
  value: string
  valueClass?: string
  sub?: string
}

function StatCard({ label, value, valueClass, sub }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-2xl font-semibold', valueClass)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

export function AccuracyCards() {
  const { data, isLoading } = useFeedback()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }
  if (!data) return null

  const s = data.accuracy_summary
  const dirPct = s.direction_accuracy * 100
  const dirColor =
    dirPct >= 70 ? 'text-emerald-700 dark:text-emerald-400' : dirPct >= 55 ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Direction Accuracy"
        value={formatPercent(s.direction_accuracy, 0)}
        valueClass={dirColor}
        sub={`${s.total_scored_predictions} predictions scored`}
      />
      <StatCard
        label="Avg Composite Score"
        value={`${s.avg_composite_score.toFixed(2)}`}
        sub="out of 1.0"
      />
      <StatCard
        label="Alpha vs TSX"
        value={formatPct(s.alpha_vs_tsx_pct)}
        valueClass={gainLossColor(s.alpha_vs_tsx_pct)}
        sub="vs benchmark"
      />
      <StatCard
        label="Predictions Scored"
        value={String(s.total_scored_predictions)}
        sub="completed checkpoints"
      />
    </div>
  )
}
