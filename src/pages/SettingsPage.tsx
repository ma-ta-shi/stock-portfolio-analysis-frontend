import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { DiscardChangesDialog } from '@/components/DiscardChangesDialog'
import { FormField } from '@/components/FormField'
import { MoneyInput } from '@/components/MoneyInput'
import { QueryError } from '@/components/QueryError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccounts, useRoom } from '@/hooks/use-portfolio'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import { useOrderSettingsSchema, useSaveSettings } from '@/hooks/use-settings'
import { useUserProfile } from '@/hooks/use-user-profile'
import { ApiError } from '@/lib/api'
import { fieldText } from '@/lib/fields'
import { formatDate, localDateInputValue } from '@/lib/format'
import { notConnectedMessage } from '@/lib/gaps'
import { TONE_TEXT } from '@/lib/labels'
import {
  PROFILE_INPUTS,
  accountInputs,
  inputError,
  ruleInput,
  savedValue,
  type OptimizerSettings,
  type Profile,
  type SettingInput,
  type Values,
} from '@/lib/settings-form'
import { setUnsaved } from '@/lib/unsaved'
import { cn } from '@/lib/utils'
import { ROOM_FIELDS } from '@/screens/portfolio/summary'
import { TAX_FIELDS, YEAR_FIELDS } from '@/screens/settings'

const ACCOUNTS = ['tfsa', 'rrsp', 'trading'] as const
const [ROOM_TODAY] = ROOM_FIELDS

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  )
}

/** A figure the page only shows. */
function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

interface FieldsProps {
  value: (input: SettingInput) => string
  set: (input: SettingInput, value: string) => void
}

function Editor({ input, value, set, note }: FieldsProps & { input: SettingInput; note?: string }) {
  const current = value(input)
  const error = inputError(input, current)
  const hint = note ?? input.hint
  return (
    <FormField label={input.label} hint={hint} error={error ?? undefined}>
      {(id, describedBy) => {
        const shared = { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined }
        if (input.kind === 'boolean') {
          return <input {...shared} type="checkbox" className="block h-4 w-4" checked={current === 'true'} onChange={(e) => set(input, String(e.target.checked))} />
        }
        const Control = input.kind === 'money' ? MoneyInput : Input
        return (
          <Control
            {...shared}
            // text, not number: a number input reports "12e" as blank, and blank clears the stored value
            type="text"
            inputMode={input.kind === 'text' ? undefined : 'decimal'}
            placeholder={input.placeholder}
            value={current}
            onChange={(e) => set(input, e.target.value)}
          />
        )
      }}
    </FormField>
  )
}

const grid = 'grid gap-3 sm:grid-cols-2'

export function SettingsPage() {
  const profile = useUserProfile()
  const owner = usePortfolioId()
  const accounts = useAccounts()
  const room = useRoom()
  const schema = useOrderSettingsSchema()
  const save = useSaveSettings()
  // only what the owner has typed; everything else shows the stored value
  const [edits, setEdits] = useState<Values>({})

  const today = localDateInputValue()
  const year = Number(today.slice(0, 4))
  const settings = (owner.portfolio?.settings ?? {}) as OptimizerSettings
  const stored = { profile: profile.data as Profile, accounts: accounts.data?.data ?? [], settings }
  const rules = (schema.data?.settings ?? []).map(ruleInput)
  const hasPortfolio = !!owner.portfolio
  const inputs = [
    ...(profile.data ? Object.values(PROFILE_INPUTS) : []),
    ...(profile.data && accounts.data ? ACCOUNTS.flatMap(accountInputs) : []),
    ...(profile.data && hasPortfolio ? rules : []),
  ]
  const saved = (input: SettingInput) => savedValue(input, stored, year)
  const value = (input: SettingInput) => edits[input.key] ?? saved(input)
  const changes = inputs.filter((i) => value(i) !== saved(i)).map((input) => ({ input, value: value(input) }))
  const dirty = changes.length > 0
  const invalid = changes.some((c) => inputError(c.input, c.value))
  const fields: FieldsProps = {
    value,
    set: (input, next) => {
      if (!save.isPending) save.reset()
      setEdits((e) => ({ ...e, [input.key]: next }))
    },
  }

  const blocker = useBlocker(dirty)
  useEffect(() => {
    setUnsaved(dirty)
    if (!dirty) return () => setUnsaved(false)
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      setUnsaved(false)
    }
  }, [dirty])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!dirty || invalid || save.isPending) return
    save.mutate({ changes, today }, {
      // what was saved now shows the server's value; what was refused stays typed
      onSuccess: ({ saved: keys }) => setEdits((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !keys.includes(key)))),
    })
  }

  const noPortfolio = <p role="status" className="text-sm text-muted-foreground">You have no portfolio yet. {notConnectedMessage('P-R1')}</p>
  const portfolioError = <QueryError what="portfolio" error={owner.error} onRetry={owner.refetch} compact />
  // the server names the profile figures room lacks; asking again would not change that
  const roomIncomplete = room.error instanceof ApiError && room.error.code === 'PROFILE_INCOMPLETE'

  const entered = (day: string | null | undefined) =>
    `What you had on a day you know. Saving a new figure dates it today, and anything dated that day or earlier counts as already in it. ${day ? `Entered on ${formatDate(day)}.` : 'Not entered yet.'}`

  function roomAccount(account: 'tfsa' | 'rrsp', p: Profile) {
    const figures = room.data?.accounts[account]
    const label = account.toUpperCase()
    return (
      <div role="group" aria-label={`${label} room`} className="space-y-2">
        <h3 className="text-sm font-medium">{label}</h3>
        {figures && (
          <div>
            {YEAR_FIELDS.map((spec) => (
              <Figure key={spec.id} label={spec.label} value={fieldText(spec, figures)} />
            ))}
            <Figure label="Room left today" value={`${fieldText(ROOM_TODAY, figures)}${figures.estimated ? ' (estimated)' : ''}`} />
          </div>
        )}
        <div className={grid}>
          {account === 'tfsa' ? (
            <Editor {...fields} input={PROFILE_INPUTS.tfsa_room_remaining} note={entered(p.tfsa_room_as_of)} />
          ) : (
            <>
              <Editor {...fields} input={PROFILE_INPUTS.rrsp_room_remaining} note={entered(p.rrsp_room_as_of)} />
              <Editor {...fields} input={PROFILE_INPUTS.rrsp_annual_contribution_cap} />
              <Editor {...fields} input={PROFILE_INPUTS.rrsp_claimed_amount} />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      {profile.isLoading && <div className="h-48 rounded-lg bg-muted animate-pulse" />}
      {profile.isError && <QueryError what="your profile" error={profile.error} onRetry={profile.refetch} />}
      {profile.data && (
        <form onSubmit={submit} noValidate>
          <fieldset disabled={save.isPending} className="space-y-4 min-w-0">
          <Card title="Profile">
            <Editor {...fields} input={PROFILE_INPUTS.display_name} />
            <p className="text-xs text-muted-foreground font-mono break-all">{profile.data.user_id}</p>
          </Card>

          <Card title="Tax & Income">
            <div>
              {TAX_FIELDS.map((spec) => (
                <Figure key={spec.id} label={spec.label} value={fieldText(spec, profile.data)} />
              ))}
            </div>
            <div className={grid}>
              <Editor {...fields} input={PROFILE_INPUTS.income_annual} />
              <Editor {...fields} input={PROFILE_INPUTS.marginal_tax_rate_override_pct} />
            </div>
          </Card>

          <Card title="Contribution Room">
            {owner.isEmpty && noPortfolio}
            {owner.isError && portfolioError}
            {room.isError && <QueryError what="contribution room" error={room.error} onRetry={roomIncomplete ? undefined : room.refetch} compact />}
            {roomAccount('tfsa', profile.data)}
            {roomAccount('rrsp', profile.data)}
          </Card>

          <Card title="Position Sizing">
            <div className={grid}>
              <Editor {...fields} input={PROFILE_INPUTS.max_position_size_pct} />
              <Editor {...fields} input={PROFILE_INPUTS.max_sector_weight_pct} />
            </div>
          </Card>

          <Card title="Accounts">
            {owner.isEmpty && noPortfolio}
            {owner.isError && portfolioError}
            {accounts.isError && <QueryError what="accounts" error={accounts.error} onRetry={accounts.refetch} compact />}
            {accounts.data &&
              ACCOUNTS.map((account) => (
                <div key={account} role="group" aria-label={`${account.toUpperCase()} account`} className="space-y-2">
                  <h3 className="text-sm font-medium">{account.toUpperCase()}</h3>
                  <div className={grid}>
                    {accountInputs(account).map((input) => (
                      <Editor key={input.key} {...fields} input={input} />
                    ))}
                  </div>
                </div>
              ))}
          </Card>

          <Card title="Optimizer Rules">
            <p className="text-xs text-muted-foreground">Blank uses the default.</p>
            {owner.isEmpty && noPortfolio}
            {owner.isError && portfolioError}
            {schema.isError && <QueryError what="optimizer rules" error={schema.error} onRetry={schema.refetch} compact />}
            {hasPortfolio && (
              <div className={grid}>
                {rules.map((input) => (
                  <Editor key={input.key} {...fields} input={input} />
                ))}
              </div>
            )}
          </Card>

          <div className="sticky bottom-0 bg-background border-t border-border py-3 space-y-2">
            {save.data?.failed.map((f) => (
              <p key={f.label} role="alert" className="text-sm text-destructive">
                {f.label} was not saved. {f.message}
              </p>
            ))}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!dirty || invalid || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              <Button type="button" variant="outline" disabled={!dirty || save.isPending} onClick={() => setEdits({})}>
                Discard
              </Button>
              <p role="status" className={cn('text-sm', invalid ? 'text-destructive' : save.data && !save.data.failed.length ? TONE_TEXT.positive : 'text-muted-foreground')}>
                {invalid ? 'Fix the marked values to save.' : dirty ? 'You have unsaved changes.' : save.data && !save.data.failed.length ? 'Saved.' : ''}
              </p>
            </div>
          </div>
          </fieldset>
        </form>
      )}
      <DiscardChangesDialog open={blocker.state === 'blocked'} onStay={() => blocker.reset?.()} onDiscard={() => blocker.proceed?.()} />
    </div>
  )
}
