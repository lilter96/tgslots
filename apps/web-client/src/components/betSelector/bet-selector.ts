import { Container, Graphics, Text } from 'pixi.js'
import { drawWoodPanel, COMMON_FONT } from '../ui-utils'

export class BetSelector extends Container {
  private _values = [1, 2, 3, 4, 5, 6]
  private _index = 2

  private _valueText!: Text

  private _bg!: Graphics
  private _label!: Text

  private _upBtn!: Container
  private _downBtn!: Container

  constructor() {
    super()

    this._bg = new Graphics()
    this.addChild(this._bg)

    this._label = new Text({
      text: 'BET',
      style: {
        fontFamily: COMMON_FONT,
        fill: '#c8a060',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
      },
    })
    this.addChild(this._label)

    this._valueText = new Text({
      text: '',
      style: {
        fontFamily: COMMON_FONT,
        fontSize: 16,
        fontWeight: '700',
        fill: '#ffffff',
      },
    })
    this.addChild(this._valueText)

    this._upBtn = this._createArrowButton(true)
    this._upBtn.on('pointerdown', () => this._increase())
    this.addChild(this._upBtn)

    this._downBtn = this._createArrowButton(false)
    this._downBtn.on('pointerdown', () => this._decrease())
    this.addChild(this._downBtn)

    this._refresh()
  }

  private _createArrowButton(up: boolean): Container {
    const c = new Container()

    const bg = new Graphics()
    // Transparent background, but interactive area
    bg.rect(0, 0, 60, 45)
    bg.fill({ color: 0xffffff, alpha: 0 }) 
    c.addChild(bg)

    const arrow = new Graphics()
    c.addChild(arrow)

    c.eventMode = 'static'
    c.cursor = 'pointer'

    c.on('pointerover', () => { arrow.alpha = 0.7 })
    c.on('pointerout', () => { arrow.alpha = 1 })

    return c
  }

  private _increase() {
    this._index++
    if (this._index >= this._values.length) this._index = 0
    this._refresh()
  }

  private _decrease() {
    this._index--
    if (this._index < 0) this._index = this._values.length - 1
    this._refresh()
  }

  private _refresh() {
    this._valueText.text = `BET ${this._values[this._index]}`
  }

  public resize(width: number, height: number) {
    drawWoodPanel(this._bg, width, height, 0x1d1308)

    // Label
    this._label.style.fontSize = Math.min(14, height * 0.25)
    this._label.position.set(width * 0.08, height * 0.15)

    // Value
    this._valueText.style.fontSize = Math.min(18, height * 0.4)
    this._valueText.position.set(width * 0.08, height * 0.5)

    // Buttons
    const btnWidth = width * 0.25
    const btnHeight = height
    const btnX = width - btnWidth

    this._upBtn.position.set(btnX, 0)
    this._downBtn.position.set(btnX, btnHeight / 2)

    const upArrow = this._upBtn.children[1] as Graphics
    const downArrow = this._downBtn.children[1] as Graphics

    const size = Math.min(btnWidth, btnHeight / 2) * 0.4
    const cx = btnWidth / 2
    const cy = btnHeight / 4

    upArrow.clear()
    upArrow.moveTo(cx, cy - size / 2)
    upArrow.lineTo(cx + size / 2, cy + size / 2)
    upArrow.lineTo(cx - size / 2, cy + size / 2)
    upArrow.fill(0xffe066)

    downArrow.clear()
    downArrow.moveTo(cx, cy + size / 2)
    downArrow.lineTo(cx + size / 2, cy - size / 2)
    downArrow.lineTo(cx - size / 2, cy - size / 2)
    downArrow.fill(0xffe066)
  }

  public get value() {
    return this._values[this._index]
  }
}