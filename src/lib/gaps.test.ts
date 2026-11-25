import { describe, expect, it } from 'vitest'
import { ApiError, notConnected } from './api'
import { GAPS, isGapId, notConnectedMessage, unavailableLabel } from './gaps'

const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('gap registry', () => {
  it('gives every gap a screen-prefixed id, a kind, what, why and a ClickUp ticket', () => {
    for (const [id, gap] of Object.entries(GAPS)) {
      expect(id, id).toMatch(/^[PWSTFHE]-[A-Za-z0-9]+$/)
      expect(['not-connected', 'missing', 'documented'], id).toContain(gap.kind)
      expect(gap.what.length, id).toBeGreaterThan(5)
      expect(gap.why.length, id).toBeGreaterThan(5)
      expect(gap.ticket, id).toMatch(/^[0-9a-z]{8,10}$/)
    }
  })

  it('builds the not-connected error and the unavailable label from the registry', () => {
    const error = notConnected('P-W9')
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('not_connected')
    expect(error.message).toBe('Adding a stock by company name is not connected yet (P-W9, ticket 86bd6r34c).')
    expect(notConnectedMessage('P-W9')).toBe(error.message)
    expect(unavailableLabel('P-C2')).toBe('unavailable (P-C2)')
    expect(isGapId('P-W9')).toBe(true)
    expect(isGapId('nope')).toBe(false)
  })

  it('cites only registered gap ids in the code (a mistyped id would compile as a string elsewhere)', () => {
    const cited = new Set<string>()
    for (const [file, text] of Object.entries(sources)) {
      if (/\.test\.tsx?$/.test(file) || file === '/src/lib/gaps.ts') continue
      for (const m of text.matchAll(/\b(?:notConnected|unavailableLabel)\(\s*'([A-Z]-[A-Za-z0-9]+)'/g)) cited.add(m[1])
    }
    expect([...cited].filter((id) => !isGapId(id))).toEqual([])
  })
})
