import { describe, it, expect } from 'vitest'
import type {
  AccountMatrixResponse,
  MonthlyPlanResponse,
  OrderViewResponse,
  RaiseCashResponse,
  RunListResponse,
  RunViewResponse,
  TargetBookResponse,
} from '@/types'
import proposalsJson from '../../public/mock-data/optimizer/user_01/proposals.json'
import proposalJson from '../../public/mock-data/optimizer/user_01/proposal.json'
import runsJson from '../../public/mock-data/optimizer/user_01/proposal-runs.json'
import previewJson from '../../public/mock-data/optimizer/user_01/run-preview.json'
import askJson from '../../public/mock-data/optimizer/user_01/ask.json'
import matrixJson from '../../public/mock-data/optimizer/user_01/account-matrix.json'
import bookJson from '../../public/mock-data/optimizer/user_01/target-book.json'
import planJson from '../../public/mock-data/optimizer/user_01/monthly-plan.json'
import raiseJson from '../../public/mock-data/optimizer/user_01/raise-cash.json'

// Each mock is a real response of the backend (the synthetic Test User), typed as the generated interface it
// should satisfy: tsc fails here when a mock and `portfolio-optimizer.ts` drift apart.
const proposals: RunViewResponse = proposalsJson
const proposal: OrderViewResponse = proposalJson
const runs: RunListResponse = runsJson
const preview: RunViewResponse = previewJson
const ask: RunViewResponse = askJson
const matrix: AccountMatrixResponse = matrixJson
// TypeScript reads the sparse per-account maps of the JSON as optional-undefined, which an index signature rejects, so
// the book is cast; its fields are still checked at run time below
const book = bookJson as unknown as TargetBookResponse
const plan: MonthlyPlanResponse = planJson
const raise: RaiseCashResponse = raiseJson

describe('optimizer mock data', () => {
  it('the stored run is one document with its orders, reasons, waiting items and report', () => {
    expect(proposals.stored).toBe(true)
    expect(proposals.headline).toMatch(/order\(s\) to place|No changes/)
    expect(proposals.orders.length).toBeGreaterThan(0)
    for (const order of proposals.orders) {
      expect(order.reasons.length).toBeGreaterThan(0)
      expect(order.rule_text).not.toBe(order.rule)
      // a proposal carries no model confidence: its value is the benefit against its costs and noise margin
      expect(Object.keys(order)).not.toContain('confidence')
    }
    expect(proposals.waiting.length).toBeGreaterThan(0)
    expect(proposals.report.caps.length).toBeGreaterThan(0)
    expect(proposals.missing).toEqual([])
  })

  it('one proposal is the same as its entry in the run', () => {
    expect(proposals.orders.some((o) => o.proposal_id === proposal.proposal_id)).toBe(true)
  })

  it('the run history lists runs newest first with their paging', () => {
    expect(runs.data.length).toBeGreaterThan(0)
    expect(runs.meta.total).toBe(runs.data.length)
    const stamps = runs.data.map((r) => r.created_at)
    expect([...stamps].sort().reverse()).toEqual(stamps)
  })

  it('an unsaved look has no ids and says it is a dry run', () => {
    expect(preview.stored).toBe(false)
    expect(preview.dry_run).toBe(true)
    expect(preview.run_id).toBeNull()
    expect(preview.orders.every((o) => o.proposal_id === null && o.status === 'unsaved')).toBe(true)
  })

  it('an answer to "where should this go" is an inquiry that sells nothing', () => {
    expect(ask.kind).toBe('inquiry')
    expect(ask.orders.every((o) => o.side === 'buy')).toBe(true)
  })

  it('the account matrix has the three market lines and a cell per instrument and account', () => {
    expect(Object.keys(matrix.market_lines).sort()).toEqual(['rrsp', 'tfsa', 'trading'])
    expect(matrix.cells.length).toBeGreaterThan(0)
    expect(matrix.cells.every((c) => c.ticker && c.account)).toBe(true)
  })

  it('the target book places the whole portfolio across the three accounts', () => {
    const capacity = book.accounts.reduce((sum, a) => sum + a.capacity, 0)
    expect(capacity).toBeCloseTo(1, 6)
    expect(book.lines.length).toBeGreaterThan(0)
  })

  it('the monthly plan splits the amount across the accounts', () => {
    const placed = plan.split.rrsp + plan.split.tfsa + plan.split.trading + plan.unplaced_cad
    expect(placed).toBeCloseTo(plan.amount_cad, 2)
  })

  it('raise-cash starts with the TFSA and never uses the RRSP', () => {
    expect(raise.steps[0].account).toBe('tfsa')
    expect(raise.steps.every((s) => s.account !== 'rrsp')).toBe(true)
  })
})
