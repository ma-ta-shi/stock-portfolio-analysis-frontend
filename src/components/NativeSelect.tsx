import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A native `<select>` styled like `Input` (same height, radius and focus ring), for forms. There is no shadcn select in
 * `components/ui`; a native control keeps the keyboard and screen-reader behaviour for free. Link it to a label with `FormField`.
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-8 w-full min-w-0 rounded-lg border px-2.5 py-1 text-base outline-none transition-colors focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}
