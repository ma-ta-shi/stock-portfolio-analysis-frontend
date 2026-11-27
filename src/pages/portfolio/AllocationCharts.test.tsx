import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AllocationCharts } from './AllocationCharts'
import { slicesOf } from '@/lib/allocation'
import exposureFixture from '@/test/fixtures/portfolio/exposure.json'
import positionsFixture from '@/test/fixtures/portfolio/positions.json'
import type { components } from '@/types/openapi.gen'

vi.mock('recharts', async (importOriginal) => ({ ...(await importOriginal<typeof import('recharts')>()), ResponsiveContainer: () => null }))
vi.mock('@/hooks/use-portfolio')
import { useExposure, usePositions } from '@/hooks/use-portfolio'

const exposure = exposureFixture as unknown as components['schemas']['ExposureResponse']
vi.mocked(useExposure).mockReturnValue({ data: exposure, isLoading: false, isError: false } as unknown as ReturnType<typeof useExposure>)
vi.mocked(usePositions).mockReturnValue({ data: positionsFixture } as unknown as ReturnType<typeof usePositions>)

const total = exposure.total_value_cad
const sum = (slices: { value: number }[]) => slices.reduce((s, x) => s + x.value, 0)

describe('allocation slices (recorded exposure response)', () => {
  // The maps already hold "inside funds, not itemised" and sum to 1 minus cash, so adding cash makes a whole.
  it.each(['sectors', 'industries', 'currencies'] as const)('%s plus cash add up to the whole portfolio, not more', (key) => {
    const slices = slicesOf(exposure[key], total, [{ name: 'Cash', value: exposure.cash * total }])
    expect(sum(slices)).toBeCloseTo(total, 0)
  })

  it('lists the biggest slice first and drops empty ones', () => {
    const slices = slicesOf({ A: 0.2, B: 0.5, C: 0 }, 100)
    expect(slices.map((s) => s.name)).toEqual(['B', 'A'])
  })
})

describe('AllocationCharts', () => {
  it('says a single-account view covers the whole portfolio (gap P-A2)', () => {
    render(<AllocationCharts accountFilter="tfsa" />)
    expect(screen.getByRole('status')).toHaveTextContent('P-A2')
  })

  it('draws the three donuts of the original design, each with its own legend under it', () => {
    render(<AllocationCharts />)
    for (const title of ['By Sector', 'By Account', 'By Geography']) {
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByRole('list', { name: `${title} legend` })).toBeInTheDocument()
    }
    expect(screen.queryByText('By Industry')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('draws no table, warning text or risk figures (the original had only the donuts)', () => {
    render(<AllocationCharts />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(/fund_contents_unknown|short_history/)).not.toBeInTheDocument()
    expect(screen.queryByText('Risk')).not.toBeInTheDocument()
  })

  it('writes the share of each slice in the legend, cash included', () => {
    render(<AllocationCharts />)
    const legend = screen.getByRole('list', { name: 'By Geography legend' })
    expect(legend).toHaveTextContent('CAD')
    expect(legend.textContent).toMatch(/d/)
  })

  it('shows what to do when nothing is held', () => {
    vi.mocked(useExposure).mockReturnValueOnce({ data: { ...exposure, total_value_cad: 0 }, isLoading: false, isError: false } as unknown as ReturnType<typeof useExposure>)
    render(<AllocationCharts />)
    expect(screen.getByText('No holdings to chart.')).toBeInTheDocument()
  })
})
