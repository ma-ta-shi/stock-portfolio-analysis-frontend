/**
 * The Portfolio screen's server state. Everything is keyed by the owner's portfolio id (`usePortfolioId`), read through the
 * mappers in `lib/portfolio-mappers.ts`, and nothing here edits a cache by hand: a write goes through `useLedgerPreview` and
 * `useLedgerRecord`, which refresh every portfolio query once the server confirms.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiFetch, apiQuery, getErrorMessage, jsonBody, notConnected } from '@/lib/api'
import { fillRoute, type LedgerRoute } from '@/lib/ledger-routes'
import { mapDividendEvent, type ApiDividendEvent } from '@/screens/portfolio/dividends'
import type { EventPreview } from '@/screens/portfolio/preview'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { dayFromToday, localDateInputValue } from '@/lib/format'
import { queryKeys } from '@/lib/query-keys'
import {
  accountParam,
  buildSummary,
  mapHoldings,
  mapTransactions,
  type ApiHolding,
  type ApiPositions,
  type ApiTransaction,
} from '@/lib/portfolio-mappers'
import { transactionsQuery, type TransactionFilters } from '@/lib/transactions'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import type { ListResponse } from '@/types'
import type { components } from '@/types/openapi.gen'
import type { PortfolioAccountView, Transaction } from '@/types/portfolio'

type Api = components['schemas']
const DIR = '/mock-data/portfolio'
const ONE_PAGE = 20

function usePortfolioPath(): { id: string | null; path: (rest: string) => string } {
  const { portfolioId } = usePortfolioId()
  return { id: portfolioId, path: (rest) => `/api/portfolios/${portfolioId}${rest}` }
}

/** What the portfolio holds, valued at the latest recorded prices; the whole and each account. */
export function usePositions() {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.positions(id ?? ''),
    enabled: !!id,
    queryFn: ({ signal }) => apiFetch<ApiPositions>(`${DIR}/positions.json`, path('/positions'), { signal }),
  })
}

function useRawHoldings() {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.rawHoldings(id ?? ''),
    enabled: !!id,
    queryFn: ({ signal }) =>
      fetchAllPages<ApiHolding>(`${DIR}/holdings.json`, path('/holdings?include=snapshot&include=position&include_closed=true'), { signal }),
  })
}

/** Every holding, active and closed, with its position, price, changes and call: one request, mapped once. */
function useHoldingRows() {
  const raw = useRawHoldings()
  const data = useMemo(() => (raw.data ? mapHoldings(raw.data) : undefined), [raw.data])
  return { data, isLoading: raw.isLoading, isError: raw.isError, error: raw.error, refetch: raw.refetch }
}

/** Active holdings. */
export function usePortfolioHoldings() {
  const rows = useHoldingRows()
  const data = useMemo(() => rows.data?.filter((h) => h.is_active), [rows.data])
  return { ...rows, data }
}

/** Closed positions: holdings with no shares left, kept for their history. */
export function useClosedPositions() {
  const rows = useHoldingRows()
  const data = useMemo(() => rows.data?.filter((h) => !h.is_active), [rows.data])
  return { ...rows, data }
}

/** The report since inception, or for an inclusive range of days (mock mode serves the 30-day recording for any range). */
function useReport(range?: { start: string; end: string }) {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.report(id ?? '', range ? `${range.start}:${range.end}` : undefined),
    enabled: !!id,
    queryFn: ({ signal }) =>
      apiQuery<Api['ReportResponse']>(`${DIR}/${range ? 'report-30d' : 'report'}.json`, path('/reports'), range ?? { preset: 'since_inception' }, { signal }),
  })
}

/** Dividends received after tax in the last 30 days, in CAD, for the account shown (the report's own figure). */
export function useDividendsReceived(view: PortfolioAccountView) {
  const { data: report, isError } = useReport({ start: dayFromToday(-30), end: localDateInputValue() })
  const part = view === 'combined' ? report?.total : report?.accounts[view]
  return { data: report ? (part?.profit.dividends_net_cad ?? 0) : undefined, isError }
}

function useValueHistory(view: PortfolioAccountView) {
  const { id, path } = usePortfolioPath()
  const account = accountParam(view)
  return useQuery({
    queryKey: queryKeys.portfolio.history(id ?? '', view),
    enabled: !!id,
    queryFn: ({ signal }) => {
      const from = dayFromToday(-30)
      return apiFetch<Api['ValueHistoryResponse']>(
        `${DIR}/value-history.json`,
        path(`/value-history?from=${from}${account ? `&account_type=${account}` : ''}`),
        { signal },
      )
    },
  })
}

/** The accounts: cash, and the commission each charges per trade (the default fee of a purchase or a sale). */
export function useAccounts() {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.accounts(id ?? ''),
    enabled: !!id,
    queryFn: ({ signal }) => apiFetch<Api['AccountListResponse']>(`${DIR}/accounts.json`, path('/accounts'), { signal }),
  })
}

export function useRoom() {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.room(id ?? ''),
    enabled: !!id,
    retry: false, // 422 PROFILE_INCOMPLETE is an answer, not a glitch
    queryFn: ({ signal }) => apiFetch<Api['RoomResponse']>(`${DIR}/room.json`, path('/room'), { signal }),
  })
}

/**
 * What the portfolio holds by sector, industry and currency, each company directly and through funds, and its risk. The API has no
 * account filter yet (gap P-A2), so this is always the whole portfolio and the key says so.
 */
export function useExposure() {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.exposure(id ?? '', 'combined'),
    enabled: !!id,
    queryFn: ({ signal }) => apiFetch<Api['ExposureResponse']>(`${DIR}/exposure.json`, path('/exposure'), { signal }),
  })
}

/**
 * The header's figures for one scope (the whole portfolio or one account). Positions are required; the report, value history,
 * accounts and room are optional parts, and a part that fails is flagged `unavailable` instead of failing the header.
 */
export function usePortfolioSummary(view: PortfolioAccountView = 'combined') {
  const positions = usePositions()
  const report = useReport()
  const history = useValueHistory(view)
  const accounts = useAccounts()
  const room = useRoom()
  const settled = [report, history, accounts, room].every((q) => !q.isPending)
  const data = useMemo(
    () =>
      positions.data && settled
        ? buildSummary({
            view,
            positions: positions.data,
            report: report.data ?? null,
            history: history.data ?? null,
            accounts: accounts.data?.data ?? null,
            room: room.data ?? null,
            roomError: room.error ? getErrorMessage(room.error) : null,
          })
        : undefined,
    [positions.data, settled, view, report.data, history.data, accounts.data, room.data, room.error],
  )
  return {
    data,
    isLoading: positions.isLoading || (!!positions.data && !settled),
    isError: positions.isError,
    error: positions.error,
    refetch: () => {
      void positions.refetch()
      void report.refetch()
      void history.refetch()
      void accounts.refetch()
      void room.refetch()
    },
  }
}

/** One page of the ledger, filtered and ordered by the server; the previous page stays on screen while the next loads. */
export function useTransactions(filters: TransactionFilters, view: PortfolioAccountView, page: number) {
  const { id, path } = usePortfolioPath()
  const query = transactionsQuery(filters, view, { page, perPage: ONE_PAGE })
  const result = useQuery({
    queryKey: queryKeys.portfolio.transactions(id ?? '', query),
    enabled: !!id,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => apiFetch<ListResponse<ApiTransaction>>(`${DIR}/transactions.json`, path(`/transactions${query}`), { signal }),
  })
  const data = useMemo(() => (result.data ? { rows: mapTransactions(result.data.data), meta: result.data.meta } : undefined), [result.data])
  return { ...result, data }
}

/** Every row of the current filter, for the CSV export. */
export async function fetchAllTransactions(
  portfolioId: string,
  filters: TransactionFilters,
  view: PortfolioAccountView,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const query = transactionsQuery(filters, view)
  const rows = await fetchAllPages<ApiTransaction>(`${DIR}/transactions.json`, `/api/portfolios/${portfolioId}/transactions${query}`, { signal })
  return mapTransactions(rows)
}

/**
 * Every ledger row of a filter, for the Dividends tab and a stock's history.
 * shortcut: reads all pages at once, page it as the Transactions tab does if a history grows past a few hundred rows.
 */
export function useTransactionHistory(filters: TransactionFilters, view: PortfolioAccountView) {
  const { id } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.allTransactions(id ?? '', transactionsQuery(filters, view)),
    enabled: !!id,
    queryFn: ({ signal }) => fetchAllTransactions(id ?? '', filters, view, signal),
  })
}

/** The dividends the system found (waiting, confirmed and dismissed) in one request; the panel splits them by status. */
export function useDividends() {
  const { id, path } = usePortfolioPath()
  const result = useQuery({
    queryKey: queryKeys.portfolio.dividends(id ?? ''),
    enabled: !!id,
    queryFn: ({ signal }) => fetchAllPages<ApiDividendEvent>(`${DIR}/dividends.json`, path('/dividends'), { signal }),
  })
  const data = useMemo(() => result.data?.map(mapDividendEvent), [result.data])
  return { ...result, data }
}

// --- Writes: one preview hook and one record hook for every ledger route (lib/ledger-routes.ts).

export interface LedgerCall {
  params?: Record<string, string>
  body?: unknown
}

async function postLedger<T>(portfolioId: string | null, route: LedgerRoute, { params, body }: LedgerCall): Promise<T> {
  if (!portfolioId) throw new Error('No portfolio to write to')
  const apiPath = `/api/portfolios/${portfolioId}${fillRoute(route, params)}`
  // A write has no recorded file: mock mode refuses it with `mock_mode_unsupported` before any request.
  return apiFetch<T>(`${DIR}/ledger.json`, apiPath, jsonBody(route.method, body))
}

/**
 * What a ledger entry would do, worked out by the server and written nowhere: the position after, the cash, the realised gain, the
 * tax estimate, the room, the warnings. One hook for every preview route (`LEDGER.eventsPreview`, and in later PRs the correct, move
 * and dividend previews); the caller passes `{ params, body }`.
 */
export function useLedgerPreview(route: LedgerRoute) {
  const { id } = usePortfolioPath()
  return useMutation({ mutationFn: (call: LedgerCall) => postLedger<EventPreview>(id, route, call) })
}

/**
 * Records a ledger entry (or reverses, removes, ...: the route says which). When the server confirms it, every portfolio query is
 * refreshed; nothing is edited in the cache by hand and nothing is optimistic.
 */
export function useLedgerRecord<T = Api['RecordedEventsResponse']>(route: LedgerRoute) {
  const { id } = usePortfolioPath()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (call: LedgerCall) => postLedger<T>(id, route, call),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.all }),
  })
}

/** What the original Edit position dialog sends. */
export interface UpdatePositionInput {
  holdingId: string
  shares: number
  average_cost_basis: number
}

/** Editing a position is not connected: the ledger has no route that sets shares and average cost (gap P-W4). */
export function useUpdatePosition() {
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_input: UpdatePositionInput): Promise<never> => {
      throw notConnected('P-W4')
    },
  })
}
