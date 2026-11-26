import { useState } from 'react'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
import { useUsers } from '@/hooks/use-users'
import { useUser } from '@/context/UserContext'
import { hasUnsaved, setUnsaved } from '@/lib/unsaved'

export function ProfileSwitcher() {
  const { data: users } = useUsers()
  const { userId, setUserId } = useUser()
  // the profile asked for while the page holds unsaved changes
  const [pending, setPending] = useState<string | null>(null)

  if (!users || users.length <= 1) return null

  return (
    <>
      <select
        aria-label="Switch profile"
        value={userId}
        onChange={(e) => (hasUnsaved() ? setPending(e.target.value) : setUserId(e.target.value))}
        className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
      >
        {users.map((u) => (
          <option key={u.user_id} value={u.user_id}>
            {u.display_name}
          </option>
        ))}
      </select>
      <DiscardChangesDialog
        open={pending != null}
        onStay={() => setPending(null)}
        onDiscard={() => {
          setUnsaved(false)
          setUserId(pending!)
          setPending(null)
        }}
      />
    </>
  )
}
