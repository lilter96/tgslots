export interface MetricDisplay {
  label: string
  description?: string
  format?: 'count' | 'currency' | 'percent' | 'multiplier' | 'cycle' | 'rate'
  chart?: 'gauge' | 'donut' | 'bar' | 'sparkline' | 'distribution' | 'minmax'
}

export const METRIC_LABELS: Record<string, MetricDisplay> = {
  rounds: {
    label: 'Rounds',
    description: 'Total simulated rounds.',
    format: 'count',
  },
  'round-rtp': {
    label: 'Round RTP',
    description: 'Per-round RTP contribution. Sums to total summary RTP.',
    format: 'percent',
    chart: 'gauge',
  },
  'round-win-amount': {
    label: 'Round Win',
    description: 'Round-level win amount aggregate (avg / min / max).',
    format: 'currency',
    chart: 'minmax',
  },
  'spins-per-round': {
    label: 'Spins / Round',
    description: 'Number of spin results per round (base + free + retriggers).',
    format: 'count',
    chart: 'minmax',
  },
  'round-win-multiplier': {
    label: 'Round Win Multiplier',
    description: 'Distribution of round win expressed as multiplier of bet.',
    chart: 'distribution',
  },

  hits: {
    label: 'Win Hits',
    description: 'Spins where win > 0.',
    format: 'cycle',
  },
  'spins-played': {
    label: 'Spins Played',
    description: 'Free spins played (excluding base spins).',
    format: 'count',
  },
  'scatter-count': {
    label: 'Scatter Count',
    description: 'Distribution of scatter symbols per spin.',
    chart: 'distribution',
  },
  'spin-win': {
    label: 'Spin Win',
    description: 'Per-spin win amount aggregate (count / avg / total).',
    format: 'currency',
    chart: 'bar',
  },

  triggers: {
    label: 'Triggers',
    description: 'Base spins that triggered the feature.',
    format: 'cycle',
  },
  retriggers: {
    label: 'Retriggers',
    description: 'Free spins that retriggered the feature.',
    format: 'cycle',
  },
  'spins-awarded': {
    label: 'Spins Awarded',
    description: 'Free spins granted at trigger / retrigger.',
    format: 'count',
    chart: 'minmax',
  },
  'total-spins-per-trigger': {
    label: 'Total Spins per Trigger',
    description: 'Total free spins per trigger session, including retriggers.',
    format: 'count',
    chart: 'minmax',
  },

  win: {
    label: 'Base RTP',
    description: 'Base game wager-normalized RTP contribution.',
    format: 'percent',
    chart: 'gauge',
  },
  'scatter-win': {
    label: 'Scatter Win',
    description: 'Scatter pay aggregate or RTP contribution depending on kind.',
    format: 'currency',
    chart: 'gauge',
  },
  'feature-rtp': {
    label: 'Feature RTP',
    description: 'Free-spin wager-normalized RTP contribution.',
    format: 'percent',
    chart: 'gauge',
  },
  'scatter-rtp': {
    label: 'Scatter RTP',
    description: 'Free-spin scatter pays as RTP contribution.',
    format: 'percent',
    chart: 'gauge',
  },
  'session-win': {
    label: 'Session Win',
    description: 'Total win per triggered feature session.',
    format: 'currency',
    chart: 'bar',
  },
  'triggered-round-win': {
    label: 'Triggered Round Win',
    description: 'Total round win on rounds where the feature triggered.',
    format: 'currency',
    chart: 'bar',
  },

  results: {
    label: 'Results',
    description: 'Spin results of this type per round.',
    format: 'count',
  },
}

export const SCOPE_LABELS: Record<string, string> = {
  root: 'Overall',
  'base-game': 'Base Game',
  features: 'Features',
  'free-spins': 'Free Spins',
  'pick-bonus-base-game': 'Pick Bonus (Base Trigger)',
  'pick-bonus-free-game': 'Pick Bonus (Free Retrigger)',
  'spin-types': 'Spin Type Mix',
}

export function humanizeName(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function metricDisplay(name: string): MetricDisplay {
  const known = METRIC_LABELS[name]
  if (known) return known
  return { label: humanizeName(name) }
}

export function scopeLabel(name: string): string {
  return SCOPE_LABELS[name] ?? humanizeName(name)
}
