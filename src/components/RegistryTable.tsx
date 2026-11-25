/**
 * A table whose columns are registry fields (`fieldsFor(specs, 'column')`) and whose rows expand to the registry's detail lines. The
 * Holdings, Closed positions, Transactions, dividends and broker-check tables are all this one component: header, right-aligned
 * figures, the expand toggle, an optional actions cell, and (when `onOpen` is given) a row that acts as a link for mouse and keyboard.
 */
import { Fragment, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FieldList } from '@/components/FieldList'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { clickableRowProps } from '@/lib/a11y'
import { fieldText, type FieldSpec } from '@/lib/fields'
import { cn } from '@/lib/utils'

interface RegistryTableProps<Row> {
  /** The columns, in order (usually `fieldsFor(specs, 'column')`). */
  columns: readonly FieldSpec<Row>[]
  rows: readonly Row[]
  rowKey: (row: Row) => string
  /** Names a row for assistive technology ("Show details of RY.TO (RRSP)"). */
  rowLabel: (row: Row) => string
  /** Ids of the columns of figures, aligned right. */
  rightAligned?: ReadonlySet<string>
  /** The registry specs listed in the expanded row; a table with no detail and no extra has no expand column. */
  detail?: readonly FieldSpec<Row>[]
  /** More content under the detail lines of an expanded row (action buttons). */
  expandedExtra?: (row: Row) => ReactNode
  /** Makes a whole row a link: what it does, and what a screen reader calls it. */
  onOpen?: (row: Row) => void
  openLabel?: (row: Row) => string
  /** A last cell for a row (buttons, a link); `actionsHeader` names its column for screen readers. */
  actions?: (row: Row) => ReactNode
  actionsHeader?: string
  /** Tighter cell padding, for a table with many columns (Holdings). */
  dense?: boolean
  id?: string
  className?: string
}

const stop = { onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(), onKeyDown: (e: { stopPropagation: () => void }) => e.stopPropagation() }

export function RegistryTable<Row>({
  columns,
  rows,
  rowKey,
  rowLabel,
  rightAligned = new Set<string>(),
  detail = [],
  expandedExtra,
  onOpen,
  openLabel,
  actions,
  actionsHeader,
  dense = false,
  id,
  className,
}: RegistryTableProps<Row>) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  // A row that is a link must not open when its own buttons are used.
  const guard = onOpen ? stop : {}
  const expandable = detail.some((spec) => spec.places.includes('detail')) || !!expandedExtra
  const colSpan = columns.length + (expandable ? 1 : 0) + (actions ? 1 : 0)

  return (
    <div id={id} className={cn('border border-border rounded-lg overflow-x-auto', dense && '[&_th]:px-1 [&_td]:px-1 [&_th]:whitespace-normal [&_th]:leading-tight', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {expandable && (
              <TableHead className="w-8">
                <span className="sr-only">Details</span>
              </TableHead>
            )}
            {columns.map((spec) => (
              <TableHead key={spec.id} className={rightAligned.has(spec.id) ? 'text-right' : undefined} title={spec.tooltip}>
                {spec.label}
              </TableHead>
            ))}
            {actions && (
              <TableHead>
                <span className="sr-only">{actionsHeader ?? 'Actions'}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const key = rowKey(row)
            const label = rowLabel(row)
            const open = expanded.has(key)
            return (
              <Fragment key={key}>
                <TableRow {...(onOpen ? clickableRowProps(() => onOpen(row), openLabel?.(row) ?? label) : {})}>
                  {expandable && (
                    <TableCell {...guard}>
                      <Button variant="ghost" size="sm" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} details of ${label}`} onClick={() => toggle(key)}>
                        {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                      </Button>
                    </TableCell>
                  )}
                  {columns.map((spec) => (
                    <TableCell key={spec.id} className={cn('text-sm', rightAligned.has(spec.id) && 'text-right')}>
                      {spec.render ? spec.render(row) : fieldText(spec, row)}
                    </TableCell>
                  ))}
                  {actions && <TableCell {...guard}>{actions(row)}</TableCell>}
                </TableRow>
                {expandable && open && (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="bg-muted/30 py-3 space-y-3">
                      <FieldList fields={detail} row={row} />
                      {expandedExtra?.(row)}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
