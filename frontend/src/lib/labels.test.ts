import { describe, expect, it } from 'vitest'
import { gainLossColor, TONE_TEXT } from './labels'

describe('gainLossColor', () => {
  it('uses the positive tone for gains and zero', () => {
    expect(gainLossColor(12)).toBe(TONE_TEXT.positive)
    expect(gainLossColor(0)).toBe(TONE_TEXT.positive)
  })
  it('uses the negative tone for losses', () => {
    expect(gainLossColor(-0.01)).toBe(TONE_TEXT.negative)
  })
  it('every tone has a dark-mode variant', () => {
    for (const tone of Object.values(TONE_TEXT)) expect(tone).toMatch(/\bdark:text-/)
  })
})
