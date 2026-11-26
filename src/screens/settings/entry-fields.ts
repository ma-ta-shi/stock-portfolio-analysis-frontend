/**
 * The Settings form's request fields: every property of `UserProfileUpdate`, `PortfolioAccountUpdate` and `PortfolioUpdate` is
 * typed or chosen (`input`), set by the page, or listed with why it is not sent. `lib/settings-form.test.ts` ties this to what
 * `buildSave` emits.
 */
import type { ApiFieldKey, FieldMeta, NotShown } from '@/lib/fields'
import { PROFILE_INPUTS, accountInputs, type SettingInput } from '@/lib/settings-form'

const typed = (label: string, source: string): FieldMeta => ({ id: source, label, source: source as ApiFieldKey, places: ['input'] })

const fieldOf = (input: SettingInput) => (input.target as { field: string }).field

/** Read off the inputs themselves; field coverage fails if one names a field the API does not have. */
export const SETTINGS_ENTRY_FIELDS: readonly FieldMeta[] = [
  ...Object.values(PROFILE_INPUTS).map((i) => typed(i.label, `UserProfileUpdate.${fieldOf(i)}`)),
  ...accountInputs('tfsa').map((i) => typed(i.label, `PortfolioAccountUpdate.${fieldOf(i)}`)),
  typed('Optimizer rules', 'PortfolioUpdate.settings'),
]

/** Sent with a figure the owner types: the day it was true, and the claim's tax year. */
export const SET_BY_PAGE: Readonly<Record<string, string>> = {
  'UserProfileUpdate.tfsa_room_as_of': 'today, when the TFSA room is saved',
  'UserProfileUpdate.rrsp_room_as_of': 'today, when the RRSP room is saved',
  'UserProfileUpdate.rrsp_claimed_tax_year': 'this year, when the claim is saved',
  'UserProfileUpdate.rrsp_claimed_as_of': 'today, when the claim is saved',
}

export const SETTINGS_ENTRY_NOT_SENT: Partial<Record<ApiFieldKey, NotShown>> = {
  ...(Object.fromEntries(Object.entries(SET_BY_PAGE).map(([key, how]) => [key, { reason: `Set by the page: ${how}` }])) as Partial<Record<ApiFieldKey, NotShown>>),
  'UserProfileUpdate.province': { reason: 'The backend accepts only ON' },
  'UserProfileUpdate.is_active': { reason: 'Only restores an archived profile', gap: 'T-3' },
  'UserProfileUpdate.time_sensitive_cash_needs': { reason: 'Stored, but nothing in the system reads them', gap: 'T-5' },
  'PortfolioAccountUpdate.cash_cad': { reason: 'Cash waits for deposits and withdrawals', gap: 'T-9' },
  'PortfolioAccountUpdate.cash_usd': { reason: 'Cash waits for deposits and withdrawals', gap: 'T-9' },
  'PortfolioUpdate.name': { reason: 'The page title is fixed; nothing shows the name' },
  'PortfolioUpdate.is_active': { reason: 'Only restores an archived portfolio', gap: 'T-3' },
}
