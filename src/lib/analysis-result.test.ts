import { describe, expect, it } from 'vitest'
import { mapAgents, type ApiResult } from './analysis-result'
import { mapResultCall } from './stock-snapshot'
import fixture from '../../public/mock-data/stocks/result.json'

const result = fixture as unknown as ApiResult
const outputs = (list: unknown[]) => list as ApiResult['agent_outputs']

describe('mapAgents', () => {
  it('keeps an agent that did not finish, with nothing in its sections', () => {
    const [agent] = mapAgents(outputs([{ agent_name: 'bear', status: 'failed', structured_output: null, narrative: null }]))
    expect(agent).toMatchObject({ name: 'Bear Advocate', completed: false, confidence: null, findings: [], risks: [], caseRisks: [], strongest: null })
  })

  it('leaves out the shadow CIO and the retired agents of old runs', () => {
    const old = outputs(['shadow_cio', 'tax', 'cio_stage_b', 'cio'].map((agent_name) => ({ agent_name, status: 'completed', structured_output: {} })))
    expect(mapAgents(old)).toEqual([])
  })

  it('keeps only the risks that are written in words, and reads the envelope narrative when the output has none', () => {
    const [agent] = mapAgents(
      outputs([{ agent_name: 'FUND', status: 'completed', narrative: 'From the envelope.', structured_output: { risks: [{ severity: 'high' }, null, { risk: 'Debt' }] } }]),
    )
    expect(agent.risks).toEqual([{ risk: 'Debt', severity: null }])
    expect(agent.findings).toEqual(['From the envelope.'])
  })
})

describe('mapAgents: an advocate', () => {
  it('keeps its thesis risks apart from the risks to the stock', () => {
    const [bear] = mapAgents(outputs([{ agent_name: 'bear', status: 'completed', structured_output: { thesis_risks: [{ risk: 'Growth beats', severity: 'high' }] } }]))
    expect(bear.risks).toEqual([])
    expect(bear.caseRisks).toEqual([{ risk: 'Growth beats', severity: 'high' }])
  })
})

describe('mapResultCall', () => {
  it("reads the band's return as the whole percent it is", () => {
    const call = mapResultCall({ ...result, price_band: { ...result.price_band!, expected_total_return_pct: 6.5 } }, result.stock!)
    expect(call.analysis?.expectedReturn).toBeCloseTo(0.065)
    expect(call.status).toBe('usable')
  })

  it('leaves target and range empty for a run without a band', () => {
    const call = mapResultCall({ ...result, price_band: null }, result.stock!)
    expect(call.analysis).toMatchObject({ targetPrice: null, rangeLow: null, rangeHigh: null, expectedReturn: null })
  })
})
