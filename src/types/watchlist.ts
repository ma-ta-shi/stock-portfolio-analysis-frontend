import type { StockSnapshot } from '@/lib/stock-snapshot'
import type { Stock } from './stock'

export type Recommendation = 'BUY' | 'HOLD' | 'SELL'
export type StockOutlookDirection =
  | 'bullish'
  | 'somewhat_bullish'
  | 'neutral'
  | 'somewhat_bearish'
  | 'bearish'
export type PortfolioFit = 'strong_candidate' | 'worth_monitoring' | 'poor_fit'
export type DisagreementLabel = 'low' | 'moderate' | 'high'

/**
 * A stock on the watchlist.
 *
 * A newly added stock exists before the backend has priced or analysed it, so:
 * - market fields are `null` until the first price fetch;
 * - analysis fields are `null` until the first analysis completes
 *   (`last_analyzed_at === null` means "awaiting analysis").
 * The backend must return `null` here rather than placeholder values like 0 or "neutral".
 */
/** One watched stock: the same `{ stock, call }` every list of stocks has, and what the entry itself holds. */
export interface WatchlistItem {
  watchlist_id: string
  stock: Stock
  /** Null only if the stock was read without its snapshot. */
  call: StockSnapshot | null
  notes: string | null
  added_at: string
}
