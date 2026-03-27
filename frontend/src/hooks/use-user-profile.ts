import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { UserProfile } from '@/types'

export function useUserProfile() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['user', 'profile', userId],
    queryFn: () =>
      apiFetch<UserProfile>(
        `/mock-data/users/${userId}.json`,
        `/api/users/${userId}`,
      ),
  })
}
