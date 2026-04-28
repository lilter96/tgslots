import type { FinalMetricScope, FinalScopedMetric } from '../../core/state-machine.js'
import type { SimulationJsonReport } from '../../cli/formatter.js'
import { escapeHtml, escapeJson, formatPercent } from '../format.js'
import { metricDisplay, scopeLabel } from '../labels.js'

interface Slice {
  label: string
  value: number
  path: string
}

function collect(scope: FinalMetricScope, slices: Slice[], pathLabels: string[] = []): void {
  for (const [name, metric] of Object.entries(scope.metrics)) {
    const m: FinalScopedMetric = metric
    if (m.kind === 'rtp' && m.ratio !== null && m.ratio > 0 && name !== 'round-rtp') {
      const display = metricDisplay(name)
      const scopeName = pathLabels.length === 0 ? 'Overall' : pathLabels.join(' / ')
      slices.push({
        label: `${scopeName} · ${display.label}`,
        value: m.ratio,
        path: [...pathLabels, name].join('/'),
      })
    }
  }
  for (const [childName, child] of Object.entries(scope.scopes)) {
    collect(child, slices, [...pathLabels, scopeLabel(childName)])
  }
}

export function renderRtpDonut(report: SimulationJsonReport): string {
  const slices: Slice[] = []
  collect(report.scopes, slices)

  if (slices.length === 0) {
    return ''
  }

  const totalAccounted = slices.reduce((s, x) => s + x.value, 0)
  const remainder = report.summary.rtp - totalAccounted
  if (remainder > 1e-6) {
    slices.push({ label: 'Other', value: remainder, path: 'other' })
  }

  const slicesPercent = slices.map((s) => ({ label: s.label, value: s.value * 100 }))

  const legend = slices
    .map(
      (s) => `
        <div class="dist-row">
          <span class="label">${escapeHtml(s.label)}</span>
          <div class="bar-track"><div class="bar-fill" style="--bar-scale: ${(
            s.value / Math.max(0.0001, report.summary.rtp)
          ).toFixed(4)}"></div></div>
          <span class="count">${formatPercent(s.value, 2)}</span>
        </div>
      `,
    )
    .join('')

  return `
    <section class="section fade-in" id="rtp-composition">
      <header>
        <h2>RTP Composition <small>partition of total RTP across scopes</small></h2>
      </header>
      <div class="split">
        <div data-chart="rtp-donut" data-slices='${escapeJson(slicesPercent)}' class="chart-tall"></div>
        <div class="dist-list">${legend}</div>
      </div>
    </section>
  `
}
