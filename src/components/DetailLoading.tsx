/** The placeholder of the Stock and Analysis pages while their first read is in flight. */
export function DetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  )
}
