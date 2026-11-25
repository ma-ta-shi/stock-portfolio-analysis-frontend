/**
 * The form of a cash entry (contribution, withdrawal, fee, interest, conversion): holds what was typed and returns the fields to draw and
 * the `events` body they make (`null` until valid). Built by `cashEntry` in `lib/ledger-entry.ts`.
 */
import { useState } from 'react'
import { initialCommon, type CommonValues, type LedgerForm } from '@/components/ledger/common-values'
import { AccountField, CommonFields, MoneyField } from '@/components/ledger/fields'
import { FormField } from '@/components/FormField'
import { NativeSelect } from '@/components/NativeSelect'
import { parseAmount } from '@/lib/format'
import { cashEntry, eventsBody, type CashKind, type Currency } from '@/lib/ledger-entry'
import { TX_TYPE_LABELS } from '@/lib/labels'
import type { AccountType } from '@/types/user'

export const CASH_KINDS: CashKind[] = ['contribution', 'withdrawal', 'fee', 'interest', 'conversion']

export function useCashForm(defaultAccount: AccountType = 'tfsa'): LedgerForm {
  const [account, setAccount] = useState<AccountType>(defaultAccount)
  const [kind, setKind] = useState<CashKind>('contribution')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('CAD')
  const [counterAmount, setCounterAmount] = useState('')
  const [common, setCommon] = useState<CommonValues>(initialCommon)

  const conversion = kind === 'conversion'
  const counterCurrency: Currency = currency === 'CAD' ? 'USD' : 'CAD'

  const entry = cashEntry({
    kind,
    account,
    amount: parseAmount(amount),
    currency,
    date: common.date,
    counter: conversion ? { currency: counterCurrency, amount: parseAmount(counterAmount) } : undefined,
    rate: common.rate ? parseAmount(common.rate) : undefined,
    reason: common.reason,
    notes: common.notes,
  })

  const fields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <AccountField value={account} onChange={setAccount} />
        <FormField label="Type">
          {(id) => (
            <NativeSelect id={id} value={kind} onChange={(e) => setKind(e.target.value as CashKind)}>
              {CASH_KINDS.map((k) => (
                <option key={k} value={k}>
                  {TX_TYPE_LABELS[k]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <MoneyField label={conversion ? 'Amount converted' : 'Amount'} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <FormField label="Currency">
          {(id) => (
            <NativeSelect id={id} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </NativeSelect>
          )}
        </FormField>
        {conversion && <MoneyField label={`Amount received (${counterCurrency})`} value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} />}
      </div>
      <CommonFields values={common} onChange={setCommon} currency={currency} showRate={!conversion} />
    </div>
  )

  return { fields, body: entry ? eventsBody([entry]) : null, currency }
}
