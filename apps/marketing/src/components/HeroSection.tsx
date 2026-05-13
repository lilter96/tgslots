import { useState } from 'react'
import type { GamePresentation } from '../types'

interface Props {
  game: GamePresentation
  onPlayDemo: () => void
}

export default function HeroSection({ game, onPlayDemo }: Props) {
  const [toastVisible, setToastVisible] = useState(false)

  function handlePlayReal() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <img
        src={game.assets.heroBackground}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center"
        draggable={false}
      />

      {/* Dark overlays for legibility */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-forest via-forest/50 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-forest/60 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">
        {/* Title / logo treatment */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="font-cinzel font-black uppercase tracking-widest text-5xl sm:text-7xl text-gold-glow drop-shadow-glow leading-none animate-pulse-glow">
            {game.title.split(' ')[0]}
          </div>
          <div className="font-cinzel font-semibold uppercase tracking-[0.4em] text-xl sm:text-3xl text-gold mt-1">
            {game.title.split(' ').slice(1).join(' ')}
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="block h-px w-20 bg-gold/70" />
            <span className="text-gold text-base tracking-widest select-none">✦ ⟁ ◈ ⟁ ✦</span>
            <span className="block h-px w-20 bg-gold/70" />
          </div>
        </div>

        {/* Tagline */}
        <p
          className="font-cinzel text-white/70 text-sm sm:text-base tracking-widest uppercase mb-10 animate-fade-up"
          style={{ animationDelay: '0.25s', opacity: 0 }}
        >
          {game.tagline}
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row gap-4 animate-fade-up"
          style={{ animationDelay: '0.4s', opacity: 0 }}
        >
          <button className="btn-primary" onClick={onPlayDemo}>
            Play Demo
          </button>
          <button className="btn-outline" onClick={handlePlayReal} disabled>
            Play for Real
          </button>
        </div>

        {import.meta.env.DEV && (
          <p className="mt-4 text-xs text-white/30 font-mono">
            "Play for Real" coming soon — auth not yet wired
          </p>
        )}
      </div>

      {/* "Coming soon" toast */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-forest border border-gold/40 px-6 py-3 font-cinzel text-gold text-sm uppercase tracking-widest shadow-xl">
          Coming soon — real-money play not yet available
        </div>
      )}

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 text-xs tracking-widest uppercase font-cinzel">
        <span>Scroll</span>
        <span className="text-gold/50 animate-bounce">↓</span>
      </div>
    </section>
  )
}
