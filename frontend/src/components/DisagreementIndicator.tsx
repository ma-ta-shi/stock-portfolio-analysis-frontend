import { cn } from '@/lib/utils'
import type { DisagreementLabel } from '@/types'

interface Props {
  label: DisagreementLabel
  score?: number
}

const colorMap: Record<DisagreementLabel, string> = {
  low: 'text-emerald-700 dark:text-emerald-400',
  moderate: 'text-amber-700 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
}

export function DisagreementIndicator({ label, score }: Props) {
  return (
    <span className={cn('text-sm capitalize', colorMap[label])}>
      {label}
      {score !== undefined && (
        <span className="text-xs ml-1">({score.toFixed(2)})</span>
      )}
    </span>
  )
}
