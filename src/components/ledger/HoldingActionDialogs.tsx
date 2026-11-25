import { BuySharesDialog } from '@/components/BuySharesDialog'
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog'
import { LogDividendDialog } from '@/components/LogDividendDialog'
import { EditPositionDialog } from '@/components/EditPositionDialog'
import { SellPositionDialog } from '@/components/SellPositionDialog'
import type { HoldingActions } from '@/hooks/use-holding-actions'
import { LEDGER } from '@/lib/ledger-routes'

/**
 * The dialog for whatever action is open (`useHoldingActions`), rendered once by each page that lists holdings. Only the open
 * dialog is mounted, keyed by action and holding, so its form starts fresh every time and a closed dialog costs nothing.
 */
export function HoldingActionDialogs({ actions }: { actions: HoldingActions }) {
  const { current, close } = actions
  if (!current) return null
  const { action, row: holding } = current
  const key = `${action}-${holding.holding_id}`
  switch (action) {
    case 'buy':
      return <BuySharesDialog key={key} holding={holding} onClose={close} />
    case 'sell':
      return <SellPositionDialog key={key} holding={holding} onClose={close} />
    case 'edit':
      return <EditPositionDialog key={key} holding={holding} onClose={close} />
    case 'dividend':
      return <LogDividendDialog key={key} holding={holding} onClose={close} />
    case 'remove':
      return (
        <ConfirmActionDialog key={key} title="Remove from Portfolio" route={LEDGER.remove} params={{ id: holding.holding_id }} submitLabel="Remove" destructive onClose={close}>
          Remove <span className="font-medium text-foreground">{holding.stock.ticker}</span> ({holding.account_type.toUpperCase()}) from your portfolio? Every entry of the position is reversed; the history stays in Transactions.
        </ConfirmActionDialog>
      )
  }
}
