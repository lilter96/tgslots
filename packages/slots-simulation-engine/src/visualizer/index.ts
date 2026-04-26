import * as fs from 'node:fs'
import type { FinalMetricScope, FinalScopedMetric } from '../core/state-machine.js'
import type { SimulationJsonReport } from '../cli/formatter.js'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatValue(
  value: number | null,
  format: 'number' | 'percent' | 'multiplier' = 'number',
): string {
  if (value === null) return 'N/A'
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(4)}%`
    case 'multiplier':
      return `${value.toFixed(2)}x`
    case 'number':
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })
  }
}

function cell(label: string, value: string): string {
  return `<td><span class="field-label">${label}</span>${value}</td>`
}

function metricRows(metricName: string, metric: FinalScopedMetric): string {
  switch (metric.kind) {
    case 'count':
      return `
        <tr>
          <td>${escapeHtml(metricName)}</td><td>count</td>
          ${cell('total', metric.total.toLocaleString())}
          ${cell('rate', metric.rate.toFixed(4))}
          ${cell('cycle', metric.cycle === null ? 'N/A' : metric.cycle.toFixed(2))}
        </tr>
      `
    case 'value':
      return `
        <tr>
          <td>${escapeHtml(metricName)}</td><td>value</td>
          ${cell('avg', metric.average.toFixed(4))}
          ${cell('min', metric.min?.toString() ?? 'N/A')}
          ${cell('max', metric.max?.toString() ?? 'N/A')}
        </tr>
      `
    case 'payout':
      return `
        <tr>
          <td>${escapeHtml(metricName)}</td><td>payout</td>
          ${cell('avg', metric.average.toFixed(4))}
          ${cell('total', metric.total.toLocaleString())}
          ${cell('rtp', metric.ratio === null ? 'N/A' : metric.ratio.toFixed(4))}
        </tr>
      `
    case 'distribution': {
      const buckets = Object.entries(metric.buckets)
        .sort((a, b) => b[1].count - a[1].count)
        .map(
          ([bucket, value]) => `
            <div class="dist-row">
              <span>${escapeHtml(bucket)}</span>
              <div class="dist-bar"><i style="width:${(value.ratio * 100).toFixed(2)}%"></i></div>
              <span>${value.count.toLocaleString()} (${(value.ratio * 100).toFixed(2)}%)</span>
            </div>
          `,
        )
        .join('')

      return `
        <tr><td>${escapeHtml(metricName)}</td><td>distribution</td><td colspan="3">
          <div class="distribution">${buckets}</div>
        </td></tr>
      `
    }
  }
}

function renderScope(scope: FinalMetricScope, title = 'root'): string {
  const metricTableRows = Object.entries(scope.metrics)
    .map(([metricName, metric]) => metricRows(metricName, metric))
    .join('')

  const children = Object.entries(scope.scopes)
    .map(([childName, child]) => renderScope(child, child.path.join('/') || childName))
    .join('')

  return `
    <section class="scope-card">
      <h3>${escapeHtml(title)}</h3>
      ${
        metricTableRows
          ? `<table><thead><tr><th>Metric</th><th>Kind</th><th colspan="3">Values</th></tr></thead><tbody>${metricTableRows}</tbody></table>`
          : '<p class="muted">No direct metrics in this scope.</p>'
      }
      ${children}
    </section>
  `
}

function renderHtml(report: SimulationJsonReport): string {
  const comparisons = report.comparisons
    .map((comparison) => {
      const stateClass = comparison.passed === null ? 'info' : comparison.passed ? 'pass' : 'fail'
      const stateText = comparison.passed === null ? 'INFO' : comparison.passed ? 'PASS' : 'FAIL'
      return `
        <tr class="${stateClass}">
          <td>${escapeHtml(comparison.label)}</td>
          <td>${formatValue(comparison.actual, comparison.format)}</td>
          <td>${formatValue(comparison.expected, comparison.format)}</td>
          <td>${formatValue(comparison.delta, comparison.format)}</td>
          <td>${stateText}</td>
        </tr>
      `
    })
    .join('')

  const summaryCardEntries: Array<[string, string]> = [
    ['Rounds', report.summary.rounds.toLocaleString()],
    ['RTP', `${(report.summary.rtp * 100).toFixed(4)}%`],
    ['Total Bet', report.summary.totalBet.toLocaleString()],
    ['Total Win', report.summary.totalWin.toLocaleString()],
    ['Max Round Win', report.summary.maxRoundWin.toLocaleString()],
    ['StdDev', report.summary.variance.stdDev.toFixed(6)],
  ]
  const summaryCards = summaryCardEntries
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `,
    )
    .join('')

  const roundDistribution = Object.entries(report.summary.roundWinDistribution.buckets)
    .map(
      ([bucket, value]) => `
        <div class="dist-row">
          <span>${escapeHtml(bucket)}</span>
          <div class="dist-bar"><i style="width:${(value.ratio * 100).toFixed(2)}%"></i></div>
          <span>${value.count.toLocaleString()} (${(value.ratio * 100).toFixed(2)}%)</span>
        </div>
      `,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(report.meta.game)} Simulation Report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1e8;
        --panel: rgba(255, 252, 247, 0.9);
        --ink: #22201b;
        --muted: #645d51;
        --line: rgba(34, 32, 27, 0.12);
        --accent: #a24a2b;
        --accent-soft: #e8b599;
        --pass: #2d6a4f;
        --fail: #b42318;
        --info: #8a6f2a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, 'Iowan Old Style', serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(162, 74, 43, 0.18), transparent 28%),
          radial-gradient(circle at top right, rgba(88, 118, 89, 0.16), transparent 26%),
          linear-gradient(180deg, #f6efe3 0%, var(--bg) 100%);
      }
      main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 32px 20px 64px;
      }
      header {
        display: grid;
        gap: 8px;
        margin-bottom: 24px;
      }
      h1, h2, h3 {
        margin: 0;
        font-weight: 600;
      }
      h1 { font-size: clamp(2rem, 5vw, 3.4rem); }
      h2 { margin-bottom: 12px; font-size: 1.35rem; }
      .muted { color: var(--muted); }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }
      .summary-card, .section-card, .scope-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(50, 35, 16, 0.08);
      }
      .summary-card {
        padding: 16px 18px;
        display: grid;
        gap: 6px;
      }
      .summary-card span {
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      .summary-card strong {
        font-size: 1.3rem;
      }
      .section-card, .scope-card {
        padding: 18px;
        margin-bottom: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95rem;
      }
      th, td {
        padding: 10px 12px;
        text-align: left;
        border-top: 1px solid var(--line);
        vertical-align: top;
      }
      thead th { border-top: 0; color: var(--muted); }
      .field-label { color: var(--muted); font-size: 0.78em; margin-right: 4px; }
      .pass td:last-child { color: var(--pass); font-weight: 700; }
      .fail td:last-child { color: var(--fail); font-weight: 700; }
      .info td:last-child { color: var(--info); font-weight: 700; }
      .distribution {
        display: grid;
        gap: 8px;
      }
      .dist-row {
        display: grid;
        grid-template-columns: 120px minmax(120px, 1fr) 160px;
        gap: 10px;
        align-items: center;
      }
      .dist-bar {
        height: 10px;
        border-radius: 999px;
        background: rgba(162, 74, 43, 0.08);
        overflow: hidden;
      }
      .dist-bar i {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-soft));
      }
      .stack {
        display: grid;
        gap: 16px;
      }
      @media (max-width: 720px) {
        .dist-row {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="muted">Simulation dashboard</p>
        <h1>${escapeHtml(report.meta.game)}</h1>
        <p class="muted">
          ${(report.meta.wallMs / 1000).toFixed(2)}s wall time • ${report.meta.throughputMps.toFixed(
            2,
          )}M rounds/sec • ${report.meta.usPerSpin.toFixed(3)} µs/round
        </p>
      </header>

      <section class="summary-grid">
        ${summaryCards}
      </section>

      <section class="section-card">
        <h2>Comparison Against Reference</h2>
        ${
          comparisons
            ? `<table><thead><tr><th>Metric</th><th>Actual</th><th>Target</th><th>Delta</th><th>Status</th></tr></thead><tbody>${comparisons}</tbody></table>`
            : '<p class="muted">No comparison targets provided.</p>'
        }
      </section>

      <section class="section-card">
        <h2>Round Win Distribution</h2>
        <div class="distribution">${roundDistribution}</div>
      </section>

      <section class="stack">
        ${renderScope(report.scopes)}
      </section>
    </main>
  </body>
</html>`
}

export async function visualizeMetrics(
  report: SimulationJsonReport,
  outputPath: string,
): Promise<void> {
  fs.writeFileSync(outputPath, renderHtml(report), 'utf-8')
}
