/**
 * Ledger rows with their expanded detail and the Correct and Reverse actions. One table for the Transactions tab, the Dividends tab
 * and the stock page; columns and detail come from the field registry (`screens/portfolio/ledger.tsx`).
 */
import { TransactionActionDialogs, type TransactionAction } from '@/components/ledger/TransactionActionDialogs'
import { RegistryTable } from '@/components/RegistryTable'
import { Button } from '@/components/ui/button'
import { useRowActions } from '@/hooks/use-row-actions'
import { fieldsFor } from '@/lib/fields'
import { correctableReason, reversibleReason } from '@/lib/ledger-correction'
import { TRANSACTION_FIELDS } from '@/screens/portfolio/ledger'
import type { Transaction } from '@/types/portfolio'

const COLUMNS = fieldsFor(TRANSACTION_FIELDS, 'column')
const RIGHT = new Set(['shares', 'price', 'total', 'amount_cad', 'fees', 'realised'])

/** `oneStock`: the stock page's narrow column, where the Stock column would repeat the page's own stock on every row. */
export function LedgerTable({ rows, className, oneStock }: { rows: Transaction[]; className?: string; oneStock?: boolean }) {
  const actions = useRowActions<Transaction, TransactionAction>()
  return (
    <>
      <RegistryTable
        className={className}
        dense={oneStock}
        columns={oneStock ? COLUMNS.filter((c) => c.id !== 'stock') : COLUMNS}
        rows={rows}
        rowKey={(t) => t.transaction_id}
        rowLabel={() => 'this entry'}
        rightAligned={RIGHT}
        detail={TRANSACTION_FIELDS}
        expandedExtra={(t) => {
          const noCorrect = correctableReason(t)
          const noReverse = reversibleReason(t)
          return (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!!noCorrect} onClick={() => actions.open('correct', t)}>
                  Correct
                </Button>
                <Button size="sm" variant="outline" disabled={!!noReverse} onClick={() => actions.open('reverse', t)}>
                  Reverse
                </Button>
              </div>
              {noCorrect && <p className="text-xs text-muted-foreground">Cannot correct: {noCorrect}.</p>}
              {noReverse && noReverse !== noCorrect && <p className="text-xs text-muted-foreground">Cannot reverse: {noReverse}.</p>}
            </div>
          )
        }}
      />
      <TransactionActionDialogs actions={actions} />
    </>
  )
}
