interface Props {
  title: string
  tagline: string
  lore: string[]
}

export default function LoreSection({ title, lore }: Props) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-10">
          <span className="block h-px flex-1 bg-gold/20" />
          <h2 className="font-cinzel text-gold uppercase tracking-[0.3em] text-sm whitespace-nowrap">
            About {title}
          </h2>
          <span className="block h-px flex-1 bg-gold/20" />
        </div>

        {/* Lore paragraphs */}
        <div className="space-y-5">
          {lore.map((para, i) => (
            <p
              key={i}
              className="text-white/70 leading-relaxed text-base sm:text-lg font-[IM_Fell_English_SC,serif] first:text-white/90 first:text-lg sm:first:text-xl"
            >
              {para}
            </p>
          ))}
        </div>

        {/* Decorative runes */}
        <div className="flex justify-center mt-12 gap-6 text-gold/30 text-2xl tracking-widest select-none">
          <span>✦</span>
          <span>⟁</span>
          <span>◈</span>
          <span>⟁</span>
          <span>✦</span>
        </div>
      </div>
    </section>
  )
}
