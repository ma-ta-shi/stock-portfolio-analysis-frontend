/** The user's own portfolio value beside the same money in the market fund, from the first day something is held. */
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { QueryError } from '@/components/QueryError'
import { useValueHistory } from '@/hooks/use-portfolio'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import { formatCAD, formatDate } from '@/lib/format'

const TITLE = 'Your portfolio vs the market fund'
const NAMES: Record<string, string> = { value_cad: 'Your portfolio', fund_value_cad: 'Same money in the fund' }
const tick = (day: string) => formatDate(day, { month: 'short', day: 'numeric' })

export function EquityCurve() {
  const portfolio = usePortfolioId()
  const history = useValueHistory('combined', 365)
  const points = history.data?.points ?? []
  const first = points.findIndex((p) => p.fund_value_cad != null)
  const line = first < 0 ? [] : points.slice(first)
  const last = line[line.length - 1]

  return (
    <section aria-label={TITLE} className="bg-card border border-border rounded-lg p-4 mb-6">
      <h2 className="font-semibold">{TITLE}</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Your own decisions, not the system&apos;s. The fund line takes the same money on the same days; it has no dividends, which favours your portfolio.
      </p>
      {portfolio.isEmpty ? (
        <p className="text-sm text-muted-foreground">You have no portfolio yet.</p>
      ) : portfolio.isError ? (
        <QueryError what="your portfolio" error={portfolio.error} onRetry={portfolio.refetch} compact />
      ) : history.isError ? (
        <QueryError what="value history" error={history.error} onRetry={history.refetch} compact />
      ) : history.isLoading || !history.data ? (
        <div className="h-56 rounded-lg bg-muted animate-pulse" />
      ) : !last ? (
        <p className="text-sm text-muted-foreground">{history.data.warnings[0] ?? 'Nothing held in the past year.'}</p>
      ) : (
        <>
          <p className="text-sm mb-2">
            On {formatDate(last.day)}: {formatCAD(last.value_cad)} against {formatCAD(last.fund_value_cad)} in the fund.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={line} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tickFormatter={tick} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" minTickGap={30} />
              <YAxis domain={['auto', 'auto']} tickFormatter={(v: number) => formatCAD(v, { compact: true })} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={56} />
              <Tooltip formatter={(value, name) => [formatCAD(Number(value)), NAMES[String(name)]]} labelFormatter={(label) => formatDate(String(label))} />
              <Legend formatter={(value: string) => NAMES[value]} />
              <Line type="monotone" dataKey="value_cad" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="fund_value_cad" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  )
}
