import { useFeedback } from '@/hooks/use-feedback'
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function formatAgentName(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function AgentAccuracyTable() {
  const { data, isLoading } = useFeedback()

  if (isLoading) {
    return <div className="h-56 rounded-lg bg-muted animate-pulse" />
  }
  if (!data) return null

  const entries = Object.entries(data.by_agent_accuracy)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Agent Accuracy</h3>
      <div className="space-y-3">
        {entries.map(([key, entry]) => {
          const accPct = Math.round(entry.signal_accuracy * 100)
          const accColor =
            accPct >= 70
              ? 'text-emerald-600'
              : accPct >= 55
                ? 'text-amber-500'
                : 'text-red-600'
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{formatAgentName(key)}</span>
                <span className={cn('text-xs font-medium', accColor)}>{accPct}%</span>
              </div>
              <Progress value={Math.round(entry.contribution_score * 100)}>
                <ProgressTrack>
                  <ProgressIndicator className="bg-emerald-500" />
                </ProgressTrack>
              </Progress>
            </div>
          )
        })}
      </div>
    </div>
  )
}
