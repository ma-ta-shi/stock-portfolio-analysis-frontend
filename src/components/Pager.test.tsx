import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pager } from './Pager'

describe('Pager', () => {
  it('shows nothing when everything fits on one page', () => {
    const { container } = render(<Pager page={1} pages={1} total={3} onPage={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows where you are and moves one page at a time', async () => {
    const onPage = vi.fn()
    const user = userEvent.setup()
    render(<Pager page={2} pages={3} total={55} onPage={onPage} noun="transactions" />)
    expect(screen.getByText('Page 2 of 3 (55 transactions)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPage.mock.calls).toEqual([[3], [1]])
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<Pager page={1} pages={2} total={30} onPage={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    rerender(<Pager page={2} pages={2} total={30} onPage={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})
