import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { MarketOverview, NewsArticle } from '@/types'

interface NewsResponse {
  data: NewsArticle[]
}

export function useMarketOverview() {
  return useQuery({
    queryKey: ['market', 'overview'],
    queryFn: () =>
      apiFetch<MarketOverview>(
        '/mock-data/market/overview.json',
        '/api/market/overview',
      ),
  })
}

export function useMarketNews() {
  return useQuery({
    queryKey: ['market', 'news'],
    queryFn: () =>
      apiFetch<NewsResponse>(
        '/mock-data/market/news.json',
        '/api/market/news',
      ),
    select: (res) => res.data,
  })
}
