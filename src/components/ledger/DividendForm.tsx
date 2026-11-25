/**
 * The dividend forms.
 *  - `useDividendForm`, logging one by hand: the original Log Dividend form (the amount per share, the payment date, and a DRIP toggle
 *    with the reinvestment price). The gross sent is the amount per share times the shares held, and a reinvestment spends all of
 *    the dividend, in fractional shares unless the owner types the shares actually bought. With `initial` it corrects one dividend row instead: the gross and the tax
 *    withheld as recorded (a reinvestment is its own drip row, corrected as a trade);
 *  - `useDividendDecisionForm`: confirm a dividend the system found, where every blank means "keep the calculated figure"; the
 *    shares shown for a typed reinvestment price are the ones that spend the whole dividend.
 * Bodies are built by `dividendEntries` and `dividendCorrections` in `lib/ledger-entry.ts`; the shared inputs are in `fields.tsx`.
 */
import { useState } from 'react'
import { initialCommon, type CommonValues, type LedgerForm } from '@/components/ledger/common-values'
import { CommonFields, DateField, DividendFields, MoneyField, NumberField, ReinvestInputs } from '@/components/ledger/fields'
import { FormField } from '@/components/FormField'
import { NativeSelect } from '@/components/NativeSelect'
import { formatMoney, parseAmount } from '@/lib/format'
import { useAccounts } from '@/hooks/use-portfolio'
import { dividendCorrections, dividendEntries, dividendProblem, eventsBody, reinvestedShares, round2, type Currency } from '@/lib/ledger-entry'
import type { CorrectionInitial } from '@/lib/ledger-correction'
import type { DividendEvent } from '@/screens/portfolio/dividends'
import type { AccountType } from '@/types/user'

interface DividendFormArgs {
  account: AccountType
  ticker: string
  currency: Currency
  /** The shares held: the dividend is the amount per share times these. */
  shares?: number
  /** The reinvestment price to start with: the last close. */
  price?: number | null
  /** Correcting one dividend row: starts from it. */
  initial?: CorrectionInitial
}

/** Whether the account's dividends are reinvested: the starting answer of both forms. */
function useReinvests(account: AccountType): boolean {
  return useAccounts().data?.data.find((a) => a.account_type === account)?.reinvests_dividends ?? false
}

export function useDividendForm({ account, ticker, currency, shares: held = 0, price: lastClose, initial }: DividendFormArgs): LedgerForm {
  const [perShare, setPerShare] = useState('')
  const reinvests = useReinvests(account)
  const [dripChoice, setIsDrip] = useState<boolean | null>(null)
  const isDrip = dripChoice ?? reinvests
  const [dripPrice, setDripPrice] = useState(() => (lastClose != null ? lastClose.toFixed(2) : ''))
  const [boughtShares, setBoughtShares] = useState('')
  const [gross, setGross] = useState(() => (initial?.amount != null ? String(initial.amount) : ''))
  const [withholding, setWithholding] = useState(() => (initial?.withholding != null ? String(initial.withholding) : ''))
  const [common, setCommon] = useState<CommonValues>(() => (initial ? { date: initial.date, rate: initial.rate != null ? String(initial.rate) : '' } : initialCommon()))
  const rate = common.rate ? parseAmount(common.rate) : undefined

  if (initial) {
    const grossNum = parseAmount(gross)
    const withholdingNum = parseAmount(withholding)
    const rows = dividendEntries({ account, ticker, currency, gross: grossNum, withholding: withholdingNum, date: common.date, rate })
    const problem = grossNum > 0 ? dividendProblem({ gross: grossNum, withholding: withholdingNum }) : null
    const fields = (
      <div className="space-y-3">
        <DividendFields currency={currency} gross={gross} onGross={setGross} withholding={withholding} onWithholding={setWithholding} problem={problem} />
        <CommonFields values={common} onChange={setCommon} currency={currency} dateLabel="Payment date" />
      </div>
    )
    return { fields, body: rows ? eventsBody(rows) : null, currency }
  }

  const perShareNum = parseAmount(perShare)
  const total = round2(perShareNum * held)
  const dripPriceNum = parseAmount(dripPrice)
  const fullShares = reinvestedShares(total, dripPriceNum)
  const dripShares = boughtShares.trim() === '' ? fullShares : parseAmount(boughtShares)
  const reinvest = isDrip ? { shares: dripShares, price: dripPriceNum } : undefined
  const problem = reinvest && total > 0 ? dividendProblem({ gross: total, reinvest }) : null
  const rows = dividendEntries({
    account, ticker, currency,
    gross: total,
    date: common.date,
    reinvest,
    rate,
  }) // fmt: skip

  const fields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label={`Amount per share (${currency})`} value={perShare} onChange={(e) => setPerShare(e.target.value)} autoFocus />
        <CommonFields values={common} onChange={setCommon} currency={currency} dateLabel="Payment date" />
      </div>
      {total > 0 && (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Total dividend </span>
          <span className="font-medium">{formatMoney(total, currency)}</span>
          {isDrip && dripShares > 0 && <span className="text-muted-foreground"> · reinvests {dripShares} shares</span>}
        </p>
      )}
      <label className="flex cursor-pointer select-none items-center gap-2">
        <input type="checkbox" checked={isDrip} onChange={(e) => setIsDrip(e.target.checked)} className="rounded border-border" />
        <span className="text-sm">DRIP: reinvest as new shares</span>
      </label>
      {isDrip && (
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label={`Reinvestment price per share (${currency})`} value={dripPrice} onChange={(e) => setDripPrice(e.target.value)} />
          <NumberField label="Shares bought" value={boughtShares} placeholder={fullShares ? String(fullShares) : undefined} onChange={(e) => setBoughtShares(e.target.value)} />
        </div>
      )}
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  )

  return { fields, body: rows ? eventsBody(rows) : null, currency }
}

type ReinvestChoice = 'default' | 'yes' | 'no'

/** Confirming a dividend the system found: every figure is blank (the calculated one is shown as the placeholder) until typed over. */
export function useDividendDecisionForm(event: DividendEvent): LedgerForm {
  const currency: Currency = event.currency
  const [gross, setGross] = useState('')
  const [withholding, setWithholding] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [choice, setChoice] = useState<ReinvestChoice>('default')
  const [price, setPrice] = useState('')
  const [shares, setShares] = useState('')
  const [reinvestDate, setReinvestDate] = useState('')
  const reinvests = useReinvests(event.account_type)
  const reinvesting = choice === 'yes' || (choice === 'default' && reinvests)

  const typed = (v: string) => (v.trim() === '' ? undefined : parseAmount(v))
  const grossNum = typed(gross)
  const withholdingNum = typed(withholding)
  // The shares that spend the whole net dividend at the price shown; a corrected gross re-works the tax at the same rate.
  const netGross = grossNum ?? event.expected_gross
  const netTax = withholdingNum ?? (grossNum === undefined ? event.expected_withholding : round2(grossNum * (event.withholding_rate ?? 0)))
  const priceUsed = typed(price) ?? event.planned_reinvest_price ?? undefined
  const fullShares = reinvestedShares(round2(netGross - netTax), priceUsed ?? 0)
  // The API takes the price and the shares together or neither: typing one sends both.
  const overridden = reinvesting && (typed(price) !== undefined || typed(shares) !== undefined)
  const body = dividendCorrections({
    gross: grossNum,
    withholding: withholdingNum,
    paymentDate: paymentDate || undefined,
    reinvest: choice === 'default' ? null : choice === 'yes',
    reinvestShares: overridden ? (typed(shares) ?? fullShares) : undefined,
    reinvestPrice: overridden ? priceUsed : undefined,
    reinvestDate: reinvesting ? reinvestDate || undefined : undefined,
  })
  const problem = grossNum !== undefined && withholdingNum !== undefined ? dividendProblem({ gross: grossNum, withholding: withholdingNum }) : null

  const fields = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Leave a figure blank to keep the calculated one.</p>
      <DividendFields
        currency={currency}
        gross={gross}
        onGross={setGross}
        withholding={withholding}
        onWithholding={setWithholding}
        problem={problem}
        grossPlaceholder={String(event.expected_gross)}
        withholdingPlaceholder={String(event.expected_withholding)}
      />
      <div className="grid grid-cols-2 gap-3">
        <DateField label="Payment date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        <FormField label="Reinvestment">
          {(id) => (
            <NativeSelect id={id} value={choice} onChange={(e) => setChoice(e.target.value as ReinvestChoice)}>
              <option value="default">Use the account&rsquo;s setting ({reinvests ? 'reinvest' : 'keep as cash'})</option>
              <option value="yes">Reinvest</option>
              <option value="no">Do not reinvest</option>
            </NativeSelect>
          )}
        </FormField>
      </div>
      {reinvesting && (
        <>
          <ReinvestInputs
            currency={currency}
            price={price}
            onPrice={setPrice}
            shares={shares}
            onShares={setShares}
            pricePlaceholder={event.planned_reinvest_price != null ? String(event.planned_reinvest_price) : undefined}
            sharesPlaceholder={fullShares ? String(fullShares) : undefined}
          />
          <DateField label="Reinvestment date" value={reinvestDate} onChange={(e) => setReinvestDate(e.target.value)} />
        </>
      )}
    </div>
  )

  return { fields, body, currency }
}
