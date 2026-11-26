import { describe, expect, it } from 'vitest'
import { historyReturn, mapDrivers, mapFundamentals, mapHistory, predictionState, type ApiFundamentals, type ApiPrediction, type ApiRunSummary } from './stock-detail'
import runsFile from '../../public/mock-data/stocks/runs.json'
import predictionsFile from '../../public/mock-data/stocks/predictions.json'
import fundamentalsFile from '../../public/mock-data/stocks/fundamentals.json'

const stock = { stock_id: 's', ticker: 'RY.TO', name: 'Royal Bank', sector: 'Financials', exchange: 'TSX', currency: 'CAD' as const }
const rows = mapHistory(stock, runsFile.data as unknown as ApiRunSummary[], predictionsFile.data as unknown as ApiPrediction[])

describe('mapHistory', () => {
  it('joins each run with its prediction, with ratios as fractions and no invented price range', () => {
    const [latest, earlier] = rows
    expect(latest.checkpoints).toEqual([])
    expect(latest.priceAtAnalysis).toBeNull()
    expect(predictionState(latest)).toBeNull()
    expect(latest.call.analysis?.expectedReturn).toBeCloseTo(0.088)
    expect(latest.call.analysis?.rangeLow).toBeNull()
    expect(latest.returnLow).toBeCloseTo(-0.12)
    expect(earlier.priceAtAnalysis).toBe(95)
    expect(predictionState(earlier)).toBe('resolved')
  })

  it('takes the 3 month return, else the 1 month one', () => {
    expect(historyReturn(rows[1])).toBeCloseTo(0.064)
    const onlyOne = { ...rows[1], checkpoints: rows[1].checkpoints.map((c) => (c.interval === '3m' ? { ...c, resolved: false } : c)) }
    expect(historyReturn(onlyOne)).toBeCloseTo(0.025)
    expect(historyReturn(rows[0])).toBeNull()
  })
})

describe('the day of a past run', () => {
  // Tests run in America/Toronto: 02:30Z on the 25th is the evening of the 24th there.
  it("is the owner's day, not the UTC date", () => {
    const run = { ...(runsFile.data[0] as unknown as ApiRunSummary), completed_at: '2026-11-25T02:30:00Z' }
    expect(mapHistory(stock, [run], [])[0].call.analysis?.asOf).toBe('2026-11-24')
  })
})

describe('mapDrivers', () => {
  it('keeps what has a factor, from objects or older plain text, and ignores the rest', () => {
    expect(mapDrivers([{ factor: 'A', direction: 'bullish' }, 'B', { evidence: 'no factor' }, null])).toEqual([
      { factor: 'A', direction: 'bullish' },
      { factor: 'B', direction: null },
    ])
    expect(mapDrivers(null)).toEqual([])
  })
})

describe('mapFundamentals', () => {
  it('gives nothing when no analysis kept a bundle (the recorded seed)', () => {
    expect(mapFundamentals(fundamentalsFile as unknown as ApiFundamentals)).toBeUndefined()
  })

  // Built by hand to the API's shape: a stored bundle is a file the seed does not write.
  it('names each figure as the card reads it, leaving a missing one out rather than zero', () => {
    const full = {
      ...fundamentalsFile,
      run_id: 'r',
      valuation: { pe_ratio: 12.5, forward_pe: 11, pb_ratio: 1.8, ps_ratio: 3, peg_ratio: 1, ev_ebitda: null },
      profitability: { roe: 0.14, gross_margin: null, net_margin: 0.28, operating_margin: null, fcf_to_net_income: null, margin_trend: null },
      dividend: { dividend_yield: 0.035, payout_ratio: null },
      price: { current_price: 100, market_cap: 2e11, currency: 'CAD', high_52w: 120, low_52w: 80 },
    } as unknown as ApiFundamentals
    expect(mapFundamentals(full)).toMatchObject({ pe_ratio: 12.5, price_to_book: 1.8, roe: 0.14, net_margin: 0.28, dividend_yield_trailing: 0.035, week_52_high: 120 })
    expect(mapFundamentals(full)?.ev_ebitda).toBeUndefined()
    expect(mapFundamentals(full)?.gross_margin).toBeUndefined()
  })
})
