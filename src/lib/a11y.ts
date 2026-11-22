import type { KeyboardEvent } from 'react'

/**
 * Props that make a whole table row act as a link for mouse *and* keyboard users
 * (focusable with Tab, activated with Enter). Nested buttons should stop propagation.
 */
export function clickableRowProps(onActivate: () => void, label: string) {
  return {
    tabIndex: 0,
    'aria-label': label,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' && e.target === e.currentTarget) {
        e.preventDefault()
        onActivate()
      }
    },
    className:
      'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  }
}
