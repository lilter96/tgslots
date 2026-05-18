import { Container, Graphics } from 'pixi.js'
import type { ShootdownEvent, ActivationEvent } from '@tgslots/le-militare'
import { ANIMATION_CONFIG } from '../animation-config.js'
import { killAllTweens } from '../helpers/tween-utils.js'
import { drawWires } from './wire-renderer.js'
import { animateActivations } from './activation-animator.js'
import { fireMissile } from './missile.js'
import type { SymbolTransformEvent, MultiplierStickEvent } from './events.js'

export type { SymbolTransformEvent, MultiplierStickEvent }

export class CombatOperationView extends Container {
  private _overlay: Graphics
  private _wires: Graphics

  private _mascotLaunchX = 0
  private _mascotLaunchY = 0
  private _mascotConnX = 0
  private _mascotConnY = 0
  private _wireActiveStates: boolean[] = []

  private _symbolWidth = 0
  private _symbolHeight = 0
  private _reelSpacing = 0
  private _totalHeight = 0
  private _reelScale = 1

  constructor() {
    super()
    this._wires = new Graphics()
    this.addChild(this._wires)
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

  drawWires(
    symbolWidth: number,
    reelSpacing: number,
    totalHeight: number,
    scale: number,
    symbolHeight = 0,
  ): void {
    if (symbolWidth === 0) return
    this._symbolWidth = symbolWidth
    this._reelSpacing = reelSpacing
    this._totalHeight = totalHeight
    this._reelScale = scale
    if (symbolHeight > 0) this._symbolHeight = symbolHeight
    this._redrawWires()
  }

  async animateActivations(activations: readonly ActivationEvent[]): Promise<void> {
    await animateActivations(
      this,
      this._overlay,
      this._wires,
      activations,
      this._symbolWidth,
      this._totalHeight,
      this._reelSpacing,
      this._reelScale,
      this._symbolHeight,
      this._mascotConnX,
      this._mascotConnY,
      this._wireActiveStates,
    )
  }

  async animateShootdowns(
    shootdowns: readonly ShootdownEvent[],
    _activations: readonly ActivationEvent[],
    wildId: number,
  ): Promise<void> {
    if (shootdowns.length === 0) return

    const sw = this._symbolWidth
    const sh = this._symbolHeight
    const rs = this._reelSpacing

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
        onTransform: (reel, row, id) =>
          this.emit('symbol:transform', { reel, row, newSymbolId: id } as SymbolTransformEvent),
        onMultiplierStick: (reel, row, mult, badge) =>
          this.emit('multiplier:stick', {
            reel,
            row,
            multiplier: mult,
            badge,
          } as MultiplierStickEvent),
      })

      const reelRemaining = shootdowns.slice(i + 1).some((other) => other.reel === sd.reel)
      if (!reelRemaining) {
        this._wireActiveStates[sd.reel] = false
        this._redrawWires()
      }

      await new Promise((r) => setTimeout(r, ANIMATION_CONFIG.INTER_MISSILE_PAUSE_MS))
    }
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
    this._redrawWires()
  }

  private _redrawWires(): void {
    drawWires(
      this._wires,
      this._symbolWidth,
      this._reelSpacing,
      this._totalHeight,
      this._reelScale,
      this._mascotConnX,
      this._mascotConnY,
      this._wireActiveStates,
    )
  }
}
