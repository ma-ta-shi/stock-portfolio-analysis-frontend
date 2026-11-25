import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RegistryTable } from './RegistryTable'
import { defineFields } from '@/lib/fields'

interface Row {
  id: string
  name: string
  amount: number
  note: string
}

const specs = defineFields<Row>([
  { id: 'name', label: 'Name', source: 'DividendEventResponse.note', get: (r) => r.name, places: ['column'] },
  { id: 'amount', label: 'Amount', source: 'DividendEventResponse.note', get: (r) => r.amount, format: (v) => `$${v}`, places: ['column'] },
  { id: 'note', label: 'Note', source: 'DividendEventResponse.note', get: (r) => r.note, places: ['detail'] },
])
const rows: Row[] = [
  { id: 'a', name: 'Alpha', amount: 10, note: 'first' },
  { id: 'b', name: 'Beta', amount: 20, note: 'second' },
]
const columns = specs.filter((s) => s.places.includes('column'))

const table = (props: Partial<React.ComponentProps<typeof RegistryTable<Row>>> = {}) =>
  render(
    <MemoryRouter>
      <RegistryTable columns={columns} rows={rows} rowKey={(r) => r.id} rowLabel={(r) => r.name} detail={specs} {...props} />
    </MemoryRouter>,
  )

describe('RegistryTable', () => {
  it('draws the columns from the registry, one row for each', () => {
    table()
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Amount')
    expect(screen.getByRole('cell', { name: '$10' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Beta' })).toBeInTheDocument()
  })

  it('aligns the columns of figures to the right', () => {
    table({ rightAligned: new Set(['amount']) })
    expect(screen.getByRole('cell', { name: '$10' })).toHaveClass('text-right')
    expect(screen.getByRole('cell', { name: 'Alpha' })).not.toHaveClass('text-right')
  })

  it('expands a row to the detail lines, named for the row, and collapses it again', () => {
    table()
    expect(screen.queryByText('first')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show details of Alpha' }))
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.queryByText('second')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide details of Alpha' }))
    expect(screen.queryByText('first')).not.toBeInTheDocument()
  })

  it('shows extra content under the detail lines', () => {
    table({ expandedExtra: (r) => <button>extra for {r.name}</button> })
    fireEvent.click(screen.getByRole('button', { name: 'Show details of Beta' }))
    expect(screen.getByRole('button', { name: 'extra for Beta' })).toBeInTheDocument()
  })

  it('has no expand column when a table has nothing to expand to', () => {
    table({ detail: undefined })
    expect(screen.queryByRole('button', { name: /details of/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(columns.length)
  })

  it('adds an actions cell, named for screen readers', () => {
    table({ actions: (r) => <button>do {r.name}</button>, actionsHeader: 'Decide' })
    expect(screen.getByRole('columnheader', { name: 'Decide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'do Alpha' })).toBeInTheDocument()
  })

  it('makes a whole row a link for mouse and keyboard, without its own buttons opening it', () => {
    const open = vi.fn()
    table({ onOpen: open, openLabel: (r) => `View ${r.name}`, actions: (r) => <button>act {r.name}</button> })
    const row = screen.getByRole('row', { name: 'View Alpha' })
    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(open).toHaveBeenCalledTimes(2)
    fireEvent.click(within(row).getByRole('button', { name: 'act Alpha' }))
    fireEvent.click(within(row).getByRole('button', { name: 'Show details of Alpha' }))
    expect(open).toHaveBeenCalledTimes(2)
  })
})
