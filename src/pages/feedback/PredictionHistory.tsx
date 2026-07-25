import { usePredictions } from '@/hooks/use-predictions'
import { RecommendationBadge } from '@/components/RecommendationBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PredictionCheckpoint } from '@/types'

function CheckpointDots({ checkpoints }: { checkpoints: PredictionCheckpoint[] }) {
  return (
    <div className="flex gap-1">
      {checkpoints.map((cp, i) => {
        let dotClass = 'bg-muted'
        if (cp.status === 'scored') {
          dotClass = cp.direction_correct ? 'bg-emerald-500' : 'bg-red-500'
        }
        return (
          <span
            key={i}
            className={cn('inline-block w-2 h-2 rounded-full', dotClass)}
            title={`${cp.interval}: ${cp.status}`}
          />
        )
      })}
    </div>
  )
}

export function PredictionHistory() {
  const { data, isLoading } = usePredictions()

  if (isLoading) {
    return <div className="h-48 rounded-lg bg-muted animate-pulse" />
  }
  if (!data?.data.length) {
    return <p className="text-muted-foreground text-sm py-8 text-center">No predictions yet.</p>
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Rec</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Checkpoints</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((p) => (
            <TableRow key={p.prediction_id}>
              <TableCell className="font-medium">{p.ticker}</TableCell>
              <TableCell>
                <RecommendationBadge recommendation={p.recommendation} />
              </TableCell>
              <TableCell className="text-right text-sm">
                {Math.round(p.confidence_score)}%
              </TableCell>
              <TableCell className="text-right text-sm">
                ${p.price_at_recommendation.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    p.status === 'active'
                      ? 'border-blue-500 text-blue-600'
                      : 'text-muted-foreground',
                  )}
                >
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell>
                <CheckpointDots checkpoints={p.checkpoints} />
              </TableCell>
              <TableCell className="text-right text-sm">
                {p.composite_score != null ? p.composite_score.toFixed(2) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
