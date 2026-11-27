import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { User } from '@/types'

interface UsersResponse {
  data: User[]
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: ({ signal }) =>
      apiFetch<UsersResponse>('/api/users', { signal }),
    select: (res) => res.data,
  })
}
