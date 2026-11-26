import { useState, type FormEvent } from 'react'
import { MoneyInput } from '@/components/MoneyInput'
import { Button } from '@/components/ui/button'
import { useAsk, type AskAccount } from '@/hooks/use-optimizer'
import { getErrorMessage } from '@/lib/api'
import { formatCAD, parseAmount } from '@/lib/format'
import { OptimizerRun } from './OptimizerRun'

/** "Where should this money go": the optimizer's answer, shown on its own and never saved. */
export function AvailableToTrade() {
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState<AskAccount>('any')
  const ask = useAsk()
  const amountNum = parseAmount(amount)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (amountNum <= 0) return
    ask.mutate({ amount_cad: amountNum, account })
  }

  return (
    <div className="space-y-3 mb-4">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
        <label htmlFor="available-to-trade" className="text-sm font-medium text-muted-foreground shrink-0">
          Available to trade:
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-32">
            <MoneyInput id="available-to-trade" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <label htmlFor="available-to-trade-account" className="text-sm text-muted-foreground">in</label>
          <select
            id="available-to-trade-account"
            value={account}
            onChange={(e) => setAccount(e.target.value as AskAccount)}
            className="py-1.5 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="any">Any Account</option>
            <option value="tfsa">TFSA</option>
            <option value="rrsp">RRSP</option>
            <option value="trading">Trading</option>
          </select>
          <Button type="submit" size="sm" variant="outline" disabled={amountNum <= 0 || ask.isPending}>
            {ask.isPending ? 'Analyzing…' : 'Analyze allocation'}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Split across your accounts by their room and this month's RRSP amount; choosing an account puts it all there, up to its room.
        </span>
        {ask.isError && (
          <p role="alert" className="basis-full text-xs text-destructive">
            {getErrorMessage(ask.error, { write: true })}
          </p>
        )}
      </form>
      {ask.data && ask.variables && (
        <section aria-label="Allocation answer" className="border border-dashed border-border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Where {formatCAD(ask.variables.amount_cad)} would go</h2>
              <p className="text-sm">{ask.data.headline}</p>
              <p className="text-xs text-muted-foreground">Not saved. Your saved suggestions are below.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => ask.reset()}>
              Close
            </Button>
          </div>
          {/* the question names its own account, so the page's account switcher does not filter the answer */}
          <OptimizerRun run={ask.data} view="combined" />
        </section>
      )}
    </div>
  )
}
