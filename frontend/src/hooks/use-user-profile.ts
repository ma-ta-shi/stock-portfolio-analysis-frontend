import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { useUser } from '@/context/UserContext'
import type { UserProfile } from '@/types'

export function useUserProfile() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: ({ signal }) =>
      apiFetch<UserProfile>(
        `/mock-data/users/${userId}.json`,
        `/api/users/${userId}`,
        { signal },
      ),
  })
}
