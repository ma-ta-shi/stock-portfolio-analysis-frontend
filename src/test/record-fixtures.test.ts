import { describe, expect, it } from 'vitest'
import recorder from '../../scripts/record-fixtures.mjs?raw'
import scratch from '../../scripts/scratch-backend.mjs?raw'

// Owner rule: no test data is ever taken from a real database. The recorder only ever talks to the backend it starts itself.
describe('the fixture recorder', () => {
  it('records from its own seeded backend', () => {
    expect(recorder).toContain("const base = await startScratchBackend('record-fixtures', ['--recordings'])")
  })

  it('cannot be pointed at another backend or user', () => {
    expect(recorder).not.toMatch(/process\.env|--user|localhost|127\.0\.0\.1/)
  })
})

describe('the backend it records from', () => {
  it('takes no database, stored runs or named person from this computer', () => {
    for (const name of ['DATABASE_URL', 'SP_RUNS_DIR', 'SP_BUNDLES_DIR', 'SP_REPLAYS_DIR', 'SP_EDGAR_IDENTITY']) expect(scratch).toContain(`${name}:`)
    expect(scratch).toContain('env: { ...process.env, ...isolated(db) }')
  })
})
