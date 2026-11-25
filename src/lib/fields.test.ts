import { describe, expect, it } from 'vitest'
import {
  checkScreen,
  defineFields,
  fieldText,
  fieldsFor,
  fieldsToCsvRows,
  unclaimedSchemas,
  type ApiFieldsFile,
  type FieldSpec,
  type ScreenFieldSet,
} from './fields'

interface Row {
  shares: number | null
  note: string | null
}

const spec = (id: string, extra: Partial<FieldSpec<Row>> = {}): FieldSpec<Row> => ({
  id,
  label: id.toUpperCase(),
  source: 'HoldingResponse.shares',
  get: (row) => row.shares,
  places: ['column', 'detail', 'csv'],
  ...extra,
})

// A tiny API: two schemas, three properties.
const api: ApiFieldsFile = {
  responses: ['HoldingResponse', 'StockSummary', 'FundResultResponse'],
  fields: { HoldingResponse: ['shares', 'notes'], StockSummary: ['ticker'], FundResultResponse: ['note'] },
}
const gaps = new Set(['P-C1'])

function screen(overrides: Partial<ScreenFieldSet> = {}): ScreenFieldSet {
  return {
    screen: 'test',
    schemas: ['HoldingResponse', 'StockSummary'],
    fields: [
      { id: 'a', label: 'A', source: 'HoldingResponse.shares', places: ['column'] },
      { id: 'b', label: 'B', source: ['HoldingResponse.notes', 'StockSummary.ticker'], places: ['detail'] },
    ],
    notShown: {},
    ...overrides,
  }
}

describe('fieldText', () => {
  it('shows null and empty as a dash, numbers plainly and booleans as words', () => {
    expect(fieldText(spec('x'), { shares: null, note: null })).toBe('—')
    expect(fieldText(spec('x'), { shares: 5, note: null })).toBe('5')
    expect(fieldText(spec('x'), { shares: 5.123, note: null })).toBe('5.12')
    expect(fieldText(spec('x', { get: () => true }), { shares: 0, note: null })).toBe('Yes')
  })
  it('uses the spec format when given', () => {
    expect(fieldText(spec('x', { format: (v) => `${String(v)} sh` }), { shares: 3, note: null })).toBe('3 sh')
  })
})

describe('registry helpers', () => {
  it('refuses a duplicate id', () => {
    expect(() => defineFields([spec('a'), spec('a')])).toThrow('Duplicate field id "a"')
  })
  it('selects specs by place and builds CSV rows from the same specs', () => {
    const fields = defineFields([spec('a'), spec('b', { places: ['detail'] }), spec('c', { places: ['csv'], label: 'Note', get: (r) => r.note })])
    expect(fieldsFor(fields, 'column').map((f) => f.id)).toEqual(['a'])
    expect(fieldsToCsvRows(fields, [{ shares: 2, note: 'hi' }])).toEqual([
      ['A', 'Note'],
      ['2', 'hi'],
    ])
  })
})

describe('checkScreen', () => {
  it('passes when every property is shown or listed', () => {
    expect(checkScreen(screen({ schemas: ['HoldingResponse', 'StockSummary'] }), api, gaps)).toEqual([])
  })
  it('fails on a property nobody decided', () => {
    const problems = checkScreen(screen({ fields: [screen().fields[0]] }), api, gaps)
    expect(problems).toEqual([
      'test: HoldingResponse.notes is neither shown nor listed as not shown',
      'test: StockSummary.ticker is neither shown nor listed as not shown',
    ])
  })
  it('accepts a property listed as not shown with a reason', () => {
    const set = screen({
      fields: [screen().fields[0]],
      notShown: { 'HoldingResponse.notes': { reason: 'internal' }, 'StockSummary.ticker': { reason: 'repeats the holding', gap: 'P-C1' } },
    })
    expect(checkScreen(set, api, gaps)).toEqual([])
  })
  it('fails on a source or not-shown key the API does not have, an unknown gap, a missing reason and a double decision', () => {
    const set = screen({
      fields: [
        { id: 'a', label: 'A', source: 'HoldingResponse.shares', places: ['column'] },
        { id: 'b', label: 'B', source: 'HoldingResponse.gone' as never, places: ['detail'] },
      ],
      schemas: ['HoldingResponse'],
      notShown: {
        'HoldingResponse.notes': { reason: '' },
        'HoldingResponse.shares': { reason: 'also listed' },
        ['StockSummary.nope' as never]: { reason: 'x', gap: 'P-ZZ' as never },
      },
    })
    const problems = checkScreen(set, api, gaps).join('\n')
    expect(problems).toContain('names HoldingResponse.gone, which the API does not have')
    expect(problems).toContain('notShown lists StockSummary.nope, which the API does not have')
    expect(problems).toContain('cites unknown gap P-ZZ')
    expect(problems).toContain('notShown HoldingResponse.notes has no reason')
    expect(problems).toContain('HoldingResponse.shares is both shown and listed as not shown')
  })
  it('fails on a schema that does not exist', () => {
    expect(checkScreen(screen({ schemas: ['Nope'] }), api, gaps)).toContain('test: schema Nope does not exist')
  })
})

describe('unclaimedSchemas', () => {
  it('lists the response schemas no screen claims', () => {
    expect(unclaimedSchemas([screen()], api)).toEqual(['FundResultResponse'])
  })
})
