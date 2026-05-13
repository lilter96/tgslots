import { Link } from 'react-router-dom'
import { gameRegistry } from '../games/registry'

export default function Lobby() {
  const games = Object.values(gameRegistry)

  return (
    <div className="min-h-screen bg-forest text-white">
      {/* Header */}
      <header className="py-12 px-6 text-center border-b border-white/5">
        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="block h-px w-16 bg-gold/40" />
          <h1 className="font-cinzel font-black uppercase tracking-[0.4em] text-gold-glow text-2xl sm:text-4xl drop-shadow-glow">
            TGSlots
          </h1>
          <span className="block h-px w-16 bg-gold/40" />
        </div>
        <p className="font-cinzel text-white/30 text-xs uppercase tracking-widest mt-2">
          Game Library
        </p>
      </header>

      {/* Game grid */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Link
              key={game.slug}
              to={`/games/${game.slug}`}
              className="group relative overflow-hidden border border-white/10 hover:border-gold/50 transition-all duration-300 block"
            >
              {/* Thumbnail background */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={game.assets.heroBackground}
                  alt={game.title}
                  className="w-full h-full object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest via-black/20 to-transparent" />
              </div>

              {/* Card footer */}
              <div className="p-5 bg-black/40">
                <h2 className="font-cinzel font-bold text-gold-glow uppercase tracking-wider text-lg leading-tight mb-1">
                  {game.title}
                </h2>
                <p className="text-white/40 text-xs font-cinzel tracking-widest uppercase truncate">
                  {game.tagline}
                </p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs font-cinzel text-white/30">
                    RTP <span className="text-gold/70">{game.stats.rtp}</span>
                  </span>
                  <span className="text-xs font-cinzel text-white/30">
                    Vol <span className="text-gold/70">{game.stats.volatility}</span>
                  </span>
                </div>
              </div>

              {/* Hover arrow */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gold text-lg">
                →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
