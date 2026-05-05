import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import type { UILayoutSnapshot } from './layout'

const FONT = 'Cinzel, serif'
const CARD_SIZE = 120
const SPACING = 16
const COLS = 5
const ROWS = 4
const TITLE_PLATE_W = 640
const TITLE_PLATE_H = 60

const GRID_WIDTH = COLS * (CARD_SIZE + SPACING) - SPACING
const GRID_HEIGHT = ROWS * (CARD_SIZE + SPACING) - SPACING
const CONTENT_HEIGHT = TITLE_PLATE_H + 44 + GRID_HEIGHT

function makeParchmentCard(): { card: Container; label: Text } {
  const card = new Container()
  const half = CARD_SIZE / 2

  const back = new Graphics()
  back.roundRect(-half, -half, CARD_SIZE, CARD_SIZE, 8)
  back.fill(0xf5e8c0)
  back.roundRect(-half, -half, CARD_SIZE, CARD_SIZE, 8)
  back.stroke({ width: 3, color: 0xd4a017 })
  back.roundRect(-half + 6, -half + 6, CARD_SIZE - 12, CARD_SIZE - 12, 4)
  back.stroke({ width: 0.8, color: 0xa07010, alpha: 0.5 })

  const corners: [number, number][] = [
    [-half + 14, -half + 14],
    [half - 14, -half + 14],
    [-half + 14, half - 14],
    [half - 14, half - 14],
  ]
  for (const [cx, cy] of corners) {
    back.circle(cx, cy, 5)
    back.fill(0xd4a017)
  }
  card.addChild(back)

  const label = new Text({
    text: '?',
    style: {
      fontFamily: FONT,
      fontSize: 52,
      fontWeight: '700',
      fill: '#5a3a08',
      stroke: { color: '#d4a017', width: 2 },
    },
  })
  label.anchor.set(0.5)
  card.addChild(label)

  return { card, label }
}

export class PickBonusUI extends Container {
  private _cards: Container[] = []
  private _labels: Text[] = []
  private _pendingReveal = false

  private _background: Graphics
  private _content: Container
  private _titlePlate: Graphics
  private _title: Text
  private _gridContainer: Container

  constructor() {
    super()
    this.visible = false
    this._background = new Graphics()
    this._content = new Container()
    this._titlePlate = new Graphics()
    this._title = new Text({
      text: 'PICK A CARD TO FIND A MATCH',
      style: { fontFamily: FONT, fill: '#ffe066', fontSize: 22, fontWeight: '700' },
    })
    this._gridContainer = new Container()
    this._init()
  }

  private _init() {
    this.addChild(this._background, this._content)

    this._content.addChild(this._titlePlate)

    this._title.anchor.set(0.5)
    this._content.addChild(this._title)

    const startX = -GRID_WIDTH / 2 + CARD_SIZE / 2
    const startY = -GRID_HEIGHT / 2 + CARD_SIZE / 2

    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const { card, label } = makeParchmentCard()
      card.x = startX + col * (CARD_SIZE + SPACING)
      card.y = startY + row * (CARD_SIZE + SPACING)

      card.interactive = true
      card.cursor = 'pointer'
      card.on('pointerdown', () => {
        if (this._pendingReveal) return
        this._pendingReveal = true
        this.emit('pick', i)
      })

      this._gridContainer.addChild(card)
      this._cards.push(card)
      this._labels.push(label)
    }

    this._gridContainer.y = 52
    this._content.addChild(this._gridContainer)
  }

  public resize(layout: UILayoutSnapshot) {
    this._background.clear()
    this._background.rect(0, 0, layout.screenWidth, layout.screenHeight)
    this._background.fill({ color: 0x030e02, alpha: 0.88 })

    this._titlePlate.clear()
    this._titlePlate.roundRect(-TITLE_PLATE_W / 2, -CONTENT_HEIGHT / 2, TITLE_PLATE_W, TITLE_PLATE_H, 10)
    this._titlePlate.fill(0x2a1608)
    this._titlePlate.stroke({ width: 2, color: 0xd4a017 })

    this._title.style.fontSize = layout.viewportClass === 'phone' ? 18 : 22
    this._title.y = -CONTENT_HEIGHT / 2 + TITLE_PLATE_H / 2

    const scale = Math.min(
      1,
      layout.featureBounds.width / (GRID_WIDTH + 40),
      layout.featureBounds.height / (CONTENT_HEIGHT + 40),
    )
    this._content.scale.set(scale)
    this._content.x = layout.featureBounds.x + layout.featureBounds.width / 2
    this._content.y = layout.featureBounds.y + layout.featureBounds.height / 2
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
        this._cards.forEach((card, i) => {
          card.interactive = true
          const label = this._labels[i]!
          label.text = '?'
          label.style.fontSize = 52
          label.style.fill = '#5a3a08'
        })
      },
    })
  }

  public restoreState(userPicks: number[], revealedValues: number[]) {
    userPicks.forEach((index, i) => {
      const card = this._cards[index]
      const label = this._labels[index]
      if (!card || !label) return

      card.interactive = false
      label.text = revealedValues[i]!.toString()
      label.style.fontSize = 44
    })
  }

  public revealCard(index: number, value: number) {
    const card = this._cards[index]
    const label = this._labels[index]
    if (!card || !label) return

    card.interactive = false

    gsap.to(card.scale, {
      x: 0,
      duration: 0.2,
      onComplete: () => {
        label.text = value.toString()
        label.style.fontSize = 44
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
