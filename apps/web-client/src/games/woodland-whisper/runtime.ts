import { Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { GameRuntime } from '../../engine/game-client.js'
import type { GameUIContext } from '../../engine/game-client.js'
import type { UILayoutSnapshot } from '../../engine/layout.js'
import { ReelSet } from '../../engine/reel-set.js'
import { WinOverlay } from '../../engine/win-overlay.js'
import { PickBonusView } from './pick-bonus-view.js'
import { BuyBonusControl } from './buy-bonus-control.js'
import { PAYLINE_DATA, Symbols } from '@tgslots/woodland-whisper'
import type {
  WoodlandWhisperBaseResult,
  WoodlandWhisperBuyResult,
  WoodlandWhisperFreeResult,
  WoodlandWhisperPickResult,
  WoodlandWhisperResult,
} from '@tgslots/woodland-whisper'
import { BUY_BONUS_COST_MULTIPLIER } from '@tgslots/woodland-whisper'
import type { WoodlandWhisperSerializedState } from '@tgslots/shared-contracts/states'
import type { WWPickBonusSerialized } from '@tgslots/shared-contracts/states'
import { deriveAwardedFreeSpins } from './free-spins-helpers.js'
import { manifest } from './manifest.js'

const FRAME_PAD = 4
const PAYLINE_WIN_COLOR = 0xffd700
const SCATTER_WIN_COLOR = 0xff44cc
const SCATTER_ID = Symbols['COIN']!

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

function transposeGrid(grid: number[][]): number[][] {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => grid[r]![c]!),
  )
}

export class WoodlandWhisperRuntime implements GameRuntime<'woodland-whisper'> {
  private _ctx!: GameUIContext<'woodland-whisper'>
  private _reelSet!: ReelSet
  private _overlay!: WinOverlay
  private _pickUI!: PickBonusView
  private _buyBonusControl!: BuyBonusControl
  private _bgSprite!: Sprite
  private _bgTex!: Texture
  private _mask!: Graphics
  private _frame!: Graphics
  private _layout?: UILayoutSnapshot
  private _pendingPickBonusState: WWPickBonusSerialized | null = null

  async init(ctx: GameUIContext<'woodland-whisper'>): Promise<void> {
    this._ctx = ctx

    // Background
    this._bgTex = ctx.assets.getTexture('BG')
    this._bgSprite = new Sprite(this._bgTex)
    this._bgSprite.anchor.set(0.5)
    ctx.scene.background.addChild(this._bgSprite)

    // Reel set
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

    // Mask (sibling to reelSet inside scene.reels layer)
    this._mask = new Graphics()
    ctx.scene.reels.addChild(this._mask)
    this._reelSet.mask = this._mask
    ctx.scene.reels.addChild(this._reelSet)

    // Frame (drawn over the reels, still inside scene.reels layer)
    this._frame = new Graphics()
    ctx.scene.reels.addChild(this._frame)

    // Pick bonus UI
    this._pickUI = new PickBonusView()
    this._pickUI.on('pick', (index: number) => {
      ctx.eventBus.emit('pick-card-selected', { index })
    })
    ctx.scene.overlays.addChild(this._pickUI)

    // Win overlay
    this._overlay = new WinOverlay()
    this._overlay.setGame(ctx.assets, [...manifest.winTiers])
    ctx.scene.overlays.addChild(this._overlay)

    this._buyBonusControl = new BuyBonusControl(ctx.eventBus, ctx.fsm, BUY_BONUS_COST_MULTIPLIER)
    ctx.hud.slot('control-right').addChild(this._buyBonusControl)
  }

  applyState(state: WoodlandWhisperSerializedState): void {
    if (state.lastGrid) {
      this._reelSet.setSymbols(transposeGrid(state.lastGrid))
    }
    this._pendingPickBonusState = state.pickBonus

    const remaining = state.freeSpins?.spinsRemaining ?? 0
    this._ctx.eventBus.emit('free-spins:updated', { remaining })
  }

  async presentResult(
    _action: keyof {
      spin: unknown
      buybonus: unknown
      freespin: unknown
      pick: unknown
      state: unknown
    },
    result: WoodlandWhisperResult,
  ): Promise<void> {
    switch (result.type) {
      case 'BASE':
        await this._presentBase(result)
        break
      case 'BUY':
        await this._presentBuy(result)
        break
      case 'FREE':
        await this._presentFree(result)
        break
      case 'PICK':
        await this._presentPick(result)
        break
    }
  }

  resize(layout: UILayoutSnapshot): void {
    this._layout = layout
    const { W, H } = { W: layout.screenWidth, H: layout.screenHeight }

    // Background — cover canvas
    const bgScale = Math.max(W / this._bgTex.width, H / this._bgTex.height)
    this._bgSprite.scale.set(bgScale)
    this._bgSprite.x = W / 2
    this._bgSprite.y = H / 2

    // Reel set
    const reelScale = layout.reelBounds.width / manifest.reelNaturalWidth
    this._reelSet.scale.set(reelScale)
    this._reelSet.x = layout.reelBounds.x
    this._reelSet.y = layout.reelBounds.y

    // Mask
    this._mask.clear()
    this._mask.rect(
      layout.reelBounds.x,
      layout.reelBounds.y,
      layout.reelBounds.width,
      layout.reelBounds.height,
    )
    this._mask.fill(0xffffff)

    // Frame — outer border + separators
    this._frame.clear()
    this._frame.rect(
      layout.reelBounds.x - FRAME_PAD,
      layout.reelBounds.y - FRAME_PAD,
      layout.reelBounds.width + FRAME_PAD * 2,
      layout.reelBounds.height + FRAME_PAD * 2,
    )
    this._frame.stroke({ color: 0xd4a017, width: 4, alpha: 1 })

    for (let col = 1; col < GRID_CONFIG.reels; col++) {
      const sepX =
        layout.reelBounds.x +
        (col * (REEL_CONFIG.symbolWidth + GRID_CONFIG.reelSpacing) - GRID_CONFIG.reelSpacing / 2) *
          reelScale
      this._frame.moveTo(sepX, layout.reelBounds.y)
      this._frame.lineTo(sepX, layout.reelBounds.y + layout.reelBounds.height)
    }
    this._frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

    for (let row = 1; row < REEL_CONFIG.visibleSymbols; row++) {
      const sepY = layout.reelBounds.y + row * REEL_CONFIG.symbolHeight * reelScale
      this._frame.moveTo(layout.reelBounds.x, sepY)
      this._frame.lineTo(layout.reelBounds.x + layout.reelBounds.width, sepY)
    }
    this._frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

    this._overlay.resize(layout)
    this._pickUI.resize(layout)
  }

  async resumeFeatures(): Promise<void> {
    if (this._pendingPickBonusState) {
      this._pickUI.show()
      this._pickUI.restoreState(
        this._pendingPickBonusState.userPicks,
        this._pendingPickBonusState.revealedValues,
      )
      await this._runPickBonus()
    }
  }

  destroy(): void {
    this._reelSet.destroy({ children: true })
    this._overlay.destroy({ children: true })
    this._pickUI.destroy({ children: true })
    this._buyBonusControl.destroy({ children: true })
    this._bgSprite.destroy()
    this._mask.destroy()
    this._frame.destroy()
  }

  // ── Private presentation helpers ───────────────────────────────────────────

  private async _presentBase(result: WoodlandWhisperBaseResult): Promise<void> {
    this._reelSet.spin()
    await this._wait(1000)

    const transposed = transposeGrid(result.grid)
    await this._reelSet.stop(transposed)

    if (result.win > 0) {
      this._ctx.eventBus.emit('win:awarded', { amount: result.win, multiplierX: 0 })
    }
    if (result.win > 0 || result.sc >= 2) {
      await this._showWinAnimation(result.hits, transposed, result.win)
    }

    if (result.triggeredPickBonus) {
      await this._overlay.announce('BONUS!', 1500)
      await this._runPickBonus()
    }

    if (result.win > 0) {
      await this._overlay.announceWin(result.win, 0)
    }
  }

  private async _presentBuy(result: WoodlandWhisperBuyResult): Promise<void> {
    this._reelSet.spin()
    await this._wait(1000)

    const transposed = transposeGrid(result.grid)
    await this._reelSet.stop(transposed)

    if (result.win > 0) {
      this._ctx.eventBus.emit('win:awarded', { amount: result.win, multiplierX: 0 })
    }
    if (result.win > 0 || result.sc >= 2) {
      await this._showWinAnimation(result.hits, transposed, result.win)
    }

    await this._overlay.announce('BONUS!', 1500)
    await this._runPickBonus()
  }

  private async _presentFree(result: WoodlandWhisperFreeResult): Promise<void> {
    this._reelSet.spin()
    await this._wait(1000)

    const transposed = transposeGrid(result.grid)
    await this._reelSet.stop(transposed)

    if (result.win > 0) {
      this._ctx.eventBus.emit('win:awarded', { amount: result.win, multiplierX: 0 })
    }
    if (result.win > 0 || result.sc >= 2) {
      await this._showWinAnimation(result.hits, transposed, result.win)
    }

    if (result.retriggeredPickBonus) {
      await this._overlay.announce('BONUS!', 1500)
      await this._runPickBonus()
    }
  }

  private async _presentPick(result: WoodlandWhisperPickResult): Promise<void> {
    this._pickUI.revealCard(result.pick.userIndex, result.pick.value)
    await this._wait(400)

    if (result.pick.isMatch) {
      await this._wait(1100)
      this._pickUI.hide()
    }
  }

  private async _runPickBonus(): Promise<void> {
    this._pendingPickBonusState = null
    this._pickUI.show()
    let matched = false

    while (!matched) {
      const userIndex = await new Promise<number>((resolve) => {
        const unsub = this._ctx.eventBus.on('pick-card-selected', ({ index }) => {
          unsub()
          resolve(index)
        })
      })

      const response = await this._ctx.dispatcher.dispatch('pick', { userIndex })
      const pickResult = response.result as WoodlandWhisperPickResult | undefined
      if (!pickResult) break

      const emptyState: WoodlandWhisperSerializedState = {
        lastGrid: null,
        freeSpins: null,
        pickBonus: null,
      }
      const awarded = pickResult.pick.isMatch
        ? deriveAwardedFreeSpins(emptyState, response.state as WoodlandWhisperSerializedState)
        : null

      this._pickUI.revealCard(pickResult.pick.userIndex, pickResult.pick.value)

      if (pickResult.pick.isMatch) {
        matched = true
        await this._wait(1500)
        this._pickUI.hide()

        if (awarded && awarded > 0) {
          await this._overlay.announceFreeSpinsAwarded(awarded, 1500)
          this._ctx.eventBus.emit('free-spins:updated', { remaining: awarded, awarded })
        }
      } else {
        await this._wait(400)
      }
    }
  }

  private async _showWinAnimation(
    hits: Array<{ lineIndex: number; matchCount: number }>,
    transposedGrid: number[][],
    _totalWin: number,
  ): Promise<void> {
    const scatterCells = this._findScatterCells(transposedGrid)

    const highlightScatters = () => {
      for (const { col, row } of scatterCells) {
        this._reelSet.highlightCell(col, row, SCATTER_WIN_COLOR)
      }
    }

    if (hits.length === 0 && scatterCells.length >= 2) {
      highlightScatters()
      await this._wait(2000)
      this._reelSet.clearAllHighlights()
      return
    }

    const msPerLine = Math.max(700, Math.min(1500, 2000 / Math.max(hits.length, 1)))

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
