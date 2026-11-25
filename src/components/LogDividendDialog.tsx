import { AccountTitle } from '@/components/ledger/AccountTitle'
import { LedgerDialog } from '@/components/ledger/LedgerDialog'
import { SummaryCells } from '@/components/ledger/PositionSummary'
import { useDividendForm } from '@/components/ledger/DividendForm'
import { formatMoney } from '@/lib/format'
import { LEDGER } from '@/lib/ledger-routes'
import type { Holding } from '@/types/portfolio'

interface LogDividendDialogProps {
  holding: Holding | null
  onClose: () => void
}

/** Record a dividend a holding paid, with the shares it bought when it was reinvested. */
export function LogDividendDialog({ holding, onClose }: LogDividendDialogProps) {
  return holding ? <LogDividend holding={holding} onClose={onClose} /> : null
}

function LogDividend({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const form = useDividendForm({ account: holding.account_type, ticker: holding.stock.ticker, currency: holding.stock.currency === 'USD' ? 'USD' : 'CAD', shares: holding.shares, price: holding.current_price })
  const expected = holding.expected_income_per_share ?? 0
  return (
    <LedgerDialog
      open
      onClose={onClose}
      title={
        <AccountTitle account={holding.account_type}>
          Log dividend {holding.stock.ticker}
        </AccountTitle>
      }
      summary={
        <SummaryCells
          cells={[
            { label: 'Shares held', value: holding.shares },
            { label: 'Expected income/share (12 months)', value: expected > 0 ? formatMoney(expected, holding.stock.currency) : '—' },
          ]}
        />
      }
      body={form.body}
      previewRoute={LEDGER.eventsPreview}
      recordRoute={LEDGER.events}
      currency={form.currency}
      submitLabel="Log dividend"
    >
      {form.fields}
    </LedgerDialog>
  )
}
