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
  alerts: {
    list: (userId: string) => ['alerts', userId] as const,
    unreadCount: (userId: string) => ['alerts', userId, 'unread'] as const,
  },
  analysis: {
    recent: ['analysis', 'recent'] as const,
    run: (analysisId: string) => ['analysis', 'run', analysisId] as const,
    agents: (analysisId: string) => ['analysis', 'agents', analysisId] as const,
  },
  market: {
    overview: ['market', 'overview'] as const,
    news: ['market', 'news'] as const,
  },
  stocks: {
    detail: (stockId: string) => ['stocks', stockId] as const,
    history: (stockId: string) => ['stocks', stockId, 'history'] as const,
    search: (query: string) => ['stocks', 'search', query] as const,
  },
  watchlist: (userId: string) => ['watchlist', userId] as const,
  portfolio: {
    all: ['portfolio'] as const,
    summary: (userId: string) => ['portfolio', 'summary', userId] as const,
    holdings: (userId: string) => ['portfolio', 'holdings', userId] as const,
    optimizer: (userId: string) => ['portfolio', 'optimizer', userId] as const,
    transactions: (userId: string) => ['portfolio', 'transactions', userId] as const,
    closed: (userId: string) => ['portfolio', 'closed', userId] as const,
  },
  predictions: (userId: string) => ['predictions', userId] as const,
  feedback: (userId: string) => ['feedback', userId] as const,
}
