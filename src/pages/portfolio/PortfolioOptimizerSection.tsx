import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { useLatestRun, useRunOptimizer } from '@/hooks/use-optimizer'
import { ApiError, getErrorMessage } from '@/lib/api'
import { fieldText } from '@/lib/fields'
import { RUN_FIELDS } from '@/screens/optimizer'
import type { PortfolioAccountView } from '@/types'
import { OptimizerRun } from './OptimizerRun'

const [HEADLINE, AS_OF] = RUN_FIELDS

/** The latest stored run, and the button that makes and saves a new one. */
export function PortfolioOptimizerSection({ accountFilter = 'combined' }: { accountFilter?: PortfolioAccountView }) {
  const latest = useLatestRun()
  const run = useRunOptimizer()
  const [asking, setAsking] = useState(false)
  // a portfolio that has never had a run is an ordinary state, not a failure
  const none = latest.error instanceof ApiError && latest.error.code === 'NO_RUN_STORED'

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">Portfolio Optimizer</h2>
          {latest.data && (
            <>
              <p className="text-sm">{fieldText(HEADLINE, latest.data)}</p>
              <p className="text-xs text-muted-foreground">
                {AS_OF.label} {fieldText(AS_OF, latest.data)}. Advice only: nothing is ever traded for you.
              </p>
            </>
          )}
        </div>
        <Button size="sm" variant="outline" disabled={run.isPending || !latest.isFetched} onClick={() => setAsking(true)}>
          {run.isPending ? 'Running…' : 'Run optimizer'}
        </Button>
      </div>

      {run.isError && (
        <p role="alert" className="text-sm text-destructive">
          The run was not saved. {getErrorMessage(run.error, { write: true })}
        </p>
      )}
      {latest.isLoading && <div className="h-32 rounded-lg bg-muted animate-pulse" />}
      {none && <p className="text-sm text-muted-foreground">No run has been saved for this portfolio yet.</p>}
      {latest.isError && !none && <QueryError what="optimizer suggestions" error={latest.error} onRetry={latest.refetch} />}
      {latest.data && <OptimizerRun run={latest.data} view={accountFilter} />}

      <ConfirmDialog
        open={asking}
        title="Run the optimizer now?"
        confirmLabel="Run and save"
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          run.mutate()
        }}
      >
        The new run replaces the open suggestions, and the next weekly run replaces it. It does not count toward the weekly
        "held for N weeks" rules. It uses the prices already recorded (the weekly job fetches new ones; a price more than 7 days old
        is not used) and leaves out analyses more than a week old.
      </ConfirmDialog>
    </div>
  )
}
