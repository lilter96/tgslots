export type SvgOrUrl = string

export type SymbolKind = 'regular' | 'wild' | 'scatter' | 'bonus'

export interface SymbolMeta {
  readonly id: number
  readonly name: string
  readonly kind: SymbolKind
}

export interface ThemePalette {
  readonly primary: number
  readonly accent: number
  readonly background: number
  readonly text: number
}

export type FeatureTag =
  | 'free-spins'
  | 'pick-bonus'
  | 'buy-bonus'
  | 'mystery'
  | 'cluster-pays'
  | 'cascade'
  | 'combat-operation'

export interface WinTier {
  readonly thresholdX: number
  readonly copy: string
  readonly textureName?: string
}

export interface GameManifest {
  readonly gameId: string
  readonly displayName: string
  readonly grid: { readonly reels: number; readonly rows: number }
  readonly reelNaturalWidth: number
  readonly reelNaturalHeight: number
  readonly symbols: readonly SymbolMeta[]
  readonly symbolSize: number
  readonly theme: ThemePalette
  readonly winTiers: readonly WinTier[]
  readonly features: readonly FeatureTag[]
}

export interface EnvAsset {
  readonly svg: SvgOrUrl
  readonly width: number
  readonly height: number
}

export interface AssetManifest {
  readonly symbols?: Record<string, SvgOrUrl>
  readonly images?: Record<string, string>
  readonly env: Record<string, EnvAsset>
  readonly audio?: Record<string, string>
}
