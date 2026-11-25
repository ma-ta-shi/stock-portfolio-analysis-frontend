/**
 * The Portfolio screen's server state. Everything is keyed by the owner's portfolio id (`usePortfolioId`), read through the
 * mappers in `lib/portfolio-mappers.ts`, and nothing here edits a cache by hand: a write that is not wired yet throws
 * `notConnected(gap)` so the dialog shows what is missing (the writes ticket, 86bd5z6mq, replaces each stub).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiFetch, apiQuery, getErrorMessage, jsonBody, notConnected } from '@/lib/api'
import { fillRoute, type LedgerRoute } from '@/lib/ledger-routes'
import type { EventPreview } from '@/screens/portfolio/preview'
import type { GapId } from '@/lib/gaps'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { localDateInputValue } from '@/lib/format'
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
import { useUser } from '@/context/UserContext'
import { usePortfolioId } from '@/hooks/use-portfolio-id'
import type { ListResponse, PortfolioOptimizerResult } from '@/types'
import type { components } from '@/types/openapi.gen'
import type { PortfolioAccountView, Transaction } from '@/types/portfolio'

type Api = components['schemas']
const DIR = '/mock-data/portfolio'
const ONE_PAGE = 20

function usePortfolioPath(): { id: string | null; path: (rest: string) => string } {
  const { portfolioId } = usePortfolioId()
  return { id: portfolioId, path: (rest) => `/api/portfolios/${portfolioId}${rest}` }
}

/** What the portfolio holds, valued at the latest recorded prices; the whole and each account, with the broker confirmations. */
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
  const positions = usePositions()
  // The confirmations come with the positions; a holding is still shown if they could not be read.
  const confirmations = positions.data?.confirmations
  const data = useMemo(() => (raw.data ? mapHoldings(raw.data, confirmations ?? []) : undefined), [raw.data, confirmations])
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

function useReport() {
  const { id, path } = usePortfolioPath()
  return useQuery({
    queryKey: queryKeys.portfolio.report(id ?? ''),
    enabled: !!id,
    queryFn: ({ signal }) =>
      apiQuery<Api['ReportResponse']>(`${DIR}/report.json`, path('/reports'), { preset: 'since_inception' }, { signal }),
  })
}

function useValueHistory(view: PortfolioAccountView) {
  const { id, path } = usePortfolioPath()
  const account = accountParam(view)
  return useQuery({
    queryKey: queryKeys.portfolio.history(id ?? '', view),
    enabled: !!id,
    queryFn: ({ signal }) => {
      const from = localDateInputValue(new Date(Date.now() - 30 * 86_400_000))
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

/** The Optimizer tab's suggestions (still the retired model; the Optimizer ticket, 86bd5z6n5, replaces it). */
export function usePortfolioOptimizer() {
  const { userId } = useUser()
  return useQuery({
    queryKey: queryKeys.portfolio.optimizer(userId),
    queryFn: ({ signal }) =>
      apiFetch<PortfolioOptimizerResult>(`/mock-data/portfolio/${userId}/optimizer.json`, `/api/portfolio/${userId}/optimizer`, { signal }),
  })
}

// --- Writes: not wired yet. Each raises the error the gap registry words (`lib/gaps.json`); the writes ticket replaces them.

/**
 * A write that is not wired yet: it takes the input the real call will take and raises the registered gap, so the dialog says what is
 * missing (the writes ticket, 86bd5z6mq, replaces each use with the real call).
 */
function notConnectedWrite<Input>(gap: GapId) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (_input: Input): Promise<never> => {
    throw notConnected(gap)
  }
}

export interface AddToPortfolioInput {
  stock: { stock_id: string; ticker: string }
  shares: number
  average_cost_basis: number
  account_type: string
}
export function useAddToPortfolio() {
  return useMutation({
    mutationFn: notConnectedWrite<AddToPortfolioInput>('P-W6'),
  })
}

/** What a ledger write sends: the path placeholders (`{id}`) and the JSON body, if any. */
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

export interface LogDividendInput {
  holdingId: string
  totalAmount: number
  amountPerShare: number
  paymentDate: string
  isDrip: boolean
  dripShares?: number
  dripPricePerShare?: number
}
export function useLogDividend() {
  return useMutation({
    mutationFn: notConnectedWrite<LogDividendInput>('P-W3'),
  })
}

export interface UpdatePositionInput {
  holdingId: string
  shares: number
  average_cost_basis: number
}
export function useUpdatePosition() {
  return useMutation({
    mutationFn: notConnectedWrite<UpdatePositionInput>('P-W4'),
  })
}

export function useRemoveFromPortfolio() {
  return useMutation({
    mutationFn: notConnectedWrite<string>('P-W5'),
  })
}

export function useCorrectTransaction() {
  return useMutation({
    mutationFn: notConnectedWrite<string>('P-W7'),
  })
}

export function useReverseTransaction() {
  return useMutation({
    mutationFn: notConnectedWrite<string>('P-W8'),
  })
}
