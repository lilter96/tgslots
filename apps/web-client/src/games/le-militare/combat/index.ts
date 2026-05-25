import { Container, Graphics } from 'pixi.js'
import type { ShootdownEvent, ActivationEvent } from '@tgslots/le-militare'
import type { GameEventBus } from '../../../engine/event-bus.js'
import { ANIMATION_CONFIG } from '../animation-config.js'
import { killAllTweens } from '../helpers/tween-utils.js'
import { drawWires } from './wire-renderer.js'
import { animateActivations } from './activation-animator.js'
import { fireMissile } from './missile.js'
import { playAirRaid } from './air-raid.js'
import type { AirRaidPlacement } from '@tgslots/le-militare'
import type { CombatLayout } from './combat-layout.js'

export class CombatOperationView extends Container {
  private _bus: GameEventBus
  private _overlay: Graphics
  private _wires: Graphics
  private _current: Graphics

  private _mascotLaunchX = 0
  private _mascotLaunchY = 0
  private _mascotConnX = 0
  private _mascotConnY = 0
  private _wireActiveStates: boolean[] = []

  private _layout: CombatLayout = {
    symbolWidth: 0,
    symbolHeight: 0,
    reelSpacing: 0,
    totalHeight: 0,
    scale: 1,
  }

  constructor(bus: GameEventBus) {
    super()
    this._bus = bus
    this._wires = new Graphics()
    this.addChild(this._wires)
    this._current = new Graphics()
    this.addChild(this._current)
    this._overlay = new Graphics()
    this.addChild(this._overlay)
  }

  setMascotData(lx: number, ly: number, cx: number, cy: number, reelCount: number): void {
    this._mascotLaunchX = lx
    this._mascotLaunchY = ly
    this._mascotConnX = cx
    this._mascotConnY = cy
    if (this._wireActiveStates.length !== reelCount) {
      this._wireActiveStates = new Array(reelCount).fill(false)
    }
  }

  clearPersistentMultipliers(): void {
    this._deactivateWires()
  }

  deactivateAllWires(): void {
    this._deactivateWires()
  }

  drawWires(layout: CombatLayout): void {
    if (layout.symbolWidth === 0) return
    this._layout = layout
    this._redrawWires()
  }

  async animateActivations(activations: readonly ActivationEvent[]): Promise<void> {
    await animateActivations(
      this,
      this._overlay,
      this._wires,
      this._current,
      activations,
      this._layout,
      this._mascotConnX,
      this._mascotConnY,
      this._wireActiveStates,
    )
  }

  // Light up cables for already-armed reels (e.g. carried into a free spin) as a
  // steady powered line, without replaying the travelling-current animation.
  energizeReels(reels: Iterable<number>): void {
    let changed = false
    for (const reel of reels) {
      if (reel >= 0 && reel < this._wireActiveStates.length && !this._wireActiveStates[reel]) {
        this._wireActiveStates[reel] = true
        changed = true
      }
    }
    if (changed) this._redrawWires()
  }

  async animateShootdowns(
    shootdowns: readonly ShootdownEvent[],
    _activations: readonly ActivationEvent[],
    wildId: number,
  ): Promise<void> {
    if (shootdowns.length === 0) return

    const { symbolWidth: sw, symbolHeight: sh, reelSpacing: rs } = this._layout

    for (let i = 0; i < shootdowns.length; i++) {
      const sd = shootdowns[i]!
      await fireMissile({
        parent: this,
        lx: this._mascotLaunchX,
        ly: this._mascotLaunchY,
        tx: sd.reel * (sw + rs) + sw / 2,
        ty: sd.row * sh + sh / 2,
        sw,
        sh,
        reel: sd.reel,
        row: sd.row,
        multiplier: sd.multiplier,
        wildId,
        bus: this._bus,
      })

      const reelRemaining = shootdowns.slice(i + 1).some((other) => other.reel === sd.reel)
      if (!reelRemaining) {
        this._wireActiveStates[sd.reel] = false
        this._redrawWires()
      }

      await new Promise((r) => setTimeout(r, ANIMATION_CONFIG.INTER_MISSILE_PAUSE_MS))
    }
  }

  async animateAirRaid(placements: readonly AirRaidPlacement[], wildId: number): Promise<void> {
    if (placements.length === 0 || this._layout.symbolWidth === 0) return
    const { symbolWidth: sw, symbolHeight: sh, reelSpacing: rs } = this._layout
    await playAirRaid({
      parent: this,
      lx: this._mascotLaunchX,
      ly: this._mascotLaunchY,
      sw,
      sh,
      rs,
      reelCount: this._wireActiveStates.length,
      placements,
      wildId,
      bus: this._bus,
    })
  }

  override destroy(options?: {
    children?: boolean
    texture?: boolean
    baseTexture?: boolean
  }): void {
    killAllTweens(this)
    super.destroy(options)
  }

  private _deactivateWires(): void {
    this._wireActiveStates.fill(false)
    this._current.clear()
    this._redrawWires()
  }

  private _redrawWires(): void {
    const { symbolWidth, reelSpacing, totalHeight, scale } = this._layout
    drawWires(
      this._wires,
      symbolWidth,
      reelSpacing,
      totalHeight,
      scale,
      this._mascotConnX,
      this._mascotConnY,
      this._wireActiveStates,
    )
  }
}
