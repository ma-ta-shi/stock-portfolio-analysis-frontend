import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StockOutlookDirection } from '@/types'

interface Props {
  direction: StockOutlookDirection
  size?: 'sm' | 'lg'
}

const colorMap: Record<StockOutlookDirection, string> = {
  bullish: 'bg-emerald-600 text-white hover:bg-emerald-600',
  somewhat_bullish: 'bg-emerald-400 text-white hover:bg-emerald-400',
  neutral: 'bg-amber-500 text-white hover:bg-amber-500',
  somewhat_bearish: 'bg-orange-500 text-white hover:bg-orange-500',
  bearish: 'bg-red-600 text-white hover:bg-red-600',
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
