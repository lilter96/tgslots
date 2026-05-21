import type { MetricDisplay } from './labels.js'

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function escapeJson<T>(value: T): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')
}

export function formatNumber(value: number | null, fractionDigits = 4): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits })
}

export function formatPercent(value: number | null, fractionDigits = 4): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `${(value * 100).toFixed(fractionDigits)}%`
}

export function formatMultiplier(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  return `${value.toFixed(2)}x`
}

export function formatSigned(
  value: number | null,
  format: 'number' | 'percent' | 'multiplier',
): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  const sign = value > 0 ? '+' : ''
  if (format === 'percent') return `${sign}${(value * 100).toFixed(4)}%`
  if (format === 'multiplier') return `${sign}${value.toFixed(2)}x`
  return `${sign}${formatNumber(value)}`
}

export function formatByDisplay(value: number | null, display?: MetricDisplay['format']): string {
  if (value === null || !Number.isFinite(value)) return 'N/A'
  switch (display) {
    case 'percent':
      return formatPercent(value, 2)
    case 'multiplier':
      return formatMultiplier(value)
    case 'cycle':
      return value.toFixed(2)
    case 'rate':
      return value.toFixed(4)
    default:
      return formatNumber(value)
  }
}
