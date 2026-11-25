/**
 * What the lookup knows about a stock the owner is about to add (`GET /api/stocks/lookup?ticker=`), drawn on the Add Stock step
 * that confirms the stock. `defineFields` over the response, so a new field the backend adds fails the coverage test until it is
 * decided.
 */
import { defineFields, type ApiFieldKey, type NotShown } from '@/lib/fields'
import type { components } from '@/types/openapi.gen'
import { text } from '../formatters'

export type StockLookup = components['schemas']['StockLookupResponse']

export const LOOKUP_FIELDS = defineFields<StockLookup>([
  { id: 'ticker', label: 'Ticker', source: 'StockLookupResponse.ticker', get: (s) => s.ticker, places: ['detail'] },
  { id: 'name', label: 'Company', source: 'StockLookupResponse.name', get: (s) => s.name, places: ['detail'] },
  { id: 'exchange', label: 'Exchange', source: 'StockLookupResponse.exchange', get: (s) => s.exchange, places: ['detail'] },
  { id: 'currency', label: 'Currency', source: 'StockLookupResponse.currency', get: (s) => s.currency, places: ['detail'] },
  { id: 'sector', label: 'Sector', source: 'StockLookupResponse.sector', get: (s) => s.sector, format: text, places: ['detail'] },
  { id: 'industry', label: 'Industry', source: 'StockLookupResponse.industry', get: (s) => s.industry, format: text, places: ['detail'] },
  { id: 'instrument_type', label: 'Kind of security', source: 'StockLookupResponse.instrument_type', get: (s) => s.instrument_type, format: text, places: ['detail'] },
  {
    id: 'supported',
    label: 'Analysed by the app',
    source: ['StockLookupResponse.pipeline_supported', 'StockLookupResponse.unsupported_reason'],
    get: (s) => s.pipeline_supported,
    format: (v, s) => (v ? 'Yes' : `No: ${s.unsupported_reason ?? 'not supported'}`),
    tooltip: 'A security the app does not analyse can still be held and recorded',
    places: ['detail'],
  },
  { id: 'source', label: 'Found in', source: 'StockLookupResponse.source', get: (s) => s.source, format: (v) => (v === 'database' ? 'Your record' : 'A data provider'), places: ['detail'] },
])

export const LOOKUP_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'StockLookupResponse.stock_id': { reason: 'An id; the ticker is what the entry is made with' },
}
