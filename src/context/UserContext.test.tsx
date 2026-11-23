import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserProvider, useUser } from './UserContext'
import { useUsers } from '@/hooks/use-users'

vi.mock('@/hooks/use-users')

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

describe('UserProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock())
    mockUsers({ data: users })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the first user when nothing is stored', () => {
    render(<UserProvider><DisplayUserId /></UserProvider>)
    expect(screen.getByTestId('user-id').textContent).toBe('aaa')
  })

  it('restores the stored user when that user exists', () => {
    localStorage.setItem(STORAGE_KEY, 'bbb')
    render(<UserProvider><DisplayUserId /></UserProvider>)
    expect(screen.getByTestId('user-id').textContent).toBe('bbb')
  })

  it('ignores a stored user that is not in the list', () => {
    localStorage.setItem(STORAGE_KEY, 'user_01')
    render(<UserProvider><DisplayUserId /></UserProvider>)
    expect(screen.getByTestId('user-id').textContent).toBe('aaa')
  })

  it('updates the user and persists to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <UserProvider>
        <DisplayUserId />
        <SwitchUser to="bbb" />
      </UserProvider>,
    )

    await user.click(screen.getByText('Switch'))

    expect(screen.getByTestId('user-id').textContent).toBe('bbb')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('bbb')
  })

  it('shows a loading state and renders no page until the users have loaded', () => {
    mockUsers({ isLoading: true })
    render(<UserProvider><DisplayUserId /></UserProvider>)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('user-id')).not.toBeInTheDocument()
  })

  it('shows a retry when the users call fails', async () => {
    const refetch = vi.fn()
    mockUsers({ isError: true, error: new Error('down'), refetch })
    const user = userEvent.setup()
    render(<UserProvider><DisplayUserId /></UserProvider>)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(refetch).toHaveBeenCalled()
    expect(screen.queryByTestId('user-id')).not.toBeInTheDocument()
  })

  it('says so when no profile exists yet', () => {
    mockUsers({ data: [] })
    render(<UserProvider><DisplayUserId /></UserProvider>)
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
