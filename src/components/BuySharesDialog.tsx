import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { PositionSummary } from '@/components/ledger/PositionSummary'
import { useTradeForm } from '@/components/ledger/TradeForm'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/format'
import { LEDGER } from '@/lib/ledger-routes'
import type { Holding } from '@/types/portfolio'

interface BuySharesDialogProps {
  holding: Holding | null
  onClose: () => void
}

/** Buy more of a position the owner holds: the trade form, reviewed with the server and recorded as a `buy`. */
export function BuySharesDialog({ holding, onClose }: BuySharesDialogProps) {
  return holding ? <BuyShares holding={holding} onClose={onClose} /> : null
}

function BuyShares({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const form = useTradeForm({ kind: 'buy', holding })
  const currency = holding.stock.currency
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title={
        <>
          Buy {holding.stock.ticker}
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {holding.account_type.toUpperCase()}
          </Badge>
        </>
      }
      summary={<PositionSummary holding={holding} third={{ label: 'Book cost', value: formatMoney(holding.total_book_cost, currency) }} />}
      body={form.body}
      previewRoute={LEDGER.eventsPreview}
      recordRoute={LEDGER.events}
      currency={form.currency}
      submitLabel="Buy shares"
    >
      {form.fields}
    </LedgerDialog>
  )
}
