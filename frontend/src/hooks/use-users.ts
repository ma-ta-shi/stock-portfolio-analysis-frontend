import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

interface UsersResponse {
  data: User[]
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () =>
      apiFetch<UsersResponse>('/mock-data/users.json', '/api/users'),
    select: (res) => res.data,
  })
}
