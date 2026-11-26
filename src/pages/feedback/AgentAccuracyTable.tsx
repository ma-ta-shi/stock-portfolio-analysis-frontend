import { unavailableLabel } from '@/lib/gaps'

/** The design's per-agent accuracy. The agents' readings are stored but nothing scores them yet (gap F-1). */
export function AgentAccuracyTable() {
  return (
    <section aria-label="Agent Accuracy" className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-3">Agent Accuracy</h3>
      <p className="text-sm text-muted-foreground py-8 text-center">Not scored yet: {unavailableLabel('F-1')}.</p>
    </section>
  )
}
