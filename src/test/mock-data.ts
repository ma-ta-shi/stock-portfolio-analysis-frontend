import { mapHolding, type ApiHolding } from '@/lib/portfolio-mappers'
import holdingsFixture from '@/test/fixtures/portfolio/holdings.json'

// Portfolio rows come from the recorded API responses (`npm run record:fixtures`), mapped by the real mapper.
const rows = holdingsFixture.data as unknown as ApiHolding[]
const byTicker = (ticker: string) => {
  const row = rows.find((h) => h.stock.ticker === ticker && h.is_active)
  if (!row) throw new Error(`Fixture has no active holding ${ticker}`)
  return mapHolding(row)
}

/** RY.TO in the RRSP: a Canadian stock with a usable call. */
export const mockHolding = byTicker('RY.TO')
/** RDDT in Trading: a USD holding whose call is excluded. */
export const mockUsdHolding = byTicker('RDDT')

/** Every recorded holding, mapped: active and closed, usable, stale and unsupported calls. */
export const mockHoldings = rows.map((row) => mapHolding(row))
/** One recorded holding by ticker (the first match, active or closed). */
export function fixtureHolding(ticker: string) {
  const found = mockHoldings.find((h) => h.stock.ticker === ticker)
  if (!found) throw new Error(`Fixture has no holding ${ticker}`)
  return found
}
