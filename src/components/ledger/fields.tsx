/**
 * The form controls every ledger form is made of, so label, control, hint and error are wired the same way everywhere (they were
 * repeated about twenty times across the old dialogs): `NumberField`, `MoneyField`, `DateField`, and `CommonFields`, the four
 * inputs every entry shares (date, exchange rate for a US row, reason, notes).
 */
import type { ComponentProps, ReactNode } from 'react'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { NativeSelect } from '@/components/NativeSelect'
import { Input } from '@/components/ui/input'
import { localDateInputValue } from '@/lib/format'
import type { CommonValues } from '@/components/ledger/common-values'
import { ACCOUNT_LABELS, ACCOUNT_TYPES } from '@/lib/accounts'
import { REASON_LABELS } from '@/lib/labels'
import type { AccountType } from '@/types/user'
import type { Currency, ReasonCode } from '@/lib/ledger-entry'

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  className?: string
}

export function NumberField({ label, hint, error, className, ...input }: FieldProps & Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      {(id, describedBy) => (
        <Input id={id} type="number" inputMode="decimal" min="0" step="any" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      )}
    </FormField>
  )
}

export function MoneyField({ label, hint, error, className, ...input }: FieldProps & Omit<ComponentProps<typeof MoneyInput>, 'type'>) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      {(id, describedBy) => <MoneyInput id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />}
    </FormField>
  )
}

/** A day picker: the value is the `YYYY-MM-DD` string the API takes; the latest day is today. */
function DateField({ label = 'Transaction date', hint, error, className, ...input }: Partial<FieldProps> & Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      {(id, describedBy) => <Input id={id} type="date" max={localDateInputValue()} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />}
    </FormField>
  )
}

interface CommonFieldsProps {
  values: CommonValues
  onChange: (next: CommonValues) => void
  currency: Currency
  /** Fields that come first in the same grid (the form's own, for example the fees). */
  before?: ReactNode
  /** What the date is called ("Transaction date" by default; "As of" for an opening balance, "Payment date" for a dividend). */
  dateLabel?: string
  /** False where the entry takes no reason (a dividend). */
  showReason?: boolean
  /** False where the API never takes a rate (a conversion). A rate shows only for a US row. */
  showRate?: boolean
  /** True where the rate cannot be left blank (a US opening balance has no day to look one up for). */
  rateRequired?: boolean
}

export function CommonFields({ values, onChange, currency, before, dateLabel, showReason = true, showRate = true, rateRequired = false }: CommonFieldsProps) {
  const set = (patch: Partial<CommonValues>) => onChange({ ...values, ...patch })
  return (
    <div className="grid grid-cols-2 gap-3">
      {before}
      <DateField label={dateLabel} value={values.date} onChange={(e) => set({ date: e.target.value })} />
      {currency === 'USD' && showRate && (
        <NumberField
          label={rateRequired ? 'Exchange rate (CAD per USD), required' : 'Exchange rate (CAD per USD)'}
          hint={rateRequired ? 'Bought before the record began, so no day has a rate to look up' : 'Leave blank for the Bank of Canada rate of that day'}
          placeholder="e.g. 1.37"
          value={values.rate}
          onChange={(e) => set({ rate: e.target.value })}
        />
      )}
      {showReason && (
        <FormField label="Reason (optional)">
          {(id) => (
            <NativeSelect id={id} value={values.reason} onChange={(e) => set({ reason: e.target.value as ReasonCode | '' })}>
              <option value="">No reason given</option>
              {(Object.keys(REASON_LABELS) as ReasonCode[]).map((code) => (
                <option key={code} value={code}>
                  {REASON_LABELS[code]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      <FormField label="Notes (optional)" className="col-span-2">
        {(id) => <Input id={id} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </FormField>
    </div>
  )
}

/** The account choice every form that does not fix its account asks for. */
export function AccountField({ value, onChange }: { value: AccountType; onChange: (next: AccountType) => void }) {
  return (
    <FormField label="Account">
      {(id) => (
        <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACCOUNT_LABELS[type]}
            </option>
          ))}
        </NativeSelect>
      )}
    </FormField>
  )
}
