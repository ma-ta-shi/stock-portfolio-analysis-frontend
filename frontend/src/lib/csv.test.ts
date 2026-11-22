import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('quotes every field and uses CRLF line endings', () => {
    expect(toCsv([['a', 'b'], [1, 2]])).toBe('"a","b"\r\n"1","2"')
  })
  it('doubles embedded quotes', () => {
    expect(toCsv([['He said "hi"']])).toBe('"He said ""hi"""')
  })
  it('keeps commas and newlines inside a field', () => {
    expect(toCsv([['a,b\nc']])).toBe('"a,b\nc"')
  })
  it('renders null and undefined as empty', () => {
    expect(toCsv([[null, undefined]])).toBe('"",""')
  })
  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([['=HYPERLINK("x")']])).toBe(`"'=HYPERLINK(""x"")"`)
    expect(toCsv([['@SUM(A1)']])).toBe(`"'@SUM(A1)"`)
  })
  it('leaves negative and signed numbers alone', () => {
    expect(toCsv([['-12.50', '+3']])).toBe('"-12.50","+3"')
  })
})
