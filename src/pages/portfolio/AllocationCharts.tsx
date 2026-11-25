/**
 * The Allocation tab of the original design: three donuts, by sector, by account and by geography (the currencies held), drawn from
 * `GET /exposure` and the positions. Cash is its own slice. The legend sits under each chart, not inside it, so it cannot overlap the
 * chart. The API has no account filter yet (gap P-A2), so a single-account view says so. The other exposure figures are listed as not
 * shown in `screens/portfolio/exposure.tsx`.
 */
import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { QueryError } from '@/components/QueryError'
import { useExposure, usePositions } from '@/hooks/use-portfolio'
import { formatCAD, formatPercent } from '@/lib/format'
import { slicesOf, type Slice } from '@/lib/allocation'
import { GAPS } from '@/lib/gaps'
import { TONE_TEXT } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { PortfolioAccountView } from '@/types/portfolio'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#14b8a6', '#ec4899']

function DonutChart({ data, title }: { data: Slice[]; title: string }) {
  const total = data.reduce((sum, s) => sum + s.value, 0)
  return (
    <figure className="flex flex-col items-center min-w-0">
      <figcaption className="text-sm font-medium text-muted-foreground mb-2">{title}</figcaption>
      <div className="w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCAD(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs" aria-label={`${title} legend`}>
        {data.map((entry, index) => (
          <li key={entry.name} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} aria-hidden="true" />
            <span className="text-foreground">{entry.name}</span>
            <span className="text-muted-foreground">{total > 0 ? formatPercent(entry.value / total, 1) : ''}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

interface AllocationChartsProps {
  accountFilter?: PortfolioAccountView
}

export function AllocationCharts({ accountFilter = 'combined' }: AllocationChartsProps) {
  const exposure = useExposure()
  const positions = usePositions()

  const accountSlices = useMemo<Slice[]>(
    () =>
      Object.entries(positions.data?.accounts ?? {})
        .map(([name, scope]) => ({ name: name.toUpperCase(), value: scope.value_cad }))
        .filter((s) => s.value > 0),
    [positions.data],
  )

  if (exposure.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }
  if (exposure.isError) return <QueryError what="allocation" error={exposure.error} onRetry={exposure.refetch} />
  const data = exposure.data
  if (!data || data.total_value_cad <= 0) return <p className="text-muted-foreground text-sm py-8 text-center">No holdings to chart.</p>

  const total = data.total_value_cad
  const extras: Slice[] = [{ name: 'Cash', value: data.cash * total }]

  return (
    <div className="space-y-4">
      {accountFilter !== 'combined' && (
        <p role="status" className={cn('text-xs', TONE_TEXT.warning)}>
          These figures cover the whole portfolio, not {accountFilter.toUpperCase()} alone ({GAPS['P-A2'].what.toLowerCase()} is not available yet, P-A2).
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DonutChart data={slicesOf(data.sectors, total, extras)} title="By Sector" />
        <DonutChart data={accountSlices} title="By Account" />
        <DonutChart data={slicesOf(data.currencies, total, extras)} title="By Geography" />
      </div>
    </div>
  )
}
