/**
 * The form of a buy, a sale or an opening balance: `useTradeForm` holds what the owner typed and returns the fields to draw and the
 * request body they make (`null` until valid). The dialogs around it (Buy, Sell, Add Stock) only choose the kind, the stock and the
 * title; the body is built by `lib/ledger-entry.ts` and covered by `screens/portfolio/entry-fields.ts`.
 *
 * A default the owner has not touched is derived, not copied into state: the fee follows the account (so choosing another account in
 * Add Stock changes it), and what the owner typed is never overwritten.
 */
import { useState } from 'react'
import { initialCommon, type CommonValues, type LedgerForm } from '@/components/ledger/common-values'
import { AccountField, CommonFields, MoneyField, NumberField } from '@/components/ledger/fields'
import { useAccounts } from '@/hooks/use-portfolio'
import { parseAmount } from '@/lib/format'
import { eventsBody, tradeEntry, type Currency } from '@/lib/ledger-entry'
import type { AccountType } from '@/types/user'

type TradeKind = 'buy' | 'sell' | 'opening_balance'

interface TradeFormArgs {
  kind: TradeKind
  ticker: string
  /** The stock's currency as the backend names it; anything but CAD or USD cannot be held, and the form says so. */
  currency: string | null
  /** The account when it is fixed (a holding's); otherwise the form asks. */
  account?: AccountType
  /** A sale cannot exceed what the position holds. */
  maxShares?: number
  /** The shares to start with (a sale starts with all of them). */
  initialShares?: number
  /** The price to start with: the last close; a lookup has none. */
  price?: number | null
}

export function useTradeForm({ kind, ticker, currency: stockCurrency, account: fixedAccount, maxShares, initialShares, price: initialPrice }: TradeFormArgs): LedgerForm {
  const accounts = useAccounts()
  const currency: Currency | null = stockCurrency === 'USD' ? 'USD' : stockCurrency === 'CAD' ? 'CAD' : null

  const [pickedAccount, setPickedAccount] = useState<AccountType>('tfsa')
  const account = fixedAccount ?? pickedAccount

  const [shares, setShares] = useState(() => (initialShares != null ? String(initialShares) : ''))
  const [price, setPrice] = useState(() => (initialPrice != null ? initialPrice.toFixed(2) : ''))
  const [feesTyped, setFeesTyped] = useState<string | null>(null)
  const [common, setCommon] = useState<CommonValues>(initialCommon)

  // The account's commission is in Canadian dollars, so it is the default fee of a Canadian stock only (and an opening balance has no fee).
  const commission = accounts.data?.data.find((a) => a.account_type === account)?.commission_per_trade ?? 0
  const defaultFee = currency === 'CAD' && commission > 0 && kind !== 'opening_balance' ? String(commission) : ''
  const fees = feesTyped ?? defaultFee

  const sharesNum = parseAmount(shares)
  const tooMany = maxShares !== undefined && sharesNum > maxShares
  const opening = kind === 'opening_balance'

  const entry = currency
    ? tradeEntry({
        kind,
        account,
        ticker,
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
    : null

  const fields = (
    <div className="space-y-3">
      {currency === null && (
        <p role="alert" className="text-xs text-destructive">
          This stock is quoted in {stockCurrency || 'an unknown currency'}. Only Canadian and US dollar stocks can be held here.
        </p>
      )}
      {fixedAccount === undefined && <AccountField value={account} onChange={setPickedAccount} />}
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={
            kind === 'sell' && maxShares !== undefined ? (
              <>
                Shares to sell <span className="text-muted-foreground">(max {maxShares})</span>
              </>
            ) : kind === 'buy' ? (
              'Shares to buy'
            ) : (
              'Shares held'
            )
          }
          error={tooMany ? `Cannot exceed ${maxShares} shares` : undefined}
          max={maxShares}
          placeholder={kind === 'buy' ? 'e.g. 25' : undefined}
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          autoFocus
        />
        <MoneyField label={`${opening ? 'Average cost per share' : 'Price per share'} (${currency ?? stockCurrency})`} value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <CommonFields
        values={common}
        onChange={setCommon}
        currency={currency ?? 'CAD'}
        dateLabel={opening ? 'As of' : undefined}
        rateRequired={opening && currency === 'USD'}
        before={opening ? null : <MoneyField label={`Fees (${currency ?? stockCurrency})`} value={fees} onChange={(e) => setFeesTyped(e.target.value)} />}
      />
    </div>
  )

  return { fields, body: entry ? eventsBody([entry]) : null, currency: currency ?? 'CAD' }
}
