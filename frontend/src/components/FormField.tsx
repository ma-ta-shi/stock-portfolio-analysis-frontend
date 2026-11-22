import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: ReactNode
  /** Render prop receives the generated id so the control is linked to its label. */
  children: (id: string, describedBy: string | undefined) => ReactNode
  error?: ReactNode
  hint?: ReactNode
  className?: string
}

/** Label + control + optional hint/error, with label `htmlFor` and `aria-describedby` wired up. */
export function FormField({ label, children, error, hint, className }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      {children(id, message ? messageId : undefined)}
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
          {message}
        </p>
      )}
    </div>
  )
}
