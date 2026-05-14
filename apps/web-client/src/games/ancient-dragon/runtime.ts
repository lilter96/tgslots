import { Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { GameRuntime, GameUIContext } from '../../engine/game-client.js'
import type { UILayoutSnapshot } from '../../engine/layout.js'
import { ReelSet } from '../../engine/reel-set.js'
import { WinOverlay } from '../../engine/win-overlay.js'
import { PAYLINE_DATA, Symbols } from '@tgslots/ancient-dragon/constants'
import type {
  AncientDragonBaseResult,
  AncientDragonFreeResult,
  AncientDragonResult,
} from '@tgslots/ancient-dragon'
import type { AncientDragonSerializedState } from '@tgslots/shared-contracts/states'
import { manifest } from './manifest.js'
import { getSpinSpeedProfile } from '../../engine/spin-speed.js'
import type { SpinSpeedProfile } from '../../engine/spin-speed.js'

const FRAME_PAD = 4
const PAYLINE_WIN_COLOR = 0xffd700
const SCATTER_WIN_COLOR = 0xff4444
const SCATTER_ID = Symbols['YINYANG']!

const GRID_CONFIG = {
  reels: manifest.grid.reels,
  rows: manifest.grid.rows,
  reelSpacing: 20,
}
const REEL_CONFIG = {
  symbolWidth: manifest.symbolSize,
  symbolHeight: manifest.symbolSize,
  visibleSymbols: manifest.grid.rows,
  totalSymbols: 5,
}

export class AncientDragonRuntime implements GameRuntime<'ancient-dragon'> {
  private _ctx!: GameUIContext<'ancient-dragon'>
  private _reelSet!: ReelSet
  private _overlay!: WinOverlay
  private _bgSprite!: Sprite
  private _bgTex!: Texture
  private _mask!: Graphics
  private _frame!: Graphics
  private _layout?: UILayoutSnapshot
  private _spinSpeedProfile: SpinSpeedProfile = getSpinSpeedProfile('normal')

  async init(ctx: GameUIContext<'ancient-dragon'>): Promise<void> {
    this._ctx = ctx

    this._bgTex = ctx.assets.getTexture('BG')
    this._bgSprite = new Sprite(this._bgTex)
    this._bgSprite.anchor.set(0.5)
    ctx.scene.background.addChild(this._bgSprite)

    const emptyGrid = Array.from({ length: GRID_CONFIG.reels }, () =>
      Array.from({ length: GRID_CONFIG.rows }, () => 0),
    )
    this._reelSet = new ReelSet(
      GRID_CONFIG,
      REEL_CONFIG,
      emptyGrid,
      ctx.assets,
      manifest.symbols.length,
    )

    this._mask = new Graphics()
    ctx.scene.reels.addChild(this._mask)
    this._reelSet.mask = this._mask
    ctx.scene.reels.addChild(this._reelSet)

    this._frame = new Graphics()
    ctx.scene.reels.addChild(this._frame)

    this._overlay = new WinOverlay()
    this._overlay.setGame(ctx.assets, [...manifest.winTiers])
    ctx.scene.overlays.addChild(this._overlay)
  }

  applyState(state: AncientDragonSerializedState): void {
    const remaining = state.freeSpins?.spinsRemaining ?? 0
    this._ctx.eventBus.emit('free-spins:updated', { remaining })
  }

  async presentResult(
    _action: keyof { spin: unknown; freespin: unknown; state: unknown },
    result: AncientDragonResult,
  ): Promise<void> {
    switch (result.type) {
      case 'BASE':
        await this._presentBase(result)
        break
      case 'FREE':
        await this._presentFree(result)
        break
    }
  }

  resize(layout: UILayoutSnapshot): void {
    this._layout = layout
    const { W, H } = { W: layout.screenWidth, H: layout.screenHeight }

    const bgScale = Math.max(W / this._bgTex.width, H / this._bgTex.height)
    this._bgSprite.scale.set(bgScale)
    this._bgSprite.x = W / 2
    this._bgSprite.y = H / 2

    const reelScale = layout.reelBounds.width / manifest.reelNaturalWidth
    this._reelSet.scale.set(reelScale)
    this._reelSet.x = layout.reelBounds.x
    this._reelSet.y = layout.reelBounds.y

    this._mask.clear()
    this._mask.rect(
      layout.reelBounds.x,
      layout.reelBounds.y,
      layout.reelBounds.width,
      layout.reelBounds.height,
    )
    this._mask.fill(0xffffff)

    this._frame.clear()
    this._frame.rect(
      layout.reelBounds.x - FRAME_PAD,
      layout.reelBounds.y - FRAME_PAD,
      layout.reelBounds.width + FRAME_PAD * 2,
      layout.reelBounds.height + FRAME_PAD * 2,
    )
    this._frame.stroke({ color: 0xcc1a1a, width: 4, alpha: 1 })

    for (let col = 1; col < GRID_CONFIG.reels; col++) {
      const sepX =
        layout.reelBounds.x +
        (col * (REEL_CONFIG.symbolWidth + GRID_CONFIG.reelSpacing) - GRID_CONFIG.reelSpacing / 2) *
          reelScale
      this._frame.moveTo(sepX, layout.reelBounds.y)
      this._frame.lineTo(sepX, layout.reelBounds.y + layout.reelBounds.height)
    }
    this._frame.stroke({ color: 0xcc1a1a, width: 1, alpha: 0.4 })

    for (let row = 1; row < REEL_CONFIG.visibleSymbols; row++) {
      const sepY = layout.reelBounds.y + row * REEL_CONFIG.symbolHeight * reelScale
      this._frame.moveTo(layout.reelBounds.x, sepY)
      this._frame.lineTo(layout.reelBounds.x + layout.reelBounds.width, sepY)
    }
    this._frame.stroke({ color: 0xcc1a1a, width: 1, alpha: 0.4 })

    this._overlay.resize(layout)
  }

  destroy(): void {
    this._reelSet.destroy({ children: true })
    this._overlay.destroy({ children: true })
    this._bgSprite.destroy()
    this._mask.destroy()
    this._frame.destroy()
  }

  syncSpinSpeed(profile: SpinSpeedProfile): void {
    this._spinSpeedProfile = profile
    this._reelSet.syncSpinSpeed(profile)
    this._overlay.syncSpinSpeed(profile)
  }

  private async _presentBase(result: AncientDragonBaseResult): Promise<void> {
    this._reelSet.spin()
    await this._wait(this._spinSpeedProfile.reelSpinMs)

    await this._reelSet.stop(result.grid)

    if (result.win > 0) {
      this._ctx.eventBus.emit('win:awarded', { amount: result.win, multiplierX: 0 })
    }
    if (result.win > 0 || result.sc >= 2) {
      await this._showWinAnimation(result.hits, result.grid)
    }

    if (result.triggeredFreeSpins) {
      await this._overlay.announce('FREE SPINS!', 1500)
    }

    if (result.win > 0) {
      await this._overlay.announceWin(result.win, 0)
    }
  }

  private async _presentFree(result: AncientDragonFreeResult): Promise<void> {
    this._reelSet.spin()
    await this._wait(this._spinSpeedProfile.reelSpinMs)

    await this._reelSet.stop(result.grid)

    if (result.win > 0) {
      this._ctx.eventBus.emit('win:awarded', { amount: result.win, multiplierX: 0 })
    }
    if (result.win > 0 || result.sc >= 2) {
      await this._showWinAnimation(result.hits, result.grid)
    }

    if (result.retriggeredFreeSpins) {
      await this._overlay.announce('FREE SPINS!', 1500)
    }
  }

  private async _showWinAnimation(
    hits: readonly { lineIndex: number; matchCount: number }[],
    transposedGrid: number[][],
  ): Promise<void> {
    const scatterCells = this._findScatterCells(transposedGrid)

    const highlightScatters = () => {
      for (const { col, row } of scatterCells) {
        this._reelSet.highlightCell(col, row, SCATTER_WIN_COLOR)
      }
    }

    if (hits.length === 0 && scatterCells.length >= 2) {
      highlightScatters()
      await this._wait(this._spinSpeedProfile.scatterHighlightMs)
      this._reelSet.clearAllHighlights()
      return
    }

    const msPerLine = Math.max(
      this._spinSpeedProfile.lineHighlightMinMs,
      Math.min(
        this._spinSpeedProfile.lineHighlightMaxMs,
        this._spinSpeedProfile.lineHighlightBudgetMs / Math.max(hits.length, 1),
      ),
    )

    for (const hit of hits) {
      this._reelSet.clearAllHighlights()
      highlightScatters()

      for (let col = 0; col < hit.matchCount; col++) {
        const row = PAYLINE_DATA[hit.lineIndex * 5 + col]
        if (row !== undefined) {
          this._reelSet.highlightCell(col, row, PAYLINE_WIN_COLOR)
        }
      }

      await this._wait(msPerLine)
    }

    this._reelSet.clearAllHighlights()
  }

  private _findScatterCells(transposedGrid: number[][]): { col: number; row: number }[] {
    const cells: { col: number; row: number }[] = []
    for (let col = 0; col < transposedGrid.length; col++) {
      const reelSyms = transposedGrid[col]!
      for (let row = 0; row < reelSyms.length; row++) {
        if (reelSyms[row] === SCATTER_ID) cells.push({ col, row })
      }
    }
    return cells
  }

  private _wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
