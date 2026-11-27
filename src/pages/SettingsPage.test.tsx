import type React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'
import { hasUnsaved } from '@/lib/unsaved'
import { installFixtureFetch, recordingFor } from '@/test/fixture-fetch'
import profile from '@/test/fixtures/settings/profile.json'
import room from '@/test/fixtures/portfolio/room.json'
import portfoliosFile from '@/test/fixtures/portfolio/portfolios.json'

vi.mock('@/context/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ userId: 'ann', setUserId: vi.fn() }),
}))
// Writes go through this one function.
const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@/lib/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@/lib/api')>()
  return { ...api, apiFetch: (path: string, init?: RequestInit) => (init?.method === 'PATCH' ? send(path, JSON.parse(init.body as string)) : api.apiFetch(path, init)) }
})

const PROFILE = 'settings/profile'
const ROOM = 'portfolio/room'
const PORTFOLIOS = 'portfolio/portfolios'

afterEach(() => {
  vi.unstubAllGlobals()
  send.mockReset()
})

function show(overrides: Record<string, unknown> = {}) {
  installFixtureFetch(overrides)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/settings', element: <><Link to="/other">Leave</Link><SettingsPage /></> },
      { path: '/other', element: <p>Another page</p> },
    ],
    { initialEntries: ['/settings'] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const card = (name: string) => screen.findByRole('region', { name })
const field = async (region: string, label: string | RegExp) => within(await card(region)).findByLabelText(label)
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } })
const saveButton = () => screen.getByRole('button', { name: 'Save changes' })

describe('SettingsPage: what it shows', () => {
  it('fills the inputs with the stored values and shows the computed rate', async () => {
    show()
    expect(await field('Profile', 'Name')).toHaveValue(profile.display_name)
    expect(await field('Tax & Income', 'Annual income')).toHaveValue('85000')
    expect(await field('Position Sizing', /Max Single Position/)).toHaveValue('10')
    expect(await card('Tax & Income')).toHaveTextContent('(auto-calculated)')
    expect(saveButton()).toBeDisabled()
  })

  it("shows each registered account's limit, contributions and room left beside the starting figure", async () => {
    show({ [ROOM]: { ...room, accounts: { ...room.accounts, tfsa: { ...room.accounts.tfsa, contributed_this_year: 1500, room_today: 30500 } } } })
    const tfsa = await screen.findByRole('group', { name: 'TFSA room' })
    await within(tfsa).findByText('Yearly limit')
    expect(tfsa).toHaveTextContent('$7,000.00 for 2026')
    expect(tfsa).toHaveTextContent('$1,500.00')
    expect(tfsa).toHaveTextContent('$30,500.00')
    expect(within(tfsa).getByLabelText('Your starting TFSA room')).toHaveValue('32000')
    expect(tfsa).toHaveTextContent(/Entered on Sep \d+, 2026/)
  })

  it('has an input for every published optimizer rule, showing its default when unset', async () => {
    show()
    const minimum = await field('Optimizer Rules', /Orders: minimum order/)
    expect(minimum).toHaveValue('')
    expect(minimum).toHaveAttribute('placeholder', 'Default 500')
    expect(within(await card('Optimizer Rules')).getAllByRole('textbox')).toHaveLength(15)
  })

  it('has the three accounts, and none of the fields nothing uses', async () => {
    show()
    expect(await screen.findByRole('group', { name: 'TRADING account' })).toBeInTheDocument()
    for (const gone of [/notes to agents/i, /risk tolerance/i, /goals/i, /member since/i]) expect(screen.queryByText(gone)).not.toBeInTheDocument()
  })

  it('keeps the starting figures editable when the server cannot work out the room', async () => {
    show()
    const served = globalThis.fetch
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
      recordingFor('GET', url) === ROOM
        ? Promise.resolve(new Response(JSON.stringify({ error: { code: 'PROFILE_INCOMPLETE', message: 'Contribution room needs these profile figures: income_annual', details: {} } }), { status: 422 }))
        : served(url, init),
    )
    const rooms = await card('Contribution Room')
    expect(await within(rooms).findByText(/needs these profile figures: income_annual/)).toBeInTheDocument()
    expect(within(rooms).queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    expect(within(rooms).getByLabelText('Your starting TFSA room')).toBeEnabled()
  })

  it('lets a user with no portfolio edit the profile, and says the rest needs one', async () => {
    show({ [PORTFOLIOS]: { data: [], meta: { page: 1, per_page: 20, total: 0, pages: 1 } } })
    expect(await field('Tax & Income', 'Annual income')).toBeEnabled()
    expect(await within(await card('Accounts')).findByText(/You have no portfolio yet.*P-R1/)).toBeInTheDocument()
  })

  it('offers a retry when the profile cannot be read', async () => {
    show({ [PROFILE]: 500 })
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})

describe('SettingsPage: saving', () => {
  it('saves the whole page at once, each part to its own route, with only what changed', async () => {
    send.mockResolvedValue({})
    show()
    type(await field('Tax & Income', 'Annual income'), '90000')
    type(await field('Optimizer Rules', /Orders: minimum order/), '750')
    type(within(await screen.findByRole('group', { name: 'RRSP account' })).getByLabelText('Commission per trade'), '4.95')
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    fireEvent.click(saveButton())

    await screen.findByText('Saved.')
    expect(send.mock.calls.map(([path, body]) => [path.replace(/[0-9a-f-]{36}/, 'P'), body])).toEqual([
      ['/api/users/ann', { income_annual: 90000 }],
      ['/api/portfolios/P', { settings: expect.objectContaining({ synthetic: true, orders: { minimum_order: 750 } }) }],
      ['/api/portfolios/P/accounts/rrsp', { commission_per_trade: 4.95 }],
    ])
  })

  it('keeps what a refused part had typed, and says which part', async () => {
    send.mockImplementation((path: string) => (path.startsWith('/api/users') ? Promise.resolve({}) : Promise.reject(new Error('orders.minimum_order cannot be negative'))))
    show()
    type(await field('Tax & Income', 'Annual income'), '90000')
    type(await field('Optimizer Rules', /Orders: minimum order/), '1')
    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Optimizer rules was not saved. orders.minimum_order cannot be negative')
    expect(await field('Optimizer Rules', /Orders: minimum order/)).toHaveValue('1')
    await waitFor(() => expect(screen.getByLabelText('Annual income')).toHaveValue('85000')) // saved: now the server's value
  })

  it('blocks saving a value out of range, and says why', async () => {
    show()
    type(await field('Position Sizing', /Max Single Position/), '500')
    expect(screen.getByText('Above 0 and at most 100')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('does not read a mistyped amount as "clear this field"', async () => {
    show()
    const income = await field('Tax & Income', 'Annual income')
    for (const typed of ['12e', '1-2', '12,000', '$500']) {
      type(income, typed)
      expect(income).toHaveValue(typed)
      expect(screen.getByText('Enter a number')).toBeInTheDocument()
      expect(saveButton()).toBeDisabled()
    }
  })

  it('takes no typing while a save is on its way, then says it saved', async () => {
    let finish = () => {}
    send.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)))
    show()
    const income = await field('Tax & Income', 'Annual income')
    type(income, '90000')
    fireEvent.click(saveButton())
    await waitFor(() => expect(income).toBeDisabled())
    finish()
    await screen.findByText('Saved.')
    expect(income).toBeEnabled()
  })

  it('merges the optimizer rules into the settings as they are when saving, not as they were when the page loaded', async () => {
    send.mockResolvedValue({})
    show()
    type(await field('Optimizer Rules', /Orders: minimum order/), '750')
    // meanwhile a key this page does not edit changes outside it
    const portfolios = structuredClone(portfoliosFile) as unknown as { data: { settings: Record<string, unknown> }[] }
    portfolios.data[0].settings = { ...portfolios.data[0].settings, synthetic: true }
    installFixtureFetch({ [PORTFOLIOS]: portfolios })
    fireEvent.click(saveButton())
    await screen.findByText('Saved.')
    expect(send.mock.calls[0][1].settings).toMatchObject({ synthetic: true, orders: { minimum_order: 750 } })
  })

  it('discards back to the stored values', async () => {
    show()
    const income = await field('Tax & Income', 'Annual income')
    type(income, '1')
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(income).toHaveValue('85000')
    expect(hasUnsaved()).toBe(false)
  })
})

describe('SettingsPage: leaving with unsaved changes', () => {
  it('asks first, stays on "Keep editing" and leaves on "Discard changes"', async () => {
    show()
    type(await field('Tax & Income', 'Annual income'), '1')
    expect(hasUnsaved()).toBe(true)

    fireEvent.click(screen.getByRole('link', { name: 'Leave' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Annual income')).toHaveValue('1')

    fireEvent.click(screen.getByRole('link', { name: 'Leave' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))
    expect(await screen.findByText('Another page')).toBeInTheDocument()
    expect(hasUnsaved()).toBe(false)
  })

  it('warns the browser before a reload or close only while something is unsaved', async () => {
    show()
    const income = await field('Tax & Income', 'Annual income')
    const leaving = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(leaving()).toBe(false)
    type(income, '1')
    expect(leaving()).toBe(true)
  })
})
