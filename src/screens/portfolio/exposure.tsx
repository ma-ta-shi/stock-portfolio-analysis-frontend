/**
 * The Allocation tab of the original design: three donuts, by sector, by account and by geography (the currencies the portfolio is
 * held in), drawn from `GET /exposure`. Every other field of the exposure report is listed as not shown, with a reason.
 */
import { defineFields, type ApiFieldKey, type NotShown } from '@/lib/fields'
import { formatCAD, formatPercent } from '@/lib/format'
import type { components } from '@/types/openapi.gen'
import { plainPct } from '../formatters'

type Exposure = components['schemas']['ExposureResponse']

const slices = (v: unknown) =>
  Object.entries(v as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .map(([k, w]) => `${k} ${formatPercent(w)}`)
    .join(', ')

export const EXPOSURE_FIELDS = defineFields<Exposure>([
  { id: 'total', label: 'Total value', source: 'ExposureResponse.total_value_cad', get: (e) => e.total_value_cad, format: (v) => formatCAD(v as number), tooltip: 'What the donuts add up to', places: ['column'] },
  { id: 'cash', label: 'Cash', source: 'ExposureResponse.cash', get: (e) => e.cash, format: plainPct, tooltip: 'Its own slice in each donut', places: ['column'] },
  { id: 'sectors', label: 'By sector', source: 'ExposureResponse.sectors', get: (e) => e.sectors, format: slices, places: ['column'] },
  { id: 'currencies', label: 'By geography', source: 'ExposureResponse.currencies', get: (e) => e.currencies, format: slices, tooltip: 'The currencies the portfolio is held in', places: ['column'] },
])

export const EXPOSURE_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'ExposureResponse.as_of': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.benchmark_vol': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.correlations': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.groups': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.held_both_ways': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.industries': { reason: "Not shown: the original had no industry donut (owner decision 2026-11-25); listed in the gap register" },
  'ExposureResponse.names': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.near_misses': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.not_itemised': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.portfolio_id': { reason: "An id of the portfolio the page is already in" },
  'ExposureResponse.risk': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.usd_cad': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureResponse.warnings': { reason: "Not shown as raw codes (they printed over the charts). The backend warns when a fund's contents are unknown or a stock has too little price history to measure risk; listed in the gap register" },
  'ExposureNameResponse.currency': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.direct': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.display': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.group': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.industry': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.key': { reason: "An id: the row key of a company, not a figure" },
  'ExposureNameResponse.kind': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.sector': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.total': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureNameResponse.via_funds': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureGroupResponse.members': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureGroupResponse.weight': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposurePairResponse.a': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposurePairResponse.b': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposurePairResponse.rho': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.beta': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.beta_se': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.beta_shrunk': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.flags': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.r2': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.resid_vol': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.vol_cad': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.vol_quote': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
  'ExposureRiskResponse.weeks': { reason: "Not shown: the original Allocation tab drew three donuts (sector, account, geography) and nothing else (owner decision 2026-11-25); the gap register lists it as a backend capability with no screen" },
}
