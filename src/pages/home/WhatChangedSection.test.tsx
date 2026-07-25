import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WhatChangedSection } from './WhatChangedSection'

vi.mock('@/hooks/use-alerts')

import { useAlerts } from '@/hooks/use-alerts'

const mockUseAlerts = vi.mocked(useAlerts)

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <WhatChangedSection />
    </MemoryRouter>,
  )
}

describe('WhatChangedSection', () => {
  it('renders only safe action links', () => {
    mockUseAlerts.mockReturnValue({
      data: [
        {
          alert_id: 'a_1',
          user_id: 'user_01',
          type: 'recommendation_change',
          title: 'Valid',
          message: 'Valid route',
          ticker: 'SHOP.TO',
          action_url: '/analysis/run_001',
          action_label: 'View',
          is_read: false,
          created_at: '2026-03-26T00:00:00Z',
          meta: {},
        },
        {
          alert_id: 'a_2',
          user_id: 'user_01',
          type: 'agent_decision',
          title: 'Invalid',
          message: 'Invalid route',
          ticker: null,
          action_url: '/agent-portfolio',
          action_label: 'View',
          is_read: false,
          created_at: '2026-03-26T00:00:00Z',
          meta: {},
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useAlerts>)

    renderWithRouter()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/analysis/run_001')
  })
})
