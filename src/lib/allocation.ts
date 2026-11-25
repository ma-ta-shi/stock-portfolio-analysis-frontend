export interface Slice {
  name: string
  value: number
}

/** Slices of a fraction map, in Canadian dollars, with the biggest first; cash is appended as its own slice (the maps already hold the part of funds the data does not list, as "inside funds, not itemised", and sum to 1 minus cash). */
export function slicesOf(fractions: Record<string, number>, total: number, extras: Slice[] = []): Slice[] {
  const slices = Object.entries(fractions)
    .map(([name, fraction]) => ({ name, value: fraction * total }))
    .sort((a, b) => b.value - a.value)
  return [...slices, ...extras].filter((s) => s.value > 0)
}
