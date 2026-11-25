/**
 * Every ledger write route, declared once. Each route is a `ledgerRoute` call with the method and the path as literal strings, so
 * `api-contract.test.ts` can read it and check it against the routes the backend serves (a path built inside a generic hook
 * would be invisible to that test). Paths are relative to `/api/portfolios/{portfolio_id}`; `{id}` and other `{name}`
 * placeholders are filled by `fillRoute`.
 */
export type LedgerMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface LedgerRoute {
  method: LedgerMethod
  path: string
}

export function ledgerRoute(method: LedgerMethod, path: string): LedgerRoute {
  return { method, path }
}

export const LEDGER = {
  eventsPreview: ledgerRoute('POST', '/events/preview'),
  events: ledgerRoute('POST', '/events'),
  remove: ledgerRoute('POST', '/holdings/{id}/remove'),
} as const

/** The route's path with its `{name}` placeholders replaced by `params`; a missing parameter is a bug, not an empty segment. */
export function fillRoute(route: LedgerRoute, params: Record<string, string> = {}): string {
  return route.path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined) throw new Error(`Route ${route.path} needs the parameter "${name}"`)
    return encodeURIComponent(value)
  })
}
