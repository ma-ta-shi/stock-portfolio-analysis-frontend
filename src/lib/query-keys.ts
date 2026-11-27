/**
 * Single source of truth for TanStack Query cache keys.
 * Queries and mutation cache updates must both use these so they can never drift apart.
 * Keys are hierarchical: invalidating `queryKeys.portfolio.all` covers every portfolio query.
 */
export const queryKeys = {
  users: {
    all: ['users'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
  },
  activity: (userId: string) => ['activity', userId] as const,
  analysis: {
    result: (analysisId: string) => ['analysis', 'result', analysisId] as const,
  },
  market: {
    macro: ['market', 'macro'] as const,
    exchangeRates: ['market', 'exchange-rates'] as const,
  },
  stocks: {
    detail: (stockId: string) => ['stocks', stockId] as const,
    history: (stockId: string) => ['stocks', stockId, 'history'] as const,
    snapshot: (stockId: string) => ['stocks', stockId, 'snapshot'] as const,
    fundamentals: (stockId: string) => ['stocks', stockId, 'fundamentals'] as const,
    prices: (stockId: string) => ['stocks', stockId, 'prices'] as const,
    search: (query: string) => ['stocks', 'search', query] as const,
  },
  /** The published optimizer rules: the same for everyone. */
  orderSettings: ['order-settings'] as const,
  watchlist: (userId: string) => ['watchlist', userId] as const,
  portfolio: {
    all: ['portfolio'] as const,
    /** The owner's portfolio id for a user. */
    id: (userId: string) => ['portfolio', 'id', userId] as const,
    /** Everything below is keyed by portfolio id, so switching user can never show another portfolio's data. */
    rawHoldings: (portfolioId: string) => ['portfolio', portfolioId, 'holdings'] as const,
    positions: (portfolioId: string) => ['portfolio', portfolioId, 'positions'] as const,
    report: (portfolioId: string, period = 'since_inception') => ['portfolio', portfolioId, 'report', period] as const,
    history: (portfolioId: string, view: string, days: number) => ['portfolio', portfolioId, 'history', view, days] as const,
    accounts: (portfolioId: string) => ['portfolio', portfolioId, 'accounts'] as const,
    room: (portfolioId: string) => ['portfolio', portfolioId, 'room'] as const,
    exposure: (portfolioId: string, view: string) => ['portfolio', portfolioId, 'exposure', view] as const,
    transactions: (portfolioId: string, query: string) => ['portfolio', portfolioId, 'transactions', query] as const,
    /** Every row of a filter, unpaged. */
    allTransactions: (portfolioId: string, query: string) => ['portfolio', portfolioId, 'transactions-all', query] as const,
    dividends: (portfolioId: string) => ['portfolio', portfolioId, 'dividends'] as const,
    /** The latest stored optimizer run. */
    optimizer: (portfolioId: string) => ['portfolio', portfolioId, 'optimizer'] as const,
  },
  /** Pipeline results, the same for every user. */
  feedback: {
    scorecard: ['feedback', 'scorecard'] as const,
    batch: ['feedback', 'batch'] as const,
    predictions: (page: number) => ['feedback', 'predictions', page] as const,
  },
}
