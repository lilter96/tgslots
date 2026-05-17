import { Container, Sprite, Texture, BlurFilter, Graphics } from 'pixi.js'
import { gsap } from 'gsap'

export class SymbolView extends Container {
  private _sprite: Sprite
  private _blurFilter: BlurFilter
  private _highlightGfx: Graphics
  private _multiplierContainer: Container

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

    this._multiplierContainer = new Container()
    this.addChild(this._multiplierContainer)
  }

  public setTexture(texture: Texture) {
    this._sprite.texture = texture
  }

  public setBlur(amount: number) {
    this._blurFilter.strengthY = amount
    this._sprite.filters = amount > 0 ? [this._blurFilter] : []
  }

  public override setSize(width: number, height: number) {
    const cx = width / 2
    const cy = height / 2
    this._sprite.width = width * 0.8
    this._sprite.height = height * 0.8
    this._sprite.x = cx
    this._sprite.y = cy
    this._multiplierContainer.x = cx
    this._multiplierContainer.y = cy
  }

  public get multiplierContainer(): Container {
    return this._multiplierContainer
  }

  public clearMultiplier(): void {
    this._multiplierContainer.removeChildren().forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
      c.destroy({ children: true })
    })
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

    gsap.killTweensOf(this._highlightGfx)
    this._highlightGfx.alpha = 1
    gsap.to(this._highlightGfx, {
      alpha: 0.35,
      duration: 0.45,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  }

  public clearHighlight(): void {
    gsap.killTweensOf(this._highlightGfx)
    this._highlightGfx.clear()
    this._highlightGfx.visible = false
    this._highlightGfx.alpha = 1
  }

  override destroy(options?: {
    children?: boolean
    texture?: boolean
    baseTexture?: boolean
  }): void {
    gsap.killTweensOf(this)
    gsap.killTweensOf(this.scale)
    gsap.killTweensOf(this._highlightGfx)
    this.clearMultiplier()
    super.destroy(options)
  }
}
