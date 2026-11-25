import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldList } from './FieldList'
import { defineFields } from '@/lib/fields'

interface Row {
  shares: number
  note: string | null
}

const fields = defineFields<Row>([
  { id: 'shares', label: 'Shares', source: 'HoldingResponse.shares', get: (r) => r.shares, places: ['column', 'detail'] },
  { id: 'note', label: 'Notes', source: 'HoldingResponse.notes', get: (r) => r.note, tooltip: 'The holding note', places: ['detail'] },
  { id: 'hidden', label: 'Column only', source: 'HoldingResponse.is_active', get: () => true, places: ['column'] },
  { id: 'badge', label: 'Badge', source: 'HoldingResponse.is_active', get: () => true, places: ['detail'], render: () => <b>custom</b> },
])

describe('FieldList', () => {
  it('lists the detail specs with their text, a dash for a missing value, and a custom cell through render', () => {
    render(<FieldList fields={fields} row={{ shares: 12, note: null }} />)
    expect(screen.getByText('Shares').nextSibling).toHaveTextContent('12')
    expect(screen.getByText('Notes').nextSibling).toHaveTextContent('—')
    expect(screen.getByText('Notes')).toHaveAttribute('title', 'The holding note')
    expect(screen.getByText('custom')).toBeInTheDocument()
    expect(screen.queryByText('Column only')).not.toBeInTheDocument()
  })

  it('lists another place when asked', () => {
    render(<FieldList fields={fields} row={{ shares: 1, note: null }} place="column" />)
    expect(screen.getByText('Column only')).toBeInTheDocument()
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })
})
