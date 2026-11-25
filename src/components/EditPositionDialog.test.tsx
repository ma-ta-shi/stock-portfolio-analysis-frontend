import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EditPositionDialog } from './EditPositionDialog'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'

vi.mock('@/hooks/use-portfolio')
import { useUpdatePosition } from '@/hooks/use-portfolio'

const mutateAsync = vi.fn()
beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined)
  vi.mocked(useUpdatePosition).mockReturnValue({ mutateAsync, isPending: false, isError: false, error: null } as unknown as ReturnType<typeof useUpdatePosition>)
})

const set = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('EditPositionDialog', () => {
  it('prefills the current shares and average cost', () => {
    render(<EditPositionDialog holding={mockHolding} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/^Shares/)).toHaveValue(mockHolding.shares)
    expect(screen.getByLabelText(/Avg cost \(CAD\)/)).toHaveValue(mockHolding.average_cost_basis)
  })

  it('previews book cost in the holding currency', () => {
    render(<EditPositionDialog holding={mockUsdHolding} onClose={vi.fn()} />)
    set(/^Shares/, '10')
    set(/Avg cost \(USD\)/, '300')
    expect(screen.getByText('Book cost: US$3,000.00')).toBeInTheDocument()
  })

  it('rejects zero or empty values', () => {
    render(<EditPositionDialog holding={mockHolding} onClose={vi.fn()} />)
    set(/^Shares/, '0')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    set(/^Shares/, '5')
    set(/Avg cost/, '')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves and closes', async () => {
    const onClose = vi.fn()
    render(<EditPositionDialog holding={mockHolding} onClose={onClose} />)
    set(/^Shares/, '60')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({ holdingId: mockHolding.holding_id, shares: 60, average_cost_basis: mockHolding.average_cost_basis })
  })

  it('stays open when saving fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('nope'))
    const onClose = vi.fn()
    render(<EditPositionDialog holding={mockHolding} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })
})
