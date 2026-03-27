export interface Stock {
  stock_id: string
  ticker: string
  name: string
  sector: string
  exchange: string
  currency: 'CAD' | 'USD'
}
