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

// Natural sizes of each button (drawn at scale 1)
const AUTO_W = 104
const AUTO_H = 68
const SPIN_D = 88   // diameter
const BUY_W  = 140
const BUY_H  = 68
const BTN_GAP = 12
const PANEL_H = SPIN_D
const PANEL_W = AUTO_W + BTN_GAP + SPIN_D + BTN_GAP + BUY_W  // 356

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

  private _infoContainer: Container
  private _buttonPanel: Container

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
    this._infoContainer = new Container()
    this._buttonPanel = new Container()

    this._build()
    this.updateTexts()
    this._fsm.addListener(() => this._onStateChange())
  }

  private _build() {
    // ── Info container (top-left, scaled as a unit in resize()) ──────────
    const balPanel = woodPanel(200, AUTO_H)
    this._infoContainer.addChild(balPanel)

    this._balanceText.x = 100
    this._balanceText.y = 18
    this._balanceText.anchor.set(0.5, 0)
    this._infoContainer.addChild(this._balanceText)

    this._betText.x = 100
    this._betText.y = 44
    this._betText.anchor.set(0.5, 0)
    this._infoContainer.addChild(this._betText)

    const winPanel = woodPanel(200, AUTO_H)
    winPanel.y = AUTO_H + 8
    this._infoContainer.addChild(winPanel)

    this._winText.x = 100
    this._winText.y = AUTO_H + 8 + 22
    this._winText.anchor.set(0.5, 0)
    this._infoContainer.addChild(this._winText)

    this.addChild(this._infoContainer)

    // ── Button panel (bottom-right, scaled and positioned in resize()) ────

    // Auto button at x=0, vertically centered in PANEL_H
    this._drawAutoBtnBg(false)
    this._autoBtnCount.anchor.set(0.5)
    this._autoBtnCount.x = AUTO_W / 2
    this._autoBtnCount.y = 26
    this._autoBtnHint.anchor.set(0.5)
    this._autoBtnHint.x = AUTO_W / 2
    this._autoBtnHint.y = 46
    this._autoBtnHint.visible = false
    this._autoBtn.addChild(this._autoBtnBg, this._autoBtnCount, this._autoBtnHint)
    this._autoBtn.x = 0
    this._autoBtn.y = (PANEL_H - AUTO_H) / 2
    this._autoBtn.interactive = true
    this._autoBtn.cursor = 'pointer'
    this._autoBtn.on('pointerdown', () => {
      if (this._autoSpinActive) this.emit('stopAutoSpin')
      else this.emit('autoSpin')
    })
    this._buttonPanel.addChild(this._autoBtn)

    // Spin button at x=AUTO_W+BTN_GAP, y=0
    const spinBg = new Graphics()
    spinBg.circle(SPIN_D / 2, SPIN_D / 2, SPIN_D / 2)
    spinBg.fill(0xd4a017)
    spinBg.circle(SPIN_D / 2, SPIN_D / 2, 38)
    spinBg.fill(0x0d3a20)
    spinBg.circle(SPIN_D / 2, SPIN_D / 2, 30)
    spinBg.fill(0x1a5a38)
    spinBg.ellipse(36, 32, 12, 7)
    spinBg.fill({ color: 0x40d090, alpha: 0.45 })
    spinBg.circle(SPIN_D / 2, SPIN_D / 2, 6)
    spinBg.fill({ color: 0xffe066, alpha: 0.6 })
    this._spinButton.addChild(spinBg)
    this._spinLabel.anchor.set(0.5)
    this._spinLabel.x = SPIN_D / 2
    this._spinLabel.y = SPIN_D / 2
    this._spinButton.addChild(this._spinLabel)
    this._spinButton.x = AUTO_W + BTN_GAP
    this._spinButton.y = 0
    this._spinButton.interactive = true
    this._spinButton.cursor = 'pointer'
    this._spinButton.on('pointerdown', () => this.emit('spin'))
    this._buttonPanel.addChild(this._spinButton)

    // Buy button at x=AUTO_W+BTN_GAP+SPIN_D+BTN_GAP, vertically centered
    this._buyBonusBtnBg.roundRect(0, 0, BUY_W, BUY_H, 8)
    this._buyBonusBtnBg.fill(0x2a1608)
    this._buyBonusBtnBg.stroke({ width: 2, color: 0xd4a017 })
    this._buyBonusBtnBg.roundRect(3, 3, BUY_W - 6, BUY_H - 6, 6)
    this._buyBonusBtnBg.stroke({ width: 0.8, color: 0xffe066, alpha: 0.3 })
    this._buyBonusBtn.addChild(this._buyBonusBtnBg)
    const buyLabel = new Text({
      text: 'BUY',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffe066', fontSize: 20, fontWeight: '900' },
    })
    buyLabel.anchor.set(0.5)
    buyLabel.x = BUY_W / 2
    buyLabel.y = 20
    this._buyBonusBtn.addChild(buyLabel)
    const buyCostLabel = new Text({
      text: '100× BET',
      style: { fontFamily: FONT_DISPLAY, fill: '#c8a060', fontSize: 12 },
    })
    buyCostLabel.anchor.set(0.5)
    buyCostLabel.x = BUY_W / 2
    buyCostLabel.y = 46
    this._buyBonusBtn.addChild(buyCostLabel)
    this._buyBonusBtn.x = AUTO_W + BTN_GAP + SPIN_D + BTN_GAP
    this._buyBonusBtn.y = (PANEL_H - BUY_H) / 2
    this._buyBonusBtn.interactive = true
    this._buyBonusBtn.cursor = 'pointer'
    this._buyBonusBtn.on('pointerdown', () => this.emit('buyBonus'))
    this._buttonPanel.addChild(this._buyBonusBtn)

    this.addChild(this._buttonPanel)
  }

  public resize(screenW: number, screenH: number) {
    const PAD = 16

    // Info container — scale to at most 45% of screen width, keep at top-left
    const maxInfoW = screenW * 0.45
    const infoScale = Math.min(1, maxInfoW / 216)  // 216 = panel(200) + PAD(16)
    this._infoContainer.scale.set(infoScale)
    this._infoContainer.x = PAD
    this._infoContainer.y = PAD

    // Button panel — scale to fit available width, pin to bottom-right
    const maxBtnW = screenW - PAD * 2
    const btnScale = Math.min(1, maxBtnW / PANEL_W)
    this._buttonPanel.scale.set(btnScale)
    this._buttonPanel.x = screenW - PANEL_W * btnScale - PAD
    this._buttonPanel.y = screenH - PANEL_H * btnScale - PAD
  }

  private _drawAutoBtnBg(active: boolean) {
    this._autoBtnBg.clear()
    this._autoBtnBg.roundRect(0, 0, AUTO_W, AUTO_H, 8)
    if (active) {
      this._autoBtnBg.fill(0x5a1a00)
      this._autoBtnBg.stroke({ width: 2, color: 0xff8040 })
    } else {
      this._autoBtnBg.fill(0x0d1a2a)
      this._autoBtnBg.stroke({ width: 2, color: 0xd4a017 })
    }
    this._autoBtnBg.roundRect(3, 3, AUTO_W - 6, AUTO_H - 6, 6)
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
