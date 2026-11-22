/** Skeleton shown while a lazily-loaded page's code is downloading. */
export function PageLoading() {
  return (
    <div role="status" className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      <div className="h-32 rounded-lg bg-muted animate-pulse" />
    </div>
  )
}
