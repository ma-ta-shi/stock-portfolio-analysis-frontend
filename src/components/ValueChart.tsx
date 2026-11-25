import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCAD, formatDate } from '@/lib/format'

export interface ValuePoint {
  /** The day, `YYYY-MM-DD`. */
  day: string
  /** The portfolio's value that day, in Canadian dollars. */
  value: number
}

/**
 * The portfolio's value over time: a line with a dated axis, the value on hover, and the first and last value written under it.
 * Fewer than two days of history cannot draw a line, so it says so instead of drawing a dot.
 */
export function ValueChart({ points, color = '#6b7280', height = 56 }: { points: readonly ValuePoint[]; color?: string; height?: number }) {
  if (points.length < 2) return <p className="text-xs text-muted-foreground">Not enough history yet to draw the value over time.</p>
  const first = points[0]
  const last = points[points.length - 1]
  return (
    <figure aria-label="Portfolio value over time" className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={[...points]} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="day" tickFormatter={(d: string) => formatDate(d)} interval="preserveStartEnd" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip formatter={(v) => [formatCAD(Number(v)), 'Value']} labelFormatter={(d) => formatDate(String(d))} contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>
          {formatDate(first.day)} {formatCAD(first.value)}
        </span>
        <span>
          {formatDate(last.day)} {formatCAD(last.value)}
        </span>
      </figcaption>
    </figure>
  )
}
