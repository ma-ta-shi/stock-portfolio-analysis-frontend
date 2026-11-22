/**
 * Web Storage access that never throws. Storage can be unavailable (privacy modes,
 * disabled cookies, quota errors); preferences should silently fall back to defaults
 * instead of crashing the app on startup.
 */
function wrap(getStore: () => Storage) {
  return {
    get(key: string): string | null {
      try {
        return getStore().getItem(key)
      } catch {
        return null
      }
    },
    set(key: string, value: string): void {
      try {
        getStore().setItem(key, value)
      } catch {
        // Not persisted; the in-memory state still works for this session.
      }
    },
  }
}

export const safeStorage = {
  local: wrap(() => window.localStorage),
  session: wrap(() => window.sessionStorage),
}
