import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { LedgerPanel } from './LedgerPanel'
import { ApiError } from '@/lib/api'
import { LEDGER, ledgerRoute } from '@/lib/ledger-routes'
import { mockLedgerHooks } from '@/test/ledger-mocks'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
const onDone = vi.fn()

beforeEach(() => {
  ledger = mockLedgerHooks()
  onDone.mockClear()
})

/** A panel with one text input standing for the form: its text is the body, empty is "not valid yet". */
function Harness({ start = 'a', previewRoute = LEDGER.eventsPreview }: { start?: string; previewRoute?: typeof LEDGER.eventsPreview | null }) {
  const [text, setText] = useState(start)
  return (
    <LedgerPanel body={text ? { text } : null} previewRoute={previewRoute} recordRoute={LEDGER.events} submitLabel="Buy shares" onDone={onDone}>
      <input aria-label="Field" value={text} onChange={(e) => setText(e.target.value)} />
    </LedgerPanel>
  )
}

const review = () => fireEvent.click(screen.getByRole('button', { name: 'Review' }))
const record = () => fireEvent.click(screen.getByRole('button', { name: 'Buy shares' }))

describe('LedgerPanel', () => {
  it('offers Review first and no way to record before a review', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Buy shares' })).not.toBeInTheDocument()
  })

  it('cannot review while the inputs are not valid', () => {
    render(<Harness start="" />)
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })

  it('sends the body to the preview, shows what the server says, then offers Record', () => {
    render(<Harness />)
    review()
    expect(ledger.calls.preview).toEqual([{ params: undefined, body: { text: 'a' } }])
    expect(screen.getByText('Shares after')).toBeInTheDocument()
    expect(screen.getByText('Cash (CAD)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buy shares' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
  })

  it('records the reviewed body and then shows what was recorded, with nothing left to submit', () => {
    render(<Harness />)
    review()
    record()
    expect(ledger.calls.record).toEqual([{ params: undefined, body: { text: 'a' } }])
    expect(screen.getByRole('status')).toHaveTextContent('Recorded 1 entry')
    expect(screen.getByRole('list', { name: 'Recorded entries' })).toHaveTextContent('ENB.TO')
    expect(screen.queryByRole('button', { name: 'Buy shares' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalled()
  })

  it('hides the preview and asks for a new review when an input changes', () => {
    render(<Harness />)
    review()
    expect(screen.getByRole('button', { name: 'Buy shares' })).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'ab' } })
    expect(screen.queryByText('Shares after')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buy shares' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
  })

  it('submits with Enter: a review first, then the record', () => {
    render(<Harness />)
    fireEvent.submit(screen.getByLabelText('Field').closest('form')!)
    expect(ledger.calls.preview).toHaveLength(1)
    expect(ledger.calls.record).toHaveLength(0)
    fireEvent.submit(screen.getByLabelText('Field').closest('form')!)
    expect(ledger.calls.record).toHaveLength(1)
  })

  it('shows a failed review in plain words and stays on Review', () => {
    ledger.outcomes.preview = { error: new ApiError('x', 422, 'INSUFFICIENT_SHARES', '/u') }
    render(<Harness />)
    review()
    expect(screen.getByRole('alert')).toHaveTextContent('x')
    expect(screen.queryByRole('button', { name: 'Buy shares' })).not.toBeInTheDocument()
  })

  it('shows a failed record, keeps the form, and does not claim success', () => {
    ledger.outcomes.record = { error: new ApiError('dup', 409, 'DUPLICATE_ENTRY', '/u') }
    render(<Harness />)
    review()
    record()
    expect(screen.getByRole('alert')).toHaveTextContent(/last 30 seconds/)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Field')).toBeInTheDocument()
  })

  it('says writes need the real backend in mock mode', () => {
    ledger.outcomes.preview = { error: new ApiError('x', null, 'mock_mode_unsupported', '/u') }
    render(<Harness />)
    review()
    expect(screen.getByRole('alert')).toHaveTextContent(/real backend/)
  })

  it('lists warnings and notes the server returned', () => {
    ledger.outcomes.preview = { data: { ...(ledger.outcomes.preview as { data: object }).data, warnings: ['Cash goes negative'], notes: ['A superficial loss'] } }
    render(<Harness />)
    review()
    expect(screen.getByRole('list', { name: 'Warnings' })).toHaveTextContent('Cash goes negative')
    expect(screen.getByRole('list', { name: 'Notes' })).toHaveTextContent('A superficial loss')
  })

  it('lets only the first of two quick clicks on Record through (the second would meet the duplicate guard and mislead)', () => {
    render(<Harness />)
    review()
    ledger.outcomes.record = { pending: true } // the request stays in flight
    const button = screen.getByRole('button', { name: 'Buy shares' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(ledger.calls.record).toHaveLength(1)
  })

  it('lets only the first of two quick clicks on Review through', () => {
    ledger.outcomes.preview = { pending: true }
    render(<Harness />)
    const button = screen.getByRole('button', { name: 'Review' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(ledger.calls.preview).toHaveLength(1)
  })

  it('cancels', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onDone).toHaveBeenCalled()
  })

  describe('a confirm-only action (no preview route)', () => {
    it('records straight away with its parameters and has no Review step', () => {
      render(
        <LedgerPanel body={undefined} params={{ id: 'h1' }} previewRoute={null} recordRoute={ledgerRoute('POST', '/holdings/{id}/remove')} submitLabel="Remove" destructive onDone={onDone} />,
      )
      expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
      expect(ledger.calls.preview).toHaveLength(0)
      expect(ledger.calls.record).toEqual([{ params: { id: 'h1' }, body: undefined }])
    })
  })
})

describe('LedgerPanel summary', () => {
  it('shows what the entry acts on above the form, and hides it once recorded (it would be out of date)', () => {
    render(
      <LedgerPanel summary={<p>Shares held 110</p>} body={{ a: 1 }} previewRoute={LEDGER.eventsPreview} recordRoute={LEDGER.events} submitLabel="Buy shares" onDone={vi.fn()} />,
    )
    expect(screen.getByText('Shares held 110')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buy shares' }))
    expect(screen.getByRole('status')).toHaveTextContent('Recorded')
    expect(screen.queryByText('Shares held 110')).not.toBeInTheDocument()
  })
})
