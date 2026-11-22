import type { ComponentProps } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ButtonLinkProps = ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>

/**
 * Navigation styled as a button. Renders a real <a> (announced as a link, opens with
 * Enter, supports middle-click / open-in-new-tab). Don't use <Button render={<Link />}>:
 * Base UI then adds role="button", so screen readers announce it as a button.
 */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
