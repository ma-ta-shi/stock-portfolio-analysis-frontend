import type { PortfolioFit } from '@/types'

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
  strong_candidate: 'text-emerald-600 dark:text-emerald-400',
  worth_monitoring: 'text-amber-600 dark:text-amber-400',
  poor_fit: 'text-red-600 dark:text-red-400',
}

export const FIT_BOX_COLORS: Record<PortfolioFit, string> = {
  strong_candidate: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  worth_monitoring: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  poor_fit: 'bg-muted border-border',
}

export const FIT_BADGE_COLORS: Record<PortfolioFit, string> = {
  strong_candidate: 'bg-emerald-600 text-white',
  worth_monitoring: 'bg-amber-500 text-white',
  poor_fit: 'bg-muted-foreground text-white',
}

/** Text colour for a signed value: gains green, losses red. */
export function gainLossColor(value: number): string {
  return value >= 0 ? 'text-emerald-600' : 'text-red-600'
}
