import type { SimulationJsonReport } from '../../cli/formatter.js'
import { escapeHtml } from '../format.js'

export function renderHero(report: SimulationJsonReport): string {
  const { meta, summary } = report
  const wallS = (meta.wallMs / 1000).toFixed(2)
  return `
    <section class="hero" id="overview">
      <div class="hero-row">
        <div>
          <p class="hero-eyebrow">Simulation Report</p>
          <h1>${escapeHtml(meta.game)}</h1>
          <div class="hero-meta">
            <span>Rounds <strong>${summary.rounds.toLocaleString()}</strong></span>
            <span>Wall Time <strong>${wallS}s</strong></span>
            <span>Throughput <strong>${meta.throughputMps.toFixed(2)}M/s</strong></span>
            <span>Latency <strong>${meta.usPerSpin.toFixed(2)}µs/round</strong></span>
          </div>
        </div>
        <button class="theme-toggle" data-theme-toggle aria-label="Toggle color theme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Theme
        </button>
      </div>
    </section>
  `
}
