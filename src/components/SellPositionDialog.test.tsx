import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SellPositionDialog } from './SellPositionDialog'
import { mockHolding, mockUsdHolding } from '@/test/mock-data'
import type { UserProfile } from '@/types'

vi.mock('@/hooks/use-portfolio')
vi.mock('@/hooks/use-user-profile')
vi.mock('@/hooks/use-fx-rates', () => ({
  useFxRates: () => ({ rates: { CAD: 1, USD: 1.4 }, isLoading: false }),
}))

import { usePortfolioHoldings, useSellPosition } from '@/hooks/use-portfolio'
import { useUserProfile } from '@/hooks/use-user-profile'

const mutateAsync = vi.fn()
vi.mocked(useSellPosition).mockReturnValue({ mutateAsync, isPending: false, isError: false } as unknown as ReturnType<typeof useSellPosition>)
vi.mocked(usePortfolioHoldings).mockReturnValue({ data: [] } as unknown as ReturnType<typeof usePortfolioHoldings>)
vi.mocked(useUserProfile).mockReturnValue({
  data: { financial_profile: { marginal_tax_rate: 0.4341 } } as UserProfile,
} as unknown as ReturnType<typeof useUserProfile>)

const trading = { ...mockHolding, account_type: 'trading' as const, shares: 100, average_cost_basis: 100, current_price: 150 }

function setValue(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('SellPositionDialog', () => {
  it('links every field to its label', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Shares to sell/)).toHaveValue(100)
    expect(screen.getByLabelText(/Price per share \(CAD\)/)).toHaveValue(150)
    expect(screen.getByLabelText(/Fees \(CAD\)/)).toHaveValue(4.99)
    expect(screen.getByLabelText(/Transaction date/)).toBeInTheDocument()
  })

  it('shows the realized gain with a single + sign (no "++")', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    setValue(/Shares to sell/, '10')
    setValue(/Fees/, '10')
    const preview = screen.getByText(/Realized gain/)
    expect(preview).toHaveTextContent('+$490.00 (+49.00%)')
    expect(preview.textContent).not.toContain('++')
  })

  it("uses the profile's marginal tax rate for the Trading tax estimate", () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    setValue(/Shares to sell/, '10')
    setValue(/Fees/, '0')
    expect(screen.getByText(/43% marginal rate/)).toBeInTheDocument()
    expect(screen.getByText(/^~\$108\.5[23]$/)).toBeInTheDocument() // 500 × 50% × 43.41% = 108.525
  })

  it('shows USD amounts in USD and converts the tax estimate to CAD', () => {
    const usdTrading = { ...mockUsdHolding, account_type: 'trading' as const, average_cost_basis: 312.4, current_price: 412.4 }
    render(<SellPositionDialog holding={usdTrading} onClose={vi.fn()} />)
    setValue(/Shares to sell/, '1')
    setValue(/Fees/, '0')
    expect(screen.getByText(/Realized gain/)).toHaveTextContent('+US$100.00')
    expect(screen.getByText(/converted to CAD/)).toBeInTheDocument()
    expect(screen.getByText('$140.00')).toBeInTheDocument() // capital gain in CAD
  })

  it('rejects selling more shares than held', () => {
    render(<SellPositionDialog holding={trading} onClose={vi.fn()} />)
    setValue(/Shares to sell/, '101')
    expect(screen.getByText('Cannot exceed 100 shares')).toBeInTheDocument()
    expect(screen.getByLabelText(/Shares to sell/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: /Sell/ })).toBeDisabled()
  })

  it('submits and closes on success', async () => {
    mutateAsync.mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    render(<SellPositionDialog holding={trading} onClose={onClose} />)
    setValue(/Shares to sell/, '10')
    fireEvent.click(screen.getByRole('button', { name: 'Sell 10 shares' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ holdingId: trading.holding_id, shares: 10, pricePerShare: 150 }))
    // A calendar date, not a UTC timestamp (which would display as the previous day in Canada)
    expect(mutateAsync.mock.calls[0][0].transactionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('stays open when the mutation fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('nope'))
    const onClose = vi.fn()
    render(<SellPositionDialog holding={trading} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sell 100 shares' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })
})
