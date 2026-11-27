/** What is happening while results are still coming in: this week's batch and how far the scoring set is from a verdict. */
import { QueryError } from '@/components/QueryError'
import { useScorecard, useWeeklyBatch } from '@/hooks/use-feedback'
import { formatDate } from '@/lib/format'

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

export function ProgressStrip() {
  const batch = useWeeklyBatch()
  const scorecard = useScorecard()
  const week = batch.data?.week
  const card = scorecard.data
  return (
    <section aria-label="Progress" className="bg-card border border-border rounded-lg px-4 py-3 mb-6 space-y-2">
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {week && (
          <Figure
            label={`Batch, week of ${formatDate(week.week_start)}`}
            value={`${week.done.length} of ${week.required.length} done${week.gave_up.length ? `, ${week.gave_up.length} gave up` : ''}`}
          />
        )}
        {card?.state === 'current' && (
          <>
            <Figure label="Runs being scored" value={String(card.figures.runs)} />
            <Figure label="With a 1-month result" value={String(card.figures.scored)} />
            <Figure label="Toward a verdict" value={`${card.figures.observations} of ${card.figures.nextVerdictAt}`} />
          </>
        )}
      </dl>
      {card?.state === 'old' && (
        <p className="text-xs text-muted-foreground">
          The latest scorecard ({formatDate(card.asOf)}) is for pipeline {card.version}; the pipeline is now {card.pipeline}. No figures until the next one.
        </p>
      )}
      {scorecard.data === null && <p className="text-xs text-muted-foreground">No scorecard has been saved yet. One is made on the 1st of each month.</p>}
      {batch.isError && <QueryError what="this week's batch" error={batch.error} onRetry={batch.refetch} compact />}
    </section>
  )
}
