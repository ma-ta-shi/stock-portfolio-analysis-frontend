import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useScorecard } from '@/hooks/use-feedback'
import { BAND_WORDS } from '@/lib/feedback'

export function ConfidenceCalibration() {
  const { data, isLoading } = useScorecard()
  if (isLoading) return <div className="h-56 rounded-lg bg-muted animate-pulse" />
  const bands = data?.state === 'current' ? data.figures.bands : []
  const chart = bands.map((b) => ({ bucket: `${BAND_WORDS[b.band]} (${b.hit.n})`, rate: b.hit.rate == null ? null : Math.round(b.hit.rate * 100) }))
  return (
    <section aria-label="Confidence Calibration" className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-1">Confidence Calibration</h3>
      <p className="text-xs text-muted-foreground mb-3">Hit rate beyond the baseline by the call&apos;s confidence (calls in brackets). It should rise with confidence.</p>
      {chart.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nothing scored yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
            <Tooltip formatter={(value) => [`${value}%`, 'Hit rate']} labelFormatter={(label) => `Confidence: ${label}`} />
            <ReferenceLine y={50} stroke="var(--muted-foreground)" strokeDasharray="4 2" label={{ value: 'Random', position: 'right', fontSize: 10 }} />
            <Bar dataKey="rate" fill="#10b981" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
