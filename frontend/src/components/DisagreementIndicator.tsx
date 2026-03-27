import { cn } from '@/lib/utils'
import type { DisagreementLabel } from '@/types'

interface Props {
  label: DisagreementLabel
  score?: number
}

const colorMap: Record<DisagreementLabel, string> = {
  low: 'text-emerald-600',
  moderate: 'text-amber-500',
  high: 'text-red-600',
}

export function DisagreementIndicator({ label, score }: Props) {
  return (
    <span className={cn('text-sm capitalize', colorMap[label])}>
      {label}
      {score !== undefined && (
        <span className="text-xs ml-1 opacity-70">({score.toFixed(2)})</span>
      )}
    </span>
  )
}
