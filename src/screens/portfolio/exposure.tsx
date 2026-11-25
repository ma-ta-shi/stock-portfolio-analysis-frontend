/** The Allocation tab: what the portfolio holds by sector, industry and currency, each company directly and through funds, and its risk. */
import { defineFields, type ApiFieldKey, type NotShown } from '@/lib/fields'
import { formatCAD, formatDate, formatNumber, formatPercent } from '@/lib/format'
import type { components } from '@/types/openapi.gen'
import { list, plainPct } from '../formatters'

type Api = components['schemas']
type Exposure = Api['ExposureResponse']
/** A risk row carries the ticker it is keyed by in the response. */
export type RiskRow = Api['ExposureRiskResponse'] & { ticker: string }

const num = (v: unknown) => (v == null ? '—' : formatNumber(v as number, 2))
const orDash = (v: unknown) => (v as string | null) ?? '—'
const slices = (v: unknown) =>
  Object.entries(v as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .map(([k, w]) => `${k} ${formatPercent(w)}`)
    .join(', ')

export const EXPOSURE_FIELDS = defineFields<Exposure>([
  { id: 'as_of', label: 'Prices as of', source: 'ExposureResponse.as_of', get: (e) => e.as_of, format: (v) => formatDate(v as string), places: ['detail'] },
  { id: 'total', label: 'Total value', source: 'ExposureResponse.total_value_cad', get: (e) => e.total_value_cad, format: (v) => formatCAD(v as number), places: ['column', 'detail'] },
  { id: 'cash', label: 'Cash', source: 'ExposureResponse.cash', get: (e) => e.cash, format: plainPct, places: ['column', 'detail'] },
  { id: 'not_itemised', label: 'Not itemised', source: 'ExposureResponse.not_itemised', get: (e) => e.not_itemised, format: plainPct, tooltip: 'The part of funds whose holdings the data does not list', places: ['column', 'detail'] },
  { id: 'sectors', label: 'Sectors', source: 'ExposureResponse.sectors', get: (e) => e.sectors, format: slices, places: ['column', 'detail'] },
  { id: 'industries', label: 'Industries', source: 'ExposureResponse.industries', get: (e) => e.industries, format: slices, places: ['column', 'detail'] },
  { id: 'currencies', label: 'Currencies', source: 'ExposureResponse.currencies', get: (e) => e.currencies, format: slices, places: ['column', 'detail'] },
  { id: 'usd_cad', label: 'USD to CAD', source: 'ExposureResponse.usd_cad', get: (e) => e.usd_cad, format: (v) => (v == null ? '—' : formatNumber(v as number, 4)), places: ['detail'] },
  { id: 'benchmark_vol', label: 'Benchmark volatility', source: 'ExposureResponse.benchmark_vol', get: (e) => e.benchmark_vol, format: plainPct, places: ['detail'] },
  { id: 'warnings', label: 'Warnings', source: 'ExposureResponse.warnings', get: (e) => e.warnings, format: list, places: ['detail'] },
  { id: 'held_both_ways', label: 'Held directly and through funds', source: 'ExposureResponse.held_both_ways', get: (e) => e.held_both_ways.map((n) => n.display), format: list, tooltip: 'Marked on the names table', places: ['detail'] },
  { id: 'names_count', label: 'Companies', source: 'ExposureResponse.names', get: (e) => e.names.length, places: ['detail'] },
  { id: 'groups_count', label: 'Correlated groups', source: 'ExposureResponse.groups', get: (e) => e.groups.length, places: ['detail'] },
  { id: 'near_misses_count', label: 'Near-correlated pairs', source: 'ExposureResponse.near_misses', get: (e) => e.near_misses.length, places: ['detail'] },
  { id: 'correlations_count', label: 'Correlated pairs', source: 'ExposureResponse.correlations', get: (e) => e.correlations.length, places: ['detail'] },
  { id: 'risk_count', label: 'Names with risk figures', source: 'ExposureResponse.risk', get: (e) => Object.keys(e.risk).length, places: ['detail'] },
])

export const EXPOSURE_NAME_FIELDS = defineFields<Api['ExposureNameResponse']>([
  { id: 'display', label: 'Company', source: 'ExposureNameResponse.display', get: (n) => n.display, places: ['column'] },
  { id: 'kind', label: 'Kind', source: 'ExposureNameResponse.kind', get: (n) => n.kind, places: ['detail'] },
  { id: 'direct', label: 'Direct', source: 'ExposureNameResponse.direct', get: (n) => n.direct, format: plainPct, places: ['column'] },
  { id: 'via_funds', label: 'Through funds', source: 'ExposureNameResponse.via_funds', get: (n) => n.via_funds, format: plainPct, places: ['column'] },
  { id: 'total', label: 'Total', source: 'ExposureNameResponse.total', get: (n) => n.total, format: plainPct, places: ['column'] },
  { id: 'sector', label: 'Sector', source: 'ExposureNameResponse.sector', get: (n) => n.sector, format: orDash, places: ['column'] },
  { id: 'industry', label: 'Industry', source: 'ExposureNameResponse.industry', get: (n) => n.industry, format: orDash, places: ['detail'] },
  { id: 'currency', label: 'Currency', source: 'ExposureNameResponse.currency', get: (n) => n.currency, places: ['column'] },
  { id: 'group', label: 'Correlated group', source: 'ExposureNameResponse.group', get: (n) => n.group, format: (v) => (v == null ? '—' : `Group ${(v as number) + 1}`), places: ['detail'] },
])

export const EXPOSURE_GROUP_FIELDS = defineFields<Api['ExposureGroupResponse']>([
  { id: 'members', label: 'Names', source: 'ExposureGroupResponse.members', get: (g) => g.members, format: (v) => (v as string[]).join(', '), places: ['column'] },
  { id: 'weight', label: 'Combined weight', source: 'ExposureGroupResponse.weight', get: (g) => g.weight, format: plainPct, places: ['column'] },
])

export const EXPOSURE_PAIR_FIELDS = defineFields<Api['ExposurePairResponse']>([
  { id: 'a', label: 'First', source: 'ExposurePairResponse.a', get: (p) => p.a, places: ['column'] },
  { id: 'b', label: 'Second', source: 'ExposurePairResponse.b', get: (p) => p.b, places: ['column'] },
  { id: 'rho', label: 'Correlation', source: 'ExposurePairResponse.rho', get: (p) => p.rho, format: num, places: ['column'] },
])

export const EXPOSURE_RISK_FIELDS = defineFields<RiskRow>([
  { id: 'ticker', label: 'Stock', source: 'ExposureResponse.risk', get: (r) => r.ticker, tooltip: 'The key the figures are listed under', places: ['column'] },
  { id: 'weeks', label: 'Weeks of history', source: 'ExposureRiskResponse.weeks', get: (r) => r.weeks, places: ['column'] },
  { id: 'vol_cad', label: 'Volatility (CAD)', source: 'ExposureRiskResponse.vol_cad', get: (r) => r.vol_cad, format: plainPct, places: ['column'] },
  { id: 'vol_quote', label: 'Volatility (own currency)', source: 'ExposureRiskResponse.vol_quote', get: (r) => r.vol_quote, format: plainPct, places: ['detail'] },
  { id: 'beta', label: 'Beta', source: 'ExposureRiskResponse.beta', get: (r) => r.beta, format: num, places: ['detail'] },
  { id: 'beta_se', label: 'Beta error', source: 'ExposureRiskResponse.beta_se', get: (r) => r.beta_se, format: num, places: ['detail'] },
  { id: 'beta_shrunk', label: 'Beta (adjusted)', source: 'ExposureRiskResponse.beta_shrunk', get: (r) => r.beta_shrunk, format: num, places: ['column'] },
  { id: 'resid_vol', label: 'Own-risk volatility', source: 'ExposureRiskResponse.resid_vol', get: (r) => r.resid_vol, format: plainPct, places: ['detail'] },
  { id: 'r2', label: 'R squared', source: 'ExposureRiskResponse.r2', get: (r) => r.r2, format: plainPct, places: ['detail'] },
  { id: 'flags', label: 'Flags', source: 'ExposureRiskResponse.flags', get: (r) => r.flags, format: list, places: ['detail'] },
])

export const EXPOSURE_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'ExposureResponse.portfolio_id': { reason: 'An id of the portfolio the page is already in' },
  'ExposureNameResponse.key': { reason: 'An internal key (RY and RY.TO are one); the display name is shown' },
}
