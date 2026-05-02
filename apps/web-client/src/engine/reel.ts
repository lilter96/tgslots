import { Container, Ticker, Graphics } from 'pixi.js'
import type { UIReelConfig } from '../types'
import { gsap } from 'gsap'
import { SymbolView } from './symbol-view'
import { AssetLoader } from './asset-loader'

export class Reel extends Container {
  private _symbols: SymbolView[] = []
  private _config: UIReelConfig
  private _symbolIds: number[] = []
  private _symbolNames: string[]
  private _spinning = false
  private _scrollY = 0
  private _spinTicker?: (ticker: Ticker) => void

  constructor(config: UIReelConfig, initialSymbolIds: number[], symbolNames: string[]) {
    super()
    this._config = config
    this._symbolIds = [...initialSymbolIds]
    this._symbolNames = symbolNames
    this.init()
  }

  private init() {
    const { visibleSymbols, totalSymbols, symbolHeight, symbolWidth } = this._config

    // Permanent slot panel behind the visible rows
    const panel = new Graphics()
    for (let row = 0; row < visibleSymbols; row++) {
      panel.rect(2, row * symbolHeight + 2, symbolWidth - 4, symbolHeight - 4)
      panel.fill({ color: 0x0d3d0d, alpha: 1 })
      panel.rect(1, row * symbolHeight + 1, symbolWidth - 2, symbolHeight - 2)
      panel.stroke({ color: 0x1a5c1a, width: 2, alpha: 0.8 })
    }
    this.addChild(panel)

    for (let i = 0; i < totalSymbols; i++) {
      const symbolView = new SymbolView()
      symbolView.y = i * symbolHeight
      symbolView.setSize(symbolWidth, symbolHeight)

      const symbolId = this._symbolIds[i % this._symbolIds.length]
      if (symbolId !== undefined) {
        symbolView.setTexture(AssetLoader.getSymbolTexture(symbolId, this._symbolNames))
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
    const spinSpeed = symbolHeight * 15 // px per second

    this._symbols.forEach((s) => s.setBlur(10))

    this._spinTicker = (ticker: Ticker) => {
      const delta = ticker.deltaMS / 1000
      this._scrollY += spinSpeed * delta

      for (let i = 0; i < this._symbols.length; i++) {
        const symbol = this._symbols[i]!
        const prevY = symbol.y
        const newY = (i * symbolHeight + this._scrollY) % reelHeight
        symbol.y = newY

        // Wrap: symbol moved from bottom back to top — randomize it
        if (newY < prevY - symbolHeight / 2) {
          const randomId = Math.floor(Math.random() * (this._symbolNames.length - 1))
          symbol.setTexture(AssetLoader.getSymbolTexture(randomId, this._symbolNames))
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

    // Set final textures and position slightly above targets for a drop-in
    this._symbols.forEach((symbol, i) => {
      gsap.killTweensOf(symbol)
      const symbolId = finalSymbols[i]
      if (symbolId !== undefined) {
        symbol.setTexture(AssetLoader.getSymbolTexture(symbolId, this._symbolNames))
      }
      symbol.y = i * symbolHeight - symbolHeight * 0.25
    })

    return new Promise((resolve) => {
      let completed = 0
      this._symbols.forEach((symbol, i) => {
        gsap.to(symbol, {
          y: i * symbolHeight,
          duration: 0.5,
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
}
