import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useUser } from '@/context/UserContext'
import type { PortfolioSummary, PortfolioHoldingsResponse, PortfolioOptimizerResult, Holding, TransactionsResponse, Transaction, ClosedPosition } from '@/types'
import type { TickerResult } from './use-ticker-search'

// Cache key helper — keeps mutation updaters in sync with the query
const holdingsCacheKey = (userId: string) => ['portfolio', 'holdings', userId]

export function usePortfolioSummary() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'summary', userId],
    queryFn: () =>
      apiFetch<PortfolioSummary>(
        `/mock-data/portfolio/${userId}/summary.json`,
        `/api/portfolio/${userId}/summary`,
      ),
  })
}

export function usePortfolioHoldings() {
  const { userId } = useUser()
  return useQuery({
    queryKey: holdingsCacheKey(userId),
    queryFn: async () => {
      const res = await apiFetch<PortfolioHoldingsResponse>(
        `/mock-data/portfolio/${userId}.json`,
        `/api/portfolio/${userId}`,
      )
      return res.data
    },
  })
}

export function usePortfolioOptimizer() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'optimizer', userId],
    queryFn: () =>
      apiFetch<PortfolioOptimizerResult>(
        `/mock-data/portfolio/${userId}/optimizer.json`,
        `/api/portfolio/${userId}/optimizer`,
      ),
  })
}

interface AddToPortfolioInput {
  stock: TickerResult
  shares: number
  average_cost_basis: number
  account_type: string
}

export function useAddToPortfolio() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ stock, shares, average_cost_basis, account_type }: AddToPortfolioInput): Promise<Holding> => {
      const now = new Date().toISOString()
      return {
        holding_id: `h_${Date.now()}`,
        user_id: userId,
        stock: {
          stock_id: stock.stock_id,
          ticker: stock.ticker,
          name: stock.name,
          sector: stock.sector,
          exchange: stock.exchange,
          currency: stock.currency,
        },
        account_type,
        shares,
        average_cost_basis,
        current_price: average_cost_basis,
        market_value: shares * average_cost_basis,
        total_gain_loss: 0,
        total_gain_loss_pct: 0,
        day_change: 0,
        day_change_pct: 0,
        stock_outlook: 'neutral',
        confidence_score: 0,
        disagreement_score: 0,
        disagreement_label: 'low',
        last_analyzed_at: now,
        annual_dividend_per_share: 0,
        annual_dividend_yield: 0,
        yield_on_cost: 0,
        added_at: now,
        last_updated: now,
      }
    },
    onSuccess: (newHolding) => {
      queryClient.setQueryData<Holding[]>(holdingsCacheKey(userId), (old) => {
        if (!old) return [newHolding]
        return [...old, newHolding]
      })
    },
  })
}

export function useRemoveFromPortfolio() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (holdingId: string) => holdingId,
    onSuccess: (holdingId) => {
      queryClient.setQueryData<Holding[]>(holdingsCacheKey(userId), (old) => {
        if (!old) return old
        return old.filter((h) => h.holding_id !== holdingId)
      })
    },
  })
}

export function useTransactions() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'transactions', userId],
    queryFn: async () => {
      const res = await apiFetch<TransactionsResponse>(
        `/mock-data/portfolio/${userId}/transactions.json`,
        `/api/portfolio/${userId}/transactions`,
      )
      return res.data
    },
  })
}

export function useClosedPositions() {
  const { userId } = useUser()
  return useQuery({
    queryKey: ['portfolio', 'closed', userId],
    queryFn: () =>
      apiFetch<ClosedPosition[]>(
        `/mock-data/portfolio/${userId}/closed.json`,
        `/api/portfolio/${userId}/closed`,
      ),
  })
}

interface BuySharesInput {
  holdingId: string
  shares: number
  pricePerShare: number
  fees: number
  transactionDate: string
}

export function useBuyShares() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BuySharesInput) => input,
    onSuccess: ({ holdingId, shares, pricePerShare, fees, transactionDate }) => {
      const holdings = queryClient.getQueryData<Holding[]>(holdingsCacheKey(userId))
      const holding = holdings?.find((h) => h.holding_id === holdingId)
      if (!holding) return

      const newTotalShares = holding.shares + shares
      // Book cost does not include fees (fees are expensed, not capitalized)
      const newBookCost = holding.shares * holding.average_cost_basis + shares * pricePerShare
      const newAvgCost = newBookCost / newTotalShares
      const market_value = newTotalShares * holding.current_price
      const total_gain_loss = market_value - newBookCost

      queryClient.setQueryData<Holding[]>(holdingsCacheKey(userId), (old) => {
        if (!old) return old
        return old.map((h) => {
          if (h.holding_id !== holdingId) return h
          return {
            ...h,
            shares: newTotalShares,
            average_cost_basis: newAvgCost,
            market_value,
            total_gain_loss,
            total_gain_loss_pct: newBookCost > 0 ? total_gain_loss / newBookCost : 0,
            yield_on_cost: h.annual_dividend_per_share > 0 ? h.annual_dividend_per_share / newAvgCost : 0,
            transaction_count: (h.transaction_count ?? 0) + 1,
            last_updated: new Date().toISOString(),
          }
        })
      })

      const newTx: Transaction = {
        transaction_id: `txn_${Date.now()}`,
        holding_id: holdingId,
        user_id: userId,
        stock: holding.stock,
        account_type: holding.account_type,
        transaction_type: 'buy',
        shares,
        price_per_share: pricePerShare,
        total_amount: pricePerShare * shares,
        fees,
        currency: holding.stock.currency,
        transaction_date: transactionDate,
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<Transaction[]>(['portfolio', 'transactions', userId], (old) => {
        return old ? [newTx, ...old] : [newTx]
      })
    },
  })
}

interface SellPositionInput {
  holdingId: string
  shares: number
  pricePerShare: number
  fees: number
  transactionDate: string
}

export function useSellPosition() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SellPositionInput) => input,
    onSuccess: ({ holdingId, shares, pricePerShare, fees, transactionDate }) => {
      const holdings = queryClient.getQueryData<Holding[]>(['portfolio', 'holdings', userId])
      const holding = holdings?.find((h) => h.holding_id === holdingId)
      if (!holding) return

      const realizedGainLoss = (pricePerShare - holding.average_cost_basis) * shares - fees
      const newShares = holding.shares - shares
      const isClosed = newShares <= 0

      // Update holdings cache
      queryClient.setQueryData<Holding[]>(['portfolio', 'holdings', userId], (old) => {
        if (!old) return old
        if (isClosed) {
          return old.filter((h) => h.holding_id !== holdingId)
        }
        return old.map((h) => {
          if (h.holding_id !== holdingId) return h
          const market_value = newShares * h.current_price
          const book_cost = newShares * h.average_cost_basis
          const total_gain_loss = market_value - book_cost
          return {
            ...h,
            shares: newShares,
            market_value,
            total_gain_loss,
            total_gain_loss_pct: book_cost > 0 ? total_gain_loss / book_cost : 0,
            total_realized_gain_loss: (h.total_realized_gain_loss ?? 0) + realizedGainLoss,
            transaction_count: (h.transaction_count ?? 0) + 1,
            last_updated: new Date().toISOString(),
          }
        })
      })

      // Add to closed positions cache if fully sold
      if (isClosed) {
        const newClosed: ClosedPosition = {
          holding_id: holdingId,
          stock: holding.stock,
          account_type: holding.account_type,
          total_shares_bought: holding.shares,
          avg_buy_price: holding.average_cost_basis,
          total_shares_sold: holding.shares,
          avg_sell_price: pricePerShare,
          total_realized_gain_loss: realizedGainLoss,
          total_realized_gain_loss_pct: realizedGainLoss / (holding.average_cost_basis * holding.shares),
          first_buy_date: holding.added_at,
          last_sell_date: transactionDate,
        }
        queryClient.setQueryData<ClosedPosition[]>(['portfolio', 'closed', userId], (old) => {
          return old ? [newClosed, ...old] : [newClosed]
        })
      }

      // Add to transactions cache
      const newTx: Transaction = {
        transaction_id: `txn_${Date.now()}`,
        holding_id: holdingId,
        user_id: userId,
        stock: holding.stock,
        account_type: holding.account_type,
        transaction_type: 'sell',
        shares: -shares,
        price_per_share: pricePerShare,
        total_amount: pricePerShare * shares,
        fees,
        currency: holding.stock.currency,
        transaction_date: transactionDate,
        cost_basis_at_sell: holding.average_cost_basis,
        realized_gain_loss: realizedGainLoss,
        realized_gain_loss_pct: realizedGainLoss / (holding.average_cost_basis * shares),
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<Transaction[]>(['portfolio', 'transactions', userId], (old) => {
        return old ? [newTx, ...old] : [newTx]
      })
    },
  })
}

interface UpdatePositionInput {
  holdingId: string
  shares: number
  average_cost_basis: number
}

export function useUpdatePosition() {
  const { userId } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdatePositionInput) => input,
    onSuccess: ({ holdingId, shares, average_cost_basis }) => {
      queryClient.setQueryData<Holding[]>(holdingsCacheKey(userId), (old) => {
        if (!old) return old
        return old.map((h) => {
          if (h.holding_id !== holdingId) return h
          const market_value = shares * h.current_price
          const book_cost = shares * average_cost_basis
          const total_gain_loss = market_value - book_cost
          return {
            ...h,
            shares,
            average_cost_basis,
            market_value,
            total_gain_loss,
            total_gain_loss_pct: book_cost > 0 ? total_gain_loss / book_cost : 0,
            yield_on_cost: h.annual_dividend_per_share > 0 ? h.annual_dividend_per_share / average_cost_basis : 0,
            last_updated: new Date().toISOString(),
          }
        })
      })
    },
  })
}
