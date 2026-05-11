import { Container, Sprite, Text, TextStyle } from 'pixi.js'
import { gsap } from 'gsap'
import type { GameAssets } from './asset-registry'
import type { WinTier } from '@tgslots/shared-contracts'
import type { UILayoutSnapshot } from './layout'

export class WinOverlay extends Container {
  private _sprite: Sprite
  private _fallbackText: Text
  private _baseScale = 1
  private _baseFontSize = 72
  private _assets: GameAssets | null = null
  private _winTiers: readonly WinTier[] = []

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
      align: 'center',
    })
    this._fallbackText = new Text({ text: '', style })
    this._fallbackText.anchor.set(0.5)
    this.addChild(this._fallbackText)

    this.alpha = 0
    this.visible = false
  }

  public setGame(assets: GameAssets, winTiers: readonly WinTier[]): void {
    this._assets = assets
    this._winTiers = winTiers
  }

  public resize(layout: UILayoutSnapshot) {
    this.x = layout.overlayCenter.x
    this.y = layout.overlayCenter.y
    this._baseScale = layout.winOverlayScale
    this._baseFontSize = layout.viewportClass === 'phone' ? 48 : 72
  }

  public async announce(text: string, duration = 2000): Promise<void> {
    const tier = this._winTiers.find((t) => t.copy === text)
    const textureName = tier?.textureName

    if (textureName && this._assets) {
      try {
        this._sprite.texture = this._assets.getTexture(textureName)
        this._sprite.visible = true
        this._fallbackText.visible = false
      } catch {
        this._showFallbackText(text)
      }
    } else {
      this._showFallbackText(text)
    }

    this.visible = true
    this.scale.set(this._baseScale * 0.6)

    return new Promise((resolve) => {
      gsap
        .timeline({ onComplete: resolve })
        .to(this, { alpha: 1, duration: 0.25, ease: 'power2.out' })
        .to(
          this.scale,
          { x: this._baseScale, y: this._baseScale, duration: 0.25, ease: 'back.out(2)' },
          '<',
        )
        .to(this, { alpha: 1, duration: duration / 1000 })
        .to(this, {
          alpha: 0,
          duration: 0.3,
          ease: 'power1.in',
          onComplete: () => {
            this.visible = false
            this.scale.set(this._baseScale)
          },
        })
    })
  }

  public async announceWin(amount: number, totalWager: number): Promise<void> {
    const ratio = totalWager > 0 ? amount / totalWager : 0
    const tier = [...this._winTiers]
      .sort((a, b) => b.thresholdX - a.thresholdX)
      .find((t) => ratio >= t.thresholdX)
    return this.announce(tier?.copy ?? 'WIN!', 2500)
  }

  public async announceFreeSpinsAwarded(awarded: number, duration = 2000): Promise<void> {
    return this.announce(`${awarded} FREE SPINS WON`, duration)
  }

  private _showFallbackText(text: string) {
    this._fallbackText.style.fontSize =
      (text.length > 12 ? this._baseFontSize * 0.72 : this._baseFontSize) / this._baseScale
    this._fallbackText.text = text
    this._fallbackText.visible = true
    this._sprite.visible = false
  }
}
