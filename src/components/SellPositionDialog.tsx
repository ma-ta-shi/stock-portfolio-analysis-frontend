import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { PositionSummary } from '@/components/ledger/PositionSummary'
import { useTradeForm } from '@/components/ledger/TradeForm'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/format'
import { LEDGER } from '@/lib/ledger-routes'
import { gainLossColor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Holding } from '@/types/portfolio'

interface SellPositionDialogProps {
  holding: Holding | null
  onClose: () => void
}

/**
 * Sell some or all of a position. The realised gain, the tax estimate and the superficial-loss notes are the server's own,
 * shown by the review step; nothing is worked out in the browser. (Selling every share closes the position: the preview says so.)
 */
export function SellPositionDialog({ holding, onClose }: SellPositionDialogProps) {
  return holding ? <SellPosition holding={holding} onClose={onClose} /> : null
}

function SellPosition({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const form = useTradeForm({
    kind: 'sell',
    ticker: holding.stock.ticker,
    currency: holding.stock.currency,
    account: holding.account_type,
    maxShares: holding.shares,
    initialShares: holding.shares,
    price: holding.current_price,
  })
  const currency = holding.stock.currency
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title={
        <>
          Sell {holding.stock.ticker}
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {holding.account_type.toUpperCase()}
          </Badge>
        </>
      }
      summary={
        <PositionSummary
          holding={holding}
          third={{
            label: 'Unrealized',
            value: <span className={cn(gainLossColor(holding.total_gain_loss ?? 0))}>{formatMoney(holding.total_gain_loss, currency, { signed: true })}</span>,
          }}
        />
      }
      body={form.body}
      previewRoute={LEDGER.eventsPreview}
      recordRoute={LEDGER.events}
      currency={form.currency}
      submitLabel="Sell shares"
      destructive
    >
      {form.fields}
    </LedgerDialog>
  )
}
