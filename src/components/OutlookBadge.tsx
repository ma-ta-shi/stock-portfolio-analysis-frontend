import { Badge } from '@/components/ui/badge'
import { OUTLOOK_BADGE, OUTLOOK_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Outlook } from '@/lib/stock-snapshot'

interface Props {
  direction: Outlook
  size?: 'sm' | 'lg'
}

export function OutlookBadge({ direction, size = 'sm' }: Props) {
  return (
    <Badge className={cn(OUTLOOK_BADGE[direction], size === 'lg' && 'text-base px-3 py-1')}>{OUTLOOK_LABELS[direction]}</Badge>
  )
}
