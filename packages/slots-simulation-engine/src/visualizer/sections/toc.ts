import { escapeHtml } from '../format.js'

export interface TocEntry {
  id: string
  label: string
  depth: number
}

export function renderToc(scopeEntries: TocEntry[]): string {
  const fixed: TocEntry[] = [
    { id: 'overview', label: 'Overview', depth: 0 },
    { id: 'kpis', label: 'KPIs', depth: 0 },
    { id: 'rtp-composition', label: 'RTP Composition', depth: 0 },
    { id: 'comparisons', label: 'Comparisons', depth: 0 },
    { id: 'round-distribution', label: 'Round Distribution', depth: 0 },
    { id: 'spin-types', label: 'Spin Type Mix', depth: 0 },
    { id: 'scopes', label: 'Scoped Metrics', depth: 0 },
  ]

  const links = [...fixed, ...scopeEntries]
    .map(
      (e) =>
        `<a class="depth-${Math.min(2, e.depth)}" data-target="${escapeHtml(e.id)}" href="#${escapeHtml(e.id)}">${escapeHtml(e.label)}</a>`,
    )
    .join('')

  return `<nav class="toc" aria-label="Sections"><h4>Sections</h4>${links}</nav>`
}
