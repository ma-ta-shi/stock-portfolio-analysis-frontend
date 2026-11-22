import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { MarketOverview, NewsArticle } from '@/types'

interface NewsResponse {
  data: NewsArticle[]
}

export function useMarketOverview() {
  return useQuery({
    queryKey: queryKeys.market.overview,
    queryFn: ({ signal }) =>
      apiFetch<MarketOverview>(
        '/mock-data/market/overview.json',
        '/api/market/overview',
        { signal },
      ),
  })
}

export function useMarketNews() {
  return useQuery({
    queryKey: queryKeys.market.news,
    queryFn: ({ signal }) =>
      apiFetch<NewsResponse>(
        '/mock-data/market/news.json',
        '/api/market/news',
        { signal },
      ),
    select: (res) => res.data,
  })
}
