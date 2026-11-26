import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { components } from '@/types/openapi.gen'

/** The active user's own profile (`GET /api/users/{id}`). Mock mode serves the one recorded profile. */
export function useUserProfile() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: ({ signal }) =>
      apiFetch<components['schemas']['UserProfileResponse']>('/mock-data/settings/profile.json', `/api/users/${userId}`, { signal }),
  })
}
