import { useMarketNews } from '@/hooks/use-market'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const sentimentDot: Record<string, string> = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  neutral: 'bg-muted-foreground',
}

export function NewsFeedSection() {
  const { data: articles, isLoading } = useMarketNews()

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
    <div className="bg-card border border-border rounded-lg p-4">
      <h2 className="font-semibold mb-3">Market News</h2>
      <div className="space-y-3">
        {articles?.map((article) => (
          <div key={article.article_id} className="space-y-1">
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
                  sentimentDot[article.sentiment] ?? 'bg-muted-foreground',
                )}
              />
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium leading-snug hover:underline line-clamp-2"
              >
                {article.headline}
              </a>
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
        ))}
      </div>
    </div>
  )
}
