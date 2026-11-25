/**
 * The small text formatters every screen registry uses for a figure it draws (`FieldSpec.format`). They take `unknown` because a
 * spec's `get` returns `unknown`, and they treat a missing value as a dash, so a null field never prints "undefined".
 * Each was defined again in several registry files; they live here once.
 */
import { formatCAD, formatDate, formatPct, formatPercent } from '@/lib/format'

const DASH = '—'

/** Canadian dollars; `signed` puts a + or - on it. */
export const cad = (value: unknown, signed = false) => formatCAD(value as number | null, { signed })

/** A day or an instant as a short date. */
export const day = (value: unknown) => (value ? formatDate(value as string) : DASH)

/** A fraction as a signed percent (+9.11%). */
export const signedPct = (value: unknown) => formatPct(value as number | null)

/** A fraction as an unsigned percent (9.11%). */
export const plainPct = (value: unknown) => formatPercent(value as number | null)

/** Any value as text; empty is a dash. */
export const text = (value: unknown) => (value == null || value === '' ? DASH : String(value))

export const yesNo = (value: unknown) => (value == null ? DASH : value ? 'Yes' : 'No')

/** A list of strings joined with semicolons; an empty list reads "None". */
export const list = (value: unknown) => ((value as string[]).length ? (value as string[]).join('; ') : 'None')
