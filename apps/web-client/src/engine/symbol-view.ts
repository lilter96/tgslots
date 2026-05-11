import { Container, Sprite, Texture, BlurFilter, Graphics } from 'pixi.js'

export class SymbolView extends Container {
  private _sprite: Sprite
  private _blurFilter: BlurFilter
  private _highlightGfx: Graphics

  constructor() {
    super()
    this._sprite = new Sprite()
    this._sprite.anchor.set(0.5)
    this.addChild(this._sprite)

    this._blurFilter = new BlurFilter()
    this._blurFilter.strengthX = 0
    this._blurFilter.strengthY = 0
    this._sprite.filters = [this._blurFilter]

    this._highlightGfx = new Graphics()
    this._highlightGfx.visible = false
    this.addChild(this._highlightGfx)
  }

  public setTexture(texture: Texture) {
    this._sprite.texture = texture
  }

  public setBlur(amount: number) {
    this._blurFilter.strengthY = amount
    this._sprite.filters = amount > 0 ? [this._blurFilter] : []
  }

  public override setSize(width: number, height: number) {
    this._sprite.width = width * 0.8
    this._sprite.height = height * 0.8
    this._sprite.x = width / 2
    this._sprite.y = height / 2
  }

  public highlight(color: number = 0xffd700): void {
    this._highlightGfx.visible = true
    this._highlightGfx.clear()
    const w = this._sprite.width + 12
    const h = this._sprite.height + 12
    const x = this._sprite.x - w / 2
    const y = this._sprite.y - h / 2
    this._highlightGfx.rect(x, y, w, h)
    this._highlightGfx.stroke({ color, width: 4, alpha: 1 })
    this._highlightGfx.rect(x + 4, y + 4, w - 8, h - 8)
    this._highlightGfx.fill({ color, alpha: 0.15 })

    import('gsap').then(({ gsap }) => {
      gsap.killTweensOf(this._highlightGfx)
      this._highlightGfx.alpha = 1
      gsap.to(this._highlightGfx, {
        alpha: 0.35,
        duration: 0.45,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
    })
  }

  public clearHighlight(): void {
    import('gsap').then(({ gsap }) => {
      gsap.killTweensOf(this._highlightGfx)
    })
    this._highlightGfx.clear()
    this._highlightGfx.visible = false
    this._highlightGfx.alpha = 1
  }
}
