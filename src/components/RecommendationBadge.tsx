import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types'

interface Props {
  recommendation: Recommendation
  size?: 'sm' | 'lg'
}

const colorMap: Record<Recommendation, string> = {
  BUY: 'bg-emerald-600 text-white hover:bg-emerald-600',
  HOLD: 'bg-amber-500 text-white hover:bg-amber-500',
  SELL: 'bg-red-600 text-white hover:bg-red-600',
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
