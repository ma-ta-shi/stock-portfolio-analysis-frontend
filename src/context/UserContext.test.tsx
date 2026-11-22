import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserProvider, useUser } from './UserContext'
import { useUsers } from '@/hooks/use-users'
import { usePortfolioOwners } from '@/hooks/use-portfolio-owners'

vi.mock('@/hooks/use-users')
vi.mock('@/hooks/use-portfolio-owners')

const STORAGE_KEY = 'stock-picker-user-id'

function makeLocalStorageMock() {
  const data: Record<string, string> = {}
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value },
    removeItem: (key: string) => { delete data[key] },
    clear: () => { for (const k in data) delete data[k] },
  }
}

function DisplayUserId() {
  const { userId } = useUser()
  return <div data-testid="user-id">{userId}</div>
}

function SwitchUser({ to }: { to: string }) {
  const { setUserId } = useUser()
  return <button onClick={() => setUserId(to)}>Switch</button>
}

const users = [
  { user_id: 'aaa', display_name: 'First', is_active: true },
  { user_id: 'bbb', display_name: 'Second', is_active: true },
]

function mockUsers(state: Partial<ReturnType<typeof useUsers>>) {
  vi.mocked(useUsers).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...state,
  } as unknown as ReturnType<typeof useUsers>)
}

function mockOwners(state: Partial<ReturnType<typeof usePortfolioOwners>>) {
  vi.mocked(usePortfolioOwners).mockReturnValue({
    data: new Set<string>(),
    isLoading: false,
    ...state,
  } as unknown as ReturnType<typeof usePortfolioOwners>)
}

function renderProvider(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <UserProvider>{children}</UserProvider>
    </QueryClientProvider>,
  )
}

describe('UserProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock())
    mockUsers({ data: users })
    mockOwners({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the first user when nothing is stored', () => {
    renderProvider(<DisplayUserId />)
    expect(screen.getByTestId('user-id').textContent).toBe('aaa')
  })

  it('prefers the first user who owns a portfolio over the first user', () => {
    mockOwners({ data: new Set(['bbb']) })
    renderProvider(<DisplayUserId />)
    expect(screen.getByTestId('user-id').textContent).toBe('bbb')
  })

  it('still opens when the owners lookup failed', () => {
    mockOwners({ data: undefined })
    renderProvider(<DisplayUserId />)
    expect(screen.getByTestId('user-id').textContent).toBe('aaa')
  })

  it('restores the stored user when that user exists', () => {
    localStorage.setItem(STORAGE_KEY, 'bbb')
    renderProvider(<DisplayUserId />)
    expect(screen.getByTestId('user-id').textContent).toBe('bbb')
  })

  it('ignores a stored user that is not in the list', () => {
    localStorage.setItem(STORAGE_KEY, 'user_01')
    renderProvider(<DisplayUserId />)
    expect(screen.getByTestId('user-id').textContent).toBe('aaa')
  })

  it('updates the user and persists to localStorage', async () => {
    const user = userEvent.setup()
    renderProvider(
      <>
        <DisplayUserId />
        <SwitchUser to="bbb" />
      </>,
    )

    await user.click(screen.getByText('Switch'))

    expect(screen.getByTestId('user-id').textContent).toBe('bbb')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('bbb')
  })

  it('shows a loading state and renders no page until the users have loaded', () => {
    mockUsers({ isLoading: true })
    renderProvider(<DisplayUserId />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('user-id')).not.toBeInTheDocument()
  })

  it('waits for the owners lookup too, so the default is not chosen twice', () => {
    mockOwners({ isLoading: true, data: undefined })
    renderProvider(<DisplayUserId />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('user-id')).not.toBeInTheDocument()
  })

  it('shows a retry when the users call fails', async () => {
    const refetch = vi.fn()
    mockUsers({ isError: true, error: new Error('down'), refetch })
    const user = userEvent.setup()
    renderProvider(<DisplayUserId />)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(refetch).toHaveBeenCalled()
    expect(screen.queryByTestId('user-id')).not.toBeInTheDocument()
  })

  it('says so when no profile exists yet', () => {
    mockUsers({ data: [] })
    renderProvider(<DisplayUserId />)
    expect(screen.getByText('No profile exists yet.')).toBeInTheDocument()
  })
})

describe('useUser', () => {
  it('throws when used outside UserProvider', () => {
    const consoleError = console.error
    console.error = () => {}

    expect(() => render(<DisplayUserId />)).toThrow('useUser must be used inside UserProvider')

    console.error = consoleError
  })
})
