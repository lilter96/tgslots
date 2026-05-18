import { Graphics, Sprite } from 'pixi.js'
import type { Texture } from 'pixi.js'
import type { GameRuntime, GameUIContext } from '../../engine/game-client.js'
import type { UILayoutSnapshot } from '../../engine/layout.js'
import { ReelSet } from '../../engine/reel-set.js'
import { WinOverlay } from '../../engine/win-overlay.js'
import { Symbols } from '@tgslots/le-militare'
import type { LeMilitareResult } from '@tgslots/le-militare'
import type { LeMilitareSerializedState } from '@tgslots/shared-contracts/states'
import { manifest } from './manifest.js'
import { ANIMATION_CONFIG } from './animation-config.js'
import { transposeGrid, decodePosition } from './helpers/grid-transform.js'
import { groupHitsBySymbol } from './helpers/cluster-grouping.js'
import { deriveFreeCarryOverMultiplier } from './helpers/free-spins-math.js'
import { projectMascotPointsToCombatLocal } from './helpers/mascot-projection.js'
import { derivePresentPlan, type PresentPlan } from './helpers/present-plan.js'
import { getSpinSpeedProfile } from '../../engine/spin-speed.js'
import type { SpinSpeedProfile } from '../../engine/spin-speed.js'
import {
  CombatOperationView,
  type SymbolTransformEvent,
  type MultiplierStickEvent,
} from './combat/index.js'
import { MultiplierHud } from './multiplier-hud.js'
import { BuyBonusControl } from './buy-bonus-control.js'
import { S300Mascot } from './mascot/index.js'
import { ReelFrame } from './reel-frame/reel-frame.js'

const CLUSTER_WIN_COLOR = 0xd4af37
const SCATTER_WIN_COLOR = 0xff4444
const SCATTER_ID = Symbols['SCATTER']!
const WILD_ID = Symbols['WILD']!

const GRID_CONFIG = {
  reels: manifest.grid.reels,
  rows: manifest.grid.rows,
  reelSpacing: 4,
}
const REEL_CONFIG = {
  symbolWidth: manifest.symbolSize,
  symbolHeight: manifest.symbolSize,
  visibleSymbols: manifest.grid.rows,
  totalSymbols: 7,
}

export class LeMilitareRuntime implements GameRuntime<'le-militare'> {
  private _ctx!: GameUIContext<'le-militare'>
  private _reelSet!: ReelSet
  private _overlay!: WinOverlay
  private _bgSprite!: Sprite
  private _bgTex!: Texture
  private _mask!: Graphics
  private _frame!: ReelFrame
  private _layout?: UILayoutSnapshot
  private _spinSpeedProfile: SpinSpeedProfile = getSpinSpeedProfile('normal')
  private _combatOpView!: CombatOperationView
  private _multiplierHud!: MultiplierHud
  private _buyBonusControl?: BuyBonusControl
  private _mascot!: S300Mascot

  async init(ctx: GameUIContext<'le-militare'>): Promise<void> {
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

    this._combatOpView = new CombatOperationView()
    ctx.scene.reels.addChild(this._combatOpView)

    this._combatOpView.on('symbol:transform', (e: SymbolTransformEvent) => {
      this._reelSet.setSymbolAt(e.reel, e.row, e.newSymbolId)
    })
    this._combatOpView.on('multiplier:stick', (e: MultiplierStickEvent) => {
      const sym = this._reelSet.getReel(e.reel).getSymbolAt(e.row)
      if (sym) {
        sym.multiplierContainer.addChild(e.badge)
      } else {
        e.badge.destroy({ children: true })
      }
    })

    this._multiplierHud = new MultiplierHud()
    ctx.scene.overlays.addChild(this._multiplierHud)

    this._buyBonusControl = new BuyBonusControl(ctx.eventBus, ctx.fsm, 100)
    ctx.hud.slot('control-right').addChild(this._buyBonusControl)

    this._frame = new ReelFrame({
      reels: GRID_CONFIG.reels,
      rows: GRID_CONFIG.rows,
      symbolSize: REEL_CONFIG.symbolWidth,
      reelSpacing: GRID_CONFIG.reelSpacing,
    })
    ctx.scene.reels.addChild(this._frame)

    this._mascot = new S300Mascot()
    ctx.scene.background.addChild(this._mascot)

    this._overlay = new WinOverlay()
    this._overlay.setGame(ctx.assets, [...manifest.winTiers])
    ctx.scene.overlays.addChild(this._overlay)
  }

  applyState(state: LeMilitareSerializedState): void {
    const remaining = state.freeSpins?.spinsRemaining ?? 0
    this._ctx.eventBus.emit('free-spins:updated', { remaining })
    this._multiplierHud.setValue(state.freeSpins?.multiplierSum ?? 1)
  }

  async presentResult(
    _action: keyof { spin: unknown; buybonus: unknown; freespin: unknown; state: unknown },
    result: LeMilitareResult,
  ): Promise<void> {
    this._combatOpView.clearPersistentMultipliers()
    await this._present(result, derivePresentPlan(result))
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

    this._combatOpView.scale.set(reelScale)
    this._combatOpView.x = layout.reelBounds.x
    this._combatOpView.y = layout.reelBounds.y

    this._multiplierHud.x = layout.reelBounds.x + layout.reelBounds.width - 60 * reelScale
    this._multiplierHud.y = layout.reelBounds.y - 40 * reelScale
    this._multiplierHud.scale.set(reelScale)

    this._mask.clear()
    this._mask
      .rect(
        layout.reelBounds.x,
        layout.reelBounds.y,
        layout.reelBounds.width,
        layout.reelBounds.height,
      )
      .fill(0xffffff)

    this._frame.update(layout, reelScale)

    this._overlay.resize(layout)
    this._mascot.resize(layout)

    const lp = this._mascot.getLaunchPoint()
    const cp = this._mascot.getConnectionPoint()
    const proj = projectMascotPointsToCombatLocal({
      mascotX: this._mascot.x,
      mascotY: this._mascot.y,
      mascotScale: this._mascot.scale.x,
      launchPoint: lp,
      connectionPoint: cp,
      combatViewX: this._combatOpView.x,
      combatViewY: this._combatOpView.y,
      reelScale,
    })

    this._combatOpView.setMascotData(
      proj.launchLocalX,
      proj.launchLocalY,
      proj.connectionLocalX,
      proj.connectionLocalY,
      GRID_CONFIG.reels,
    )
    this._combatOpView.drawWires(
      REEL_CONFIG.symbolWidth,
      GRID_CONFIG.reelSpacing,
      REEL_CONFIG.visibleSymbols * REEL_CONFIG.symbolHeight,
      1, // draw in design space, container scale handles the rest
      REEL_CONFIG.symbolHeight,
    )
  }

  destroy(): void {
    // FIX 2.4: destroy combat-op view before reel set so in-flight badge/missile tweens
    // targeting SymbolViews are killed before those views are torn down.
    this._combatOpView.removeAllListeners('symbol:transform')
    this._combatOpView.removeAllListeners('multiplier:stick')
    this._combatOpView.destroy({ children: true })
    this._multiplierHud.destroy({ children: true })
    this._reelSet.destroy({ children: true })
    this._overlay.destroy({ children: true })
    this._bgSprite.destroy()
    this._mask.destroy()
    this._frame.destroy()
    this._buyBonusControl?.destroy({ children: true })
    this._mascot.destroy({ children: true })
  }

  syncSpinSpeed(profile: SpinSpeedProfile): void {
    this._spinSpeedProfile = profile
    this._reelSet.syncSpinSpeed(profile)
    this._overlay.syncSpinSpeed(profile)
  }

  private async _present(result: LeMilitareResult, plan: PresentPlan): Promise<void> {
    if (plan.preAnnounce) {
      await this._overlay.announce(plan.preAnnounce.text, plan.preAnnounce.ms)
    }
    this._reelSet.spin()
    await this._wait(this._spinSpeedProfile.reelSpinMs)
    await this._reelSet.stop(transposeGrid(result.steps[0]?.preCombatGrid ?? []))

    await this._playCascadeSteps(result)

    if (plan.retriggerAnnounce) {
      await this._overlay.announce(plan.retriggerAnnounce.text, plan.retriggerAnnounce.ms)
    }

    if (result.win > 0) {
      this._ctx.eventBus.emit('win:awarded', {
        amount: result.win,
        multiplierX: result.multiplierSum,
      })
      await this._overlay.announceWin(result.win, this._ctx.session.lastWager)
    }
  }

  private async _playCascadeSteps(result: LeMilitareResult): Promise<void> {
    this._reelSet.clearAllMultipliers()

    // For FREE spins, HUD shows the carry-over multiplier from earlier spins in the session
    let currentMultiplier = deriveFreeCarryOverMultiplier(result)
    // FIX 2.3: push carry value immediately so HUD is correct even when the first
    // step has no shootdowns (otherwise the HUD lags until the first multiplier event).
    this._multiplierHud.setValue(currentMultiplier)

    const hasAnyCombatOp = result.steps.some((s) => s.activations.length > 0)

    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i]!

      // ── Combat Operation ──────────────────────────────────────────────────
      // Animate S300 column flash then plane shootdowns (in sequence per activation,
      // shootdowns fire in parallel for all planes on this step).
      if (step.activations.length > 0) {
        void this._mascot.triggerS300Feature()
        await this._combatOpView.animateActivations(step.activations)
      }
      if (step.shootdowns.length > 0) {
        await this._combatOpView.animateShootdowns(step.shootdowns, step.activations, WILD_ID)
        for (const sd of step.shootdowns) currentMultiplier += sd.multiplier
        this._multiplierHud.setValue(currentMultiplier)
      }
      // Snap grid to postCombatGrid (giant wilds + multiplier wilds now visible)
      if (step.activations.length > 0 || step.shootdowns.length > 0) {
        this._reelSet.setSymbols(transposeGrid(step.postCombatGrid))
        await this._wait(ANIMATION_CONFIG.POST_COMBAT_SETTLE_MS)
      }

      // ── No cluster hits → terminal step ───────────────────────────────────
      if (step.hits.length === 0) break

      // ── Cluster win highlights ────────────────────────────────────────────
      // Group hits by symbol type so we highlight one symbol group at a time.
      const hitsBySymbol = groupHitsBySymbol(step.hits)

      for (const [, hits] of hitsBySymbol) {
        for (const hit of hits) {
          for (const encoded of hit.positions) {
            const { reel, row } = decodePosition(encoded, GRID_CONFIG.rows)
            this._reelSet.highlightCell(reel, row, CLUSTER_WIN_COLOR)
          }
        }
        await this._wait(this._spinSpeedProfile.lineHighlightMinMs)
        this._reelSet.clearAllHighlights()
      }

      // ── Cascade animation ─────────────────────────────────────────────────
      // If a next step exists, animate vanished symbols falling out and new ones
      // falling in to reach the next step's preCombatGrid.
      const nextStep = result.steps[i + 1]
      if (nextStep) {
        await this._reelSet.cascadeGrid(
          step.vanishedPositions,
          transposeGrid(nextStep.preCombatGrid),
          GRID_CONFIG.rows,
        )
      }
    }

    // ── Final grid ────────────────────────────────────────────────────────────
    const lastStep = result.steps[result.steps.length - 1]
    if (lastStep) {
      this._reelSet.setSymbols(transposeGrid(lastStep.postCombatGrid))
    }

    // ── Scatter highlight (if free spins triggered) ───────────────────────────
    if (result.scatterCount > 0) {
      const finalGrid = lastStep?.postCombatGrid ?? []
      for (let reel = 0; reel < GRID_CONFIG.reels; reel++) {
        for (let row = 0; row < GRID_CONFIG.rows; row++) {
          if (finalGrid[row]?.[reel] === SCATTER_ID) {
            this._reelSet.highlightCell(reel, row, SCATTER_WIN_COLOR)
          }
        }
      }
      await this._wait(this._spinSpeedProfile.scatterHighlightMs)
      this._reelSet.clearAllHighlights()
    }

    // Retract launcher after all animations if it was deployed this spin
    if (hasAnyCombatOp) {
      this._combatOpView.deactivateAllWires()
      void this._mascot.retractLauncher()
    }
  }

  private _wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
