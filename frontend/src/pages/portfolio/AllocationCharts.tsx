import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'
import { useFxRates } from '@/hooks/use-fx-rates'
import { QueryError } from '@/components/QueryError'
import { formatCAD, formatPercent } from '@/lib/format'
import { buildAllocations, filterByAccount, type AllocationSlice } from '@/lib/portfolio'
import type { PortfolioAccountView } from '@/types'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

function DonutChart({ data, title }: { data: AllocationSlice[]; title: string }) {
  return (
    <figure className="flex flex-col items-center">
      <figcaption className="text-sm font-medium text-muted-foreground mb-2">{title}</figcaption>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            label={({ percent }) => formatPercent(percent ?? 0, 1)}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCAD(Number(value))} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  )
}

interface AllocationChartsProps {
  accountFilter?: PortfolioAccountView
}

export function AllocationCharts({ accountFilter }: AllocationChartsProps) {
  const { data: allHoldings, isLoading, isError, error, refetch } = usePortfolioHoldings()
  const { rates, isLoading: fxLoading } = useFxRates()

  const allocations = useMemo(() => {
    const holdings = filterByAccount(allHoldings, accountFilter)
    return holdings ? buildAllocations(holdings, rates) : null
  }, [allHoldings, accountFilter, rates])

  if (isLoading || fxLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <QueryError what="holdings" error={error} onRetry={refetch} />
  }

  if (!allocations || allocations.totalCad <= 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">No holdings to chart.</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DonutChart data={allocations.bySector} title="By Sector" />
        <DonutChart data={allocations.byAccount} title="By Account" />
        <DonutChart data={allocations.byGeography} title="By Geography" />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Weights by market value in CAD{allocations.missingCurrencies.length === 0 && rates.USD ? ' (USD converted at the current rate)' : ''}.
        {allocations.missingCurrencies.length > 0 && (
          <span className="text-amber-600">
            {' '}{allocations.missingCurrencies.join(', ')} holdings excluded — exchange rate unavailable.
          </span>
        )}
      </p>
    </div>
  )
}
