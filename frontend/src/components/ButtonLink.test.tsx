import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ButtonLink } from './ButtonLink'

const sources = import.meta.glob(['../**/*.tsx', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('ButtonLink', () => {
  it('is announced as a link, not a button', () => {
    render(<MemoryRouter><ButtonLink to="/x" variant="outline">Go</ButtonLink></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Go' })
    expect(link).toHaveAttribute('href', '/x')
    expect(link).not.toHaveAttribute('role')
  })

  it('is used instead of <Button render={<Link />}> (which adds role="button")', () => {
    const offenders = Object.entries(sources).filter(([, src]) => /nativeButton=\{false\}/.test(src)).map(([f]) => f)
    expect(offenders).toEqual([])
  })
})
