import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { BUY_OPTIONS, MODE_IDS, DEFAULT_MODE } from '@tgslots/le-militare'
import type { ModeId } from '@tgslots/le-militare'
import type { GameEventBus } from '../../engine/event-bus.js'
import type { UILayoutSnapshot } from '../../engine/layout.js'

// Hacksaw-style feature menu: a dark, minimal modal with a volatility segmented
// selector and a stack of feature-buy cards (cost + buy affordance).

interface FeatureOption {
  id: string
  name: string
  desc: string
  costMultiplier: number
}

const OPTIONS: FeatureOption[] = [
  {
    id: 'standard',
    name: 'COMBAT OP',
    desc: 'Free spins — standard entry',
    costMultiplier: BUY_OPTIONS.standard.cost,
  },
  {
    id: 'elite',
    name: 'ELITE OP',
    desc: 'More free spins',
    costMultiplier: BUY_OPTIONS.elite.cost,
  },
  {
    id: 'super',
    name: 'SUPER OP',
    desc: 'Max spins + ×3 start multiplier',
    costMultiplier: BUY_OPTIONS.super.cost,
  },
  {
    id: 'chance',
    name: 'RECON SPIN',
    desc: 'One spin · ×5 bonus chance',
    costMultiplier: BUY_OPTIONS.chanceSpin.cost,
  },
  {
    id: 'airraid',
    name: 'AIR RAID SPIN',
    desc: 'One spin · guaranteed Air Raid',
    costMultiplier: BUY_OPTIONS.airRaidSpin.cost,
  },
]

const MODE_LABELS: Record<ModeId, string> = {
  recon: 'RECON',
  assault: 'ASSAULT',
  siege: 'SIEGE',
}
const MODE_SUBLABELS: Record<ModeId, string> = {
  recon: 'LOW VOL',
  assault: 'STANDARD',
  siege: 'HIGH VOL',
}

const ACCENT = 0xffb02e
const GREEN = 0x1f9d57

interface ModePill {
  id: ModeId
  container: Container
  bg: Graphics
  label: Text
  sub: Text
}

interface OptionCard {
  id: string
  costMultiplier: number
  container: Container
  bg: Graphics
  name: Text
  desc: Text
  buyBg: Graphics
  buyLabel: Text
}

export class BuyFeatureModal extends Container {
  private readonly _inner = new Container()
  private readonly _backdrop = new Graphics()
  private readonly _panelBg = new Graphics()
  private readonly _title: Text
  private readonly _volLabel: Text
  private readonly _featLabel: Text
  private readonly _closeBtn = new Container()
  private readonly _closeBg = new Graphics()
  private readonly _closeLabel: Text
  private readonly _modePills: ModePill[] = []
  private readonly _cards: OptionCard[] = []

  private _selectedMode: ModeId = DEFAULT_MODE
  private _innerBaseY = 0
  private _pillW = 100
  private _pillH = 44

  constructor(
    private readonly _eventBus: GameEventBus,
    private readonly _getBet: () => number,
  ) {
    super()
    this.visible = false

    this._title = new Text({
      text: 'COMBAT OPS',
      style: { fill: '#ffd166', fontSize: 24, fontWeight: '900', letterSpacing: 4 },
    })
    this._volLabel = this._sectionLabel('VOLATILITY')
    this._featLabel = this._sectionLabel('FEATURE BUY')
    this._closeLabel = new Text({ text: '✕', style: { fill: '#8a93a0', fontSize: 16 } })

    this._build()
  }

  private _sectionLabel(text: string): Text {
    return new Text({ text, style: { fill: '#6b7682', fontSize: 12, letterSpacing: 3 } })
  }

  private _build(): void {
    this._backdrop.interactive = true
    this._backdrop.on('pointerdown', () => this.hide())
    this.addChild(this._backdrop)

    this._panelBg.interactive = true
    this._panelBg.on('pointerdown', (e) => e.stopPropagation())
    this._inner.addChild(this._panelBg)

    this._title.anchor.set(0.5, 0)
    this._volLabel.anchor.set(0, 0)
    this._featLabel.anchor.set(0, 0)
    this._inner.addChild(this._title, this._volLabel, this._featLabel)

    this._closeLabel.anchor.set(0.5)
    this._closeBtn.addChild(this._closeBg, this._closeLabel)
    this._closeBtn.interactive = true
    this._closeBtn.cursor = 'pointer'
    this._closeBtn.on('pointerdown', (e) => {
      e.stopPropagation()
      this.hide()
    })
    this._inner.addChild(this._closeBtn)

    for (const id of MODE_IDS) {
      const bg = new Graphics()
      const label = new Text({
        text: MODE_LABELS[id],
        style: { fill: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
      })
      label.anchor.set(0.5)
      const sub = new Text({
        text: MODE_SUBLABELS[id],
        style: { fill: '#8a93a0', fontSize: 10, letterSpacing: 1 },
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

    for (const opt of OPTIONS) {
      const bg = new Graphics()
      const name = new Text({
        text: opt.name,
        style: { fill: '#f2f5f8', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
      })
      name.anchor.set(0, 0.5)
      const desc = new Text({
        text: opt.desc,
        style: { fill: '#7e8a96', fontSize: 12 },
      })
      desc.anchor.set(0, 0.5)
      const buyBg = new Graphics()
      const buyLabel = new Text({
        text: '',
        style: { fill: '#ffffff', fontSize: 15, fontWeight: '900' },
      })
      buyLabel.anchor.set(0.5)
      const container = new Container()
      container.addChild(bg, name, desc, buyBg, buyLabel)
      container.interactive = true
      container.cursor = 'pointer'
      container.on('pointerover', () => (bg.tint = 0xc9d2dc))
      container.on('pointerout', () => (bg.tint = 0xffffff))
      container.on('pointerdown', (e) => {
        e.stopPropagation()
        this._eventBus.emit('feature-buy:requested', { optionId: opt.id })
        this.hide()
      })
      this._cards.push({
        id: opt.id,
        costMultiplier: opt.costMultiplier,
        container,
        bg,
        name,
        desc,
        buyBg,
        buyLabel,
      })
      this._inner.addChild(container)
    }

    this.addChild(this._inner)
    this._refreshModePills()
  }

  private _selectMode(id: ModeId): void {
    this._selectedMode = id
    this._eventBus.emit('volatility:selected', { mode: id })
    this._refreshModePills()
  }

  private _refreshModePills(): void {
    for (const pill of this._modePills) {
      this._drawPill(pill, pill.id === this._selectedMode)
    }
  }

  private _drawPill(pill: ModePill, active: boolean): void {
    const width = this._pillW
    const height = this._pillH
    pill.bg.clear()
    pill.bg.roundRect(0, 0, width, height, 10)
    pill.bg.fill(active ? ACCENT : 0x171c22)
    pill.bg.stroke({ width: active ? 0 : 1.5, color: 0x2c343d })
    pill.label.style.fill = active ? '#1a1205' : '#c2cad2'
    pill.sub.style.fill = active ? '#5a4413' : '#8a93a0'
    pill.label.x = width / 2
    pill.label.y = height / 2 - 7
    pill.sub.x = width / 2
    pill.sub.y = height / 2 + 11
  }

  private _refreshCosts(): void {
    const bet = this._getBet()
    for (const card of this._cards) {
      const credits = card.costMultiplier * bet
      const creditText = Number.isInteger(credits) ? String(credits) : credits.toFixed(2)
      card.buyLabel.text = creditText
    }
  }

  public resize(layout: UILayoutSnapshot): void {
    this._backdrop.clear()
    this._backdrop.rect(0, 0, layout.screenWidth, layout.screenHeight)
    this._backdrop.fill({ color: 0x000000, alpha: 0.72 })

    const panelWidth = Math.max(320, Math.min(540, layout.modalBounds.width))
    const pad = 24
    const innerW = panelWidth - pad * 2

    const titleY = 26
    const volLabelY = 66
    const pillTop = 86
    const pillGap = 10
    this._pillH = 44
    this._pillW = (innerW - pillGap * 2) / 3
    const featLabelY = pillTop + this._pillH + 20
    const cardTop = featLabelY + 22
    const cardH = 58
    const cardGap = 10
    const panelHeight = cardTop + OPTIONS.length * (cardH + cardGap) + 14

    const innerScale = Math.min(
      1,
      layout.modalBounds.height / panelHeight,
      layout.modalBounds.width / panelWidth,
    )
    this._inner.scale.set(innerScale)
    this._inner.x = layout.modalBounds.x + layout.modalBounds.width / 2
    this._innerBaseY = layout.modalBounds.y + layout.modalBounds.height / 2
    this._inner.y = this._innerBaseY

    const left = -panelWidth / 2
    const top = -panelHeight / 2

    this._panelBg.clear()
    this._panelBg.roundRect(left, top, panelWidth, panelHeight, 16)
    this._panelBg.fill(0x0d1014)
    this._panelBg.stroke({ width: 1.5, color: 0x29313b })

    this._title.x = 0
    this._title.y = top + titleY

    const closeSize = 30
    this._closeBg.clear()
    this._closeBg.roundRect(-closeSize / 2, -closeSize / 2, closeSize, closeSize, 7)
    this._closeBg.fill(0x1a2027)
    this._closeBtn.x = panelWidth / 2 - pad
    this._closeBtn.y = top + titleY + 8

    this._volLabel.x = left + pad
    this._volLabel.y = top + volLabelY
    this._featLabel.x = left + pad
    this._featLabel.y = top + featLabelY

    this._modePills.forEach((pill, i) => {
      pill.container.x = left + pad + i * (this._pillW + pillGap)
      pill.container.y = top + pillTop
      this._drawPill(pill, pill.id === this._selectedMode)
    })

    this._refreshCosts()
    this._cards.forEach((card, i) => {
      const y = top + cardTop + i * (cardH + cardGap)
      card.container.x = left + pad
      card.container.y = y
      card.bg.clear()
      card.bg.roundRect(0, 0, innerW, cardH, 10)
      card.bg.fill(0x141a20)
      card.bg.stroke({ width: 1, color: 0x262f38 })
      card.name.x = 16
      card.name.y = cardH / 2 - 9
      card.desc.x = 16
      card.desc.y = cardH / 2 + 12
      const buyW = 92
      const buyH = 36
      const buyX = innerW - buyW - 12
      card.buyBg.clear()
      card.buyBg.roundRect(buyX, (cardH - buyH) / 2, buyW, buyH, 8)
      card.buyBg.fill(GREEN)
      card.buyLabel.x = buyX + buyW / 2
      card.buyLabel.y = cardH / 2
    })
  }

  public show(): void {
    this._refreshCosts()
    this.visible = true
    this.alpha = 0
    this._inner.y = this._innerBaseY + 24
    gsap.to(this, { alpha: 1, duration: 0.2, ease: 'power2.out' })
    gsap.to(this._inner, { y: this._innerBaseY, duration: 0.28, ease: 'back.out(1.7)' })
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
