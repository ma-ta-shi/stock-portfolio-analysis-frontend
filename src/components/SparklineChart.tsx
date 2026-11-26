import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

interface Props {
  data: number[]
  color?: string
  height?: number
}

export function SparklineChart({ data, color = '#6b7280', height = 32 }: Props) {
  const chartData = data.map((v) => ({ v }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        {/* scaled to the values: from zero, a price line is flat */}
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
