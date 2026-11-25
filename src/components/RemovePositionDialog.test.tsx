import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RemovePositionDialog } from './RemovePositionDialog'
import { mockHolding } from '@/test/mock-data'
import { mockLedgerHooks } from '@/test/ledger-mocks'
import { ApiError } from '@/lib/api'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

describe('RemovePositionDialog', () => {
  it('renders nothing without a holding', () => {
    const { container } = render(<RemovePositionDialog holding={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('asks for confirmation with no review step, then removes by the holding id', async () => {
    render(<RemovePositionDialog holding={mockHolding} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Every entry of the position is reversed')
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(ledger.calls.record).toHaveLength(1))
    expect(ledger.calls.record[0].params).toEqual({ id: mockHolding.holding_id })
    expect(ledger.calls.record[0].body).toBeUndefined()
  })

  it('shows the error and stays open when the server refuses', async () => {
    ledger.outcomes.record = { error: new ApiError('Has a move', 409, 'NOT_REMOVABLE', '/u') }
    const onClose = vi.fn()
    render(<RemovePositionDialog holding={mockHolding} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does nothing when cancelled', () => {
    const onClose = vi.fn()
    render(<RemovePositionDialog holding={mockHolding} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(ledger.calls.record).toHaveLength(0)
  })
})
