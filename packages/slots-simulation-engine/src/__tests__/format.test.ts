import { describe, expect, it } from 'bun:test'

import {
  escapeHtml,
  escapeJson,
  formatByDisplay,
  formatMultiplier,
  formatNumber,
  formatPercent,
  formatSigned,
} from '../visualizer/format.js'

describe('escapeHtml', () => {
  it('escapes special HTML characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
    expect(escapeHtml("it's")).toBe('it&#39;s')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('returns safe text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})

describe('escapeJson', () => {
  it('escapes HTML-like characters in JSON', () => {
    const result = escapeJson({ key: '<value>' })
    expect(result).toContain('\\u003c')
    expect(result).toContain('\\u003e')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('returns valid JSON', () => {
    const obj = { a: 1, b: 'hello' }
    const result = escapeJson(obj)
    expect(() => JSON.parse(result)).not.toThrow()
    expect(JSON.parse(result)).toEqual(obj)
  })

  it('handles arrays', () => {
    const result = escapeJson([1, 2, 3])
    expect(JSON.parse(result)).toEqual([1, 2, 3])
  })
})

describe('formatNumber', () => {
  it('formats integers with locale formatting', () => {
    const result = formatNumber(1234567)
    expect(result).toContain('1')
    expect(result).toContain('567')
  })

  it('returns N/A for null', () => {
    expect(formatNumber(null)).toBe('N/A')
  })

  it('returns N/A for NaN', () => {
    expect(formatNumber(NaN)).toBe('N/A')
  })

  it('returns N/A for Infinity', () => {
    expect(formatNumber(Infinity)).toBe('N/A')
  })

  it('returns N/A for -Infinity', () => {
    expect(formatNumber(-Infinity)).toBe('N/A')
  })

  it('handles zero', () => {
    expect(formatNumber(0)).not.toBe('N/A')
  })
})

describe('formatPercent', () => {
  it('formats as percentage', () => {
    expect(formatPercent(0.5)).toBe('50.0000%')
  })

  it('returns N/A for null', () => {
    expect(formatPercent(null)).toBe('N/A')
  })

  it('returns N/A for non-finite values', () => {
    expect(formatPercent(NaN)).toBe('N/A')
    expect(formatPercent(Infinity)).toBe('N/A')
  })

  it('respects custom fractionDigits', () => {
    expect(formatPercent(0.5, 2)).toBe('50.00%')
  })
})

describe('formatMultiplier', () => {
  it('formats as multiplier with x suffix', () => {
    expect(formatMultiplier(3.5)).toBe('3.50x')
  })

  it('returns N/A for null', () => {
    expect(formatMultiplier(null)).toBe('N/A')
  })

  it('returns N/A for non-finite values', () => {
    expect(formatMultiplier(NaN)).toBe('N/A')
    expect(formatMultiplier(Infinity)).toBe('N/A')
  })
})

describe('formatSigned', () => {
  it('adds + prefix for positive values', () => {
    expect(formatSigned(5, 'number')).toMatch(/^\+/)
  })

  it('no + prefix for zero or negative values', () => {
    expect(formatSigned(-5, 'number')).toMatch(/^-/)
    expect(formatSigned(0, 'number')).not.toMatch(/^\+/)
  })

  it('returns N/A for null', () => {
    expect(formatSigned(null, 'number')).toBe('N/A')
  })

  it('returns N/A for non-finite values', () => {
    expect(formatSigned(NaN, 'number')).toBe('N/A')
  })

  it('formats percent type', () => {
    const result = formatSigned(0.05, 'percent')
    expect(result).toContain('%')
    expect(result).toMatch(/^\+/)
  })

  it('formats multiplier type', () => {
    const result = formatSigned(2, 'multiplier')
    expect(result).toContain('x')
    expect(result).toMatch(/^\+/)
  })

  it('formats number type (default)', () => {
    const result = formatSigned(10, 'number')
    expect(result).toMatch(/^\+/)
  })
})

describe('formatByDisplay', () => {
  it('returns N/A for null', () => {
    expect(formatByDisplay(null)).toBe('N/A')
  })

  it('returns N/A for non-finite values', () => {
    expect(formatByDisplay(NaN)).toBe('N/A')
  })

  it('formats percent display', () => {
    const result = formatByDisplay(0.5, 'percent')
    expect(result).toContain('%')
  })

  it('formats multiplier display', () => {
    const result = formatByDisplay(5, 'multiplier')
    expect(result).toContain('x')
  })

  it('formats cycle display', () => {
    const result = formatByDisplay(3.14159, 'cycle')
    expect(result).toBe('3.14')
  })

  it('formats rate display', () => {
    const result = formatByDisplay(0.12345, 'rate')
    expect(result).toBe('0.1235')
  })

  it('falls back to formatNumber for unknown display', () => {
    expect(formatByDisplay(42)).not.toBe('N/A')
  })

  it('falls back to formatNumber for count display', () => {
    expect(formatByDisplay(1000, 'count')).not.toBe('N/A')
  })
})
