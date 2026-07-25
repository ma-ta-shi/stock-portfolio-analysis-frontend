import { useMutation } from '@tanstack/react-query'

export interface TickerResult {
  ticker: string
  name: string
  exchange: string
  sector: string
  currency: 'CAD' | 'USD'
  stock_id: string
}

const KNOWN_TICKERS: TickerResult[] = [
  { ticker: 'RY.TO', name: 'Royal Bank of Canada', exchange: 'TSX', sector: 'Financials', currency: 'CAD', stock_id: 'stk_ry_to' },
  { ticker: 'TD.TO', name: 'Toronto-Dominion Bank', exchange: 'TSX', sector: 'Financials', currency: 'CAD', stock_id: 'stk_td_to' },
  { ticker: 'BMO.TO', name: 'Bank of Montreal', exchange: 'TSX', sector: 'Financials', currency: 'CAD', stock_id: 'stk_bmo_to' },
  { ticker: 'BNS.TO', name: 'Bank of Nova Scotia', exchange: 'TSX', sector: 'Financials', currency: 'CAD', stock_id: 'stk_bns_to' },
  { ticker: 'CM.TO', name: 'CIBC', exchange: 'TSX', sector: 'Financials', currency: 'CAD', stock_id: 'stk_cm_to' },
  { ticker: 'WSP.TO', name: 'WSP Global Inc.', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', stock_id: 'stk_wsp_to' },
  { ticker: 'CNR.TO', name: 'Canadian National Railway', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', stock_id: 'stk_cnr_to' },
  { ticker: 'CP.TO', name: 'Canadian Pacific Kansas City', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', stock_id: 'stk_cp_to' },
  { ticker: 'ATD.TO', name: 'Alimentation Couche-Tard', exchange: 'TSX', sector: 'Consumer Staples', currency: 'CAD', stock_id: 'stk_atd_to' },
  { ticker: 'SU.TO', name: 'Suncor Energy', exchange: 'TSX', sector: 'Energy', currency: 'CAD', stock_id: 'stk_su_to' },
  { ticker: 'ENB.TO', name: 'Enbridge Inc.', exchange: 'TSX', sector: 'Energy', currency: 'CAD', stock_id: 'stk_enb_to' },
  { ticker: 'BCE.TO', name: 'BCE Inc.', exchange: 'TSX', sector: 'Communication Services', currency: 'CAD', stock_id: 'stk_bce_to' },
  { ticker: 'SHOP.TO', name: 'Shopify Inc.', exchange: 'TSX', sector: 'Technology', currency: 'CAD', stock_id: 'stk_shop_to' },
  { ticker: 'MFC.TO', name: 'Manulife Financial', exchange: 'TSX', sector: 'Financials', currency: 'CAD', stock_id: 'stk_mfc_to' },
  { ticker: 'TRI.TO', name: 'Thomson Reuters', exchange: 'TSX', sector: 'Industrials', currency: 'CAD', stock_id: 'stk_tri_to' },
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD', stock_id: 'stk_aapl' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD', stock_id: 'stk_msft' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD', stock_id: 'stk_googl' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary', currency: 'USD', stock_id: 'stk_amzn' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology', currency: 'USD', stock_id: 'stk_nvda' },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', exchange: 'NYSE', sector: 'Financials', currency: 'USD', stock_id: 'stk_brk_b' },
  { ticker: 'JPM', name: 'JPMorgan Chase', exchange: 'NYSE', sector: 'Financials', currency: 'USD', stock_id: 'stk_jpm' },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Financials', currency: 'USD', stock_id: 'stk_v' },
]

async function lookupTicker(query: string): Promise<TickerResult | null> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  const q = query.trim().toUpperCase()
  if (!q) return null
  return (
    KNOWN_TICKERS.find((t) => t.ticker.toUpperCase() === q) ??
    KNOWN_TICKERS.find((t) => t.name.toUpperCase().includes(q)) ??
    null
  )
}

export function useTickerSearch() {
  return useMutation({ mutationFn: lookupTicker })
}
