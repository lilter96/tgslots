import { Container, Sprite, Text, TextStyle } from 'pixi.js'
import { AssetLoader } from './asset-loader'
import { gsap } from 'gsap'

const TEXTURE_MAP: Record<string, string> = {
  'BONUS!': 'ANNOUNCE_BONUS',
  'FREE SPINS!': 'ANNOUNCE_FREE',
  'WIN!': 'WIN_SMALL',
  'BIG WIN!': 'WIN_BIG',
  'MEGA WIN!': 'WIN_MEGA',
}

export class WinOverlay extends Container {
  private _sprite: Sprite
  private _fallbackText: Text

  constructor() {
    super()

    this._sprite = new Sprite()
    this._sprite.anchor.set(0.5)
    this.addChild(this._sprite)

    const style = new TextStyle({
      fontFamily: 'Cinzel, serif',
      fontSize: 72,
      fontWeight: 'bold',
      fill: 0xffd700,
      dropShadow: { color: 0x000000, blur: 12, distance: 4, angle: Math.PI / 4 },
      stroke: { color: 0x000000, width: 6 },
    })
    this._fallbackText = new Text({ text: '', style })
    this._fallbackText.anchor.set(0.5)
    this.addChild(this._fallbackText)

    this.alpha = 0
    this.visible = false
  }

  public async announce(text: string, duration = 2000): Promise<void> {
    const textureName = TEXTURE_MAP[text]
    if (textureName) {
      this._sprite.texture = AssetLoader.getTexture(textureName)
      this._sprite.visible = true
      this._fallbackText.visible = false
    } else {
      this._fallbackText.text = text
      this._fallbackText.visible = true
      this._sprite.visible = false
    }

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

  public async announceWin(amount: number, totalWager: number): Promise<void> {
    const ratio = totalWager > 0 ? amount / totalWager : 0
    let tier: string
    if (ratio >= 50) tier = 'MEGA WIN!'
    else if (ratio >= 20) tier = 'BIG WIN!'
    else tier = 'WIN!'
    return this.announce(tier, 2500)
  }
}
