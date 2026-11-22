import { useMarketNews } from '@/hooks/use-market'
import { Badge } from '@/components/ui/badge'
import { QueryError } from '@/components/QueryError'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Only render http(s) links from API data — never javascript: or data: URLs. */
function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch {
    return null
  }
}

const sentimentDot: Record<string, string> = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  neutral: 'bg-muted-foreground',
}

export function NewsFeedSection() {
  const { data: articles, isLoading, isError, error, refetch } = useMarketNews()

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Market News</h2>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <section aria-labelledby="market-news-heading" className="bg-card border border-border rounded-lg p-4">
      <h2 id="market-news-heading" className="font-semibold mb-3">Market News</h2>
      {isError && <QueryError what="news" error={error} onRetry={refetch} compact />}
      {!isError && articles?.length === 0 && (
        <p className="text-sm text-muted-foreground">No recent news.</p>
      )}
      <div className="space-y-3">
        {articles?.map((article) => {
          const href = safeExternalUrl(article.url)
          return (
          <div key={article.article_id} className="space-y-1">
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
                  sentimentDot[article.sentiment] ?? 'bg-muted-foreground',
                )}
                aria-hidden="true"
              />
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium leading-snug hover:underline line-clamp-2"
                >
                  {article.headline}
                  <span className="sr-only"> (opens in new tab, {article.sentiment} sentiment)</span>
                </a>
              ) : (
                <span className="text-sm font-medium leading-snug line-clamp-2">{article.headline}</span>
              )}
            </div>
            <div className="flex items-center gap-2 pl-3.5">
              <span className="text-xs text-muted-foreground">
                {article.source} · {formatRelativeTime(article.published_at)}
              </span>
              <div className="flex gap-1 flex-wrap">
                {article.affected_tickers.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs py-0 h-4">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}
