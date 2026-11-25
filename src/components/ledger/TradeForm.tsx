/**
 * The form of a buy, a sale or an opening balance: `useTradeForm` holds what the owner typed and returns the fields to draw and the
 * request body they make (`null` until valid). The dialogs around it (Buy, Sell, Add Stock) only choose the kind and the title; the
 * body is built by `lib/ledger-entry.ts` and covered by `screens/portfolio/entry-fields.ts`.
 */
import { useState, type ReactNode } from 'react'
import { initialCommon, type CommonValues } from '@/components/ledger/common-values'
import { CommonFields, MoneyField, NumberField } from '@/components/ledger/fields'
import { useAccounts } from '@/hooks/use-portfolio'
import { parseAmount } from '@/lib/format'
import { eventsBody, tradeEntry, type Currency } from '@/lib/ledger-entry'
import type { Holding } from '@/types/portfolio'

type TradeKind = 'buy' | 'sell' | 'opening_balance'

interface TradeFormArgs {
  kind: TradeKind
  holding: Holding
}

export interface TradeForm {
  fields: ReactNode
  /** The `events` request body, or `null` while the inputs are not valid. */
  body: ReturnType<typeof eventsBody> | null
  currency: Currency
}

export function useTradeForm({ kind, holding }: TradeFormArgs): TradeForm {
  const accounts = useAccounts()
  const currency: Currency = holding.stock.currency === 'USD' ? 'USD' : 'CAD'
  // The account's commission is in Canadian dollars, so it is the default fee of a Canadian stock only.
  const commission = accounts.data?.data.find((a) => a.account_type === holding.account_type)?.commission_per_trade ?? 0

  const [shares, setShares] = useState(() => (kind === 'sell' ? String(holding.shares) : ''))
  const [price, setPrice] = useState(() => (holding.current_price != null ? holding.current_price.toFixed(2) : ''))
  const [fees, setFees] = useState(() => (currency === 'CAD' && commission > 0 && kind !== 'opening_balance' ? String(commission) : ''))
  const [common, setCommon] = useState<CommonValues>(initialCommon)

  const sharesNum = parseAmount(shares)
  const maxShares = kind === 'sell' ? holding.shares : undefined
  const tooMany = maxShares !== undefined && sharesNum > maxShares

  const entry = tradeEntry({
    kind,
    account: holding.account_type,
    ticker: holding.stock.ticker,
    currency,
    shares: sharesNum,
    price: parseAmount(price),
    fees: parseAmount(fees),
    date: common.date,
    rate: common.rate ? parseAmount(common.rate) : undefined,
    reason: common.reason,
    notes: common.notes,
    maxShares,
  })

  const fields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={
            kind === 'sell' ? (
              <>
                Shares to sell <span className="text-muted-foreground">(max {holding.shares})</span>
              </>
            ) : (
              'Shares to buy'
            )
          }
          error={tooMany ? `Cannot exceed ${holding.shares} shares` : undefined}
          max={maxShares}
          placeholder={kind === 'buy' ? 'e.g. 25' : undefined}
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          autoFocus
        />
        <MoneyField label={`Price per share (${currency})`} value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <CommonFields
        values={common}
        onChange={setCommon}
        currency={currency}
        before={kind === 'opening_balance' ? null : <MoneyField label={`Fees (${currency})`} value={fees} onChange={(e) => setFees(e.target.value)} />}
      />
    </div>
  )

  return { fields, body: entry ? eventsBody([entry]) : null, currency }
}
