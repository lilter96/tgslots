import type { SimulationJsonReport } from '../../cli/formatter.js'
import { escapeHtml, escapeJson, formatPercent } from '../format.js'

export function renderRoundDistribution(report: SimulationJsonReport): string {
  const buckets = report.summary.roundWinDistribution.buckets
  const entries = Object.entries(buckets)
  if (entries.length === 0) return ''

  const legend = entries
    .map(
      ([bucket, value]) => `
        <div class="dist-row">
          <span class="label">${escapeHtml(bucket)}</span>
          <div class="bar-track"><div class="bar-fill" style="--bar-scale: ${value.ratio.toFixed(4)}"></div></div>
          <span class="count">${value.count.toLocaleString()} · ${formatPercent(value.ratio, 2)}</span>
        </div>
      `,
    )
    .join('')

  return `
    <section class="section fade-in" id="round-distribution">
      <header>
        <h2>Round Win Multiplier Distribution <small>round win ÷ bet, bucketed</small></h2>
      </header>
      <div data-chart="round-win-histogram" class="chart-tall"></div>
      <div class="dist-list">${legend}</div>
    </section>
  `
}

export function renderSpinTypeDonut(report: SimulationJsonReport): string {
  const buckets = report.summary.resultTypeDistribution?.buckets
  if (!buckets) return ''
  const entries = Object.entries(buckets)
  if (entries.length === 0) return ''

  const slices = entries.map(([k, v]) => ({ label: k.toUpperCase(), value: v.count }))

  return `
    <section class="section fade-in" id="spin-types">
      <header>
        <h2>Spin Type Mix <small>distribution of spin results across types</small></h2>
      </header>
      <div data-chart="spin-type-donut" data-slices='${escapeJson(slices)}' class="chart-tall"></div>
    </section>
  `
}
