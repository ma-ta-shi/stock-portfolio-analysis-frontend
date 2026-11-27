import { describe, expect, it } from 'vitest'
import { PROFILE_INPUTS, accountInputs, buildSave, inputError, ruleInput, savedValue, type Profile, type SettingInput } from './settings-form'
import { SETTINGS_ENTRY_FIELDS, SET_BY_PAGE } from '@/screens/settings/entry-fields'
import profile from '@/test/fixtures/settings/profile.json'
import schema from '@/test/fixtures/settings/order-settings.json'
import accounts from '@/test/fixtures/portfolio/accounts.json'
import type { components } from '@/types/openapi.gen'

type Rule = components['schemas']['OrderSettingResponse']
const rules = (schema.settings as Rule[]).map(ruleInput)
const rule = (key: string) => rules.find((r) => r.key === `rule.${key}`)!
const stored = {
  profile: profile as unknown as Profile,
  accounts: accounts.data as unknown as components['schemas']['PortfolioAccountResponse'][],
  settings: { synthetic: true, sell: ['AAA'], orders: { minimum_order: 800 } },
}
const change = (input: SettingInput, value: string) => ({ input, value })
const TODAY = '2026-11-26'

describe('buildSave', () => {
  it('sends only what changed, dating a room figure the day it is saved', () => {
    const [part, ...rest] = buildSave([change(PROFILE_INPUTS.tfsa_room_remaining, '12000'), change(PROFILE_INPUTS.income_annual, '90000')], stored.settings, TODAY)
    expect(rest).toEqual([])
    expect(part).toMatchObject({ to: 'profile', body: { tfsa_room_remaining: 12000, tfsa_room_as_of: TODAY, income_annual: 90000 } })
    expect(part.body).not.toHaveProperty('rrsp_room_as_of')
  })

  it('names the tax year of an RRSP claim, and clears all three together', () => {
    expect(buildSave([change(PROFILE_INPUTS.rrsp_claimed_amount, '500')], {}, TODAY)[0].body).toEqual({
      rrsp_claimed_amount: 500,
      rrsp_claimed_tax_year: 2026,
      rrsp_claimed_as_of: TODAY,
    })
    expect(buildSave([change(PROFILE_INPUTS.rrsp_claimed_amount, '')], {}, TODAY)[0].body).toEqual({
      rrsp_claimed_amount: null,
      rrsp_claimed_tax_year: null,
      rrsp_claimed_as_of: null,
    })
  })

  it('sends the optimizer settings whole, keeping the keys it does not edit, and drops a rule set back to its default', () => {
    const [set] = buildSave([change(rule('drift.low'), '0.4')], stored.settings, TODAY)
    expect(set.body).toEqual({ settings: { synthetic: true, sell: ['AAA'], orders: { minimum_order: 800 }, drift: { low: 0.4 } } })
    const [cleared] = buildSave([change(rule('orders.minimum_order'), '')], stored.settings, TODAY)
    expect(cleared.body).toEqual({ settings: { synthetic: true, sell: ['AAA'] } })
    expect(stored.settings.orders).toEqual({ minimum_order: 800 }) // the stored object is not touched
  })

  it('makes one request per account', () => {
    const [tfsa] = accountInputs('tfsa')
    const trading = accountInputs('trading')[3]
    const parts = buildSave([change(tfsa, '4.95'), change(trading, 'false')], {}, TODAY)
    expect(parts.map((p) => [p.label, p.body])).toEqual([
      ['TFSA account', { commission_per_trade: 4.95 }],
      ['TRADING account', { reinvests_dividends: false }],
    ])
  })

  it('emits exactly the request fields the registry says are typed or set by the page', () => {
    const everything = [...Object.values(PROFILE_INPUTS), ...accountInputs('tfsa'), rules[0]]
    const emitted = new Set(
      buildSave(everything.map((i) => change(i, i.kind === 'boolean' ? 'true' : '1')), {}, TODAY).flatMap((part) => {
        const schemaName = part.to === 'profile' ? 'UserProfileUpdate' : part.to === 'portfolio' ? 'PortfolioUpdate' : 'PortfolioAccountUpdate'
        return Object.keys(part.body).map((key) => `${schemaName}.${key}`)
      }),
    )
    expect([...emitted].sort()).toEqual([...SETTINGS_ENTRY_FIELDS.map((f) => f.source as string), ...Object.keys(SET_BY_PAGE)].sort())
  })
})

describe('savedValue', () => {
  it('reads a profile, account and rule value as text, blank when there is none', () => {
    expect(savedValue(PROFILE_INPUTS.income_annual, stored, 2026)).toBe('95000')
    expect(savedValue(PROFILE_INPUTS.marginal_tax_rate_override_pct, stored, 2026)).toBe('')
    expect(savedValue(accountInputs('tfsa')[3], stored, 2026)).toBe('true')
    expect(savedValue(rule('orders.minimum_order'), stored, 2026)).toBe('800')
    expect(savedValue(rule('drift.low'), stored, 2026)).toBe('')
  })

  it('treats an RRSP claim of another tax year as none', () => {
    const claimed = { ...stored, profile: { ...stored.profile, rrsp_claimed_amount: 900, rrsp_claimed_tax_year: 2025 } }
    expect(savedValue(PROFILE_INPUTS.rrsp_claimed_amount, claimed, 2026)).toBe('')
    expect(savedValue(PROFILE_INPUTS.rrsp_claimed_amount, claimed, 2025)).toBe('900')
  })
})

describe('inputError', () => {
  it('holds profile values to sensible ranges, which the backend does not', () => {
    expect(inputError(PROFILE_INPUTS.income_annual, '-1')).toBe('Cannot be negative')
    expect(inputError(PROFILE_INPUTS.max_position_size_pct, '500')).toBe('Above 0 and at most 100')
    expect(inputError(PROFILE_INPUTS.max_position_size_pct, '0')).toBe('Above 0 and at most 100')
    expect(inputError(PROFILE_INPUTS.max_position_size_pct, '12.5')).toBeNull()
    expect(inputError(PROFILE_INPUTS.display_name, '  ')).toBe('Required')
    expect(inputError(PROFILE_INPUTS.income_annual, 'abc')).toBe('Enter a number')
    expect(inputError(PROFILE_INPUTS.income_annual, '')).toBeNull()
  })

  it("uses each rule's published range, with the ends allowed or not as published", () => {
    expect(inputError(rule('drift.low'), '1')).toBe('drift.low must be above 0 and below 1')
    expect(inputError(rule('drift.low'), '0.5')).toBeNull()
    expect(inputError(rule('orders.per_run'), '2.5')).toBe('Enter a whole number')
    expect(inputError(rule('orders.per_run'), '50')).toBeNull()
    expect(inputError(rule('orders.per_run'), '51')).toBe('orders.per_run must be from 1 to 50')
  })
})
