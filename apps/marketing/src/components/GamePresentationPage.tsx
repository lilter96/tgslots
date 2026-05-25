import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { GamePresentation } from '../types'
import HeroSection from './HeroSection'
import StatsBar from './StatsBar'
import LoreSection from './LoreSection'
import FeatureGrid from './FeatureGrid'
import GameLauncher from './GameLauncher'

interface Props {
  game: GamePresentation
}

export default function GamePresentationPage({ game }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    document.title = game.title
  }, [game.title])

  if (isPlaying) {
    return (
      <GameLauncher
        launchUrl={game.launchUrl}
        title={game.title}
        onClose={() => setIsPlaying(false)}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-forest text-white"
      style={
        {
          '--theme-primary': game.theme.primary,
          '--theme-accent': game.theme.accent,
          '--theme-bg': game.theme.background,
          '--theme-text': game.theme.text,
        } as CSSProperties
      }
    >
      <HeroSection game={game} onPlayDemo={() => setIsPlaying(true)} />
      <StatsBar stats={game.stats} releaseDate={game.releaseDate} />
      <LoreSection title={game.title} tagline={game.tagline} lore={game.lore} />
      <FeatureGrid features={game.features} />
    </div>
  )
}
