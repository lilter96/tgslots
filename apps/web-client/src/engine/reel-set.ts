import { Container } from 'pixi.js'
import { Reel } from './reel'
import type { UIGridConfig, UIReelConfig } from '../types'

export class ReelSet extends Container {
  private _reels: Reel[] = []
  private _gridConfig: UIGridConfig
  private _reelConfig: UIReelConfig
  private _symbolNames: string[]

  constructor(
    gridConfig: UIGridConfig,
    reelConfig: UIReelConfig,
    initialGrid: number[][],
    symbolNames: string[],
  ) {
    super()
    this._gridConfig = gridConfig
    this._reelConfig = reelConfig
    this._symbolNames = symbolNames
    this.init(initialGrid)
  }

  private init(initialGrid: number[][]) {
    for (let i = 0; i < this._gridConfig.reels; i++) {
      const initialSymbols = initialGrid[i] || []
      const reel = new Reel(this._reelConfig, initialSymbols, this._symbolNames)
      reel.x = i * (this._reelConfig.symbolWidth + this._gridConfig.reelSpacing)
      this._reels.push(reel)
      this.addChild(reel)
    }
  }

  public async spin(): Promise<void> {
    const promises = this._reels.map((reel, i) => {
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await reel.spin()
          resolve()
        }, i * 50)
      })
    })
    await Promise.all(promises)
  }

  public async stop(finalGrid: number[][]): Promise<void> {
    const promises = this._reels.map((reel, i) => {
      const finalSymbols = finalGrid[i] || []
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await reel.stop(finalSymbols)
          resolve()
        }, i * 150)
      })
    })
    await Promise.all(promises)
  }

  get isSpinning(): boolean {
    return this._reels.some((r) => r.isSpinning)
  }

  public getReel(index: number): Reel {
    return this._reels[index]!
  }

  public highlightCell(col: number, row: number, color: number): void {
    this._reels[col]?.getSymbolAt(row)?.highlight(color)
  }

  public clearAllHighlights(): void {
    for (const reel of this._reels) {
      for (let row = 0; row < this._reelConfig.visibleSymbols; row++) {
        reel.getSymbolAt(row)?.clearHighlight()
      }
    }
  }
}
