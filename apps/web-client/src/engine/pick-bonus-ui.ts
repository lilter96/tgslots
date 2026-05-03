import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'

export class PickBonusUI extends Container {
  private _cards: Container[] = []
  private _gridWidth = 5
  private _gridHeight = 4
  private _cardSize = 120
  private _spacing = 20
  private _pendingReveal = false

  constructor() {
    super()
    this.visible = false
    this.init()
  }

  private init() {
    const bg = new Graphics()
    // Full screen semi-transparent background
    bg.rect(-2000, -2000, 4000, 4000)
    bg.fill({ color: 0x000000, alpha: 0.8 })
    this.addChild(bg)

    const title = new Text({
      text: 'PICK A CARD TO FIND A MATCH!',
      style: { fill: '#ffd700', fontSize: 40, fontWeight: 'bold' },
    })
    title.anchor.set(0.5)
    title.y = -200
    this.addChild(title)

    const gridContainer = new Container()
    for (let i = 0; i < this._gridWidth * this._gridHeight; i++) {
      const card = this.createCard(i)
      const col = i % this._gridWidth
      const row = Math.floor(i / this._gridWidth)
      card.x =
        col * (this._cardSize + this._spacing) -
        (this._gridWidth * (this._cardSize + this._spacing)) / 2 +
        this._cardSize / 2
      card.y =
        row * (this._cardSize + this._spacing) -
        (this._gridHeight * (this._cardSize + this._spacing)) / 2 +
        this._cardSize / 2
      gridContainer.addChild(card)
      this._cards.push(card)
    }
    this.addChild(gridContainer)
  }

  private createCard(index: number): Container {
    const card = new Container()

    const back = new Graphics()
    back.rect(-this._cardSize / 2, -this._cardSize / 2, this._cardSize, this._cardSize)
    back.fill(0x2e7d32)
    back.stroke({ width: 4, color: 0xffffff })
    card.addChild(back)

    const label = new Text({
      text: '?',
      style: { fill: '#ffffff', fontSize: 48, fontWeight: 'bold' },
    })
    label.anchor.set(0.5)
    card.addChild(label)

    card.interactive = true
    card.cursor = 'pointer'
    card.on('pointerdown', () => {
      if (this._pendingReveal) return
      this._pendingReveal = true
      this.emit('pick', index)
    })

    return card
  }

  public show() {
    this.visible = true
    this.alpha = 0
    gsap.to(this, { alpha: 1, duration: 0.5 })
  }

  public hide() {
    gsap.to(this, {
      alpha: 0,
      duration: 0.5,
      onComplete: () => {
        this.visible = false
        this._pendingReveal = false
        this._cards.forEach((c) => {
          c.interactive = true
          const label = c.getChildAt(1) as Text
          label.text = '?'
        })
      },
    })
  }

  public revealCard(index: number, value: number) {
    const card = this._cards[index]
    if (!card) return

    card.interactive = false
    const label = card.getChildAt(1) as Text

    // Flip animation
    gsap.to(card.scale, {
      x: 0,
      duration: 0.2,
      onComplete: () => {
        label.text = value.toString()
        gsap.to(card.scale, {
          x: 1,
          duration: 0.2,
          onComplete: () => {
            this._pendingReveal = false
          },
        })
      },
    })
  }
}
