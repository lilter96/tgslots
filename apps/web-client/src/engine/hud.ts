import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import type { FreeSpinsStatus } from '../types'
import { GameUIState } from '../types'
import { GameStateMachine } from './state-machine'
import { SessionManager } from './session-manager'
import type { HUDLayoutMode, UILayoutSnapshot } from './layout'

const FONT_DISPLAY = 'Cinzel, serif'

const BUY_W = 140
const BUY_H = 68
const AUTO_W = BUY_W
const AUTO_H = 68
const SPIN_D = 88
const BTN_GAP = 12
const PANEL_H = SPIN_D
const PANEL_W = AUTO_W + BTN_GAP + SPIN_D + BTN_GAP + BUY_W

interface InfoCard {
  key: 'balance' | 'bet' | 'win' | 'freeSpins'
  container: Container
  background: Graphics
  title: Text
  value: Text
}

function drawWoodPanel(g: Graphics, w: number, h: number, fill = 0x2a1608) {
  g.clear()
  g.roundRect(0, 0, w, h, 12)
  g.fill(fill)
  g.roundRect(0, 0, w, h, 12)
  g.stroke({ width: 2, color: 0xd4a017 })
  g.roundRect(3, 3, w - 6, h - 6, 9)
  g.stroke({ width: 0.9, color: 0xffe066, alpha: 0.32 })
}

function woodPanel(w: number, h: number, fill = 0x2a1608): Graphics {
  const g = new Graphics()
  drawWoodPanel(g, w, h, fill)
  return g
}

export class HUD extends Container {
  private _session: SessionManager
  private _fsm: GameStateMachine

  private _layout?: UILayoutSnapshot

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

  private _balanceCard: InfoCard
  private _betCard: InfoCard
  private _winCard: InfoCard
  private _freeSpinsCard: InfoCard

  private _autoSpinActive = false

  constructor(session: SessionManager, fsm: GameStateMachine) {
    super()
    this._session = session
    this._fsm = fsm

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

    this._balanceCard = this._makeInfoCard('balance', 'BALANCE', 0x2a1608)
    this._betCard = this._makeInfoCard('bet', 'BET', 0x1d1308)
    this._winCard = this._makeInfoCard('win', 'WIN', 0x15240d)
    this._freeSpinsCard = this._makeInfoCard('freeSpins', 'FREE SPINS', 0x1d1030)
    this._freeSpinsCard.container.visible = false

    this._build()
    this.updateTexts()
    this._fsm.addListener(() => this._onStateChange())
  }

  private _makeInfoCard(key: InfoCard['key'], title: string, fill: number): InfoCard {
    const container = new Container()
    const background = woodPanel(160, 64, fill)
    const titleText = new Text({
      text: title,
      style: {
        fontFamily: FONT_DISPLAY,
        fill: '#c8a060',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
      },
    })
    titleText.anchor.set(0.5, 0)

    const valueText = new Text({
      text: '',
      style: {
        fontFamily: FONT_DISPLAY,
        fill: '#ffe066',
        fontSize: 24,
        fontWeight: '700',
        stroke: { color: '#5a3a00', width: 3 },
      },
    })
    valueText.anchor.set(0.5)

    container.addChild(background, titleText, valueText)
    this._infoContainer.addChild(container)

    return { key, container, background, title: titleText, value: valueText }
  }

  private _build() {
    this.addChild(this._infoContainer)

    this._drawAutoBtnBg(false)
    this._autoBtnCount.anchor.set(0.5)
    this._autoBtnCount.x = AUTO_W / 2
    this._autoBtnCount.y = AUTO_H / 2
    this._autoBtnHint.anchor.set(0.5)
    this._autoBtnHint.x = AUTO_W / 2
    this._autoBtnHint.visible = false
    this._autoBtn.addChild(this._autoBtnBg, this._autoBtnCount, this._autoBtnHint)
    this._autoBtn.y = (PANEL_H - AUTO_H) / 2
    this._autoBtn.interactive = true
    this._autoBtn.cursor = 'pointer'
    this._autoBtn.on('pointerdown', () => {
      if (this._autoSpinActive) this.emit('stopAutoSpin')
      else this.emit('autoSpin')
    })
    this._buttonPanel.addChild(this._autoBtn)

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
    this._spinButton.interactive = true
    this._spinButton.cursor = 'pointer'
    this._spinButton.on('pointerdown', () => this.emit('spin'))
    this._buttonPanel.addChild(this._spinButton)

    this._buyBonusBtnBg.roundRect(0, 0, BUY_W, BUY_H, 10)
    this._buyBonusBtnBg.fill(0x2a1608)
    this._buyBonusBtnBg.stroke({ width: 2, color: 0xd4a017 })
    this._buyBonusBtnBg.roundRect(3, 3, BUY_W - 6, BUY_H - 6, 7)
    this._buyBonusBtnBg.stroke({ width: 0.8, color: 0xffe066, alpha: 0.3 })
    this._buyBonusBtn.addChild(this._buyBonusBtnBg)
    const buyLabel = new Text({
      text: 'BUY BONUS',
      style: { fontFamily: FONT_DISPLAY, fill: '#ffe066', fontSize: 16, fontWeight: '900' },
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

  public resize(layout: UILayoutSnapshot) {
    this._layout = layout
    this._layoutInfoCards(layout)
    this._layoutControls(layout)
  }

  private _layoutInfoCards(layout: UILayoutSnapshot) {
    const activeCards = [this._balanceCard, this._betCard, this._winCard]
    if (this._freeSpinsCard.container.visible) activeCards.push(this._freeSpinsCard)

    const { infoArea } = layout
    const gap = layout.hudMode === 'portrait' ? 8 : 10

    const minCardWidth = layout.hudMode === 'wide' ? 132 : layout.hudMode === 'portrait' ? 92 : 104
    const targetCardWidth =
      layout.hudMode === 'wide' ? 156 : layout.hudMode === 'portrait' ? 108 : 118
    const maxCardWidth = layout.hudMode === 'wide' ? 168 : layout.hudMode === 'portrait' ? 136 : 128
    const cols = Math.min(
      activeCards.length,
      Math.max(1, Math.floor((infoArea.width + gap) / (minCardWidth + gap))),
    )
    const rows = Math.ceil(activeCards.length / cols)

    const availableCardWidth = (infoArea.width - gap * (cols - 1)) / cols
    const cardWidth =
      rows === 1
        ? Math.min(
            maxCardWidth,
            Math.max(minCardWidth, Math.min(targetCardWidth, availableCardWidth)),
          )
        : availableCardWidth
    const cardHeight = (infoArea.height - gap * (rows - 1)) / rows

    const usedWidth = cols * cardWidth + gap * (cols - 1)
    const usedHeight = rows * cardHeight + gap * (rows - 1)
    const startX = infoArea.x + (infoArea.width - usedWidth) / 2
    const startY = infoArea.y + (infoArea.height - usedHeight) / 2

    for (const card of [this._balanceCard, this._betCard, this._winCard, this._freeSpinsCard]) {
      card.container.visible =
        card === this._freeSpinsCard ? this._freeSpinsCard.container.visible : true
    }

    activeCards.forEach((card, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      card.container.x = startX + col * (cardWidth + gap)
      card.container.y = startY + row * (cardHeight + gap)
      this._sizeInfoCard(card, cardWidth, cardHeight, layout.hudMode)
    })
  }

  private _sizeInfoCard(card: InfoCard, width: number, height: number, hudMode: HUDLayoutMode) {
    const fill =
      card.key === 'win'
        ? 0x15240d
        : card.key === 'freeSpins'
          ? 0x1d1030
          : card.key === 'bet'
            ? 0x1d1308
            : 0x2a1608
    drawWoodPanel(card.background, width, height, fill)

    const titleSize = height < 54 ? 10 : hudMode === 'wide' ? 12 : 11
    const valueSize = Math.max(16, Math.min(28, height * 0.34))
    card.title.style.fontSize = titleSize
    card.value.style.fontSize = valueSize
    card.value.style.stroke = { color: '#5a3a00', width: height < 50 ? 2 : 3 }

    card.title.x = width / 2
    card.title.y = Math.max(6, height * 0.12)
    card.value.x = width / 2
    card.value.y = height * 0.64
  }

  private _layoutControls(layout: UILayoutSnapshot) {
    const scale = Math.min(
      1,
      layout.controlsArea.width / PANEL_W,
      layout.controlsArea.height / PANEL_H,
    )
    this._buttonPanel.scale.set(scale)
    this._buttonPanel.x = layout.controlsArea.x + (layout.controlsArea.width - PANEL_W * scale) / 2
    this._buttonPanel.y = layout.controlsArea.y + (layout.controlsArea.height - PANEL_H * scale) / 2
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
      this._autoBtnHint.y = 46
      this._autoBtnHint.visible = true
    } else {
      this._autoBtnCount.text = 'AUTO'
      this._autoBtnCount.y = AUTO_H / 2
      this._autoBtnHint.visible = false
    }

    this._refreshButtonStates()
  }

  public updateTexts() {
    this._balanceCard.value.text = `${this._session.balance}`
    this._betCard.value.text = `${this._session.betMultiplier}`
    this._winCard.value.text = this._session.lastWin > 0 ? `${this._session.lastWin}` : '—'
  }

  public syncFreeSpinsStatus(status: FreeSpinsStatus) {
    this._freeSpinsCard.container.visible = status.active
    this._freeSpinsCard.value.text = status.active ? `${status.remaining} LEFT` : ''
    if (this._layout) this._layoutInfoCards(this._layout)
  }

  public animateBalance(target: number) {
    const obj = { val: this._session.balance - this._session.lastWin }
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      onUpdate: () => {
        this._balanceCard.value.text = `${Math.floor(obj.val)}`
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
        this._winCard.value.scale,
        { x: 1, y: 1 },
        { x: 1.18, y: 1.18, duration: 0.4, yoyo: true, repeat: 3 },
      )
    } else {
      this.updateTexts()
    }

    this._refreshButtonStates()
  }
}
