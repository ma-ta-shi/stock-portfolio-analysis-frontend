import { fieldText, fieldsFor, type FieldPlace, type FieldSpec } from '@/lib/fields'

interface FieldListProps<Row> {
  fields: readonly FieldSpec<Row>[]
  row: Row
  /** Which specs to list; `detail` by default. */
  place?: FieldPlace
  className?: string
}

/** Label and value for every spec in a place, from the registry: the one way a detail line is drawn. */
export function FieldList<Row>({ fields, row, place = 'detail', className }: FieldListProps<Row>) {
  return (
    <dl className={className ?? 'grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm'}>
      {fieldsFor(fields, place).map((spec) => (
        <div key={spec.id}>
          <dt className="text-xs text-muted-foreground" title={spec.tooltip}>
            {spec.label}
          </dt>
          <dd className="font-medium">{spec.render ? spec.render(row) : fieldText(spec, row)}</dd>
        </div>
      ))}
    </dl>
  )
}
