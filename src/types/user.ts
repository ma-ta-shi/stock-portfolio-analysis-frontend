export type AccountType = 'tfsa' | 'rrsp' | 'trading'

/** One entry of the profile switcher's list. A profile itself is `UserProfileResponse`. */
export interface User {
  user_id: string
  display_name: string
  is_active: boolean
}
