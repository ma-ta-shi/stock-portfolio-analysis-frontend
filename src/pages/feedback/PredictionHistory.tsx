import { useState } from 'react'
import { Pager } from '@/components/Pager'
import { QueryError } from '@/components/QueryError'
import { RegistryTable } from '@/components/RegistryTable'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePredictions } from '@/hooks/use-predictions'
import { fieldsFor } from '@/lib/fields'
import { formatDate, formatPct } from '@/lib/format'
import { CHECKPOINT_WORDS, INTERVAL_WORDS, mapCheckpoints, type ApiPrediction } from '@/lib/predictions'
import { PREDICTION_FIELDS } from '@/screens/feedback'

const COLUMNS = fieldsFor(PREDICTION_FIELDS, 'column')
const RIGHT = new Set(['confidence', 'price'])
const pct = (v: number | null) => formatPct(v, 1)

function Checkpoints({ prediction }: { prediction: ApiPrediction }) {
  const checks = mapCheckpoints(prediction)
  if (!checks.length) return <p className="text-xs text-muted-foreground">No price band was made, so there is nothing to check.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {['Check-in', 'Due', 'Return', 'Market', 'Difference', 'Expected by then', 'Status'].map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {checks.map((c) => (
          <TableRow key={c.interval}>
            <TableCell>{INTERVAL_WORDS[c.interval] ?? c.interval}</TableCell>
            <TableCell>{formatDate(c.due)}</TableCell>
            <TableCell>{pct(c.totalReturn)}</TableCell>
            <TableCell>{pct(c.marketReturn)}</TableCell>
            <TableCell>{pct(c.excessReturn)}</TableCell>
            <TableCell>{pct(c.expected)}</TableCell>
            <TableCell className="whitespace-normal">
              {CHECKPOINT_WORDS[c.status]}
              {c.reason && <span className="text-muted-foreground">: {c.reason}</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function PredictionHistory() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error, refetch } = usePredictions(page)

  if (isLoading) return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  if (isError) return <QueryError what="prediction history" error={error} onRetry={refetch} />
  if (!data?.data.length) return <p className="text-muted-foreground text-sm py-8 text-center">No weekly batch predictions yet.</p>

  return (
    <>
      <RegistryTable
        columns={COLUMNS}
        rows={data.data}
        rowKey={(p) => p.prediction_id}
        rowLabel={(p) => `${p.stock.ticker}, ${formatDate(p.created_at)}`}
        rightAligned={RIGHT}
        detail={PREDICTION_FIELDS}
        expandedExtra={(p) => <Checkpoints prediction={p} />}
      />
      <Pager page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPage={setPage} noun="predictions" />
    </>
  )
}
