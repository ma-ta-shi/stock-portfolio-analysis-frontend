/**
 * The field registry: where every API field a screen shows is declared once.
 *
 * A screen reads some API schemas. For each property of each schema it either shows it, through a `FieldSpec` whose
 * `source` names the API field, or lists it in the screen's `notShown` with a reason (and a gap id when something is
 * missing). Tables, detail lists and the CSV export are all built from the same specs, so a field is never hand-written
 * into a view, and `checkScreen` (run by `field-coverage.test.ts`) fails when the backend adds a field nobody has decided
 * about. `npm run coverage:api` lists the response schemas no screen has claimed yet.
 *
 * The procedure for a new screen is "Wiring a screen" in `frontend/CLAUDE.md`.
 */
import type { ReactNode } from 'react'
import type { components } from '@/types/openapi.gen'
import type { GapId } from './gaps'

type Schemas = components['schemas']

/** Every `Schema.field` of the generated API types. A mistyped source or `notShown` key fails `tsc`. */
export type ApiFieldKey = {
  [S in keyof Schemas & string]: `${S}.${keyof Schemas[S] & string}`
}[keyof Schemas & string]

/** Where a field appears; `input` is a request field the owner types (see `screens/portfolio/entry-fields.ts`). */
export type FieldPlace = 'column' | 'detail' | 'csv' | 'input'

export interface FieldSpec<Row> {
  /** Unique within a screen. */
  id: string
  label: string
  /** The API field(s) this shows; several for a value derived from more than one (for example a yield). */
  source: ApiFieldKey | readonly ApiFieldKey[]
  /** The value, read from the view-model row. */
  get: (row: Row) => unknown
  /** Text for `get`'s value; the default shows null as "—" and numbers with two decimals. */
  format?: (value: unknown, row: Row) => string
  tooltip?: string
  places: readonly FieldPlace[]
  /** A bespoke cell for a table or detail line (a badge, a link); CSV always uses the text. */
  render?: (row: Row) => ReactNode
}

/** What a screen needs to know about a field to check coverage; any `FieldSpec<Row>` is one. */
export type FieldMeta = Pick<FieldSpec<never>, 'id' | 'label' | 'source' | 'places'>

export interface NotShown {
  reason: string
  /** The gap registry id when something is missing or different (a documented difference needs one too). */
  gap?: GapId
}

export interface ScreenFieldSet {
  screen: string
  /** The response schemas the screen reads; every property of each must be in `fields` or `notShown`. */
  schemas: readonly string[]
  fields: readonly FieldMeta[]
  notShown: Partial<Record<ApiFieldKey, NotShown>>
  /** Whole schemas the screen reaches but deliberately does not show (counted as claimed), each with its reason. */
  notShownSchemas?: Readonly<Record<string, NotShown>>
}

/** Declares a registry; throws on a duplicate id so two entries cannot share a column or a CSV header. */
export function defineFields<Row>(specs: readonly FieldSpec<Row>[]): readonly FieldSpec<Row>[] {
  const seen = new Set<string>()
  for (const spec of specs) {
    if (seen.has(spec.id)) throw new Error(`Duplicate field id "${spec.id}"`)
    seen.add(spec.id)
  }
  return specs
}

const EMPTY = '—'

/** The text of a field for a row. */
export function fieldText<Row>(spec: FieldSpec<Row>, row: Row): string {
  const value = spec.get(row)
  if (spec.format) return spec.format(value, row)
  if (value == null || value === '') return EMPTY
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/** The specs that belong in a place (`column`, `detail` or `csv`), in declaration order. */
export function fieldsFor<Row>(specs: readonly FieldSpec<Row>[], place: FieldPlace): FieldSpec<Row>[] {
  return specs.filter((spec) => spec.places.includes(place))
}

export type SortDir = 'asc' | 'desc'

/** A sorted copy by a field's own value: numbers as numbers, text and ISO days as text, a row without a value always last. */
export function sortRows<Row>(rows: readonly Row[], spec: FieldSpec<Row>, dir: SortDir): Row[] {
  return [...rows].sort((a, b) => {
    const va = spec.get(a)
    const vb = spec.get(b)
    if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1
    const order = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb))
    return dir === 'asc' ? order : -order
  })
}

/** CSV header and rows from the `csv` specs; the same text a table cell would show. */
export function fieldsToCsvRows<Row>(specs: readonly FieldSpec<Row>[], rows: readonly Row[]): string[][] {
  const csv = fieldsFor(specs, 'csv')
  return [csv.map((spec) => spec.label), ...rows.map((row) => csv.map((spec) => fieldText(spec, row)))]
}

export interface ApiFieldsFile {
  responses: readonly string[]
  fields: Readonly<Record<string, readonly string[]>>
}

/**
 * Problems with one screen's coverage: a property nobody decided, a source or `notShown` key the API does not have, a
 * gap id that is not registered, a field both shown and listed as not shown. An empty list means the screen is complete.
 */
export function checkScreen(set: ScreenFieldSet, api: ApiFieldsFile, gapIds: ReadonlySet<string>): string[] {
  const problems: string[] = []
  const exists = (key: string) => {
    const [schema, field] = [key.slice(0, key.indexOf('.')), key.slice(key.indexOf('.') + 1)]
    return api.fields[schema]?.includes(field) ?? false
  }
  const shown = new Set<string>()
  for (const spec of set.fields) {
    for (const source of [spec.source].flat()) {
      if (!exists(source)) problems.push(`${set.screen}: field "${spec.id}" names ${source}, which the API does not have`)
      shown.add(source)
    }
  }
  for (const [key, entry] of Object.entries(set.notShown)) {
    if (!exists(key)) problems.push(`${set.screen}: notShown lists ${key}, which the API does not have`)
    if (shown.has(key)) problems.push(`${set.screen}: ${key} is both shown and listed as not shown`)
    if (entry?.gap && !gapIds.has(entry.gap)) problems.push(`${set.screen}: notShown ${key} cites unknown gap ${entry.gap}`)
    if (!entry?.reason) problems.push(`${set.screen}: notShown ${key} has no reason`)
  }
  for (const [schema, entry] of Object.entries(set.notShownSchemas ?? {})) {
    if (!api.fields[schema]) problems.push(`${set.screen}: notShownSchemas lists ${schema}, which the API does not have`)
    if (set.schemas.includes(schema)) problems.push(`${set.screen}: ${schema} is both read and listed as not shown`)
    if (entry.gap && !gapIds.has(entry.gap)) problems.push(`${set.screen}: notShownSchemas ${schema} cites unknown gap ${entry.gap}`)
    if (!entry.reason) problems.push(`${set.screen}: notShownSchemas ${schema} has no reason`)
  }
  for (const schema of set.schemas) {
    if (!api.fields[schema]) {
      problems.push(`${set.screen}: schema ${schema} does not exist`)
      continue
    }
    for (const field of api.fields[schema]) {
      const key = `${schema}.${field}`
      if (!shown.has(key) && !(key in set.notShown)) problems.push(`${set.screen}: ${key} is neither shown nor listed as not shown`)
    }
  }
  return problems
}

/** The response schemas no screen has claimed (its `schemas`), for `npm run coverage:api`. */
export function unclaimedSchemas(sets: readonly ScreenFieldSet[], api: ApiFieldsFile): string[] {
  const claimed = new Set(sets.flatMap((set) => [...set.schemas, ...Object.keys(set.notShownSchemas ?? {})]))
  return api.responses.filter((schema) => !claimed.has(schema))
}
