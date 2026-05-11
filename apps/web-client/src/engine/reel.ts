import { Container, Ticker } from 'pixi.js'
import type { UIReelConfig } from '../types'
import { gsap } from 'gsap'
import { SymbolView } from './symbol-view'
import type { GameAssets } from './asset-registry'
import { getSpinSpeedProfile } from './spin-speed.js'
import type { SpinSpeedProfile } from './spin-speed.js'

export class Reel extends Container {
  private _symbols: SymbolView[] = []
  private _config: UIReelConfig
  private _assets: GameAssets
  private _symbolCount: number
  private _spinning = false
  private _scrollY = 0
  private _spinTicker?: (ticker: Ticker) => void
  private _speedProfile: SpinSpeedProfile = getSpinSpeedProfile('normal')

  constructor(
    config: UIReelConfig,
    initialSymbolIds: number[],
    assets: GameAssets,
    symbolCount: number,
  ) {
    super()
    this._config = config
    this._assets = assets
    this._symbolCount = symbolCount
    this._init(initialSymbolIds)
  }

  private _init(initialSymbolIds: number[]) {
    const { totalSymbols, symbolHeight, symbolWidth } = this._config

    for (let i = 0; i < totalSymbols; i++) {
      const symbolView = new SymbolView()
      symbolView.y = i * symbolHeight
      symbolView.setSize(symbolWidth, symbolHeight)

      const symbolId = initialSymbolIds[i % initialSymbolIds.length]
      if (symbolId !== undefined) {
        symbolView.setTexture(this._assets.getSymbolTexture(symbolId))
      }

      this._symbols.push(symbolView)
      this.addChild(symbolView)
    }
  }

  public async spin(): Promise<void> {
    if (this._spinning) return
    this._spinning = true
    this._scrollY = 0

    const { symbolHeight, totalSymbols } = this._config
    const reelHeight = totalSymbols * symbolHeight
    this._symbols.forEach((s) => s.setBlur(10))

    this._spinTicker = (ticker: Ticker) => {
      const delta = ticker.deltaMS / 1000
      const spinSpeed = symbolHeight * 15 * this._speedProfile.reelVelocityMultiplier
      this._scrollY += spinSpeed * delta

      for (let i = 0; i < this._symbols.length; i++) {
        const symbol = this._symbols[i]!
        const prevY = symbol.y
        const newY = (i * symbolHeight + this._scrollY) % reelHeight
        symbol.y = newY

        if (newY < prevY - symbolHeight / 2) {
          const randomId = Math.floor(Math.random() * this._symbolCount)
          symbol.setTexture(this._assets.getSymbolTexture(randomId))
        }
      }
    }

    Ticker.shared.add(this._spinTicker)
  }

  public async stop(finalSymbols: number[]): Promise<void> {
    if (!this._spinning) return

    if (this._spinTicker) {
      Ticker.shared.remove(this._spinTicker)
      this._spinTicker = undefined
    }

    const { symbolHeight } = this._config

    this._symbols.forEach((s) => s.setBlur(0))

    this._symbols.forEach((symbol, i) => {
      gsap.killTweensOf(symbol)
      const symbolId = finalSymbols[i]
      if (symbolId !== undefined) {
        symbol.setTexture(this._assets.getSymbolTexture(symbolId))
      }
      symbol.y = i * symbolHeight - symbolHeight * 0.25
    })

    return new Promise((resolve) => {
      let completed = 0
      this._symbols.forEach((symbol, i) => {
        gsap.to(symbol, {
          y: i * symbolHeight,
          duration: this._speedProfile.reelSettleDurationMs / 1000,
          ease: 'back.out(1.7)',
          onComplete: () => {
            completed++
            if (completed === this._symbols.length) {
              this._spinning = false
              resolve()
            }
          },
        })
      })
    })
  }

  get isSpinning(): boolean {
    return this._spinning
  }

  public getSymbolAt(row: number): SymbolView | null {
    return this._symbols[row] ?? null
  }

  public setSymbols(symbols: number[]): void {
    const { symbolHeight } = this._config
    this._symbols.forEach((symbol, i) => {
      gsap.killTweensOf(symbol)
      const symbolId = symbols[i % symbols.length]
      if (symbolId !== undefined) {
        symbol.setTexture(this._assets.getSymbolTexture(symbolId))
      }
      symbol.y = i * symbolHeight
      symbol.setBlur(0)
    })
    this._spinning = false
  }

  public syncSpinSpeed(profile: SpinSpeedProfile): void {
    this._speedProfile = profile
  }
}
