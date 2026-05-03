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

  private _buyBonusBtn: Container
  private _buyBonusBtnBg: Graphics

  private _autoBtn: Container
  private _autoBtnBg: Graphics
  private _autoBtnCount: Text  // large — shows count or "AUTO"
  private _autoBtnHint: Text   // small — shows "TAP TO STOP" when active

  private _autoSpinActive = false

  constructor(session: SessionManager, fsm: GameStateMachine) {
    super()
    this._session = session
    this._fsm = fsm

    this._balanceText = new Text({
      text: '',
      style: { fill: '#ffffff', fontSize: 24, fontWeight: 'bold' },
    })
    this._betText = new Text({ text: '', style: { fill: '#aaaaaa', fontSize: 20 } })
    this._winText = new Text({
      text: '',
      style: { fill: '#ffd700', fontSize: 28, fontWeight: 'bold' },
    })

    this._spinButton = new Container()
    this._spinLabel = new Text({
      text: 'SPIN',
      style: { fill: '#ffffff', fontSize: 32, fontWeight: 'bold' },
    })

    this._autoBtn = new Container()
    this._autoBtnBg = new Graphics()
    this._autoBtnCount = new Text({
      text: 'AUTO',
      style: { fill: '#ffffff', fontSize: 22, fontWeight: 'bold' },
    })
    this._autoBtnHint = new Text({
      text: 'TAP TO STOP',
      style: { fill: '#ffcc80', fontSize: 11 },
    })

    this._buyBonusBtn = new Container()
    this._buyBonusBtnBg = new Graphics()

    this._build()
    this.updateTexts()
    this._fsm.addListener(() => this._onStateChange())
  }

  private _build() {
    // ── Info texts (top-left) ─────────────────────────────────────────────
    this._balanceText.x = 20
    this._balanceText.y = 20
    this.addChild(this._balanceText)

    this._betText.x = 20
    this._betText.y = 56
    this.addChild(this._betText)

    this._winText.x = 400
    this._winText.y = 20
    this._winText.anchor.set(0.5, 0)
    this.addChild(this._winText)

    // ── Spin button ───────────────────────────────────────────────────────
    const spinBg = new Graphics()
    spinBg.roundRect(0, 0, 160, 60, 10)
    spinBg.fill(0xc62828)
    spinBg.stroke({ width: 2, color: 0xff6666 })
    this._spinButton.addChild(spinBg)

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

    // ── Buy Bonus button ──────────────────────────────────────────────────
    this._buyBonusBtnBg.roundRect(0, 0, 160, 60, 10)
    this._buyBonusBtnBg.fill(0xb8860b)
    this._buyBonusBtnBg.stroke({ width: 2, color: 0xffd700 })
    this._buyBonusBtn.addChild(this._buyBonusBtnBg)

    const buyBonusLabel = new Text({
      text: 'BUY BONUS',
      style: { fill: '#ffffff', fontSize: 22, fontWeight: 'bold' },
    })
    buyBonusLabel.anchor.set(0.5)
    buyBonusLabel.x = 80
    buyBonusLabel.y = 22
    this._buyBonusBtn.addChild(buyBonusLabel)

    const buyBonusCostLabel = new Text({
      text: '100× BET',
      style: { fill: '#ffd700', fontSize: 13 },
    })
    buyBonusCostLabel.anchor.set(0.5)
    buyBonusCostLabel.x = 80
    buyBonusCostLabel.y = 44
    this._buyBonusBtn.addChild(buyBonusCostLabel)

    this._buyBonusBtn.x = 876
    this._buyBonusBtn.y = 20
    this._buyBonusBtn.interactive = true
    this._buyBonusBtn.cursor = 'pointer'
    this._buyBonusBtn.on('pointerdown', () => this.emit('buyBonus'))
    this.addChild(this._buyBonusBtn)

    // ── Auto button ───────────────────────────────────────────────────────
    this._drawAutoBtnBg(false)

    this._autoBtnCount.anchor.set(0.5)
    this._autoBtnCount.x = 60
    this._autoBtnCount.y = 24

    this._autoBtnHint.anchor.set(0.5)
    this._autoBtnHint.x = 60
    this._autoBtnHint.y = 47
    this._autoBtnHint.visible = false

    this._autoBtn.addChild(this._autoBtnBg, this._autoBtnCount, this._autoBtnHint)
    this._autoBtn.x = 544
    this._autoBtn.y = 20
    this._autoBtn.interactive = true
    this._autoBtn.cursor = 'pointer'
    this._autoBtn.on('pointerdown', () => {
      if (this._autoSpinActive) {
        this.emit('stopAutoSpin')
      } else {
        this.emit('autoSpin')
      }
    })
    this.addChild(this._autoBtn)
  }

  private _drawAutoBtnBg(active: boolean) {
    this._autoBtnBg.clear()
    this._autoBtnBg.roundRect(0, 0, 120, 60, 10)
    if (active) {
      this._autoBtnBg.fill(0xe65100) // deep orange — "something is running"
      this._autoBtnBg.stroke({ width: 2, color: 0xffab40 })
    } else {
      this._autoBtnBg.fill(0x1a2a3a) // dark neutral — opens a panel
      this._autoBtnBg.stroke({ width: 1.5, color: 0x4466aa })
    }
  }

  // Called by main.ts after every spin cycle (FSM → IDLE) and after user action
  public syncAutoSpin(isActive: boolean, remaining: number) {
    this._autoSpinActive = isActive
    this._drawAutoBtnBg(isActive)

    if (isActive) {
      const countLabel = remaining === 0 ? '∞' : remaining.toString()
      this._autoBtnCount.text = countLabel
      this._autoBtnCount.y = 20
      this._autoBtnHint.visible = true
    } else {
      this._autoBtnCount.text = 'AUTO'
      this._autoBtnCount.y = 24
      this._autoBtnHint.visible = false
    }

    this._refreshButtonStates()
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

  private _refreshButtonStates() {
    const idle = this._fsm.state === GameUIState.IDLE

    // SPIN: only usable when idle and no auto-spin running
    const spinEnabled = idle && !this._autoSpinActive
    this._spinButton.alpha = spinEnabled ? 1 : 0.4
    this._spinButton.interactive = spinEnabled

    // BUY BONUS: only usable when idle and no auto-spin running
    this._buyBonusBtn.alpha = spinEnabled ? 1 : 0.4
    this._buyBonusBtn.interactive = spinEnabled

    // AUTO button: always reachable when auto-spin is active (user can stop mid-spin);
    // otherwise only when idle
    const autoEnabled = this._autoSpinActive || idle
    this._autoBtn.alpha = autoEnabled ? 1 : 0.5
    this._autoBtn.interactive = autoEnabled
  }

  private _onStateChange() {
    const state = this._fsm.state

    if (state === GameUIState.WIN_SHOW) {
      this.updateTexts()
      gsap.fromTo(
        this._winText.scale,
        { x: 1, y: 1 },
        { x: 1.5, y: 1.5, duration: 0.5, yoyo: true, repeat: 3 },
      )
    } else {
      this.updateTexts()
    }

    this._refreshButtonStates()
  }
}
