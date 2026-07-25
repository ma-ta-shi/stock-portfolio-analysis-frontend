import { LineChart, Line, ResponsiveContainer } from 'recharts'

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
