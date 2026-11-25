/** Closed positions: holdings with no shares left, from the same registry as the active ones (`screens/portfolio/holdings.tsx`). */
import { useId, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useClosedPositions } from '@/hooks/use-portfolio'
import { ButtonLink } from '@/components/ButtonLink'
import { RegistryTable } from '@/components/RegistryTable'
import { QueryError } from '@/components/QueryError'
import { holdingHistoryHref } from '@/hooks/use-transaction-filters'
import { filterByAccount, positionLabel } from '@/lib/portfolio'
import { HOLDING_FIELDS } from '@/screens/portfolio/holdings'
import type { PortfolioAccountView } from '@/types/portfolio'

/** The columns of this table, picked from the registry by id: what a closed position is read for. */
const COLUMN_IDS = ['ticker', 'account', 'total_shares_bought', 'total_shares_sold', 'average_buy_price', 'average_sell_price', 'realised', 'first_buy', 'last_activity']
const COLUMNS = COLUMN_IDS.map((id) => {
  const spec = HOLDING_FIELDS.find((s) => s.id === id)
  if (!spec) throw new Error(`Closed positions: no field "${id}" in the holdings registry`)
  return spec
})
const RIGHT = new Set(['total_shares_bought', 'total_shares_sold', 'average_buy_price', 'average_sell_price', 'realised'])

interface ClosedPositionsProps {
  accountFilter?: PortfolioAccountView
}

export function ClosedPositions({ accountFilter }: ClosedPositionsProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { data: allClosed, isError, error, refetch } = useClosedPositions()
  const closed = filterByAccount(allClosed, accountFilter)

  if (isError) return <QueryError what="closed positions" error={error} onRetry={refetch} compact className="mt-4" />
  if (!closed?.length) return null

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
        <span className="font-medium">Closed Positions</span>
        <span className="text-xs">({closed.length})</span>
      </button>

      {open && (
        <RegistryTable
          id={panelId}
          columns={COLUMNS}
          rows={closed}
          rowKey={(pos) => pos.holding_id}
          rowLabel={(pos) => positionLabel(pos)}
          rightAligned={RIGHT}
          detail={HOLDING_FIELDS}
          actionsHeader="History"
          actions={(pos) => {
            const label = positionLabel(pos)
            return (
              <ButtonLink variant="ghost" size="sm" className="text-xs" to={holdingHistoryHref(pos.holding_id)} aria-label={`View history for ${label}`}>
                View history
              </ButtonLink>
            )
          }}
        />
      )}
    </div>
  )
}
