import type { ScreenFieldSet } from '@/lib/fields'
import { PORTFOLIO_SCREEN } from './portfolio'

/**
 * Every screen wired to the API, with the schemas it reads, its field registries and what it deliberately does not show.
 * `field-coverage.test.ts` checks each entry against the generated API fields; `npm run coverage:api` lists the response
 * schemas no entry claims yet. Adding a screen is step 2 of "Wiring a screen" in `frontend/CLAUDE.md`.
 */
export const SCREEN_FIELD_SETS: readonly ScreenFieldSet[] = [PORTFOLIO_SCREEN]
