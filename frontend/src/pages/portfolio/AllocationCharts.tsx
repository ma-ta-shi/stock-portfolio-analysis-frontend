import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { usePortfolioHoldings } from '@/hooks/use-portfolio'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

interface SliceEntry {
  name: string
  value: number
  pct: string
}

function groupBy(
  items: { key: string; value: number }[],
  total: number,
): SliceEntry[] {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.key, (map.get(item.key) ?? 0) + item.value)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      pct: ((value / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value)
}

function DonutChart({ data, title }: { data: SliceEntry[]; title: string }) {
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={({ pct }: any) => `${pct}%`}
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) =>
              new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(value))
            }
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface AllocationChartsProps {
  accountFilter?: string
}

export function AllocationCharts({ accountFilter }: AllocationChartsProps) {
  const { data: allHoldings, isLoading } = usePortfolioHoldings()
  const holdings =
    accountFilter && accountFilter !== 'combined'
      ? allHoldings?.filter((h) => h.account_type === accountFilter)
      : allHoldings

  const { sectorData, accountData, geoData } = useMemo(() => {
    if (!holdings) return { sectorData: [], accountData: [], geoData: [] }

    const total = holdings.reduce((sum, h) => sum + h.market_value, 0)

    const sectorData = groupBy(
      holdings.map((h) => ({ key: h.stock.sector, value: h.market_value })),
      total,
    )
    const accountData = groupBy(
      holdings.map((h) => ({ key: h.account_type.toUpperCase(), value: h.market_value })),
      total,
    )
    const geoData = groupBy(
      holdings.map((h) => ({
        key: h.stock.currency === 'CAD' ? 'Canadian' : 'US',
        value: h.market_value,
      })),
      total,
    )

    return { sectorData, accountData, geoData }
  }, [holdings])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <DonutChart data={sectorData} title="By Sector" />
      <DonutChart data={accountData} title="By Account" />
      <DonutChart data={geoData} title="By Geography" />
    </div>
  )
}
