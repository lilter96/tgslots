import type { ComparisonResult } from '../../cli/comparison.js'
import type { SimulationJsonReport } from '../../cli/formatter.js'
import { escapeHtml, formatNumber, formatPercent, formatSigned } from '../format.js'

const CATEGORY_LABELS: Record<string, string> = {
  rtp: 'RTP & Ratios',
  cycle: 'Cycles',
  average: 'Averages',
  distribution: 'Distributions',
  count: 'Counts',
}

function formatActual(value: number | null, format: ComparisonResult['format']): string {
  if (value === null) return 'N/A'
  if (format === 'percent') return formatPercent(value, 4)
  if (format === 'multiplier') return value.toFixed(2) + 'x'
  return formatNumber(value)
}

function describeSource(source: ComparisonResult['source']): string {
  if (source.kind === 'summary') return `summary.${source.key}`
  return [source.scope.join('/'), source.metric, source.field ?? 'total'].join(' · ')
}

function bandPositions(c: ComparisonResult): { lo: number; hi: number; actualLeft: number } {
  if (c.tolerance && c.expected !== 0) {
    const tol = c.tolerance.value
    const span =
      c.tolerance.type === 'absolute'
        ? Math.max(Math.abs(tol), Math.abs(c.expected) * 0.0001) * 2.5
        : Math.abs(c.expected) * tol * 2.5
    const min = c.expected - span
    const max = c.expected + span
    const range = max - min || 1
    const ratio = (v: number) => ((v - min) / range) * 100
    const lo = ratio(
      c.expected - (c.tolerance.type === 'absolute' ? tol : Math.abs(c.expected) * tol),
    )
    const hi = ratio(
      c.expected + (c.tolerance.type === 'absolute' ? tol : Math.abs(c.expected) * tol),
    )
    const actualLeft = c.actual === null ? 50 : Math.max(0, Math.min(100, ratio(c.actual)))
    return { lo, hi, actualLeft }
  }
  return { lo: 0, hi: 100, actualLeft: 50 }
}

function renderRow(c: ComparisonResult): string {
  const stateClass = c.passed === null ? 'info' : c.passed ? 'pass' : 'fail'
  const stateText = c.passed === null ? 'INFO' : c.passed ? 'PASS' : 'FAIL'
  const { lo, hi, actualLeft } = bandPositions(c)

  const tolerance = c.tolerance
    ? c.tolerance.type === 'absolute'
      ? `± ${formatNumber(c.tolerance.value)}`
      : `± ${(c.tolerance.value * 100).toFixed(2)}%`
    : 'no tolerance'

  return `
    <article class="comparison ${stateClass} fade-in"
      style="--lo: ${lo.toFixed(2)}%; --hi: ${hi.toFixed(2)}%; --actual-left: ${actualLeft.toFixed(2)}%;">
      <div class="meta">
        <span class="label">${escapeHtml(c.label)} <span class="pill ${stateClass}">${stateText}</span></span>
        <span class="desc">${escapeHtml(c.description ?? `Target ${formatActual(c.expected, c.format)} · tolerance ${tolerance}`)}</span>
        <span class="source">${escapeHtml(describeSource(c.source))}</span>
      </div>
      <div class="band">
        <div class="target"></div>
        <div class="actual"></div>
      </div>
      <div class="stats">
        <span><strong>${formatActual(c.actual, c.format)}</strong></span>
        <span class="delta">${formatSigned(c.delta, c.format)}${
          c.relativeDelta !== null && c.format !== 'percent'
            ? ` (${formatSigned(c.relativeDelta, 'percent')})`
            : ''
        }</span>
      </div>
    </article>
  `
}

export function renderComparisons(report: SimulationJsonReport): string {
  if (!report.comparisons.length) return ''

  const groups = new Map<string, ComparisonResult[]>()
  for (const c of report.comparisons) {
    const key = c.category ?? 'count'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  const order = ['rtp', 'cycle', 'average', 'distribution', 'count']
  const groupHtml = order
    .map((k) => {
      const items = groups.get(k)
      if (!items?.length) return ''
      return `
        <div class="comparison-group">
          <h3>${escapeHtml(CATEGORY_LABELS[k] ?? k)}</h3>
          ${items.map(renderRow).join('')}
        </div>
      `
    })
    .join('')

  const passed = report.comparisons.filter((c) => c.passed === true).length
  const failed = report.comparisons.filter((c) => c.passed === false).length
  const info = report.comparisons.filter((c) => c.passed === null).length

  return `
    <section class="section fade-in" id="comparisons">
      <header>
        <h2>Comparison Against Reference</h2>
        <div style="display:flex; gap:8px;">
          <span class="pill pass">${passed} pass</span>
          <span class="pill fail">${failed} fail</span>
          ${info > 0 ? `<span class="pill info">${info} info</span>` : ''}
        </div>
      </header>
      ${groupHtml}
    </section>
  `
}
