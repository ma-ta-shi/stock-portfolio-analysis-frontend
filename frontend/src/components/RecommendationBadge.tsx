import { Badge } from '@/components/ui/badge'
import { BADGE } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types'

interface Props {
  recommendation: Recommendation
  size?: 'sm' | 'lg'
}

const colorMap: Record<Recommendation, string> = {
  BUY: BADGE.positive,
  HOLD: BADGE.warningSoft,
  SELL: BADGE.negative,
}

export function RecommendationBadge({ recommendation, size = 'sm' }: Props) {
  return (
    <Badge
      className={cn(
        colorMap[recommendation],
        size === 'lg' && 'text-base px-3 py-1',
      )}
    >
      {recommendation}
    </Badge>
  )
}
