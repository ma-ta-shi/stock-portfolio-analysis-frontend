import { cn } from '@/lib/utils'
import { TONE_TEXT } from '@/lib/labels'
import type { DisagreementLabel } from '@/types'

interface Props {
  label: DisagreementLabel
  score?: number
}

const colorMap: Record<DisagreementLabel, string> = {
  low: TONE_TEXT.positive,
  moderate: TONE_TEXT.warning,
  high: TONE_TEXT.negative,
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
