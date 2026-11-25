import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRowActions } from './use-row-actions'

interface Row {
  id: string
}

describe('useRowActions', () => {
  it('starts with nothing open', () => {
    const { result } = renderHook(() => useRowActions<Row, 'a' | 'b'>())
    expect(result.current.current).toBeNull()
  })

  it('opens one action for one row, and a second open replaces the first', () => {
    const { result } = renderHook(() => useRowActions<Row, 'a' | 'b'>())
    act(() => result.current.open('a', { id: '1' }))
    expect(result.current.current).toEqual({ action: 'a', row: { id: '1' } })
    act(() => result.current.open('b', { id: '2' }))
    expect(result.current.current).toEqual({ action: 'b', row: { id: '2' } })
  })

  it('closes', () => {
    const { result } = renderHook(() => useRowActions<Row, 'a'>())
    act(() => result.current.open('a', { id: '1' }))
    act(() => result.current.close())
    expect(result.current.current).toBeNull()
  })
})
