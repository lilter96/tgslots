import { Container, Graphics, Text } from 'pixi.js'

const FONT = 'Cinzel, serif'

export class BetSelector extends Container {
  private _values = [1, 2, 3, 4, 5, 6]
  private _index = 2

  private _valueText!: Text

  // ссылки на элементы (ВАЖНО)
  private _bg!: Graphics
  private _divider!: Graphics
  private _label!: Text

  private _upBtn!: Container
  private _downBtn!: Container

  constructor() {
    super()

    // BG
    this._bg = new Graphics()
    this._bg.roundRect(0, 0, 220, 90, 8)
    this._bg.fill(0x1e1e1e)
    this._bg.stroke({ width: 2, color: 0x555555 })
    this.addChild(this._bg)

    // Divider
    this._divider = new Graphics()
    this._divider.rect(160, 0, 2, 90)
    this._divider.fill(0x333333)
    this.addChild(this._divider)

    // Label
    this._label = new Text({
      text: 'BET',
      style: {
        fontFamily: FONT,
        fill: '#c8a060',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
      },
    })

    this._label.position.set(20, 14)
    this.addChild(this._label)

    // Value
    this._valueText = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: '700',
        fill: '#ffffff',
      },
    })

    this._valueText.position.set(20, 38)
    this.addChild(this._valueText)

    // UP button
    this._upBtn = this._createArrowButton(true)
    this._upBtn.position.set(160, 0)
    this._upBtn.on('pointerdown', () => this._increase())
    this.addChild(this._upBtn)

    // DOWN button
    this._downBtn = this._createArrowButton(false)
    this._downBtn.position.set(160, 45)
    this._downBtn.on('pointerdown', () => this._decrease())
    this.addChild(this._downBtn)

    this._refresh()
  }

  private _createArrowButton(up: boolean): Container {
    const c = new Container()

    const bg = new Graphics()
    bg.rect(0, 0, 60, 45)
    bg.fill(0x2c2c2c)
    c.addChild(bg)

    const arrow = new Graphics()

    if (up) {
      arrow.moveTo(30, 12)
      arrow.lineTo(45, 28)
      arrow.lineTo(15, 28)
    } else {
      arrow.moveTo(15, 16)
      arrow.lineTo(45, 16)
      arrow.lineTo(30, 32)
    }

    arrow.fill(0xffffff)
    c.addChild(arrow)

    c.eventMode = 'static'
    c.cursor = 'pointer'

    c.on('pointerover', () => {
      bg.tint = 0x666666
    })

    c.on('pointerout', () => {
      bg.tint = 0xffffff
    })

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
    if (!this._bg) return

    // BG
    this._bg.clear()
    this._bg.roundRect(0, 0, width, height, 8)
    this._bg.fill(0x1e1e1e)
    this._bg.stroke({ width: Math.max(1, height * 0.03), color: 0x555555 })

    // Divider
    const dividerX = width * 0.72
    this._divider.clear()
    this._divider.rect(dividerX, 0, 2, height)
    this._divider.fill(0x333333)

    // Label
    this._label.style.fontSize = Math.min(14, height * 0.22)
    this._label.position.set(width * 0.08, height * 0.12)

    // Value
    this._valueText.style.fontSize = Math.min(16, height * 0.45)
    this._valueText.position.set(width * 0.08, height * 0.45)

    // Buttons
    const btnHeight = height / 2
    const btnWidth = width - dividerX

    this._upBtn.position.set(dividerX, 0)
    this._downBtn.position.set(dividerX, btnHeight)

    const upBg = this._upBtn.children[0] as Graphics
    const downBg = this._downBtn.children[0] as Graphics

    upBg.clear()
    upBg.rect(0, 0, btnWidth, btnHeight)
    upBg.fill(0x2c2c2c)

    downBg.clear()
    downBg.rect(0, 0, btnWidth, btnHeight)
    downBg.fill(0x2c2c2c)

    // arrows
    const upArrow = this._upBtn.children[1] as Graphics
    const downArrow = this._downBtn.children[1] as Graphics

    const arrowScale = Math.min(width, height) * 0.01

    upArrow.clear()
    upArrow.moveTo(0, arrowScale * 2)
    upArrow.lineTo(arrowScale * 1.5, 0)
    upArrow.lineTo(arrowScale * 3, arrowScale * 2)
    upArrow.fill(0xffffff)

    downArrow.clear()
    downArrow.moveTo(0, 0)
    downArrow.lineTo(arrowScale * 3, 0)
    downArrow.lineTo(arrowScale * 1.5, arrowScale * 2)
    downArrow.fill(0xffffff)
  }

  public get value() {
    return this._values[this._index]
  }
}