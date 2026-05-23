import { describe, expect, it } from 'bun:test'

import { SCOPE_LABELS, humanizeName, metricDisplay, scopeLabel } from '../visualizer/labels.js'

describe('humanizeName', () => {
  it('converts kebab-case to Title Case', () => {
    expect(humanizeName('hello-world')).toBe('Hello World')
    expect(humanizeName('spin-win')).toBe('Spin Win')
  })

  it('handles single words', () => {
    expect(humanizeName('hello')).toBe('Hello')
  })

  it('handles empty segments', () => {
    expect(humanizeName('a--b')).toBe('A  B')
  })

  it('handles empty string', () => {
    expect(humanizeName('')).toBe('')
  })
})

describe('metricDisplay', () => {
  it('returns known metric labels', () => {
    const display = metricDisplay('rounds')
    expect(display.label).toBe('Rounds')
    expect(display.description).toBe('Total simulated rounds.')
    expect(display.format).toBe('count')
  })

  it('returns known metric with chart', () => {
    const display = metricDisplay('round-rtp')
    expect(display.label).toBe('Round RTP')
    expect(display.chart).toBe('gauge')
  })

  it('falls back to humanized name for unknown metrics', () => {
    const display = metricDisplay('my-custom-metric')
    expect(display.label).toBe('My Custom Metric')
    expect(display.chart).toBeUndefined()
  })

  it('all canonical metrics are defined', () => {
    const canonical = [
      'rounds',
      'round-rtp',
      'round-win-amount',
      'spins-per-round',
      'round-win-multiplier',
      'hits',
      'spins-played',
      'scatter-count',
      'spin-win',
      'triggers',
      'retriggers',
      'spins-awarded',
      'total-spins-per-trigger',
      'win',
      'scatter-win',
      'feature-rtp',
      'scatter-rtp',
      'session-win',
      'triggered-round-win',
      'results',
    ]
    for (const name of canonical) {
      const display = metricDisplay(name)
      expect(display.label).toBeTruthy()
    }
  })
})

describe('scopeLabel', () => {
  it('returns known scope labels', () => {
    expect(scopeLabel('base-game')).toBe('Base Game')
    expect(scopeLabel('free-spins')).toBe('Free Spins')
    expect(scopeLabel('spin-types')).toBe('Spin Type Mix')
    expect(scopeLabel('pick-bonus-base-game')).toBe('Pick Bonus (Base Trigger)')
    expect(scopeLabel('pick-bonus-free-game')).toBe('Pick Bonus (Free Retrigger)')
  })

  it('returns root label', () => {
    expect(scopeLabel('root')).toBe('Overall')
  })

  it('falls back to humanized name for unknown scopes', () => {
    expect(scopeLabel('my-scope')).toBe('My Scope')
  })

  it('all SCOPE_LABELS entries are defined', () => {
    for (const [, label] of Object.entries(SCOPE_LABELS)) {
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
