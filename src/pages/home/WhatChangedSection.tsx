import { Link } from 'react-router-dom'
import { CircleDollarSign, LayoutGrid, Target, TrendingUp } from 'lucide-react'
import type { ElementType } from 'react'
import { QueryError } from '@/components/QueryError'
import { useActivity } from '@/hooks/use-home'
import { formatRelativeTime } from '@/lib/format'
import type { components } from '@/types/openapi.gen'

type Item = components['schemas']['ActivityItemResponse']
type Kind = Item['type']

const SHOWN = 8
const ICONS: Record<Kind, ElementType> = {
  outlook_change: TrendingUp,
  portfolio_optimization: LayoutGrid,
  prediction_result: Target,
  dividend_waiting: CircleDollarSign,
}
/** One and many, for what did not fit. */
const KIND_WORDS: Record<Kind, [string, string]> = {
  outlook_change: ['outlook change', 'outlook changes'],
  portfolio_optimization: ['new proposal list', 'new proposal lists'],
  prediction_result: ['prediction result', 'prediction results'],
  dividend_waiting: ['dividend to confirm', 'dividends to confirm'],
}
const NEEDS_YOU: ReadonlySet<Kind> = new Set(['dividend_waiting'])

const VALID_STATIC_ACTION_ROUTES = new Set(['/watchlist', '/portfolio', '/feedback', '/settings', '/'])
const isSafeInternalActionUrl = (url: string) => {
  if (!url.startsWith('/') || url.startsWith('//')) return false
  const path = url.split('?')[0]
  return VALID_STATIC_ACTION_ROUTES.has(path) || path.startsWith('/analysis/')
}

function hiddenWords(hidden: Item[]): string {
  const counts = new Map<Kind, number>()
  for (const item of hidden) counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
  return [...counts].map(([kind, n]) => `${n} ${KIND_WORDS[kind][n === 1 ? 0 : 1]}`).join(', ')
}

function Card({ item }: { item: Item }) {
  const Icon = ICONS[item.type]
  const href = item.action_url && isSafeInternalActionUrl(item.action_url) ? item.action_url : null
  return (
    <li className="bg-card border border-border rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <div className="text-sm font-medium leading-snug line-clamp-2">{item.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{item.message}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-muted-foreground">
          {NEEDS_YOU.has(item.type) || !item.happened_at ? 'Needs you' : formatRelativeTime(item.happened_at)}
        </span>
        {href && (
          <Link to={href} className="text-xs text-primary underline underline-offset-2" aria-label={`View: ${item.title}`}>
            View
          </Link>
        )}
      </div>
    </li>
  )
}

export function WhatChangedSection() {
  const { data, isLoading, isError, error, refetch } = useActivity()
  const items = data?.data ?? []
  const hidden = items.slice(SHOWN)
  const more = (data?.meta.total ?? items.length) - Math.min(items.length, SHOWN)

  return (
    <section aria-labelledby="what-changed-heading" className="mb-6">
      <h2 id="what-changed-heading" className="text-lg font-semibold mb-3">What Changed</h2>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <QueryError what="what changed" error={error} onRetry={refetch} compact />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing new in the last 7 days.</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.slice(0, SHOWN).map((item, i) => (
              <Card key={`${item.type}-${item.ticker ?? item.portfolio_id}-${i}`} item={item} />
            ))}
          </ul>
          {more > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {more} more: {hiddenWords(hidden)}.{' '}
              {hidden.some((i) => i.type === 'dividend_waiting') && (
                <Link to="/portfolio?tab=dividends" className="text-primary underline underline-offset-2">
                  Go to Portfolio
                </Link>
              )}
            </p>
          )}
        </>
      )}
    </section>
  )
}
