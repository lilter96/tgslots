import { Container, Graphics, Text } from 'pixi.js'
import type { DestroyOptions } from 'pixi.js'
import type { GameEventBus } from '../../engine/event-bus.js'
import type { GameStateMachine } from '../../engine/state-machine.js'
import { GameUIState } from '../../types.js'

const CONTROL_W = 120
const CONTROL_H = 60
const TITLE_TEXT = 'BUY BONUS'

export interface BuyBonusControlState {
  readonly uiState: GameUIState
  readonly isAutoSpin: boolean
  readonly freeSpinsRemaining: number
}

export class BuyBonusControl extends Container {
  private readonly _background = new Graphics()
  private readonly _title = new Text({
    text: TITLE_TEXT,
    style: {
      fontFamily: 'serif',
      fill: '#ffffff',
      fontSize: 14,
      fontWeight: '900',
    },
  })
  private readonly _subtitle: Text
  private readonly _unsubs: Array<() => void> = []

  private _freeSpinsRemaining = 0
  private _isAutoSpin = false

  constructor(eventBus: GameEventBus, fsm: GameStateMachine, costMultiplier: number) {
    super()

    this._subtitle = new Text({
      text: `${costMultiplier}x BET`,
      style: {
        fontFamily: 'serif',
        fill: '#d4af37',
        fontSize: 10,
        fontWeight: '700',
      },
    })

    this._build()
    this._sync(fsm.state)

    this._unsubs.push(
      fsm.addListener((state) => {
        this._sync(state)
      }),
      eventBus.on('auto-spin:updated', ({ active }) => {
        this._isAutoSpin = active
        this._sync(fsm.state)
      }),
      eventBus.on('free-spins:updated', ({ remaining }) => {
        this._freeSpinsRemaining = remaining
        this._sync(fsm.state)
      }),
    )

    this.on('pointerdown', () => {
      if (!this.eventMode || this.eventMode !== 'static') return
      eventBus.emit('buy-bonus:requested', {})
    })
  }

  override destroy(options?: DestroyOptions): void {
    for (const unsub of this._unsubs) unsub()
    this._unsubs.length = 0
    super.destroy(options)
  }

  private _build(): void {
    this._title.anchor.set(0.5)
    this._title.x = CONTROL_W / 2
    this._title.y = 18

    this._subtitle.anchor.set(0.5)
    this._subtitle.x = CONTROL_W / 2
    this._subtitle.y = 42

    this.cursor = 'pointer'
    this.addChild(this._background, this._title, this._subtitle)
  }

  private _sync(uiState: GameUIState): void {
    const enabled =
      uiState === GameUIState.IDLE && !this._isAutoSpin && this._freeSpinsRemaining <= 0

    this.alpha = enabled ? 1 : 0.45
    this.eventMode = enabled ? 'static' : 'none'
    this._drawBackground(enabled)
  }

  private _drawBackground(enabled: boolean): void {
    this._background.clear()
    this._background.roundRect(0, 0, CONTROL_W, CONTROL_H, 4)
    this._background.fill(enabled ? 0xc41e1e : 0x4a1010)
    this._background.stroke({ width: 2, color: 0xd4af37 })
  }
}
