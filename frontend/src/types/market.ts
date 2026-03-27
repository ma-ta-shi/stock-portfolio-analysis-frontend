export type SentimentLabel = 'fear' | 'neutral' | 'greed'

export interface MarketIndex {
  name: string
  symbol: string
  value: number
  day_change: number
  day_change_pct: number
  sparkline_5d: number[]
}

export interface ExchangeRate {
  cad_usd: number
  usd_cad: number
  day_change: number
  trend: string
}

export interface InterestRates {
  boc_rate: number
  boc_direction: string
  boc_next_meeting: string
  fed_funds_rate: number
  fed_direction: string
  fed_next_meeting: string
}

export interface MarketSentiment {
  score: number
  label: SentimentLabel
  vix: number
  description: string
}

export interface MarketOverview {
  as_of: string
  indices: MarketIndex[]
  exchange_rate: ExchangeRate
  interest_rates: InterestRates
  market_sentiment: MarketSentiment
}

export interface NewsArticle {
  article_id: string
  headline: string
  source: string
  url: string
  published_at: string
  sentiment: 'positive' | 'negative' | 'neutral'
  sentiment_score?: number
  affected_tickers: string[]
  category?: string
}
