import { describe, expect, it } from 'bun:test'

import { Metrics, ModernDataCollector } from '../core/state-machine.js'
import { formatJson } from '../cli/formatter.js'
import { renderHero } from '../visualizer/sections/header.js'
import { renderKpis } from '../visualizer/sections/kpis.js'
import { renderComparisons } from '../visualizer/sections/comparisons.js'
import {
  renderRoundDistribution,
  renderSpinTypeDonut,
} from '../visualizer/sections/distribution.js'
import { renderRtpDonut } from '../visualizer/sections/rtp-donut.js'
import { renderScopes } from '../visualizer/sections/scopes.js'
import { renderToc } from '../visualizer/sections/toc.js'
import { renderHtml, visualizeMetrics } from '../visualizer/index.js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

function makeReport() {
  const collector = new ModernDataCollector()
  collector.beginRound(100)
  collector.collect({ type: 'BASE', win: 120 })
  collector.collect({ type: 'FREE', win: 30 })
  collector.endRound()
  collector.beginRound(100)
  collector.collect({ type: 'BASE', win: 0 })
  collector.endRound()

  const featScope = collector.scope(['features', 'free-spins'])
  featScope.count('triggers', 1)
  featScope.count('spins-played', 2)
  featScope.payout('spin-win', 30)
  featScope.rtp('feature-rtp', 30)

  const metrics = Metrics.finalize(collector.getRawMetrics())
  return formatJson(metrics, { bet: 100, targetRTP: 0.96 }, 'test-game', 1500)
}

describe('renderHero', () => {
  it('renders hero section with game name', () => {
    const html = renderHero(makeReport())
    expect(html).toContain('test-game')
    expect(html).toContain('Simulation Report')
    expect(html).toContain('overview')
    expect(html).toContain('theme-toggle')
  })

  it('includes meta stats', () => {
    const html = renderHero(makeReport())
    expect(html).toContain('Rounds')
    expect(html).toContain('Throughput')
    expect(html).toContain('Latency')
  })
})

describe('renderKpis', () => {
  it('renders KPI grid', () => {
    const html = renderKpis(makeReport())
    expect(html).toContain('kpi-grid')
    expect(html).toContain('kpis')
    expect(html).toContain('Total RTP')
    expect(html).toContain('Hit Frequency')
    expect(html).toContain('Volatility')
  })

  it('handles report with no rounds (zero totalSpinResults)', () => {
    const raw = Metrics.emptyRaw()
    const metrics = Metrics.finalize(raw)
    const report = formatJson(metrics, { bet: 100, targetRTP: 0.96 }, 'empty-game', 0)
    const html = renderKpis(report)
    expect(html).toContain('Total RTP')
    expect(html).toContain('kpi-grid')
  })
})

describe('renderComparisons', () => {
  it('renders comparison section with pass/fail counts', () => {
    const html = renderComparisons(makeReport())
    expect(html).toContain('Comparison Against Reference')
    expect(html).toContain('comparisons')
  })

  it('returns empty for report with no comparisons', () => {
    const collector = new ModernDataCollector()
    collector.beginRound(100)
    collector.collect({ type: 'BASE', win: 0 })
    collector.endRound()
    const metrics = Metrics.finalize(collector.getRawMetrics())
    const report = formatJson(metrics, { comparisons: [] }, 'test', 0)
    const html = renderComparisons(report)
    expect(html).toBe('')
  })
})

describe('renderRoundDistribution', () => {
  it('renders round win distribution', () => {
    const html = renderRoundDistribution(makeReport())
    expect(html).toContain('Round Win Multiplier Distribution')
    expect(html).toContain('round-win-histogram')
  })
})

describe('renderSpinTypeDonut', () => {
  it('renders spin type donut when buckets exist', () => {
    const html = renderSpinTypeDonut(makeReport())
    expect(html).toContain('Spin Type Mix')
    expect(html).toContain('spin-type-donut')
  })
})

describe('renderRtpDonut', () => {
  it('renders RTP composition', () => {
    const html = renderRtpDonut(makeReport())
    expect(html).toContain('RTP Composition')
    expect(html).toContain('rtp-donut')
  })

  it('returns empty string when no RTP slices', () => {
    const raw = Metrics.emptyRaw()
    const metrics = Metrics.finalize(raw)
    const report = formatJson(metrics, { bet: 100, targetRTP: 0.96 }, 'empty', 0)
    const html = renderRtpDonut(report)
    expect(html).toBe('')
  })
})

describe('renderScopes', () => {
  it('renders scoped metrics', () => {
    const report = makeReport()
    const { html, toc } = renderScopes(report.scopes)
    expect(html).toContain('Scoped Metrics')
    expect(html).toContain('scope')
    expect(toc.length).toBeGreaterThan(0)
    expect(toc[0]).toHaveProperty('id')
    expect(toc[0]).toHaveProperty('label')
    expect(toc[0]).toHaveProperty('depth')
  })

  it('shows Overall label for root scope', () => {
    const report = makeReport()
    const { html } = renderScopes(report.scopes)
    expect(html).toContain('Overall')
  })
})

describe('renderToc', () => {
  it('renders table of contents with fixed entries', () => {
    const html = renderToc([])
    expect(html).toContain('Overview')
    expect(html).toContain('KPIs')
    expect(html).toContain('RTP Composition')
    expect(html).toContain('Comparisons')
    expect(html).toContain('Round Distribution')
    expect(html).toContain('Spin Type Mix')
    expect(html).toContain('Scoped Metrics')
    expect(html).toContain('Sections')
  })

  it('includes scope entries from scopes TOC', () => {
    const html = renderToc([{ id: 'scope-features', label: 'Features', depth: 1 }])
    expect(html).toContain('Features')
    expect(html).toContain('depth-1')
  })

  it('clamps depth to max 2', () => {
    const html = renderToc([
      { id: 'deep', label: 'Deep', depth: 5 },
      { id: 'shallow', label: 'Shallow', depth: 0 },
      { id: 'mid', label: 'Mid', depth: 1 },
    ])
    expect(html).toContain('depth-1')
    expect(html).toContain('depth-0')
  })
})

describe('renderHtml', () => {
  it('renders full HTML with all sections', () => {
    const html = renderHtml(makeReport())
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('test-game')
    expect(html).toContain('overview')
  })
})

describe('visualizeMetrics', () => {
  it('writes HTML file to disk', () => {
    const tmpDir = os.tmpdir()
    const outputPath = path.join(tmpDir, `tgslots-test-${Date.now()}.html`)
    const report = makeReport()

    try {
      visualizeMetrics(report, outputPath)
      const content = fs.readFileSync(outputPath, 'utf-8')
      expect(content).toContain('<!doctype html>')
      expect(content).toContain('test-game')
    } finally {
      // Clean up
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
      }
    }
  })
})
