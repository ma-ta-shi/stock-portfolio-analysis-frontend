import type { ScreenFieldSet } from '@/lib/fields'
import { ANALYSIS_SCREEN } from './analysis'
import { PORTFOLIO_SCREEN } from './portfolio'
import { STOCK_SCREEN } from './stock'
import { SETTINGS_SCREEN } from './settings'
import { STOCK_DETAIL_SCREEN } from './stock-detail'
import { WATCHLIST_SCREEN } from './watchlist'

/**
 * Every screen wired to the API, with the schemas it reads, its field registries and what it deliberately does not show.
 * `field-coverage.test.ts` checks each entry against the generated API fields; `npm run coverage:api` lists the response
 * schemas no entry claims yet. Adding a screen is step 2 of "Wiring a screen" in `frontend/CLAUDE.md`.
 */
export const SCREEN_FIELD_SETS: readonly ScreenFieldSet[] = [STOCK_SCREEN, STOCK_DETAIL_SCREEN, ANALYSIS_SCREEN, PORTFOLIO_SCREEN, WATCHLIST_SCREEN, SETTINGS_SCREEN]
