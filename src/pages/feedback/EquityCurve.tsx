import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useFeedback } from '@/hooks/use-feedback'

function formatYAxis(value: number) {
  return `$${Math.round(value / 1000)}K`
}

function formatXAxis(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })
}

export function EquityCurve() {
  const { data, isLoading } = useFeedback()

  if (isLoading) {
    return <div className="h-56 rounded-lg bg-muted animate-pulse mb-6" />
  }
  if (!data) return null

  const periods = data.walk_forward_equity_curve.periods

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <h2 className="font-semibold mb-3">Walk-Forward Performance</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={periods} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            width={52}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              `$${Number(value).toLocaleString('en-CA')}`,
              name === 'portfolio_value' ? 'Portfolio' : 'TSX Benchmark',
            ]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => formatXAxis(String(label))}
          />
          <Legend
            formatter={(value: string) =>
              value === 'portfolio_value' ? 'Portfolio' : 'TSX Benchmark'
            }
          />
          <Line
            type="monotone"
            dataKey="portfolio_value"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="benchmark_value"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
