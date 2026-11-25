import { BuySharesDialog } from '@/components/BuySharesDialog'
import { EditPositionDialog } from '@/components/EditPositionDialog'
import { LogDividendDialog } from '@/components/LogDividendDialog'
import { RemovePositionDialog } from '@/components/RemovePositionDialog'
import { SellPositionDialog } from '@/components/SellPositionDialog'
import type { HoldingActions } from '@/hooks/use-holding-actions'

/**
 * The dialog for whatever action is open (`useHoldingActions`), rendered once by each page that lists holdings. Only the open
 * dialog is mounted, keyed by action and holding, so its form starts fresh every time and a closed dialog costs nothing.
 */
export function HoldingActionDialogs({ actions }: { actions: HoldingActions }) {
  const { current, close } = actions
  if (!current) return null
  const { action, holding } = current
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
      return <RemovePositionDialog key={key} holding={holding} onClose={close} />
  }
}
