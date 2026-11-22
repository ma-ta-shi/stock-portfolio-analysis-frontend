import { Badge } from '@/components/ui/badge'
import { BADGE } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { StockOutlookDirection } from '@/types'

interface Props {
  direction: StockOutlookDirection
  size?: 'sm' | 'lg'
}

const colorMap: Record<StockOutlookDirection, string> = {
  bullish: BADGE.positive,
  somewhat_bullish: BADGE.positiveSoft,
  neutral: BADGE.warningSoft,
  somewhat_bearish: BADGE.cautionSoft,
  bearish: BADGE.negative,
}

const labelMap: Record<StockOutlookDirection, string> = {
  bullish: 'Bullish',
  somewhat_bullish: 'Somewhat Bullish',
  neutral: 'Neutral',
  somewhat_bearish: 'Somewhat Bearish',
  bearish: 'Bearish',
}

export function OutlookBadge({ direction, size = 'sm' }: Props) {
  return (
    <Badge
      className={cn(
        colorMap[direction],
        size === 'lg' && 'text-base px-3 py-1',
      )}
    >
      {labelMap[direction]}
    </Badge>
  )
}
