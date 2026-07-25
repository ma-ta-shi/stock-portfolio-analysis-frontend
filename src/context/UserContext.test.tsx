import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserProvider, useUser } from './UserContext'

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

describe('UserProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to user_01 when localStorage is empty', () => {
    render(
      <UserProvider>
        <DisplayUserId />
      </UserProvider>,
    )
    expect(screen.getByTestId('user-id').textContent).toBe('user_01')
  })

  it('restores userId from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'user_02')
    render(
      <UserProvider>
        <DisplayUserId />
      </UserProvider>,
    )
    expect(screen.getByTestId('user-id').textContent).toBe('user_02')
  })

  it('updates userId and persists to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <UserProvider>
        <DisplayUserId />
        <SwitchUser to="user_02" />
      </UserProvider>,
    )

    await user.click(screen.getByText('Switch'))

    expect(screen.getByTestId('user-id').textContent).toBe('user_02')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('user_02')
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
