import { cloneElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValueChart } from './ValueChart'
import { formatCAD, formatDate } from '@/lib/format'

// jsdom has no layout, so the responsive wrapper gets a fixed size and the chart draws its axis for real.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactElement }) => cloneElement(children, { width: 400, height: 56 } as object),
}))

const points = [
  { day: '2026-10-26', value: 85807.98 },
  { day: '2026-11-02', value: 87000 },
  { day: '2026-11-25', value: 95776.94 },
]

describe('ValueChart', () => {
  it('writes the first and the last value, with their days, under the line', () => {
    render(<ValueChart points={points} />)
    const figure = screen.getByRole('figure', { name: 'Portfolio value over time' })
    expect(figure).toHaveTextContent(`${formatDate('2026-10-26')} ${formatCAD(85807.98)}`)
    expect(figure).toHaveTextContent(`${formatDate('2026-11-25')} ${formatCAD(95776.94)}`)
  })

  it('draws a dated axis: the first and the last day are tick labels', () => {
    render(<ValueChart points={points} />)
    // each day is written twice: once under the line and once on the axis
    expect(screen.getAllByText(formatDate('2026-10-26')).length).toBeGreaterThanOrEqual(1)
    expect(document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick').length).toBeGreaterThanOrEqual(2)
  })

  it('draws the line', () => {
    render(<ValueChart points={points} color="#059669" />)
    expect(document.querySelector('.recharts-line-curve')).toHaveAttribute('stroke', '#059669')
  })

  it.each([[[]], [points.slice(0, 1)]])('says there is not enough history instead of drawing a dot (%j)', (few) => {
    render(<ValueChart points={few} />)
    expect(screen.getByText(/Not enough history yet/)).toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })
})
