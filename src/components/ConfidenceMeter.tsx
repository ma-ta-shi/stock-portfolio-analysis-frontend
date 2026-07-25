import { cn } from '@/lib/utils'

interface Props {
  score: number
  showLabel?: boolean
}

export function ConfidenceMeter({ score, showLabel = true }: Props) {
  const color =
    score >= 75
      ? 'bg-emerald-500'
      : score >= 55
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{score}%</span>
      )}
    </div>
  )
}
