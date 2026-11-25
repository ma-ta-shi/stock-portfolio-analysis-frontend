/**
 * The Allocation tab, from `GET /exposure`: sector, industry and currency donuts (cash and the part of funds the data does not
 * list are their own slices), each company directly and through funds, correlated groups, and risk. Every figure is a registry
 * entry (`screens/portfolio/exposure.tsx`). The API has no account filter yet (gap P-A2), so a single-account view says so.
 */
import { useMemo } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { FieldList } from '@/components/FieldList'
import { QueryError } from '@/components/QueryError'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useExposure, usePositions } from '@/hooks/use-portfolio'
import { fieldText, fieldsFor, type FieldSpec } from '@/lib/fields'
import { formatCAD, formatPercent } from '@/lib/format'
import { slicesOf, type Slice } from '@/lib/allocation'
import { GAPS } from '@/lib/gaps'
import { TONE_TEXT } from '@/lib/labels'
import { cn } from '@/lib/utils'
import {
  EXPOSURE_FIELDS,
  EXPOSURE_GROUP_FIELDS,
  EXPOSURE_NAME_FIELDS,
  EXPOSURE_PAIR_FIELDS,
  EXPOSURE_RISK_FIELDS,
  type RiskRow,
} from '@/screens/portfolio/exposure'
import type { PortfolioAccountView } from '@/types/portfolio'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#14b8a6', '#ec4899']
const PERCENT_COLUMNS = new Set(['direct', 'via_funds', 'total', 'weight', 'vol_cad', 'rho', 'beta_shrunk'])

function DonutChart({ data, title }: { data: Slice[]; title: string }) {
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
          <Legend formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  )
}

/** A small table over registry columns. */
function RegistryTable<Row>({ fields, rows, caption, rowKey }: { fields: readonly FieldSpec<Row>[]; rows: readonly Row[]; caption: string; rowKey: (row: Row) => string }) {
  const columns = fieldsFor(fields, 'column')
  if (!rows.length) return null
  return (
    <section aria-label={caption}>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">{caption}</h2>
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((spec) => (
                <TableHead key={spec.id} className={PERCENT_COLUMNS.has(spec.id) ? 'text-right' : undefined} title={spec.tooltip}>
                  {spec.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((spec) => (
                  <TableCell key={spec.id} className={cn('text-sm', PERCENT_COLUMNS.has(spec.id) && 'text-right')}>
                    {spec.render ? spec.render(row) : fieldText(spec, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
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
  const riskRows = useMemo<RiskRow[]>(() => Object.entries(exposure.data?.risk ?? {}).map(([ticker, risk]) => ({ ticker, ...risk })), [exposure.data])

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
  const extras: Slice[] = [
    { name: 'Cash', value: data.cash * total },
  ]

  return (
    <div className="space-y-6">
      {accountFilter !== 'combined' && (
        <p role="status" className={cn('text-xs', TONE_TEXT.warning)}>
          These figures cover the whole portfolio, not {accountFilter.toUpperCase()} alone ({GAPS['P-A2'].what.toLowerCase()} is not available yet, P-A2).
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DonutChart data={slicesOf(data.sectors, total, extras)} title="By Sector" />
        <DonutChart data={slicesOf(data.industries, total, extras)} title="By Industry" />
        <DonutChart data={slicesOf(data.currencies, total, extras)} title="By Currency" />
        <DonutChart data={accountSlices} title="By Account" />
      </div>

      {data.warnings.length > 0 && (
        <ul className={cn('text-xs space-y-0.5', TONE_TEXT.warning)}>
          {data.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <RegistryTable fields={EXPOSURE_NAME_FIELDS} rows={data.names} caption="Companies, directly and through funds" rowKey={(n) => n.key} />
      <RegistryTable fields={EXPOSURE_GROUP_FIELDS} rows={data.groups} caption="Correlated groups" rowKey={(g) => g.members.join('|')} />
      <RegistryTable fields={EXPOSURE_PAIR_FIELDS} rows={data.near_misses} caption="Nearly correlated pairs" rowKey={(p) => `${p.a}|${p.b}`} />
      <RegistryTable fields={EXPOSURE_PAIR_FIELDS} rows={data.correlations} caption="Correlated pairs" rowKey={(p) => `${p.a}|${p.b}`} />
      <RegistryTable fields={EXPOSURE_RISK_FIELDS} rows={riskRows} caption="Risk" rowKey={(r) => r.ticker} />

      <details>
        <summary className="cursor-pointer text-xs text-primary">About these figures</summary>
        <div className="mt-3">
          <FieldList fields={EXPOSURE_FIELDS} row={data} />
        </div>
      </details>
    </div>
  )
}
