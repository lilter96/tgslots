import { Graphics } from 'pixi.js'
import type { UILayoutSnapshot } from '../../../engine/layout.js'

const FRAME_PAD = 4

export interface ReelFrameConfig {
  reels: number
  rows: number
  symbolSize: number
  reelSpacing: number
}

export class ReelFrame extends Graphics {
  private readonly _cfg: ReelFrameConfig

  constructor(cfg: ReelFrameConfig) {
    super()
    this._cfg = cfg
  }

  update(layout: UILayoutSnapshot, reelScale: number): void {
    const { reels, rows, symbolSize, reelSpacing } = this._cfg
    this.clear()

    this.rect(
      layout.reelBounds.x - FRAME_PAD,
      layout.reelBounds.y - FRAME_PAD,
      layout.reelBounds.width + FRAME_PAD * 2,
      layout.reelBounds.height + FRAME_PAD * 2,
    ).stroke({ color: 0xc41e1e, width: 4, alpha: 1 })

    for (let col = 1; col < reels; col++) {
      const sepX =
        layout.reelBounds.x + (col * (symbolSize + reelSpacing) - reelSpacing / 2) * reelScale
      this.moveTo(sepX, layout.reelBounds.y)
        .lineTo(sepX, layout.reelBounds.y + layout.reelBounds.height)
        .stroke({ color: 0xc41e1e, width: 1, alpha: 0.4 })
    }

    for (let row = 1; row < rows; row++) {
      const sepY = layout.reelBounds.y + row * symbolSize * reelScale
      this.moveTo(layout.reelBounds.x, sepY)
        .lineTo(layout.reelBounds.x + layout.reelBounds.width, sepY)
        .stroke({ color: 0xc41e1e, width: 1, alpha: 0.4 })
    }
  }
}
