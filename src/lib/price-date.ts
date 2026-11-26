/** How current a shown price is, in words. Prices are daily closes, so a price is "old" once it is past a long weekend. */
import { formatDate, parseDate } from '@/lib/format'

export const OLD_AFTER_DAYS = 4 // the backend's rule for "no current price" (price_store.UNPRICED_AFTER_DAYS)

/** `day` is null, or `source` is `price_band`, when no close is recorded and the price is the one the last analysis saw. */
export function priceDate(day: string | null | undefined, source?: string | null, now = new Date()): { text: string; old: boolean } {
  if (!day || source === 'price_band') return { text: 'Price at last analysis', old: true }
  const from = parseDate(day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const old = !!from && (today.getTime() - from.getTime()) / 86_400_000 > OLD_AFTER_DAYS
  return { text: `${old ? 'Old: as of' : 'As of'} ${formatDate(day)}`, old }
}
