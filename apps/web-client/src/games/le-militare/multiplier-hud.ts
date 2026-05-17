import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { gsap } from 'gsap'

const STYLE = new TextStyle({
  fontFamily: 'serif',
  fontSize: 24,
  fontWeight: '900',
  fill: '#d4af37',
  stroke: '#1a2e1f',
  strokeThickness: 3,
})

export class MultiplierHud extends Container {
  private _bg: Graphics
  private _label: Text
  private _value: Text
  private _currentValue: number = 0

  constructor() {
    super()
    this._bg = new Graphics()
    this.addChild(this._bg)

    this._label = new Text({
      text: 'MULTIPLIER',
      style: {
        fontFamily: 'serif',
        fontSize: 12,
        fontWeight: '900',
        fill: '#b0b0b0',
        stroke: '#1a2e1f',
        strokeThickness: 2,
      },
    })
    this._label.anchor.set(0.5)
    this._label.y = -15
    this.addChild(this._label)

    this._value = new Text({ text: '×1', style: STYLE })
    this._value.anchor.set(0.5)
    this._value.y = 8
    this.addChild(this._value)

    this._draw()
  }

  private _draw() {
    this._bg.clear()
    this._bg
      .roundRect(-50, -25, 100, 50, 8)
      .fill({ color: 0x1a2e1f, alpha: 0.8 })
      .stroke({ color: 0xd4af37, width: 2 })
  }

  public setValue(value: number) {
    const targetValue = Math.max(1, value)
    if (this._currentValue === targetValue) return

    gsap.to(this.scale, {
      x: 1.2,
      y: 1.2,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
    })

    this._currentValue = targetValue
    this._value.text = `×${targetValue}`
  }
}
