import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { BUY_OPTIONS, MODE_IDS, DEFAULT_MODE } from '@tgslots/le-militare'
import type { ModeId } from '@tgslots/le-militare'
import type { GameEventBus } from '../../engine/event-bus.js'
import type { UILayoutSnapshot } from '../../engine/layout.js'

// Hacksaw-style BONUS BUY menu: dimmed game, a centered BET +/- card, a
// volatility segmented control, and a row of white feature cards — each with
// an icon, description, volatility, price and a full-width ACTIVATE/BUY button.

type Kind = 'activate' | 'buy'

interface OptionMeta {
  id: string
  name: string
  desc: string
  icon: string
  kind: Kind
  costMultiplier: number
}

const OPTIONS: OptionMeta[] = [
  {
    id: 'chance',
    name: 'RECON STRIKE',
    desc: 'One spin · 5× chance to trigger free spins',
    icon: '5×',
    kind: 'activate',
    costMultiplier: BUY_OPTIONS.chanceSpin.cost,
  },
  {
    id: 'airraid',
    name: 'AIR RAID',
    desc: 'One spin with a guaranteed Air Raid',
    icon: 'RAID',
    kind: 'activate',
    costMultiplier: BUY_OPTIONS.airRaidSpin.cost,
  },
  {
    id: 'standard',
    name: 'COMBAT OP',
    desc: 'Free spins — standard entry',
    icon: 'FS',
    kind: 'buy',
    costMultiplier: BUY_OPTIONS.standard.cost,
  },
  {
    id: 'elite',
    name: 'ELITE OP',
    desc: 'Free spins — more spins',
    icon: 'FS+',
    kind: 'buy',
    costMultiplier: BUY_OPTIONS.elite.cost,
  },
  {
    id: 'super',
    name: 'SUPER OP',
    desc: 'Max spins + ×3 starting multiplier',
    icon: 'FS++',
    kind: 'buy',
    costMultiplier: BUY_OPTIONS.super.cost,
  },
]

const MODE_LABELS: Record<ModeId, string> = { recon: 'RECON', assault: 'ASSAULT', siege: 'SIEGE' }
const MODE_SUB: Record<ModeId, string> = { recon: 'LOW', assault: 'MEDIUM', siege: 'HIGH' }

const FONT = 'Cinzel, serif'
const ACTIVATE_COLOR = 0xf0820f
const BUY_COLOR = 0x2cb742
const ACCENT = 0xffb02e
const ICON_BG = 0x8b5cf6

// Design-space dimensions (the whole panel is scaled to fit the modal bounds).
const PANEL_W = 980
const PAD = 32
const CARD_GAP = 16
const CARD_H = 300
const CARDS_TOP = 252

interface ModePill {
  id: ModeId
  container: Container
  bg: Graphics
  label: Text
  sub: Text
}

interface CardView {
  meta: OptionMeta
  container: Container
  bg: Graphics
  iconBg: Graphics
  iconLabel: Text
  name: Text
  desc: Text
  vol: Text
  price: Text
  btnBg: Graphics
  btnLabel: Text
}

export class BuyFeatureModal extends Container {
  private readonly _inner = new Container()
  private readonly _backdrop = new Graphics()
  private readonly _title: Text
  private readonly _closeBtn = new Container()
  private readonly _closeRing = new Graphics()
  private readonly _closeX: Text

  private readonly _betCard = new Container()
  private readonly _betBg = new Graphics()
  private readonly _betLabel: Text
  private readonly _betValue: Text
  private readonly _minusBtn = new Container()
  private readonly _minusBg = new Graphics()
  private readonly _plusBtn = new Container()
  private readonly _plusBg = new Graphics()

  private readonly _volLabel: Text
  private readonly _modePills: ModePill[] = []
  private readonly _cards: CardView[] = []

  private _selectedMode: ModeId = DEFAULT_MODE
  private _innerBaseY = 0

  constructor(
    private readonly _eventBus: GameEventBus,
    private readonly _getBet: () => number,
    private readonly _getBalance: () => number,
  ) {
    super()
    this.visible = false

    this._title = new Text({
      text: 'BONUS BUY',
      style: {
        fill: '#ffffff',
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: 4,
        fontFamily: FONT,
      },
    })
    this._closeX = new Text({
      text: '✕',
      style: { fill: '#ffffff', fontSize: 20, fontFamily: FONT },
    })
    this._betLabel = new Text({
      text: 'BET',
      style: {
        fill: '#8a8a8a',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
        fontFamily: FONT,
      },
    })
    this._betValue = new Text({
      text: '',
      style: { fill: '#141414', fontSize: 28, fontWeight: '900', fontFamily: FONT },
    })
    this._volLabel = new Text({
      text: 'VOLATILITY',
      style: {
        fill: '#c9cdd3',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 3,
        fontFamily: FONT,
      },
    })

    this._build()
  }

  private _build(): void {
    this._backdrop.interactive = true
    this._backdrop.on('pointerdown', () => this.hide())
    this.addChild(this._backdrop)

    this._panelChrome()
    this._buildBetCard()
    this._buildModePills()
    this._buildCards()

    this.addChild(this._inner)
    this._refreshModePills()
  }

  private _panelChrome(): void {
    this._title.anchor.set(0.5, 0)
    this._inner.addChild(this._title)

    this._closeX.anchor.set(0.5)
    this._closeRing.circle(0, 0, 20).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
    this._closeBtn.addChild(this._closeRing, this._closeX)
    this._closeBtn.interactive = true
    this._closeBtn.cursor = 'pointer'
    this._closeBtn.on('pointerdown', (e) => {
      e.stopPropagation()
      this.hide()
    })
    this._inner.addChild(this._closeBtn)
  }

  private _buildBetCard(): void {
    this._betLabel.anchor.set(0.5, 0)
    this._betValue.anchor.set(0.5, 0)
    this._betCard.addChild(this._betBg, this._betLabel, this._betValue)

    const mkStep = (btn: Container, bg: Graphics, glyph: string, delta: number) => {
      const label = new Text({
        text: glyph,
        style: { fill: '#ffffff', fontSize: 26, fontWeight: '900', fontFamily: FONT },
      })
      label.anchor.set(0.5)
      btn.addChild(bg, label)
      btn.interactive = true
      btn.cursor = 'pointer'
      btn.on('pointerdown', (e) => {
        e.stopPropagation()
        this._stepBet(delta)
      })
    }
    mkStep(this._minusBtn, this._minusBg, '−', -1)
    mkStep(this._plusBtn, this._plusBg, '+', 1)
    this._betCard.addChild(this._minusBtn, this._plusBtn)
    this._inner.addChild(this._betCard)
  }

  private _buildModePills(): void {
    this._volLabel.anchor.set(0.5, 0)
    this._inner.addChild(this._volLabel)
    for (const id of MODE_IDS) {
      const bg = new Graphics()
      const label = new Text({
        text: MODE_LABELS[id],
        style: {
          fill: '#ffffff',
          fontSize: 15,
          fontWeight: '800',
          letterSpacing: 1,
          fontFamily: FONT,
        },
      })
      label.anchor.set(0.5)
      const sub = new Text({
        text: MODE_SUB[id],
        style: { fill: '#9aa0a8', fontSize: 9, letterSpacing: 1, fontFamily: FONT },
      })
      sub.anchor.set(0.5)
      const container = new Container()
      container.addChild(bg, label, sub)
      container.interactive = true
      container.cursor = 'pointer'
      container.on('pointerdown', (e) => {
        e.stopPropagation()
        this._selectMode(id)
      })
      this._modePills.push({ id, container, bg, label, sub })
      this._inner.addChild(container)
    }
  }

  private _buildCards(): void {
    for (const meta of OPTIONS) {
      const bg = new Graphics()
      const iconBg = new Graphics()
      const iconLabel = new Text({
        text: meta.icon,
        style: { fill: '#ffffff', fontSize: 26, fontWeight: '900', fontFamily: FONT },
      })
      iconLabel.anchor.set(0.5)
      const name = new Text({
        text: meta.name,
        style: {
          fill: '#161616',
          fontSize: 18,
          fontWeight: '900',
          align: 'center',
          fontFamily: FONT,
        },
      })
      name.anchor.set(0.5, 0)
      const desc = new Text({
        text: meta.desc,
        style: {
          fill: '#6a6f76',
          fontSize: 13,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 10,
          fontFamily: FONT,
        },
      })
      desc.anchor.set(0.5, 0)
      const vol = new Text({
        text: '',
        style: { fill: '#9aa0a8', fontSize: 12, fontStyle: 'italic', fontFamily: FONT },
      })
      vol.anchor.set(0.5, 0)
      const price = new Text({
        text: '',
        style: { fill: '#111111', fontSize: 24, fontWeight: '900', fontFamily: FONT },
      })
      price.anchor.set(0.5, 0)
      const btnBg = new Graphics()
      const btnLabel = new Text({
        text: meta.kind === 'activate' ? 'ACTIVATE' : 'BUY',
        style: {
          fill: '#ffffff',
          fontSize: 18,
          fontWeight: '900',
          letterSpacing: 1,
          fontFamily: FONT,
        },
      })
      btnLabel.anchor.set(0.5)

      const container = new Container()
      container.addChild(bg, iconBg, iconLabel, name, desc, vol, price, btnBg, btnLabel)
      container.interactive = true
      container.cursor = 'pointer'
      container.on('pointerover', () => (bg.tint = 0xeef1f4))
      container.on('pointerout', () => (bg.tint = 0xffffff))
      container.on('pointerdown', (e) => {
        e.stopPropagation()
        if (this._getBalance() < meta.costMultiplier * this._getBet()) return
        this._eventBus.emit('feature-buy:requested', { optionId: meta.id })
        this.hide()
      })
      this._cards.push({
        meta,
        container,
        bg,
        iconBg,
        iconLabel,
        name,
        desc,
        vol,
        price,
        btnBg,
        btnLabel,
      })
      this._inner.addChild(container)
    }
  }

  private _stepBet(delta: number): void {
    const next = Math.max(1, this._getBet() + delta)
    this._eventBus.emit('bet:changed', { multiplier: next })
    this._refreshBet()
    this._refreshCards()
  }

  private _selectMode(id: ModeId): void {
    this._selectedMode = id
    this._eventBus.emit('volatility:selected', { mode: id })
    this._refreshModePills()
    this._refreshCards()
  }

  private _refreshBet(): void {
    this._betValue.text = String(this._getBet())
  }

  private _refreshModePills(): void {
    for (const pill of this._modePills) {
      const active = pill.id === this._selectedMode
      pill.label.style.fill = active ? '#1a1205' : '#cfd3d9'
      pill.sub.style.fill = active ? '#5a4413' : '#9aa0a8'
    }
  }

  private _refreshCards(): void {
    const bet = this._getBet()
    const volText = `Volatility: ${MODE_SUB[this._selectedMode][0]}${MODE_SUB[this._selectedMode]
      .slice(1)
      .toLowerCase()}`
    const balance = this._getBalance()
    for (const card of this._cards) {
      const credits = card.meta.costMultiplier * bet
      const affordable = balance >= credits
      card.price.text = Number.isInteger(credits) ? String(credits) : credits.toFixed(2)
      card.price.style.fill = affordable ? '#111111' : '#c0392b'
      card.vol.text = volText
      // Dim the whole card when it can't be afforded (clear "disabled" affordance).
      card.container.alpha = affordable ? 1 : 0.45
    }
  }

  public resize(layout: UILayoutSnapshot): void {
    this._backdrop.clear()
    this._backdrop.rect(0, 0, layout.screenWidth, layout.screenHeight)
    this._backdrop.fill({ color: 0x000000, alpha: 0.6 })

    const innerW = PANEL_W - PAD * 2
    const cardW = (innerW - CARD_GAP * (OPTIONS.length - 1)) / OPTIONS.length
    const panelHeight = CARDS_TOP + CARD_H + PAD

    // Center on the full screen and scale to fit with a small margin — more
    // reliable than the reel-area modal bounds (which can be short/offset).
    const margin = 32
    const innerScale = Math.min(
      1,
      (layout.screenWidth - margin * 2) / PANEL_W,
      (layout.screenHeight - margin * 2) / panelHeight,
    )
    this._inner.scale.set(innerScale)
    this._inner.x = layout.screenWidth / 2
    this._innerBaseY = layout.screenHeight / 2
    this._inner.y = this._innerBaseY

    const left = -PANEL_W / 2
    const top = -panelHeight / 2

    this._title.x = 0
    this._title.y = top + 8

    this._closeBtn.x = PANEL_W / 2 - 12
    this._closeBtn.y = top + 24

    // BET +/- card (centered)
    const betW = 240
    const betH = 92
    const betX = -betW / 2
    const betY = top + 56
    this._betBg.clear()
    this._betBg.roundRect(betX, betY, betW, betH, 14)
    this._betBg.fill(0xffffff)
    this._betLabel.x = 0
    this._betLabel.y = betY + 14
    this._betValue.x = 0
    this._betValue.y = betY + 34
    const stepSize = 40
    this._drawStep(this._minusBg, stepSize)
    this._minusBtn.x = betX + 18 + stepSize / 2
    this._minusBtn.y = betY + betH / 2
    this._drawStep(this._plusBg, stepSize)
    this._plusBtn.x = betX + betW - 18 - stepSize / 2
    this._plusBtn.y = betY + betH / 2

    // Volatility selector
    const volY = top + 164
    this._volLabel.x = 0
    this._volLabel.y = volY
    const pillW = 150
    const pillH = 40
    const pillGap = 12
    const pillsW = pillW * 3 + pillGap * 2
    const pillsLeft = -pillsW / 2
    this._modePills.forEach((pill, i) => {
      pill.container.x = pillsLeft + i * (pillW + pillGap)
      pill.container.y = volY + 22
      const active = pill.id === this._selectedMode
      pill.bg.clear()
      pill.bg.roundRect(0, 0, pillW, pillH, 10)
      pill.bg.fill(active ? ACCENT : 0x20262e)
      pill.bg.stroke({ width: 1.5, color: active ? ACCENT : 0x39414b })
      pill.label.x = pillW / 2
      pill.label.y = pillH / 2 - 5
      pill.sub.x = pillW / 2
      pill.sub.y = pillH / 2 + 11
    })
    this._refreshModePills()

    // Cards
    this._refreshCards()
    this._refreshBet()
    this._cards.forEach((card, i) => {
      const x = left + PAD + i * (cardW + CARD_GAP)
      card.container.x = x
      card.container.y = top + CARDS_TOP
      const cx = cardW / 2

      card.bg.clear()
      card.bg.roundRect(0, 0, cardW, CARD_H, 12)
      card.bg.fill(0xffffff)

      card.name.x = cx
      card.name.y = 16
      card.name.style.wordWrap = true
      card.name.style.wordWrapWidth = cardW - 20

      card.desc.x = cx
      card.desc.y = 58
      card.desc.style.wordWrapWidth = cardW - 26

      const iconSize = 66
      card.iconBg.clear()
      card.iconBg.roundRect(cx - iconSize / 2, 102, iconSize, iconSize, 16)
      card.iconBg.fill(ICON_BG)
      card.iconLabel.x = cx
      card.iconLabel.y = 102 + iconSize / 2

      card.vol.x = cx
      card.vol.y = 182
      card.price.x = cx
      card.price.y = 202

      // Button flush with the card bottom (only bottom corners rounded).
      const btnH = 54
      const btnTop = CARD_H - btnH
      const r = 12
      card.btnBg.clear()
      card.btnBg
        .moveTo(0, btnTop)
        .lineTo(cardW, btnTop)
        .lineTo(cardW, CARD_H - r)
        .arcTo(cardW, CARD_H, cardW - r, CARD_H, r)
        .lineTo(r, CARD_H)
        .arcTo(0, CARD_H, 0, CARD_H - r, r)
        .closePath()
        .fill(card.meta.kind === 'activate' ? ACTIVATE_COLOR : BUY_COLOR)
      card.btnLabel.x = cx
      card.btnLabel.y = btnTop + btnH / 2
    })
  }

  private _drawStep(bg: Graphics, size: number): void {
    bg.clear()
    bg.roundRect(-size / 2, -size / 2, size, size, 8)
    bg.fill(0x2a2a2a)
  }

  public show(): void {
    this._refreshBet()
    this._refreshCards()
    this.visible = true
    this.alpha = 0
    this._inner.y = this._innerBaseY + 24
    gsap.to(this, { alpha: 1, duration: 0.2, ease: 'power2.out' })
    gsap.to(this._inner, { y: this._innerBaseY, duration: 0.28, ease: 'back.out(1.6)' })
  }

  public hide(): void {
    gsap.to(this, {
      alpha: 0,
      duration: 0.16,
      ease: 'power2.in',
      onComplete: () => {
        this.visible = false
        this._inner.y = this._innerBaseY
      },
    })
  }
}
