import { Container, Graphics, Text } from 'pixi.js'
import { SessionManager } from './session-manager'
import { GameStateMachine } from './state-machine'
import { GameUIState } from '../types'
import { gsap } from 'gsap'

const FONT_DISPLAY = 'Cinzel, serif'

function woodPanel(w: number, h: number): Graphics {
  const g = new Graphics()
  g.roundRect(0, 0, w, h, 8)
  g.fill(0x2a1608)
  g.roundRect(0, 0, w, h, 8)
  g.stroke({ width: 2, color: 0xd4a017 })
  g.roundRect(3, 3, w - 6, h - 6, 6)
  g.stroke({ width: 0.8, color: 0xffe066, alpha: 0.3 })
  return g
}

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
  private _autoBtnCount: Text
  private _autoBtnHint: Text

  private _autoSpinActive = false

  constructor(session: SessionManager, fsm: GameStateMachine) {
    super()
    this._session = session
    this._fsm = fsm

    this._balanceText = new Text({
      text: '',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffe066', fontSize: 20, fontWeight: '700' },
    })
    this._betText = new Text({
      text: '',
      style: { fontFamily: FONT_DISPLAY, fill: '#c8a060', fontSize: 16 },
    })
    this._winText = new Text({
      text: '',
      style: {
        fontFamily: FONT_DISPLAY,
        fill: '#ffe066',
        fontSize: 22,
        fontWeight: '700',
        stroke: { color: '#5a3a00', width: 3 },
      },
    })

    this._spinButton = new Container()
    this._spinLabel = new Text({
      text: 'SPIN',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffe066', fontSize: 20, fontWeight: '900' },
    })

    this._autoBtn = new Container()
    this._autoBtnBg = new Graphics()
    this._autoBtnCount = new Text({
      text: 'AUTO',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffe066', fontSize: 16, fontWeight: '700' },
    })
    this._autoBtnHint = new Text({
      text: 'STOP',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffcc80', fontSize: 10 },
    })

    this._buyBonusBtn = new Container()
    this._buyBonusBtnBg = new Graphics()

    this._build()
    this.updateTexts()
    this._fsm.addListener(() => this._onStateChange())
  }

  private _build() {
    // ── Balance panel (top-left) ──────────────────────────────────────────
    const balPanel = woodPanel(200, 68)
    balPanel.x = 16
    balPanel.y = 16
    this.addChild(balPanel)

    this._balanceText.x = 100
    this._balanceText.y = 18
    this._balanceText.anchor.set(0.5, 0)
    this.addChild(this._balanceText)

    this._betText.x = 100
    this._betText.y = 44
    this._betText.anchor.set(0.5, 0)
    this.addChild(this._betText)

    // ── Win panel (top-center) ────────────────────────────────────────────
    const winPanel = woodPanel(200, 68)
    winPanel.x = 300
    winPanel.y = 16
    this.addChild(winPanel)

    this._winText.x = 400
    this._winText.y = 30
    this._winText.anchor.set(0.5, 0)
    this.addChild(this._winText)

    // ── Auto button ───────────────────────────────────────────────────────
    this._drawAutoBtnBg(false)

    this._autoBtnCount.anchor.set(0.5)
    this._autoBtnCount.x = 52
    this._autoBtnCount.y = 26

    this._autoBtnHint.anchor.set(0.5)
    this._autoBtnHint.x = 52
    this._autoBtnHint.y = 46
    this._autoBtnHint.visible = false

    this._autoBtn.addChild(this._autoBtnBg, this._autoBtnCount, this._autoBtnHint)
    this._autoBtn.x = 540
    this._autoBtn.y = 16
    this._autoBtn.interactive = true
    this._autoBtn.cursor = 'pointer'
    this._autoBtn.on('pointerdown', () => {
      if (this._autoSpinActive) this.emit('stopAutoSpin')
      else this.emit('autoSpin')
    })
    this.addChild(this._autoBtn)

    // ── Spin button — circular gem ────────────────────────────────────────
    const spinBg = new Graphics()
    // Gold outer ring
    spinBg.circle(44, 44, 44)
    spinBg.fill(0xd4a017)
    // Dark gem base
    spinBg.circle(44, 44, 38)
    spinBg.fill(0x0d3a20)
    // Mid gem layer
    spinBg.circle(44, 44, 30)
    spinBg.fill(0x1a5a38)
    // Top highlight ellipse
    spinBg.ellipse(36, 32, 12, 7)
    spinBg.fill({ color: 0x40d090, alpha: 0.45 })
    // Center glow
    spinBg.circle(44, 44, 6)
    spinBg.fill({ color: 0xffe066, alpha: 0.6 })

    this._spinButton.addChild(spinBg)

    this._spinLabel.anchor.set(0.5)
    this._spinLabel.x = 44
    this._spinLabel.y = 44
    this._spinButton.addChild(this._spinLabel)

    this._spinButton.x = 680
    this._spinButton.y = 8
    this._spinButton.interactive = true
    this._spinButton.cursor = 'pointer'
    this._spinButton.on('pointerdown', () => this.emit('spin'))
    this.addChild(this._spinButton)

    // ── Buy Bonus button ──────────────────────────────────────────────────
    this._buyBonusBtnBg.roundRect(0, 0, 140, 68, 8)
    this._buyBonusBtnBg.fill(0x2a1608)
    this._buyBonusBtnBg.stroke({ width: 2, color: 0xd4a017 })
    this._buyBonusBtnBg.roundRect(3, 3, 134, 62, 6)
    this._buyBonusBtnBg.stroke({ width: 0.8, color: 0xffe066, alpha: 0.3 })
    this._buyBonusBtn.addChild(this._buyBonusBtnBg)

    const buyLabel = new Text({
      text: 'BUY',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffe066', fontSize: 20, fontWeight: '900' },
    })
    buyLabel.anchor.set(0.5)
    buyLabel.x = 70
    buyLabel.y = 20
    this._buyBonusBtn.addChild(buyLabel)

    const buyCostLabel = new Text({
      text: '100× BET',
      style: { fontFamily: FONT_DISPLAY, fill: '#c8a060', fontSize: 12 },
    })
    buyCostLabel.anchor.set(0.5)
    buyCostLabel.x = 70
    buyCostLabel.y = 46
    this._buyBonusBtn.addChild(buyCostLabel)

    this._buyBonusBtn.x = 836
    this._buyBonusBtn.y = 16
    this._buyBonusBtn.interactive = true
    this._buyBonusBtn.cursor = 'pointer'
    this._buyBonusBtn.on('pointerdown', () => this.emit('buyBonus'))
    this.addChild(this._buyBonusBtn)
  }

  private _drawAutoBtnBg(active: boolean) {
    this._autoBtnBg.clear()
    this._autoBtnBg.roundRect(0, 0, 104, 68, 8)
    if (active) {
      this._autoBtnBg.fill(0x5a1a00)
      this._autoBtnBg.stroke({ width: 2, color: 0xff8040 })
    } else {
      this._autoBtnBg.fill(0x0d1a2a)
      this._autoBtnBg.stroke({ width: 2, color: 0xd4a017 })
    }
    this._autoBtnBg.roundRect(3, 3, 98, 62, 6)
    this._autoBtnBg.stroke({ width: 0.8, color: active ? 0xffaa60 : 0xffe066, alpha: 0.3 })
  }

  public syncAutoSpin(isActive: boolean, remaining: number) {
    this._autoSpinActive = isActive
    this._drawAutoBtnBg(isActive)

    if (isActive) {
      this._autoBtnCount.text = remaining === 0 ? '∞' : remaining.toString()
      this._autoBtnCount.y = 22
      this._autoBtnHint.visible = true
    } else {
      this._autoBtnCount.text = 'AUTO'
      this._autoBtnCount.y = 26
      this._autoBtnHint.visible = false
    }

    this._refreshButtonStates()
  }

  public updateTexts() {
    this._balanceText.text = `${this._session.balance}`
    this._betText.text = `BET  ${this._session.betMultiplier}`
    this._winText.text = this._session.lastWin > 0 ? `WIN  ${this._session.lastWin}` : ''
  }

  public animateBalance(target: number) {
    const obj = { val: this._session.balance - this._session.lastWin }
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      onUpdate: () => {
        this._balanceText.text = `${Math.floor(obj.val)}`
      },
    })
  }

  private _refreshButtonStates() {
    const idle = this._fsm.state === GameUIState.IDLE
    const spinEnabled = idle && !this._autoSpinActive
    this._spinButton.alpha = spinEnabled ? 1 : 0.4
    this._spinButton.interactive = spinEnabled
    this._buyBonusBtn.alpha = spinEnabled ? 1 : 0.4
    this._buyBonusBtn.interactive = spinEnabled
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
        { x: 1.3, y: 1.3, duration: 0.4, yoyo: true, repeat: 3 },
      )
    } else {
      this.updateTexts()
    }

    this._refreshButtonStates()
  }
}
