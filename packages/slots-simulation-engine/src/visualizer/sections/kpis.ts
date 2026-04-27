import type { SimulationJsonReport } from '../../cli/formatter.js'
import { escapeHtml, escapeJson } from '../format.js'

interface Kpi {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  glow?: string
  spark?: number[]
  sparkColor?: string
}

function sparkFromBuckets(report: SimulationJsonReport): number[] {
  const buckets = report.summary?.roundWinDistribution?.buckets
  if (!buckets) return [0]
  return Object.values(buckets).map((b) => b.count)
}

export function renderKpis(report: SimulationJsonReport): string {
  const { summary } = report
  const totalSpins = summary.totalSpinResults || summary.rounds
  const winningRounds = summary.rounds - (summary.roundWinDistribution.buckets['0x']?.count ?? 0)
  const hitFreq = summary.rounds > 0 ? winningRounds / summary.rounds : 0
  const spark = sparkFromBuckets(report)

  const cards: Kpi[] = [
    {
      label: 'Total RTP',
      value: summary.rtp * 100,
      suffix: '%',
      decimals: 2,
      glow: 'rgba(99, 102, 241, 0.30)',
      spark,
      sparkColor: '#818cf8',
    },
    {
      label: 'Hit Frequency',
      value: hitFreq * 100,
      suffix: '%',
      decimals: 2,
      glow: 'rgba(192, 132, 252, 0.30)',
      spark,
      sparkColor: '#c084fc',
    },
    {
      label: 'Volatility (σ)',
      value: summary.variance.stdDev,
      decimals: 4,
      glow: 'rgba(217, 70, 239, 0.30)',
      spark,
      sparkColor: '#d946ef',
    },
    {
      label: 'Max Win × Bet',
      value: summary.maxRoundWinMultiplier,
      suffix: 'x',
      decimals: 2,
      glow: 'rgba(56, 189, 248, 0.28)',
      spark,
      sparkColor: '#38bdf8',
    },
    {
      label: 'Total Bet',
      value: summary.totalBet,
      decimals: 0,
      glow: 'rgba(52, 211, 153, 0.26)',
      spark,
      sparkColor: '#34d399',
    },
    {
      label: 'Total Win',
      value: summary.totalWin,
      decimals: 0,
      glow: 'rgba(251, 191, 36, 0.28)',
      spark,
      sparkColor: '#fbbf24',
    },
    {
      label: 'Spin Results',
      value: totalSpins,
      decimals: 0,
      glow: 'rgba(244, 114, 182, 0.28)',
      spark,
      sparkColor: '#f472b6',
    },
    {
      label: 'Avg Round Win',
      value: summary.averageRoundWin,
      decimals: 2,
      glow: 'rgba(129, 140, 248, 0.28)',
      spark,
      sparkColor: '#818cf8',
    },
  ]

  const html = cards
    .map((k) => {
      const sparkAttrs = k.spark
        ? `<div class="kpi-spark" data-spark='${escapeJson(k.spark)}' data-spark-color="${escapeHtml(
            k.sparkColor ?? '#818cf8',
          )}"></div>`
        : ''
      return `
        <article class="kpi fade-in" style="--kpi-glow: ${escapeHtml(k.glow ?? 'rgba(129,140,248,0.30)')}">
          <div class="kpi-label">${escapeHtml(k.label)}</div>
          <div class="kpi-value"><span data-count-to="${k.value}" data-count-decimals="${
            k.decimals ?? 2
          }" data-count-prefix="${escapeHtml(k.prefix ?? '')}" data-count-suffix="${escapeHtml(
            k.suffix ?? '',
          )}">0</span></div>
          ${sparkAttrs}
        </article>
      `
    })
    .join('')

  return `<section class="kpi-grid" id="kpis" aria-label="Key metrics">${html}</section>`
}
