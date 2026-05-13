export interface GameFeature {
  title: string
  description: string
  icon: string
}

export interface GameStats {
  volatility: string
  rtp: string
  maxWin: string
  paylines: string
}

export interface GamePresentation {
  slug: string
  title: string
  tagline: string
  releaseDate: string
  stats: GameStats
  lore: string[]
  features: GameFeature[]
  assets: {
    heroBackground: string
  }
  theme: {
    primary: string
    accent: string
    background: string
    text: string
  }
  launchUrl: string
}
