import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HoldingActionDialogs } from './HoldingActionDialogs'
import { useHoldingActions } from '@/hooks/use-holding-actions'
import { mockHolding } from '@/test/mock-data'
import { mockLedgerHooks } from '@/test/ledger-mocks'

vi.mock('@/hooks/use-portfolio')
import { useUpdatePosition } from '@/hooks/use-portfolio'

beforeEach(() => {
  mockLedgerHooks()
  // Edit is connected in the next PR; until then its dialog calls the not-connected stub.
  const stub = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null }
  vi.mocked(useUpdatePosition).mockReturnValue(stub as unknown as ReturnType<typeof useUpdatePosition>)
})

/** A page that lists one holding with a button for each action, as the Holdings table and the Stock page do. */
function Page() {
  const actions = useHoldingActions()
  return (
    <>
      {(['buy', 'sell', 'edit', 'dividend', 'remove'] as const).map((action) => (
        <button key={action} onClick={() => actions.open(action, mockHolding)}>
          open {action}
        </button>
      ))}
      <HoldingActionDialogs actions={actions} />
    </>
  )
}

describe('useHoldingActions with HoldingActionDialogs', () => {
  it('mounts nothing until an action is opened', () => {
    render(<Page />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['buy', /Buy RY\.TO/],
    ['sell', /Sell RY\.TO/],
    ['edit', /RY\.TO/],
    ['dividend', /Log dividend RY/],
    ['remove', /Remove from Portfolio/],
  ] as const)('opens the %s dialog for the holding', (action, title) => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: `open ${action}` }))
    expect(screen.getByRole('dialog')).toHaveTextContent(title)
  })

  it('shows one dialog at a time: opening another replaces the first', () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'open buy' }))
    fireEvent.click(screen.getByRole('button', { name: 'open sell', hidden: true })) // the page behind a modal is hidden from the tree
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(1)
    expect(dialogs[0]).toHaveTextContent(/Sell RY\.TO/)
  })

  it('closes with Cancel and starts the next one with a fresh form', () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'open buy' }))
    fireEvent.change(screen.getByLabelText(/Shares to buy/), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'open buy' }))
    expect(screen.getByLabelText(/Shares to buy/)).toHaveValue(null)
  })
})
