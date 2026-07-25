import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useFeedback } from '@/hooks/use-feedback'

export function ConfidenceCalibration() {
  const { data, isLoading } = useFeedback()

  if (isLoading) {
    return <div className="h-56 rounded-lg bg-muted animate-pulse" />
  }
  if (!data) return null

  const chartData = data.confidence_calibration.map((b) => ({
    bucket: b.confidence_bucket,
    accuracy: Math.round(b.accuracy * 100),
    predictions: b.predictions,
  }))

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Confidence Calibration</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            width={40}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [`${value}%`, 'Accuracy']}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => `Confidence: ${label}`}
          />
          <ReferenceLine
            y={50}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 2"
            label={{ value: 'Random', position: 'right', fontSize: 10 }}
          />
          <Bar dataKey="accuracy" fill="#10b981" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
