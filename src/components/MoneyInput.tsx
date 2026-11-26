import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** `type="text"` where blank means something: a number input reports text it cannot read ("12e") as blank. */
type MoneyInputProps = ComponentProps<typeof Input>

/** Non-negative decimal input with a leading "$" adornment. */
export function MoneyInput({ className, ...props }: MoneyInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none"
      >
        $
      </span>
      <Input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        className={cn('pl-7', className)}
        {...props}
      />
    </div>
  )
}

