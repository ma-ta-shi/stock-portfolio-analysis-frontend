import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSwitcher } from './ProfileSwitcher'
import { setUnsaved } from '@/lib/unsaved'

const { setUserId } = vi.hoisted(() => ({ setUserId: vi.fn() }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ userId: 'ann', setUserId }) }))
vi.mock('@/hooks/use-users', () => ({ useUsers: () => ({ data: [{ user_id: 'ann', display_name: 'Ann' }, { user_id: 'ben', display_name: 'Ben' }] }) }))

afterEach(() => {
  setUnsaved(false)
  setUserId.mockReset()
})

describe('ProfileSwitcher with unsaved changes', () => {
  it('asks before switching, and stays with the current profile on "Keep editing"', async () => {
    setUnsaved(true)
    render(<ProfileSwitcher />)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Switch profile' }), 'ben')
    await user.click(await screen.findByRole('button', { name: 'Keep editing' }))
    expect(setUserId).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Switch profile' })).toHaveValue('ann')
  })

  it('switches once the changes are discarded', async () => {
    setUnsaved(true)
    render(<ProfileSwitcher />)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Switch profile' }), 'ben')
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }))
    expect(setUserId).toHaveBeenCalledWith('ben')
  })

  it('switches at once when nothing is unsaved', async () => {
    render(<ProfileSwitcher />)
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Switch profile' }), 'ben')
    expect(setUserId).toHaveBeenCalledWith('ben')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
