import { useUsers } from '@/hooks/use-users'
import { useUser } from '@/context/UserContext'

export function ProfileSwitcher() {
  const { data: users } = useUsers()
  const { userId, setUserId } = useUser()

  if (!users || users.length <= 1) return null

  return (
    <select
      value={userId}
      onChange={(e) => setUserId(e.target.value)}
      className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
    >
      {users.map((u) => (
        <option key={u.user_id} value={u.user_id}>
          {u.display_name}
        </option>
      ))}
    </select>
  )
}
