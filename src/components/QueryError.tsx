import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

interface QueryErrorProps {
  /** What failed to load, e.g. "holdings" → "Failed to load holdings." */
  what: string
  error?: unknown
  onRetry?: () => void
  /** Compact single-line variant for small cards and sections. */
  compact?: boolean
  className?: string
}

/** Standard error state for a failed query, with an optional Retry button. */
export function QueryError({ what, error, onRetry, compact, className }: QueryErrorProps) {
  const detail = error ? getErrorMessage(error) : null
  return (
    <div
      role="alert"
      className={cn(
        'border border-border rounded-lg text-center text-sm text-muted-foreground',
        compact ? 'p-3 flex items-center justify-center gap-3 flex-wrap' : 'p-6 space-y-2',
        className,
      )}
    >
      <p className="flex items-center justify-center gap-1.5">
        <AlertCircle className="w-4 h-4 shrink-0 text-destructive" aria-hidden="true" />
        Failed to load {what}.
        {detail && <span className="text-xs">({detail})</span>}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={() => onRetry()}>
          Retry
        </Button>
      )}
    </div>
  )
}
