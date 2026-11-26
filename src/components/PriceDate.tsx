import { TONE_TEXT } from '@/lib/labels'
import { priceDate } from '@/lib/price-date'
import { cn } from '@/lib/utils'

/** The line under a price that says which day's it is. */
export function PriceDate({ day, source }: { day: string | null | undefined; source?: string | null }) {
  const { text, old } = priceDate(day, source)
  return <div className={cn('text-xs', old ? TONE_TEXT.warning : 'text-muted-foreground')}>{text}</div>
}
