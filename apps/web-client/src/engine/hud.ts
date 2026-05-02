import { Container, Graphics, Text } from 'pixi.js'
import { SessionManager } from './session-manager'
import { GameStateMachine } from './state-machine'
import { GameUIState } from '../types'
import { gsap } from 'gsap'

export class HUD extends Container {
  private _session: SessionManager
  private _fsm: GameStateMachine

  private _balanceText: Text
  private _betText: Text
  private _winText: Text
  private _spinButton: Container
  private _spinLabel: Text

  constructor(session: SessionManager, fsm: GameStateMachine) {
    super()
    this._session = session
    this._fsm = fsm

    this._balanceText = new Text({
      text: '',
      style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' },
    })
    this._betText = new Text({ text: '', style: { fill: '#ffffff', fontSize: 20 } })
    this._winText = new Text({
      text: '',
      style: { fill: '#ffd700', fontSize: 28, fontWeight: 'bold' },
    })

    this._spinButton = new Container()
    this._spinLabel = new Text({
      text: 'SPIN',
      style: { fill: '#ffffff', fontSize: 32, fontWeight: 'bold' },
    })

    this.init()
    this.updateTexts()

    this._fsm.addListener(() => this.onStateChange())
  }

  private init() {
    // Layout (simplified, fixed positions for now)
    this._balanceText.x = 20
    this._balanceText.y = 20
    this.addChild(this._balanceText)

    this._betText.x = 20
    this._betText.y = 60
    this.addChild(this._betText)

    this._winText.x = 400
    this._winText.y = 20
    this._winText.anchor.set(0.5, 0)
    this.addChild(this._winText)

    // Spin Button
    const bg = new Graphics()
    bg.rect(0, 0, 160, 60)
    bg.fill(0xe53935)
    bg.stroke({ width: 2, color: 0xffffff })
    this._spinButton.addChild(bg)

    this._spinLabel.anchor.set(0.5)
    this._spinLabel.x = 80
    this._spinLabel.y = 30
    this._spinButton.addChild(this._spinLabel)

    this._spinButton.x = 700
    this._spinButton.y = 20
    this._spinButton.interactive = true
    this._spinButton.cursor = 'pointer'
    this._spinButton.on('pointerdown', () => this.emit('spin'))

    this.addChild(this._spinButton)
  }

  public updateTexts() {
    this._balanceText.text = `BALANCE: ${this._session.balance}`
    this._betText.text = `BET: ${this._session.betMultiplier}`
    this._winText.text = this._session.lastWin > 0 ? `WIN: ${this._session.lastWin}` : ''
  }

  public animateBalance(target: number) {
    const obj = { val: this._session.balance - this._session.lastWin }
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      onUpdate: () => {
        this._balanceText.text = `BALANCE: ${Math.floor(obj.val)}`
      },
    })
  }

  private onStateChange() {
    const state = this._fsm.state
    this._spinButton.alpha = state === GameUIState.IDLE ? 1 : 0.5
    this._spinButton.interactive = state === GameUIState.IDLE

    if (state === GameUIState.WIN_SHOW) {
      this.updateTexts()
      // Pulse win text
      gsap.fromTo(
        this._winText.scale,
        { x: 1, y: 1 },
        { x: 1.5, y: 1.5, duration: 0.5, yoyo: true, repeat: 3 },
      )
    } else {
      this.updateTexts()
    }
  }
}
