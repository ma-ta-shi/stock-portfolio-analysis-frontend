import { describe, expect, it } from 'vitest'
import { pickUserId } from './default-user'

const users = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }]

describe('pickUserId', () => {
  it('keeps the stored user when that user exists, even without a portfolio', () => {
    expect(pickUserId(users, 'a', new Set(['b']))).toBe('a')
  })

  it('ignores a stored user that is not in the list', () => {
    expect(pickUserId(users, 'gone', new Set(['b']))).toBe('b')
  })

  it('prefers the first user who owns a portfolio', () => {
    expect(pickUserId(users, null, new Set(['c', 'b']))).toBe('b')
  })

  it('falls back to the first user when nobody owns a portfolio or the owners are unknown', () => {
    expect(pickUserId(users, null, new Set())).toBe('a')
    expect(pickUserId(users, null, null)).toBe('a')
  })

  it('is null when there are no users', () => {
    expect(pickUserId([], 'a', new Set(['a']))).toBeNull()
  })
})
