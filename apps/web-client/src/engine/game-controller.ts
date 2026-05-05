import type {
  PaylineHit,
  WoodlandWhisperFreeResult,
  WoodlandWhisperState,
} from '@tgslots/woodland-whisper'
import {
  BET_CONFIG,
  BUY_BONUS_COST_MULTIPLIER,
  PAYLINE_DATA,
  Symbols,
} from '@tgslots/woodland-whisper'
import { Wager } from '@tgslots/slots-core'
import { GameStateMachine } from './state-machine'
import { ReelSet } from './reel-set'
import { SessionManager } from './session-manager'
import { PickBonusUI } from './pick-bonus-ui'
import { WinOverlay } from './win-overlay'
import { GameUIState } from '../types'
import type { AutoSpinConfig } from '../types'
import { APIClient } from './api-client'

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
  private _api = new APIClient()
  private _gameState: WoodlandWhisperState = {
    lastGrid: null,
    freeSpins: null,
    pickBonus: null,
  }
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
  }

  get isFreeSpins(): boolean {
    return !!this._gameState.freeSpins
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

  /**
   * Initializes the game by fetching state from the server.
   * Restores the grid and resumes any active features (Free Spins / Pick Bonus).
   */
  public async init(): Promise<void> {
    const { state } = await this._api.getState()
    this._gameState = state

    // Initialize reels with the last known grid
    if (state.lastGrid) {
      this._reels.setSymbols(transposeGrid(state.lastGrid))
    }

    // Resume Pick Bonus if active
    if (state.pickBonus) {
      this._pickUI!.show()
      this._pickUI!.restoreState(state.pickBonus.userPicks, state.pickBonus.revealedValues)
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      this.runPickBonus().then(() => this.resumeAfterFeature())
      return
    }

    // Resume Free Spins if active
    if (state.freeSpins && state.freeSpins.spinsRemaining > 0) {
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      this.resumeFreeSpins().then(() => this.resumeAfterFeature())
      return
    }
  }

  private async resumeFreeSpins(): Promise<void> {
    while (this._gameState.freeSpins && this._gameState.freeSpins.spinsRemaining > 0) {
      const { result, state } = await this._api.freeSpin()
      this._gameState = state
      await this.runFreeSpin(result)

      if (result.retriggeredPickBonus) {
        this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
        await this._overlay?.announce('BONUS!', 1500)
        await this.runPickBonus()
      }
    }
  }

  private resumeAfterFeature(): void {
    if (this._fsm.state !== GameUIState.IDLE) {
      this._fsm.transitionTo(GameUIState.IDLE)
    }
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
    _totalWin: number,
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
    this._reels.spin()

    const { result, state } = await this._api.spin(this._session.betMultiplier)
    const baseResult = result
    this._gameState = state

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
    if (this._gameState.freeSpins && this._gameState.freeSpins.spinsRemaining > 0) {
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      await this._overlay?.announce('FREE SPINS!', 1500)
      await this.resumeFreeSpins()
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

  public async buyBonus(): Promise<void> {
    if (this._fsm.state !== GameUIState.IDLE) return

    const wager = new Wager(this._session.betMultiplier, BET_CONFIG)
    const buyCost = wager.totalWager * BUY_BONUS_COST_MULTIPLIER
    if (!this._session.deductWager(buyCost)) {
      console.error('Insufficient balance for buy bonus')
      return
    }

    // ── Guaranteed-scatter spin ────────────────────────────────────────────
    this._fsm.transitionTo(GameUIState.SPINNING)
    this._reels.spin()

    const { result, state } = await this._api.buyBonus(this._session.betMultiplier)
    const buyResult = result
    this._gameState = state

    await this.wait(this._config.spinDelay)

    this._fsm.transitionTo(GameUIState.STOPPING)
    const transposedBuy = transposeGrid(buyResult.grid)
    await this._reels.stop(transposedBuy)

    if (buyResult.win > 0) {
      this._session.addWin(buyResult.win)
      this._fsm.transitionTo(GameUIState.WIN_SHOW)
    }

    if (buyResult.win > 0 || buyResult.sc >= 2) {
      await this.showWinAnimation(buyResult.hits, transposedBuy, buyResult.win)
    }

    // ── Pick bonus (always triggered) ─────────────────────────────────────
    this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
    await this._overlay?.announce('BONUS!', 1500)
    await this.runPickBonus()

    // ── Free spin loop ─────────────────────────────────────────────────────
    if (this._gameState.freeSpins) {
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      await this._overlay?.announce('FREE SPINS!', 1500)
    }

    if (this._gameState.freeSpins && this._gameState.freeSpins.spinsRemaining > 0) {
      this._fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
      await this.resumeFreeSpins()
    }

    const s = this._fsm.state as GameUIState
    if (
      s === GameUIState.WIN_SHOW ||
      s === GameUIState.STOPPING ||
      s === GameUIState.FEATURE_TRANSITION
    ) {
      this._fsm.transitionTo(GameUIState.IDLE)
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
      const onPick = async (index: number) => {
        if (!this._gameState.pickBonus) return

        const { result, state } = await this._api.pick(index)
        const pickResult = result
        this._gameState = state

        this._pickUI!.revealCard(index, pickResult.pick.value)

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
