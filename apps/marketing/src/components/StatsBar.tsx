import type { GameStats } from '../types'

const DEV = import.meta.env.DEV

interface Props {
  stats: GameStats
  releaseDate: string
  showDevelopmentHints?: boolean
}

interface StatCellProps {
  label: string
  value: string
  estimated?: boolean
}

function StatCell({ label, value, estimated }: StatCellProps) {
  return (
    <div className="stat-cell flex-1 min-w-0">
      <span className="text-white/40 text-xs font-cinzel uppercase tracking-widest mb-1 block">
        {label}
      </span>
      <span className="text-gold-glow font-cinzel font-bold text-xl sm:text-2xl drop-shadow-gold leading-none">
        {value}
        {estimated && DEV && (
          <span
            className="ml-1 text-[10px] text-white/30 align-super cursor-help"
            title="Estimated — confirm before launch"
          >
            est.
          </span>
        )}
      </span>
    </div>
  )
}

export default function StatsBar({ stats, releaseDate, showDevelopmentHints = true }: Props) {
  return (
    <section className="bg-black/60 border-y border-white/10 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
          <StatCell label="Volatility" value={stats.volatility} estimated={showDevelopmentHints} />
          <StatCell label="RTP" value={stats.rtp} />
          <StatCell label="Max Win" value={stats.maxWin} estimated={showDevelopmentHints} />
          <StatCell label="Paylines" value={stats.paylines} />
        </div>

        {releaseDate && (
          <div className="text-center py-2 border-t border-white/5">
            <span className="text-white/20 text-[11px] font-cinzel tracking-widest uppercase">
              Release: {releaseDate}
              {DEV && showDevelopmentHints && ' (placeholder)'}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
