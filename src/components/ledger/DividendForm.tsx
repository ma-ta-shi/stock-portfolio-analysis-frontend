/**
 * The form of a dividend, with an optional reinvestment: holds what was typed and returns the fields and the `events` body
 * (a `dividend` row and, when reinvested, a `drip` row in one call). Built by `dividendEntries` in `lib/ledger-entry.ts`.
 */
import { useState } from 'react'
import { initialCommon, type CommonValues, type LedgerForm } from '@/components/ledger/common-values'
import { CommonFields, MoneyField } from '@/components/ledger/fields'
import { parseAmount } from '@/lib/format'
import { dividendEntries, dividendProblem, eventsBody, type Currency } from '@/lib/ledger-entry'
import type { Holding } from '@/types/portfolio'

export function useDividendForm(holding: Holding): LedgerForm {
  const currency: Currency = holding.stock.currency === 'USD' ? 'USD' : 'CAD'
  const [gross, setGross] = useState('')
  const [withholding, setWithholding] = useState('')
  const [reinvest, setReinvest] = useState(false)
  const [price, setPrice] = useState(() => (holding.current_price != null ? holding.current_price.toFixed(2) : ''))
  const [sharesTyped, setSharesTyped] = useState<string | null>(null)
  const [common, setCommon] = useState<CommonValues>(initialCommon)

  const grossNum = parseAmount(gross)
  const withholdingNum = parseAmount(withholding)
  const priceNum = parseAmount(price)
  // Untouched, the shares are what the dividend after tax buys, to four decimals (rounded down so it never overspends).
  const derived = priceNum > 0 ? Math.floor(((grossNum - withholdingNum) / priceNum) * 1e4) / 1e4 : 0
  const shares = sharesTyped ?? (derived > 0 ? String(derived) : '')
  const reinvestion = reinvest ? { shares: parseAmount(shares), price: priceNum } : undefined

  const problem = grossNum > 0 ? dividendProblem({ gross: grossNum, withholding: withholdingNum, reinvest: reinvestion }) : null
  const rows = dividendEntries({
    account: holding.account_type,
    ticker: holding.stock.ticker,
    currency,
    gross: grossNum,
    withholding: withholdingNum,
    date: common.date,
    reinvest: reinvestion,
    rate: common.rate ? parseAmount(common.rate) : undefined,
    notes: common.notes,
  })

  const fields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label={`Dividend before tax (${currency})`} value={gross} onChange={(e) => setGross(e.target.value)} autoFocus />
        <MoneyField label={`Tax withheld (${currency}, optional)`} value={withholding} onChange={(e) => setWithholding(e.target.value)} />
      </div>
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
      <label className="flex cursor-pointer select-none items-center gap-2">
        <input type="checkbox" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} className="rounded border-border" />
        <span className="text-sm">Reinvested as new shares</span>
      </label>
      {reinvest && (
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label={`Price per share (${currency})`} value={price} onChange={(e) => setPrice(e.target.value)} />
          <MoneyField label="Shares bought" value={shares} onChange={(e) => setSharesTyped(e.target.value)} />
        </div>
      )}
      <CommonFields values={common} onChange={setCommon} currency={currency} showReason={false} dateLabel="Payment date" />
    </div>
  )

  return { fields, body: rows ? eventsBody(rows) : null, currency }
}
