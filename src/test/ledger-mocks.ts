/**
 * One place that fakes the ledger hooks for tests that mock `@/hooks/use-portfolio` (`vi.mock('@/hooks/use-portfolio')`): the preview
 * and record mutations behave like the real ones (they hold state and re-render the component) but answer from `outcomes`, and
 * `useAccounts` serves the recorded accounts. Replaces the same fifteen lines of hook setup in every dialog test.
 *
 *   const ledger = mockLedgerHooks()
 *   ledger.outcomes.record = { error: new ApiError('dup', 409, 'DUPLICATE_ENTRY', '/u') }
 *   ... click Review, click Record ...
 *   expect(ledger.calls.record[0].body).toEqual(...)
 */
import { useState } from 'react'
import { vi } from 'vitest'
import { useAccounts, useLedgerPreview, useLedgerRecord, type LedgerCall } from '@/hooks/use-portfolio'
import type { EventPreview } from '@/screens/portfolio/preview'
import accountsFixture from '@/test/fixtures/portfolio/accounts.json'

/**
 * `pending`: the request is in flight and never settles, and the hook has not re-rendered yet. The real mutation hook batches its
 * notifications, so a fast second click reaches the button before it renders disabled; modelling that lag is what lets a test prove the
 * panel's own latch (a synchronous `isPending` would hide the bug).
 */
type Outcome = { data: unknown } | { error: Error } | { pending: true }

/** A preview with a position and a cash change: enough for a form test to see Record become available. */
export const PREVIEW_OF_A_BUY: EventPreview = {
  row: {},
  position: {
    shares: 50, total_book_cost: 5000, total_book_cost_cad: 5000, average_cost_basis: 100, is_active: true,
    first_buy_date: '2026-01-02T00:00:00', last_transaction_date: '2026-11-24T00:00:00',
    total_realized_gain_loss_cad: 0, total_dividends_received_cad: 0, total_fees_paid_cad: 4.99,
  },
  cash_before: { CAD: 2000, USD: 0 }, cash_after: { CAD: 1000, USD: 0 }, estimated_tax: null, tax_note: null,
  warnings: [], notes: [], other_effects: [], room: {},
} // fmt: skip

const RECORDED = {
  transactions: [
    {
      transaction_id: 't1', portfolio_id: 'p1', holding_id: 'h1', stock: { stock_id: 's1', ticker: 'ENB.TO', name: 'Enbridge Inc.', exchange: 'TSX', currency: 'CAD', sector: 'Energy' },
      account_type: 'trading', transaction_type: 'buy', shares: 10, price_per_share: 100, total_amount: 1000, fees: 0, currency: 'CAD',
      transaction_date: '2026-11-24T00:00:00', tax_year: 2026, in_kind: false, initiated_by: 'owner', created_at: '2026-11-24T12:00:00Z',
    },
  ],
} // fmt: skip

function useFakeMutation(outcome: () => Outcome, calls: LedgerCall[]) {
  const [state, setState] = useState<{ data?: unknown; error: Error | null; status: 'idle' | 'success' | 'error' }>({ error: null, status: 'idle' })
  return {
    data: state.data,
    error: state.error,
    isPending: false,
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    reset: () => setState({ error: null, status: 'idle' }),
    mutate: (call: LedgerCall, options?: { onSuccess?: (data: unknown) => void; onSettled?: () => void }) => {
      calls.push(call)
      const result = outcome()
      if ('pending' in result) return
      if ('error' in result) setState({ error: result.error, status: 'error' })
      else {
        setState({ data: result.data, error: null, status: 'success' })
        options?.onSuccess?.(result.data)
      }
      options?.onSettled?.()
    },
  }
}

/** `commission` is each account's commission per trade; the recorded accounts charge none, so a test that checks the fee default sets one. */
export function mockLedgerHooks({ commission = 9.99 }: { commission?: number } = {}) {
  const outcomes: { preview: Outcome; record: Outcome } = { preview: { data: PREVIEW_OF_A_BUY }, record: { data: RECORDED } }
  const calls: { preview: LedgerCall[]; record: LedgerCall[] } = { preview: [], record: [] }
  vi.mocked(useLedgerPreview).mockImplementation((() => useFakeMutation(() => outcomes.preview, calls.preview)) as unknown as typeof useLedgerPreview)
  vi.mocked(useLedgerRecord).mockImplementation((() => useFakeMutation(() => outcomes.record, calls.record)) as unknown as typeof useLedgerRecord)
  const accounts = { ...accountsFixture, data: accountsFixture.data.map((a) => ({ ...a, commission_per_trade: commission })) }
  vi.mocked(useAccounts).mockReturnValue({ data: accounts, isLoading: false } as unknown as ReturnType<typeof useAccounts>)
  return { outcomes, calls }
}
