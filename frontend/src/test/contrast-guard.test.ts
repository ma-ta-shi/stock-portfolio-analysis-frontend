/**
 * Guards against colour classes that failed WCAG AA contrast (axe-core audit) or broke
 * dark mode, so they can't creep back in. Use the tokens in src/lib/labels.ts instead.
 */
import { describe, expect, it } from 'vitest'

const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../components/ui/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function offenders(pattern: RegExp): string[] {
  return Object.entries(sources).flatMap(([file, src]) =>
    src.split('\n').flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  )
}

describe('colour contrast guard', () => {
  it('scans the source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
  })

  it('does not use low-contrast 400–600 shades for text (fail AA on white)', () => {
    // Matches e.g. "text-emerald-600" but not "dark:text-emerald-400" (dark mode needs light shades)
    expect(offenders(/(?<![\w:-])text-(emerald|green|amber|yellow|orange|lime)-(400|500|600)\b/)).toEqual([])
    expect(offenders(/(?<![\w:-])text-blue-(400|500)\b/)).toEqual([])
  })

  it('does not put white text on light badge fills', () => {
    expect(
      // blue-600 passes (5.2:1) so blue is only flagged up to 500
      offenders(/\bbg-((emerald|green|amber|yellow|orange|lime)-(300|400|500|600)|blue-(300|400|500))\b[^'"`]*\btext-white\b|\btext-white\b[^'"`]*\bbg-((emerald|green|amber|yellow|orange|lime)-(300|400|500|600)|blue-(300|400|500))\b/),
    ).toEqual([])
  })

  it('pairs state-prefixed colours with a state-prefixed dark variant', () => {
    // "hover:text-x dark:text-y" applies y permanently in dark mode; it must be "dark:hover:text-y"
    expect(offenders(/\b(hover|focus|active|group-hover):text-\S+\s+dark:text-/)).toEqual([])
  })
})
