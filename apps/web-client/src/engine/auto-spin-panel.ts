import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import type { AutoSpinConfig } from '../types'

const PRESETS: Array<{ label: string; value: number }> = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '∞', value: 0 },
]

const PANEL_W = 480
const PANEL_H = 316

export class AutoSpinPanel extends Container {
  private _selectedSpins = 10
  private _stopOnWin = false
  private _stopOnBonus = false

  private _inner: Container
  private _chips: Array<{ bg: Graphics; value: number }> = []
  private _winBox!: Graphics
  private _winCheck!: Text
  private _bonusBox!: Graphics
  private _bonusCheck!: Text

  constructor() {
    super()
    this.visible = false
    this._inner = new Container()
    this._build()
  }

  private _build() {
    // ── Backdrop — click outside closes panel ──────────────────────────────
    const backdrop = new Graphics()
    backdrop.rect(-4000, -4000, 8000, 8000)
    backdrop.fill({ color: 0x000000, alpha: 0.65 })
    backdrop.interactive = true
    backdrop.on('pointerdown', () => this.hide())
    this.addChild(backdrop)

    // ── Panel background ───────────────────────────────────────────────────
    const panelBg = new Graphics()
    panelBg.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 16)
    panelBg.fill(0x14142a)
    panelBg.stroke({ width: 1.5, color: 0x38386a })
    panelBg.interactive = true
    panelBg.on('pointerdown', (e) => e.stopPropagation())
    this._inner.addChild(panelBg)

    // ── Title ─────────────────────────────────────────────────────────────
    const title = new Text({
      text: 'AUTO SPIN',
      style: {
        fill: '#d0d0ff',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 3,
      },
    })
    title.anchor.set(0.5)
    title.y = -PANEL_H / 2 + 28
    this._inner.addChild(title)

    // ── Close button ──────────────────────────────────────────────────────
    const closeBtn = this._makeIconBtn('✕', 30, 30)
    closeBtn.x = PANEL_W / 2 - 22
    closeBtn.y = -PANEL_H / 2 + 22
    closeBtn.on('pointerdown', (e) => {
      e.stopPropagation()
      this.hide()
    })
    this._inner.addChild(closeBtn)

    // ── Divider ───────────────────────────────────────────────────────────
    const divider = new Graphics()
    divider.rect(-PANEL_W / 2 + 24, -PANEL_H / 2 + 54, PANEL_W - 48, 1)
    divider.fill(0x38386a)
    this._inner.addChild(divider)

    // ── Spin count section ────────────────────────────────────────────────
    this._inner.addChild(this._sectionLabel('NUMBER OF SPINS', 0, -PANEL_H / 2 + 76))

    const chipW = 72
    const chipH = 50
    const chipGap = 10
    const totalChipsW = PRESETS.length * chipW + (PRESETS.length - 1) * chipGap
    PRESETS.forEach(({ label, value }, i) => {
      const bg = new Graphics()
      const txt = new Text({
        text: label,
        style: { fill: '#ffffff', fontSize: 22, fontWeight: 'bold' },
      })
      txt.anchor.set(0.5)

      const chip = new Container()
      chip.addChild(bg, txt)
      chip.x = -totalChipsW / 2 + i * (chipW + chipGap) + chipW / 2
      chip.y = -PANEL_H / 2 + 122
      chip.interactive = true
      chip.cursor = 'pointer'
      chip.on('pointerdown', (e) => {
        e.stopPropagation()
        this._selectedSpins = value
        this._refreshChips()
      })

      this._chips.push({ bg, value })
      this._inner.addChild(chip)
    })
    this._refreshChips()

    // ── Stop conditions section ───────────────────────────────────────────
    this._inner.addChild(this._sectionLabel('STOP CONDITIONS', 0, -PANEL_H / 2 + 186))

    const toggleY = -PANEL_H / 2 + 216
    const { box: wb, check: wc, container: wt } = this._makeToggle('Stop on any win')
    this._winBox = wb
    this._winCheck = wc
    wt.x = -PANEL_W / 2 + 60
    wt.y = toggleY
    wt.on('pointerdown', (e) => {
      e.stopPropagation()
      this._stopOnWin = !this._stopOnWin
      this._refreshToggle(this._winBox, this._winCheck, this._stopOnWin)
    })
    this._inner.addChild(wt)

    const { box: bb, check: bc, container: bt } = this._makeToggle('Stop on bonus')
    this._bonusBox = bb
    this._bonusCheck = bc
    bt.x = PANEL_W / 2 - 200
    bt.y = toggleY
    bt.on('pointerdown', (e) => {
      e.stopPropagation()
      this._stopOnBonus = !this._stopOnBonus
      this._refreshToggle(this._bonusBox, this._bonusCheck, this._stopOnBonus)
    })
    this._inner.addChild(bt)

    // ── Start button ──────────────────────────────────────────────────────
    const startBg = new Graphics()
    startBg.roundRect(-130, -28, 260, 56, 10)
    startBg.fill(0x1b5e20)
    const startLabel = new Text({
      text: 'START AUTO SPIN',
      style: { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
    })
    startLabel.anchor.set(0.5)
    const startBtn = new Container()
    startBtn.addChild(startBg, startLabel)
    startBtn.y = PANEL_H / 2 - 42
    startBtn.interactive = true
    startBtn.cursor = 'pointer'
    startBtn.on('pointerover', () => { startBg.tint = 0xaaddaa })
    startBtn.on('pointerout', () => { startBg.tint = 0xffffff })
    startBtn.on('pointerdown', (e) => {
      e.stopPropagation()
      const config: AutoSpinConfig = {
        spins: this._selectedSpins,
        stopOnWin: this._stopOnWin,
        stopOnBonus: this._stopOnBonus,
      }
      this.emit('start', config)
      this.hide()
    })
    this._inner.addChild(startBtn)

    this.addChild(this._inner)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _sectionLabel(text: string, x: number, y: number): Text {
    const t = new Text({
      text,
      style: { fill: '#6868a0', fontSize: 12, letterSpacing: 2 },
    })
    t.anchor.set(0.5)
    t.x = x
    t.y = y
    return t
  }

  private _makeIconBtn(icon: string, w: number, h: number): Container {
    const bg = new Graphics()
    bg.roundRect(-w / 2, -h / 2, w, h, 6)
    bg.fill(0x2a2a4a)
    const label = new Text({ text: icon, style: { fill: '#9090c0', fontSize: 16 } })
    label.anchor.set(0.5)
    const btn = new Container()
    btn.addChild(bg, label)
    btn.interactive = true
    btn.cursor = 'pointer'
    btn.on('pointerover', () => { bg.tint = 0xbbbbff })
    btn.on('pointerout', () => { bg.tint = 0xffffff })
    return btn
  }

  private _makeToggle(label: string): { container: Container; box: Graphics; check: Text } {
    const box = new Graphics()
    const check = new Text({
      text: '✓',
      style: { fill: '#ffffff', fontSize: 13, fontWeight: 'bold' },
    })
    check.anchor.set(0.5)
    check.x = 11
    check.y = 0

    const labelText = new Text({ text: label, style: { fill: '#b0b0d8', fontSize: 15 } })
    labelText.x = 30
    labelText.y = -10

    const container = new Container()
    container.addChild(box, check, labelText)
    container.interactive = true
    container.cursor = 'pointer'
    this._refreshToggle(box, check, false)
    return { container, box, check }
  }

  private _refreshChips() {
    const W = 72
    const H = 50
    this._chips.forEach(({ bg, value }) => {
      const selected = value === this._selectedSpins
      bg.clear()
      bg.roundRect(-W / 2, -H / 2, W, H, 9)
      bg.fill(selected ? 0x2d2d6a : 0x1e1e3a)
      bg.stroke({ width: selected ? 2.5 : 1, color: selected ? 0x8080ff : 0x38386a })
    })
  }

  private _refreshToggle(box: Graphics, check: Text, active: boolean) {
    box.clear()
    box.roundRect(0, -11, 22, 22, 5)
    box.fill(active ? 0x1b5e20 : 0x1e1e3a)
    box.stroke({ width: 1.5, color: active ? 0x4caf50 : 0x38386a })
    check.visible = active
  }

  // ── Public API ────────────────────────────────────────────────────────────

  public show() {
    this.visible = true
    this.alpha = 0
    this._inner.y = 24
    gsap.to(this, { alpha: 1, duration: 0.2, ease: 'power2.out' })
    gsap.to(this._inner, { y: 0, duration: 0.28, ease: 'back.out(1.7)' })
  }

  public hide() {
    gsap.to(this, {
      alpha: 0,
      duration: 0.16,
      ease: 'power2.in',
      onComplete: () => {
        this.visible = false
        this._inner.y = 0
      },
    })
  }
}
