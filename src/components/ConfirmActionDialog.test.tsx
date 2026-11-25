import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmActionDialog } from './ConfirmActionDialog'
import { ApiError } from '@/lib/api'
import { LEDGER } from '@/lib/ledger-routes'
import { mockLedgerHooks } from '@/test/ledger-mocks'

vi.mock('@/hooks/use-portfolio')

let ledger: ReturnType<typeof mockLedgerHooks>
beforeEach(() => {
  ledger = mockLedgerHooks()
})

const open = (props: Partial<React.ComponentProps<typeof ConfirmActionDialog>> = {}) =>
  render(
    <ConfirmActionDialog title="Remove from Portfolio" route={LEDGER.remove} params={{ id: 'h1' }} submitLabel="Remove" onClose={vi.fn()} {...props}>
      Remove it?
    </ConfirmActionDialog>,
  )

describe('ConfirmActionDialog', () => {
  it('asks for confirmation with no review step, then records with the route parameters and no body', async () => {
    open()
    expect(screen.getByRole('dialog')).toHaveTextContent('Remove it?')
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(ledger.calls.record).toHaveLength(1))
    expect(ledger.calls.record[0].params).toEqual({ id: 'h1' })
    expect(ledger.calls.record[0].body).toBeUndefined()
  })

  it('shows the error in words and stays open when the server refuses', async () => {
    ledger.outcomes.record = { error: new ApiError('x', 422, 'NOT_REMOVABLE', '/u') }
    const onClose = vi.fn()
    open({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot be removed')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does nothing when cancelled', () => {
    const onClose = vi.fn()
    open({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(ledger.calls.record).toHaveLength(0)
  })
})
