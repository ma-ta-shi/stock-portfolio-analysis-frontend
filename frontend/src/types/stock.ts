export interface Stock {
  stock_id: string
  ticker: string
  name: string
  sector: string
  exchange: string
  currency: 'CAD' | 'USD'
  // False for an ETF, fund, preferred share or trust, or a NEO or CSE stock: held and tracked, but the pipeline
  // cannot analyse it (backend StockSummary). Absent in mock data, which means supported.
  pipeline_supported?: boolean
  instrument_type?: string | null
  unsupported_reason?: string | null
}
