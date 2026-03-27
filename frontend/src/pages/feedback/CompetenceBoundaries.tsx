import { useFeedback } from '@/hooks/use-feedback'
import { Badge } from '@/components/ui/badge'

export function CompetenceBoundaries() {
  const { data, isLoading } = useFeedback()

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (!data) return null

  const { competence_boundaries, learning_journal } = data
  const journal = [...learning_journal].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Competence Boundaries</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Best Sectors</div>
            <div className="flex flex-wrap gap-1">
              {competence_boundaries.best_performing_sectors.map((s) => (
                <Badge key={s} className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-200">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Weakest Sectors</div>
            <div className="flex flex-wrap gap-1">
              {competence_boundaries.weakest_performing_sectors.map((s) => (
                <Badge key={s} variant="outline" className="text-xs text-red-600 border-red-200">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Best Timeline</div>
            <span className="font-medium">{competence_boundaries.best_timeline}</span>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Weakest Timeline</div>
            <span className="font-medium text-muted-foreground">
              {competence_boundaries.weakest_timeline}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Learning Journal</h3>
        <ul className="space-y-2">
          {journal.map((entry, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-xs text-muted-foreground shrink-0 pt-0.5 tabular-nums">
                {new Date(entry.date).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>{entry.insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
