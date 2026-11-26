/**
 * The Settings page's reads and writes. The editable values are the inputs of `lib/settings-form.ts`; the figures only shown are
 * declared here. The room today is the Portfolio screen's own field (`ROOM_FIELDS`); the account and portfolio responses are
 * declared there too.
 */
import { defineFields, type ApiFieldKey, type NotShown, type ScreenFieldSet } from '@/lib/fields'
import { asFraction } from '@/lib/units'
import { PROFILE_INPUTS, type Profile } from '@/lib/settings-form'
import type { components } from '@/types/openapi.gen'
import { cad, plainPct, text } from '../formatters'
import { SETTINGS_ENTRY_FIELDS, SETTINGS_ENTRY_NOT_SENT } from './entry-fields'

type RoomAccount = components['schemas']['AccountRoomResponse']

const place = ['detail' as const]
const input = ['input' as const]

export const TAX_FIELDS = defineFields<Profile>([
  { id: 'province', label: 'Province / Territory', source: 'UserProfileResponse.province', get: (p) => p.province, format: text, places: place },
  {
    id: 'marginal_rate',
    label: 'Marginal Tax Rate',
    source: 'UserProfileResponse.marginal_tax_rate_pct',
    get: (p) => asFraction('UserProfileResponse.marginal_tax_rate_pct', p.marginal_tax_rate_pct),
    format: (v, p) => (v == null ? '—' : `${plainPct(v)} ${p.marginal_tax_rate_override_pct != null ? '(manual override)' : '(auto-calculated)'}`),
    places: place,
  },
])

/** This year's figures of a registered account's room, beside the room left today. */
export const YEAR_FIELDS = defineFields<RoomAccount>([
  {
    id: 'annual_limit',
    label: 'Yearly limit',
    source: ['AccountRoomResponse.annual_limit', 'AccountRoomResponse.year', 'AccountRoomResponse.limit_estimated'],
    get: (r) => r.annual_limit,
    format: (v, r) => `${cad(v)} for ${r.year}${r.limit_estimated ? ' (estimated)' : ''}`,
    places: place,
  },
  { id: 'contributed', label: 'Contributed this year', source: 'AccountRoomResponse.contributed_this_year', get: (r) => r.contributed_this_year, format: (v) => cad(v), places: place },
])

const stored = (label: string, field: keyof Profile) => ({
  id: field,
  label,
  source: `UserProfileResponse.${field}` as ApiFieldKey,
  get: (p: Profile) => p[field],
  format: text,
  places: input,
})

/** The stored values the inputs start from (one per profile input), the id, and the days and year shown with them. */
export const PROFILE_PREFILL = defineFields<Profile>([
  ...Object.values(PROFILE_INPUTS).map((i) => stored(i.label, (i.target as { field: keyof Profile }).field)),
  stored('Profile id', 'user_id'),
  stored('TFSA room entered on', 'tfsa_room_as_of'),
  stored('RRSP room entered on', 'rrsp_room_as_of'),
  stored('RRSP claim year', 'rrsp_claimed_tax_year'),
])

type Rule = components['schemas']['OrderSettingResponse']
const rule = (key: keyof Rule) => ({ id: `rule_${key}`, label: key, source: `OrderSettingResponse.${key}` as ApiFieldKey, get: (r: Rule) => r[key], format: text, places: input })

/** Each published optimizer rule becomes one input (`ruleInput`): every one of its fields is used. */
export const RULE_FIELDS = defineFields<Rule>(
  (['group', 'key', 'type', 'default', 'minimum', 'maximum', 'minimum_allowed', 'maximum_allowed', 'rule', 'meaning'] as const).map(rule),
)

export const SETTINGS_NOT_SHOWN: Partial<Record<ApiFieldKey, NotShown>> = {
  'UserProfileResponse.is_active': { reason: 'An archived profile is not listed', gap: 'T-3' },
  'UserProfileResponse.rrsp_claimed_as_of': { reason: 'The day the claim was saved; the page sets it' },
  'UserProfileResponse.time_sensitive_cash_needs': { reason: 'Stored, but nothing in the system reads them', gap: 'T-5' },
  'OrderSettingsSchemaResponse.settings': { reason: 'The rules, one input each (OrderSettingResponse)' },
  'OrderSettingsSchemaResponse.other_keys': { reason: 'The page keeps the other keys of the settings object as they are' },
  ...SETTINGS_ENTRY_NOT_SENT,
}

export const SETTINGS_SCREEN: ScreenFieldSet = {
  screen: 'settings',
  schemas: ['UserProfileResponse', 'OrderSettingsSchemaResponse', 'OrderSettingResponse', 'UserProfileUpdate', 'PortfolioAccountUpdate', 'PortfolioUpdate'],
  fields: [...TAX_FIELDS, ...YEAR_FIELDS, ...PROFILE_PREFILL, ...RULE_FIELDS, ...SETTINGS_ENTRY_FIELDS],
  notShown: SETTINGS_NOT_SHOWN,
  notShownSchemas: {
    TimeSensitiveCashNeed: { reason: 'Stored, but nothing in the system reads them', gap: 'T-5' },
    UserListResponse: { reason: 'The profile switcher reads the list (id and name)' },
  },
}
