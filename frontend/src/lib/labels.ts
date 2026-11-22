import type { PortfolioFit } from '@/types'

/**
 * Colour tokens. Every pair here meets WCAG AA contrast (≥ 4.5:1 for small text)
 * in both light and dark mode — use these instead of raw Tailwind colours so the
 * guarantee holds everywhere. (Tailwind's 500/600 shades fail on white.)
 */
export const TONE_TEXT = {
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
} as const

/** Badge fills: solid (white text) for strong signals, tinted (dark text) for softer ones. */
export const BADGE = {
  positive: 'bg-emerald-700 text-white',
  positiveSoft: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200',
  warningSoft: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  cautionSoft: 'bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200',
  negative: 'bg-red-700 text-white',
  neutral: 'bg-muted text-foreground',
} as const

export const FIT_LABELS: Record<PortfolioFit, string> = {
  strong_candidate: 'Strong Candidate',
  worth_monitoring: 'Worth Monitoring',
  poor_fit: 'Poor Fit',
}

/** Short labels for dense tables. */
export const FIT_SHORT_LABELS: Record<PortfolioFit, string> = {
  strong_candidate: 'Strong',
  worth_monitoring: 'Monitor',
  poor_fit: 'Poor Fit',
}

export const FIT_TEXT_COLORS: Record<PortfolioFit, string> = {
  strong_candidate: 'text-emerald-700 dark:text-emerald-400',
  worth_monitoring: 'text-amber-700 dark:text-amber-400',
  poor_fit: 'text-red-600 dark:text-red-400',
}

export const FIT_BOX_COLORS: Record<PortfolioFit, string> = {
  strong_candidate: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  worth_monitoring: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  poor_fit: 'bg-muted border-border',
}

export const FIT_BADGE_COLORS: Record<PortfolioFit, string> = {
  strong_candidate: BADGE.positive,
  worth_monitoring: BADGE.warningSoft,
  poor_fit: BADGE.neutral,
}

/** Text colour for a signed value: gains green, losses red. */
export function gainLossColor(value: number): string {
  return value >= 0 ? TONE_TEXT.positive : TONE_TEXT.negative
}
