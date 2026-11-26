/**
 * The Settings form as data: every editable value is one `SettingInput`, so validation, "what changed" and the requests to save
 * are written once. Values are the text of the inputs; blank means "no value" (a profile field is cleared, an optimizer rule
 * takes its default). Percent profile and account fields are whole percents in the API and are typed as such.
 */
import type { components } from '@/types/openapi.gen'
import type { AccountType } from '@/types/user'

type Api = components['schemas']
export type Profile = Api['UserProfileResponse']
export type Account = Api['PortfolioAccountResponse']
export type OrderRule = Api['OrderSettingResponse']
type ProfileField = keyof Api['UserProfileUpdate']
type AccountField = keyof Api['PortfolioAccountUpdate']
export type OptimizerSettings = Record<string, unknown>

type Target =
  | { part: 'profile'; field: ProfileField }
  | { part: 'account'; account: AccountType; field: AccountField }
  | { part: 'rule'; group: string; name: string }

export interface SettingInput {
  key: string
  label: string
  kind: 'text' | 'money' | 'number' | 'integer' | 'boolean'
  target: Target
  required?: boolean
  min?: number
  max?: number
  /** True when `min` / `max` itself is not allowed. */
  above?: boolean
  below?: boolean
  /** Said when a number is outside the range. */
  rule?: string
  hint?: string
  placeholder?: string
}

export type Values = Record<string, string>

const profileInput = (field: ProfileField, label: string, kind: SettingInput['kind'], extra: Partial<SettingInput> = {}): SettingInput => ({
  key: `profile.${field}`,
  label,
  kind,
  target: { part: 'profile', field },
  ...extra,
})

const notNegative = { min: 0, rule: 'Cannot be negative' }
const cap = { min: 0, above: true, max: 100, rule: 'Above 0 and at most 100' }

export const PROFILE_INPUTS = {
  display_name: profileInput('display_name', 'Name', 'text', { required: true }),
  income_annual: profileInput('income_annual', 'Annual income', 'money', notNegative),
  marginal_tax_rate_override_pct: profileInput('marginal_tax_rate_override_pct', 'Tax rate override (%)', 'number', {
    min: 0,
    max: 100,
    rule: 'From 0 to 100',
    hint: 'Blank: the rate is calculated from province and income.',
  }),
  tfsa_room_remaining: profileInput('tfsa_room_remaining', 'Your starting TFSA room', 'money', notNegative),
  rrsp_room_remaining: profileInput('rrsp_room_remaining', 'Your starting RRSP room', 'money', notNegative),
  rrsp_annual_contribution_cap: profileInput('rrsp_annual_contribution_cap', 'Your own RRSP cap for the year', 'money', {
    ...notNegative,
    hint: 'The most the monthly plan puts into the RRSP this year. Blank: only your room limits it.',
  }),
  rrsp_claimed_amount: profileInput('rrsp_claimed_amount', 'RRSP contributed before these records, this year', 'money', {
    ...notNegative,
    hint: 'Counted in "Contributed this year".',
  }),
  // portfolio-optimizer-design.md, O44: per account, raised to at most 15% for a standout; not a hard cap across accounts
  max_position_size_pct: profileInput('max_position_size_pct', 'Max Single Position (%)', 'number', {
    ...cap,
    hint: 'Of each account. The optimizer may raise it to 15% for a stock far ahead of the rest.',
  }),
  max_sector_weight_pct: profileInput('max_sector_weight_pct', 'Max sector weight (%)', 'number', { ...cap, hint: 'Of the whole portfolio, used by the optimizer.' }),
} as const

export function accountInputs(account: AccountType): SettingInput[] {
  const input = (field: AccountField, label: string, kind: SettingInput['kind'], extra: Partial<SettingInput> = {}): SettingInput => ({
    key: `account.${account}.${field}`,
    label,
    kind,
    target: { part: 'account', account, field },
    ...extra,
  })
  return [
    input('commission_per_trade', 'Commission per trade', 'money', { ...notNegative, required: true }),
    input('conversion_cost_pct', 'Currency conversion cost (%)', 'number', { min: 0, max: 100, rule: 'From 0 to 100', required: true }),
    input('uses_norberts_gambit', "Uses Norbert's gambit", 'boolean'),
    input('reinvests_dividends', 'Reinvests dividends', 'boolean'),
  ]
}

const words = (name: string) => (name === 'tfsa' ? 'TFSA' : name.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()))

/** One input per rule the backend publishes (`GET /api/order-settings/schema`), with its range and default. */
export function ruleInput(rule: OrderRule): SettingInput {
  return {
    key: `rule.${rule.group}.${rule.key}`,
    label: `${words(rule.group)}: ${rule.key.replaceAll('_', ' ')}`,
    kind: rule.type === 'whole number' ? 'integer' : 'number',
    target: { part: 'rule', group: rule.group, name: rule.key },
    min: rule.minimum ?? undefined,
    max: rule.maximum ?? undefined,
    above: !rule.minimum_allowed,
    below: !rule.maximum_allowed,
    rule: rule.rule,
    hint: rule.meaning,
    placeholder: `Default ${rule.default}`,
  }
}

/** Why a value cannot be saved, or null. */
export function inputError(input: SettingInput, value: string): string | null {
  if (input.kind === 'boolean') return null
  const text = value.trim()
  if (!text) return input.required ? 'Required' : null
  if (input.kind === 'text') return null
  const n = Number(text)
  if (!Number.isFinite(n)) return 'Enter a number'
  if (input.kind === 'integer' && !Number.isInteger(n)) return 'Enter a whole number'
  const low = input.min != null && (input.above ? n <= input.min : n < input.min)
  const high = input.max != null && (input.below ? n >= input.max : n > input.max)
  return low || high ? (input.rule ?? 'Out of range') : null
}

const written = (value: unknown) => (value == null ? '' : String(value))

const ruleValue = (settings: OptimizerSettings, group: string, name: string) => (settings[group] as Record<string, unknown> | undefined)?.[name]

/** The stored value of an input as its text. An RRSP claim counts for its own tax year only. */
export function savedValue(
  input: SettingInput,
  stored: { profile: Profile; accounts: readonly Account[]; settings: OptimizerSettings },
  year: number,
): string {
  const { target } = input
  if (target.part === 'rule') return written(ruleValue(stored.settings, target.group, target.name))
  if (target.part === 'account') return written(stored.accounts.find((a) => a.account_type === target.account)?.[target.field as keyof Account])
  if (target.field === 'rrsp_claimed_amount' && stored.profile.rrsp_claimed_tax_year !== year) return ''
  return written(stored.profile[target.field as keyof Profile])
}

const parsed = (input: SettingInput, value: string): string | number | boolean | null => {
  if (input.kind === 'boolean') return value === 'true'
  const text = value.trim()
  if (!text) return null
  return input.kind === 'text' ? text : Number(text)
}

export type SaveRequest =
  | { to: 'profile'; body: Api['UserProfileUpdate'] }
  | { to: 'portfolio'; body: Api['PortfolioUpdate'] }
  | { to: 'account'; account: AccountType; body: Api['PortfolioAccountUpdate'] }

export type SavePart = SaveRequest & { label: string; keys: string[] }

export interface Change {
  input: SettingInput
  value: string
}

/**
 * The requests for what changed, one per thing the server saves on its own (profile, optimizer rules, each account). A room
 * figure is dated the day it is saved, an RRSP claim also names its tax year; the optimizer's `settings` is sent whole (the
 * server replaces it), keeping the keys this page does not edit.
 */
export function buildSave(changes: readonly Change[], settings: OptimizerSettings, today: string): SavePart[] {
  const parts: SavePart[] = []

  const profile: Record<string, unknown> = {}
  const profileKeys: string[] = []
  for (const { input, value } of changes) {
    if (input.target.part !== 'profile') continue
    const { field } = input.target
    const v = parsed(input, value)
    profile[field] = v
    profileKeys.push(input.key)
    if (field === 'tfsa_room_remaining') profile.tfsa_room_as_of = v == null ? null : today
    if (field === 'rrsp_room_remaining') profile.rrsp_room_as_of = v == null ? null : today
    if (field === 'rrsp_claimed_amount') {
      profile.rrsp_claimed_tax_year = v == null ? null : Number(today.slice(0, 4))
      profile.rrsp_claimed_as_of = v == null ? null : today
    }
  }
  if (profileKeys.length) parts.push({ to: 'profile', label: 'Profile', keys: profileKeys, body: profile as Api['UserProfileUpdate'] })

  const rules = changes.filter((c) => c.input.target.part === 'rule')
  if (rules.length) {
    const next = structuredClone(settings)
    for (const { input, value } of rules) {
      if (input.target.part !== 'rule') continue
      const { group, name } = input.target
      const values = { ...(next[group] as Record<string, unknown> | undefined) }
      const v = parsed(input, value)
      if (v == null) delete values[name]
      else values[name] = v
      if (Object.keys(values).length) next[group] = values
      else delete next[group]
    }
    parts.push({ to: 'portfolio', label: 'Optimizer rules', keys: rules.map((c) => c.input.key), body: { settings: next } })
  }

  for (const account of ['tfsa', 'rrsp', 'trading'] as const) {
    const mine = changes.filter((c) => c.input.target.part === 'account' && c.input.target.account === account)
    if (!mine.length) continue
    const body = Object.fromEntries(mine.map((c) => [(c.input.target as { field: string }).field, parsed(c.input, c.value)]))
    parts.push({ to: 'account', account, label: `${account.toUpperCase()} account`, keys: mine.map((c) => c.input.key), body })
  }
  return parts
}
