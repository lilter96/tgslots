import { Container } from 'pixi.js'
import type { UILayoutSnapshot } from '../../../engine/layout.js'
import { PALETTE } from './palette.js'
import { GND, NATURAL_W, NATURAL_H } from './design.js'
import { drawChassis } from './draw-chassis.js'
import { drawRadar } from './draw-radar.js'
import { drawLauncher } from './draw-launcher.js'
import {
  startIdleTweens,
  startDeployedIdleTweens,
  createDeployTimeline,
  createRetractTween,
} from './tweens.js'
import type { IdleTweens } from './tweens.js'
import { computeLaunchPoint, computeConnectionPoint } from './geometry.js'
import { killAllTweens } from '../helpers/tween-utils.js'

export class S300Mascot extends Container {
  readonly masterContainer: Container
  readonly chassisContainer: Container
  readonly radarContainer: Container
  readonly launcherContainer: Container

  private _idle: IdleTweens | null = null
  private _isDeployed = false
  private _deployPromise: Promise<void> | null = null
  private _retractPromise: Promise<void> | null = null

  constructor() {
    super()

    this.masterContainer = new Container()
    this.chassisContainer = new Container()
    this.radarContainer = new Container()
    this.launcherContainer = new Container()

    this.masterContainer.addChild(this.chassisContainer)
    this.masterContainer.addChild(this.radarContainer)
    this.masterContainer.addChild(this.launcherContainer)
    this.addChild(this.masterContainer)

    drawChassis(this.chassisContainer, PALETTE)
    drawRadar(this.radarContainer, PALETTE)
    drawLauncher(this.launcherContainer, PALETTE)
    this._idle = startIdleTweens(this.masterContainer, this.radarContainer)
  }

  resize(layout: UILayoutSnapshot): void {
    const rightEdge = layout.reelBounds.x + layout.reelBounds.width
    const availW = layout.screenWidth - rightEdge - layout.safePadding
    const availH = layout.reelBounds.height

    if (availW < 80) {
      this.visible = false
      return
    }
    this.visible = true

    const scale = Math.min(availW / NATURAL_W, availH / NATURAL_H, 1.0)
    this.scale.set(scale)
    this.x = rightEdge - 82 * scale
    this.y = layout.reelBounds.y + layout.reelBounds.height - GND * scale
  }

  getLaunchPoint(): { x: number; y: number } {
    return computeLaunchPoint(this.masterContainer.x, this.masterContainer.y, this._isDeployed)
  }

  getConnectionPoint(): { x: number; y: number } {
    return computeConnectionPoint(this.masterContainer.x, this.masterContainer.y)
  }

  async triggerS300Feature(): Promise<void> {
    if (this._isDeployed) return this._deployPromise ?? Promise.resolve()
    // Wait for any in-progress retraction before deploying
    if (this._retractPromise) await this._retractPromise
    this._isDeployed = true
    this._killIdle()

    this._deployPromise = new Promise<void>((resolve) => {
      createDeployTimeline(this.masterContainer, this.launcherContainer, () => {
        this._idle = startDeployedIdleTweens(this.masterContainer, this.radarContainer)
        this._deployPromise = null
        resolve()
      })
    })
    return this._deployPromise
  }

  async retractLauncher(): Promise<void> {
    if (!this._isDeployed) return this._retractPromise ?? Promise.resolve()
    // Wait for any in-progress deploy before retracting
    if (this._deployPromise) await this._deployPromise
    this._isDeployed = false
    this._killIdle()

    this._retractPromise = new Promise<void>((resolve) => {
      createRetractTween(this.launcherContainer, () => {
        this._idle = startIdleTweens(this.masterContainer, this.radarContainer)
        this._retractPromise = null
        resolve()
      })
    })
    return this._retractPromise
  }

  override destroy(options?: { children?: boolean; texture?: boolean }): void {
    this._killIdle()
    killAllTweens(this)
    super.destroy(options)
  }

  private _killIdle(): void {
    this._idle?.bob.kill()
    this._idle?.radar.kill()
    this._idle = null
  }
}
