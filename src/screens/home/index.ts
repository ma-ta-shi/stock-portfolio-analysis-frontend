/**
 * Home: the value bar (declared by the Portfolio field set, which owns the summary), "What Changed" (the activity feed) and the
 * market figures. The exchange rate is the one `useFxRates` already reads.
 */
import type { ApiFieldKey, NotShown, ScreenFieldSet } from '@/lib/fields'

const column = ['column' as const]

const notShown: Partial<Record<ApiFieldKey, NotShown>> = {
  'ActivityItemResponse.ticker': { reason: 'The title names the stock' },
  'ActivityItemResponse.portfolio_id': { reason: 'The link goes to the Portfolio page' },
  'ActivityItemResponse.meta': { reason: 'The figures behind the message, which says them in words' },
  'MacroSnapshotResponse.run_id': { reason: 'An id' },
  'MacroSnapshotResponse.data_vintage': { reason: 'The day of the analysis is shown' },
  'MacroSnapshotResponse.boc_rate_90d_delta_bp': { reason: 'The direction is shown' },
  'MacroSnapshotResponse.boc_rate_age_days': { reason: 'The day of the analysis is shown' },
  'MacroSnapshotResponse.vix_age_days': { reason: 'The day of the analysis is shown' },
  'MacroSnapshotResponse.cad_usd': { reason: "The page shows the Bank's latest rate, as the rest of the app converts with it" },
  'MacroSnapshotResponse.cad_usd_age_days': { reason: 'Goes with cad_usd' },
  'MacroSnapshotResponse.canada_bond_2y': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.canada_bond_10y': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.ca_curve_shape': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.ca_cpi_yoy': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.ca_cpi_trend': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.cpi_age_days': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.ca_unemployment_6m_delta': { reason: 'No place in the design', gap: 'H-5' },
  'MacroSnapshotResponse.unemployment_age_days': { reason: 'No place in the design', gap: 'H-5' },
}

export const HOME_SCREEN: ScreenFieldSet = {
  screen: 'home',
  schemas: ['ActivityItemResponse', 'MacroSnapshotResponse'],
  fields: [
    { id: 'kind', label: 'Kind', source: 'ActivityItemResponse.type', places: column },
    { id: 'title', label: 'Title', source: 'ActivityItemResponse.title', places: column },
    { id: 'message', label: 'Message', source: 'ActivityItemResponse.message', places: column },
    { id: 'when', label: 'When', source: 'ActivityItemResponse.happened_at', places: column },
    { id: 'link', label: 'View', source: 'ActivityItemResponse.action_url', places: column },
    { id: 'as_of', label: 'From the analysis of', source: 'MacroSnapshotResponse.run_day', places: column },
    { id: 'boc', label: 'BoC Rate', source: ['MacroSnapshotResponse.boc_rate', 'MacroSnapshotResponse.boc_rate_trend'], places: column },
    { id: 'fed', label: 'Fed Rate', source: 'MacroSnapshotResponse.fed_funds_rate', places: column },
    { id: 'vix', label: 'VIX', source: ['MacroSnapshotResponse.vix', 'MacroSnapshotResponse.vix_regime'], places: column },
  ],
  notShown,
}
