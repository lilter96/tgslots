import type {
  PaylineHit,
  WoodlandWhisperBaseResult,
  WoodlandWhisperFreeResult,
} from '@tgslots/woodland-whisper'
import {
  BET_CONFIG,
  PAYLINE_DATA,
  Symbols,
  WoodlandWhisperStateMachine,
} from '@tgslots/woodland-whisper'
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core'
import { GameStateMachine } from './state-machine'
import { ReelSet } from './reel-set'
import { SessionManager } from './session-manager'
import { PickBonusUI } from './pick-bonus-ui'
import { WinOverlay } from './win-overlay'
import { GameUIState } from '../types'
import type { AutoSpinConfig } from '../types'

// Game returns grid[row][col] (3 rows × 5 cols), ReelSet expects grid[col][row] (5 reels × 3 rows)
function transposeGrid(grid: number[][]): number[][] {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => grid[r]![c]!),
  )
}

const SCATTER_ID = Symbols.COIN!
const PAYLINE_WIN_COLOR = 0xffd700
const SCATTER_WIN_COLOR = 0xff44cc

interface AutoSpinState {
  config: AutoSpinConfig
  remaining: number // 0 means unlimited (config.spins === 0)
}

export class GameController {
  private _fsm: GameStateMachine
  private _reels: ReelSet
  private _session: SessionManager
  private _pickUI?: PickBonusUI
  private _overlay?: WinOverlay
  private _game: WoodlandWhisperStateMachine
  private _rng = mt19937(Date.now())
  private _autoSpinState: AutoSpinState | null = null

  constructor(
    fsm: GameStateMachine,
    reels: ReelSet,
    session: SessionManager,
    private _config: { spinDelay: number; winDelay: number } = { spinDelay: 1000, winDelay: 2000 },
  ) {
    this._fsm = fsm
    this._reels = reels
    this._session = session
    this._game = new WoodlandWhisperStateMachine()
  }

  get isFreeSpins(): boolean {
    return !!this._game.state.freeSpins
  }

  get isAutoSpin(): boolean {
    return this._autoSpinState !== null
  }

  // Returns remaining spins, or 0 when unlimited
  get autoSpinRemaining(): number {
    return this._autoSpinState?.remaining ?? 0
  }

  public setPickUI(ui: PickBonusUI) {
    this._pickUI = ui
  }

  public setOverlay(overlay: WinOverlay) {
    this._overlay = overlay
  }

  public startAutoSpin(config: AutoSpinConfig): void {
    this._autoSpinState = { config, remaining: config.spins }
    if (this._fsm.state === GameUIState.IDLE) {
      this.spin().catch(console.error)
    }
  }

  public stopAutoSpin(): void {
    this._autoSpinState = null
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async showWinAnimation(
    hits: PaylineHit[],
    transposedGrid: number[][],
    totalWin: number,
  ): Promise<void> {
    const scatterCells = this._findScatterCells(transposedGrid)

    const highlightScatters = () => {
      for (const { col, row } of scatterCells) {
        this._reels.highlightCell(col, row, SCATTER_WIN_COLOR)
      }
    }

    if (hits.length === 0 && scatterCells.length >= 2) {
      highlightScatters()
      await this.wait(this._config.winDelay)
      this._reels.clearAllHighlights()
      return
    }

    const msPerLine = Math.max(
      700,
      Math.min(1500, this._config.winDelay / Math.max(hits.length, 1)),
    )
    for (const hit of hits) {
      this._reels.clearAllHighlights()
      highlightScatters()

      for (let col = 0; col < hit.matchCount; col++) {
        const row = PAYLINE_DATA[hit.lineIndex * 5 + col]
        if (row !== undefined) {
          this._reels.highlightCell(col, row, PAYLINE_WIN_COLOR)
        }
      }

      await this.wait(msPerLine)
    }

    this._reels.clearAllHighlights()
  }

  private _findScatterCells(transposedGrid: number[][]): { col: number; row: number }[] {
    const cells: { col: number; row: number }[] = []
    for (let col = 0; col < transposedGrid.length; col++) {
      const reelSyms = transposedGrid[col]!
      for (let row = 0; row < reelSyms.length; row++) {
        if (reelSyms[row] === SCATTER_ID) {
          cells.push({ col, row })
        }
      }
    }
    return cells
  }

  public async spin(): Promise<void> {
    if (this._fsm.state !== GameUIState.IDLE) return

    const wager = new Wager(this._session.betMultiplier, BET_CONFIG)
    if (!this._session.deductWager(wager.totalWager)) {
      console.error('Insufficient balance')
      this._autoSpinState = null
      return
    }

    let cycleWin = 0
    let bonusTriggered = false

    // ── Base spin ─────────────────────────────────────────────────────────
    this._fsm.transitionTo(GameUIState.SPINNING)
    await this._reels.spin()

    const baseResult = this._game.spin(this._rng, wager) as WoodlandWhisperBaseResult
    await this.wait(this._config.spinDelay)

    this._fsm.transitionTo(GameUIState.STOPPING)
    const transposedBase = transposeGrid(baseResult.grid)
    await this._reels.stop(transposedBase)

    cycleWin += baseResult.win
    if (baseResult.win > 0) {
      this._session.addWin(baseResult.win)
      this._fsm.transitionTo(GameUIState.WIN_SHOW)
    }

    if (baseResult.win > 0 || baseResult.sc >= 2) {
      await this.showWinAnimation(baseResult.hits, transposedBase, baseResult.win)
    }

    // ── Pick bonus ────────────────────────────────────────────────────────
    if (baseResult.triggeredPickBonus) {
      bonusTriggered = true
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      await this._overlay?.announce('BONUS!', 1500)
      await this.runPickBonus()
    }

    // ── Free spin loop ────────────────────────────────────────────────────
    if (this._game.state.freeSpins && !baseResult.triggeredPickBonus) {
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      await this._overlay?.announce('FREE SPINS!', 1500)
    }

    while (this._game.state.freeSpins && this._game.state.freeSpins.spinsRemaining > 0) {
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      const freeResult = this._game.next(this._rng) as WoodlandWhisperFreeResult
      await this.runFreeSpin(freeResult)
      cycleWin += freeResult.win

      if (freeResult.retriggeredPickBonus) {
        bonusTriggered = true
        this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
        await this._overlay?.announce('BONUS!', 1500)
        await this.runPickBonus()
      }
    }

    // ── Done ──────────────────────────────────────────────────────────────
    const s = this._fsm.state as GameUIState
    if (
      s === GameUIState.WIN_SHOW ||
      s === GameUIState.STOPPING ||
      s === GameUIState.FEATURE_TRANSITION
    ) {
      this._fsm.transitionTo(GameUIState.IDLE)
    }

    // ── Auto-spin continuation ────────────────────────────────────────────
    if (this._autoSpinState && this._fsm.state === GameUIState.IDLE) {
      const { config } = this._autoSpinState

      if (config.spins > 0) {
        this._autoSpinState.remaining--
      }

      const shouldStop =
        (config.stopOnWin && cycleWin > 0) ||
        (config.stopOnBonus && bonusTriggered) ||
        (config.spins > 0 && this._autoSpinState.remaining <= 0)

      if (shouldStop) {
        this._autoSpinState = null
        // FSM is already IDLE — listeners will sync the HUD
      } else {
        await this.wait(500)
        this.spin().catch(console.error)
      }
    }
  }

  private async runFreeSpin(result: WoodlandWhisperFreeResult): Promise<void> {
    this._fsm.transitionTo(GameUIState.SPINNING)
    this._reels.spin()

    await this.wait(this._config.spinDelay)

    this._fsm.transitionTo(GameUIState.STOPPING)
    const transposed = transposeGrid(result.grid)
    await this._reels.stop(transposed)

    if (result.win > 0) {
      this._session.addWin(result.win)
      this._fsm.transitionTo(GameUIState.WIN_SHOW)
    }

    if (result.win > 0 || result.sc >= 2) {
      await this.showWinAnimation(result.hits, transposed, result.win)
    }
  }

  private async runPickBonus(): Promise<void> {
    if (!this._pickUI) return

    this._pickUI.show()

    await new Promise<void>((resolve) => {
      const onPick = (index: number) => {
        if (!this._game.state.pickBonus) return

        const pickResult = this._game.pickBall(index)

        this._pickUI!.revealCard(pickResult.pick.revealedIndex, pickResult.pick.value)

        if (pickResult.pick.isMatch) {
          this._pickUI!.off('pick', onPick)
          setTimeout(() => {
            this._pickUI!.hide()
            resolve()
          }, 1500)
        }
      }

      this._pickUI!.on('pick', onPick)
    })
  }
}
