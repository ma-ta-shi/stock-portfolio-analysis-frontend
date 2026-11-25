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
import { REASON_LABELS } from '@/lib/labels'
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
}

export function CommonFields({ values, onChange, currency, before }: CommonFieldsProps) {
  const set = (patch: Partial<CommonValues>) => onChange({ ...values, ...patch })
  return (
    <div className="grid grid-cols-2 gap-3">
      {before}
      <DateField value={values.date} onChange={(e) => set({ date: e.target.value })} />
      {currency === 'USD' && (
        <NumberField
          label="Exchange rate (CAD per USD)"
          hint="Leave blank for the Bank of Canada rate of that day"
          placeholder="e.g. 1.37"
          value={values.rate}
          onChange={(e) => set({ rate: e.target.value })}
        />
      )}
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
      <FormField label="Notes (optional)" className="col-span-2">
        {(id) => <Input id={id} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </FormField>
    </div>
  )
}
