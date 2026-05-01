import type { FinalMetricScope, FinalScopedMetric } from '../../core/state-machine.js'
import { escapeHtml, escapeJson, formatNumber, formatPercent } from '../format.js'
import { metricDisplay, scopeLabel } from '../labels.js'

interface RenderedScope {
  id: string
  label: string
  depth: number
  html: string
}

const KIND_LABEL: Record<FinalScopedMetric['kind'], string> = {
  count: 'count',
  value: 'value',
  payout: 'payout',
  rtp: 'rtp',
  distribution: 'distribution',
}

function renderMetric(name: string, metric: FinalScopedMetric): string {
  const display = metricDisplay(name)
  const headerHtml = `
    <div class="metric-meta">
      <div class="metric-name">${escapeHtml(display.label)} <span class="kind-chip kind-${metric.kind}">${
        KIND_LABEL[metric.kind]
      }</span></div>
      <div class="metric-desc">${escapeHtml(display.description ?? `metric: ${name}`)}</div>
    </div>
  `

  switch (metric.kind) {
    case 'count': {
      const cycleLabel = metric.cycle === null ? 'N/A' : metric.cycle.toFixed(2)
      const ratePct = (metric.rate * 100).toFixed(2)
      const rateScale = Math.max(0, Math.min(1, metric.rate))
      return `
        <div class="metric fade-in">
          ${headerHtml}
          <div class="metric-viz">
            <div class="stat-row">
              <span><strong>${formatNumber(metric.total)}</strong>total</span>
              <span><strong>${ratePct}%</strong>rate</span>
              <span><strong>${cycleLabel}</strong>cycle</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="--bar-scale: ${rateScale.toFixed(4)}"></div></div>
          </div>
        </div>
      `
    }
    case 'value': {
      const payload = {
        min: metric.min ?? 0,
        average: metric.average,
        max: metric.max ?? 0,
      }
      return `
        <div class="metric fade-in">
          ${headerHtml}
          <div class="metric-viz">
            <div class="stat-row">
              <span><strong>${formatNumber(metric.average, 4)}</strong>avg</span>
              <span><strong>${metric.min === null ? 'N/A' : formatNumber(metric.min)}</strong>min</span>
              <span><strong>${metric.max === null ? 'N/A' : formatNumber(metric.max)}</strong>max</span>
              <span><strong>${formatNumber(metric.sum)}</strong>sum</span>
            </div>
            <div data-metric-chart="minmax" data-payload='${escapeJson(payload)}' class="chart-mini"></div>
          </div>
        </div>
      `
    }
    case 'payout': {
      const payload = {
        average: metric.average,
        total: metric.total,
        count: metric.count,
      }
      return `
        <div class="metric fade-in">
          ${headerHtml}
          <div class="metric-viz">
            <div class="stat-row">
              <span><strong>${formatNumber(metric.count)}</strong>count</span>
              <span><strong>${formatNumber(metric.average, 4)}</strong>avg</span>
              <span><strong>${formatNumber(metric.total)}</strong>total</span>
              <span><strong>${metric.min === null ? 'N/A' : formatNumber(metric.min)}</strong>min</span>
              <span><strong>${metric.max === null ? 'N/A' : formatNumber(metric.max)}</strong>max</span>
            </div>
            <div data-metric-chart="bar" data-payload='${escapeJson(payload)}' class="chart-mini"></div>
          </div>
        </div>
      `
    }
    case 'rtp': {
      const payload = {
        ratio: metric.ratio ?? 0,
        label: display.label,
      }
      const ratioText = metric.ratio === null ? 'N/A' : formatPercent(metric.ratio, 4)
      return `
        <div class="metric fade-in">
          ${headerHtml}
          <div class="metric-viz">
            <div class="stat-row">
              <span><strong>${formatNumber(metric.count)}</strong>events</span>
              <span><strong>${formatNumber(metric.total)}</strong>total</span>
              <span><strong>${ratioText}</strong>ratio</span>
            </div>
            <div data-metric-chart="gauge" data-payload='${escapeJson(payload)}' class="chart-gauge"></div>
          </div>
        </div>
      `
    }
    case 'distribution': {
      const payload = { buckets: metric.buckets }
      const top = Object.entries(metric.buckets)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
        .map(
          ([k, v]) => `
            <div class="dist-row">
              <span class="label">${escapeHtml(k)}</span>
              <div class="bar-track"><div class="bar-fill" style="--bar-scale: ${v.ratio.toFixed(4)}"></div></div>
              <span class="count">${formatNumber(v.count)} · ${formatPercent(v.ratio, 2)}</span>
            </div>
          `,
        )
        .join('')
      return `
        <div class="metric fade-in">
          ${headerHtml}
          <div class="metric-viz">
            <div data-metric-chart="distribution" data-payload='${escapeJson(payload)}' class="chart"></div>
            <div class="dist-list">${top}</div>
          </div>
        </div>
      `
    }
  }
}

function scopeIdFromPath(path: string[]): string {
  if (path.length === 0) return 'scope-root'
  return 'scope-' + path.join('-').replaceAll('/', '-').toLowerCase()
}

function renderScope(
  scope: FinalMetricScope,
  name: string,
  depth: number,
  out: RenderedScope[],
): void {
  const path = scope.path
  const isRoot = path.length === 0
  const id = scopeIdFromPath(path)
  const label = isRoot ? 'Overall' : scopeLabel(name)
  const displayPath = isRoot ? '' : path.join(' / ')
  const metricCount = Object.keys(scope.metrics).length
  const childCount = Object.keys(scope.scopes).length

  const metricsHtml = Object.entries(scope.metrics)
    .map(([metricName, metric]) => renderMetric(metricName, metric))
    .join('')

  const html = `
    <details class="scope fade-in" id="${id}" ${depth <= 1 ? 'open' : ''}>
      <summary>
        <div>
          <div>${escapeHtml(label)}${
            displayPath ? ` <span class="scope-path">/${escapeHtml(displayPath)}</span>` : ''
          }</div>
          <div class="badge">${metricCount} metric${metricCount === 1 ? '' : 's'}${
            childCount > 0 ? ` · ${childCount} child${childCount === 1 ? '' : 'ren'}` : ''
          }</div>
        </div>
        <span class="chevron" aria-hidden="true"></span>
      </summary>
      <div class="scope-body">
        ${metricsHtml || '<p class="lead">No direct metrics in this scope.</p>'}
      </div>
    </details>
  `

  out.push({ id, label: displayPath || label, depth, html })

  for (const [childName, child] of Object.entries(scope.scopes)) {
    renderScope(child, childName, depth + 1, out)
  }
}

export function renderScopes(rootScope: FinalMetricScope): {
  html: string
  toc: { id: string; label: string; depth: number }[]
} {
  const collected: RenderedScope[] = []
  renderScope(rootScope, 'root', 0, collected)
  const html = `
    <section class="section fade-in" id="scopes">
      <header>
        <h2>Scoped Metrics <small>collapsible breakdown by scope</small></h2>
      </header>
      <div style="display: grid; gap: 14px;">
        ${collected.map((c) => c.html).join('')}
      </div>
    </section>
  `
  return {
    html,
    toc: collected.map((c) => ({ id: c.id, label: c.label, depth: c.depth })),
  }
}
