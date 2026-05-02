import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { gsap } from 'gsap'

export class WinOverlay extends Container {
  private _bg: Graphics
  private _text: Text

  constructor() {
    super()

    this._bg = new Graphics()
    this._bg.rect(-600, -100, 1200, 200)
    this._bg.fill({ color: 0x000000, alpha: 0.7 })
    this.addChild(this._bg)

    const style = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 72,
      fontWeight: 'bold',
      fill: 0xffd700,
      dropShadow: { color: 0x000000, blur: 12, distance: 4, angle: Math.PI / 4 },
      stroke: { color: 0x000000, width: 6 },
    })
    this._text = new Text({ text: '', style })
    this._text.anchor.set(0.5)
    this.addChild(this._text)

    this.alpha = 0
    this.visible = false
  }

  public async announce(text: string, duration = 2000): Promise<void> {
    this._text.text = text
    this.visible = true
    this.scale.set(0.6)

    return new Promise((resolve) => {
      gsap
        .timeline({ onComplete: resolve })
        .to(this, { alpha: 1, duration: 0.25, ease: 'power2.out' })
        .to(this.scale, { x: 1, y: 1, duration: 0.25, ease: 'back.out(2)' }, '<')
        .to(this, { alpha: 1, duration: duration / 1000 })
        .to(this, {
          alpha: 0,
          duration: 0.3,
          ease: 'power1.in',
          onComplete: () => {
            this.visible = false
            this.scale.set(1)
          },
        })
    })
  }
}
