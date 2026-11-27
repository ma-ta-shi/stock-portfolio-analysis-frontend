import { useScorecard } from '@/hooks/use-feedback'
import type { Figures, Hit } from '@/lib/feedback'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'

function StatCard({ label, value, sub, title }: { label: string; value: string; sub: string; title: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4" title={title}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  )
}

function cards(f: Figures | null) {
  const nothing = f ? 'Nothing scored yet' : 'No current figures'
  const thin = f?.thin ? ', too few to read' : ''
  // results can exist with no figure: neutral calls have no direction, and a month with too few stocks cannot be ranked
  const hit = (h: Hit | null) => ({ value: formatPercent(h?.rate ?? null, 0), sub: h?.n ? `${h.hits} of ${h.n} calls${thin}` : f?.scored ? 'No call with a direction yet' : nothing })
  return [
    { label: 'Hit rate against the market', ...hit(f?.marketHit ?? null), title: 'Calls with a direction where the stock beat or lagged the market as called' },
    { label: 'Hit rate beyond the baseline', ...hit(f?.baselineHit ?? null), title: 'The same, after taking out what the valuation baseline already expected. This is the measure verdicts use' },
    {
      label: 'Rank correlation',
      value: f?.rankCorrelation == null ? '—' : formatNumber(f.rankCorrelation),
      sub: !f?.scored ? nothing : f.rankCorrelation == null ? 'Too few in any month to rank' : `Zero is no better than chance${thin}`,
      title: 'Whether stocks rated higher went on to do better than stocks rated lower: 1 is always, 0 is chance, below 0 is backwards',
    },
    { label: 'Independent calls scored', value: f ? String(f.scored) : '—', sub: f?.scored ? 'Repeats left out' : nothing, title: 'Calls with a 1-month result' },
  ]
}

export function AccuracyCards() {
  const { data, isLoading } = useScorecard()
  if (isLoading) return <div className="h-24 rounded-lg bg-muted animate-pulse mb-6" />
  const current = data?.state === 'current' ? data : null
  return (
    <section aria-label="Accuracy" className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards(current?.figures ?? null).map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>
      {current && (
        <p className="text-xs text-muted-foreground mt-2">
          1-month results of pipeline {current.version}, scorecard of {formatDate(current.asOf)}.
        </p>
      )}
    </section>
  )
}
