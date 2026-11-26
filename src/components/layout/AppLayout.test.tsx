import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { UserProvider, useUser } from '@/context/UserContext'
import { AppLayout } from './AppLayout'

vi.mock('@/hooks/use-users', () => ({
  useUsers: () => ({ data: [{ user_id: 'ann', display_name: 'Ann' }, { user_id: 'ben', display_name: 'Ben' }], isLoading: false, isError: false }),
}))
// Only the switcher of the header matters here.
vi.mock('./Header', async () => ({ Header: (await import('./ProfileSwitcher')).ProfileSwitcher }))

/** Stands for anything a page keeps on screen: it remembers the user it was first drawn for. */
function Page() {
  const [first] = useState(useUser().userId)
  return <div data-testid="kept">{first}</div>
}

describe('AppLayout: switching user', () => {
  it("starts the page afresh and leaves focus on the switcher", async () => {
    const router = createMemoryRouter([{ path: '/', element: <AppLayout />, children: [{ index: true, element: <Page /> }] }])
    render(
      <UserProvider>
        <RouterProvider router={router} />
      </UserProvider>,
    )
    const switcher = screen.getByRole('combobox', { name: 'Switch profile' })

    await userEvent.setup().selectOptions(switcher, 'ben')

    expect(screen.getByTestId('kept')).toHaveTextContent('ben')
    expect(switcher).toBeInTheDocument()
    expect(switcher).toHaveFocus()
  })
})
