import * as fs from 'node:fs'
import type { SimulationJsonReport } from '../cli/formatter.js'
import { loadApexChartsBundle } from './assets.js'
import { CLIENT_SCRIPT } from './client.js'
import { escapeJson } from './format.js'
import { renderHero } from './sections/header.js'
import { renderKpis } from './sections/kpis.js'
import { renderRtpDonut } from './sections/rtp-donut.js'
import { renderComparisons } from './sections/comparisons.js'
import { renderRoundDistribution, renderSpinTypeDonut } from './sections/distribution.js'
import { renderScopes } from './sections/scopes.js'
import { renderToc } from './sections/toc.js'
import { STYLES } from './styles.js'
import { renderPage } from './template.js'

export function renderHtml(report: SimulationJsonReport): string {
  const scopes = renderScopes(report.scopes)
  const body = [
    renderHero(report),
    renderKpis(report),
    renderRtpDonut(report),
    renderComparisons(report),
    renderRoundDistribution(report),
    renderSpinTypeDonut(report),
    scopes.html,
  ]
    .filter(Boolean)
    .join('\n')

  return renderPage({
    title: `${report.meta.game} Simulation Report`,
    styles: STYLES,
    apexBundle: loadApexChartsBundle(),
    clientScript: CLIENT_SCRIPT,
    reportJson: escapeJson(report),
    toc: renderToc(scopes.toc),
    body,
  })
}

export async function visualizeMetrics(
  report: SimulationJsonReport,
  outputPath: string,
): Promise<void> {
  fs.writeFileSync(outputPath, renderHtml(report), 'utf-8')
}
