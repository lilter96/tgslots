import type { GameFeature } from '../types'

interface Props {
  features: GameFeature[]
}

export default function FeatureGrid({ features }: Props) {
  return (
    <section className="py-20 px-6 bg-black/20">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <span className="block h-px flex-1 bg-gold/20" />
          <h2 className="font-cinzel text-gold uppercase tracking-[0.3em] text-sm whitespace-nowrap">
            Game Features
          </h2>
          <span className="block h-px flex-1 bg-gold/20" />
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/5">
          {features.map((feature) => (
            <article key={feature.title} className="feature-card bg-forest">
              <div className="flex items-start gap-5">
                {/* Icon */}
                <div className="shrink-0 w-14 h-14 flex items-center justify-center rounded border border-gold/20 bg-black/40 group-hover:border-gold/60 transition-colors">
                  <img src={feature.icon} alt="" aria-hidden className="w-9 h-9 object-contain" />
                </div>

                {/* Text */}
                <div>
                  <h3 className="font-cinzel font-bold text-gold-glow text-sm uppercase tracking-widest mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
