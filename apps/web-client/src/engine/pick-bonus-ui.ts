import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'

const FONT = 'Cinzel, serif'
const CARD_SIZE = 120
const SPACING = 16
const COLS = 5
const ROWS = 4

function makeParchmentCard(): { card: Container; label: Text } {
  const card = new Container()
  const half = CARD_SIZE / 2

  const back = new Graphics()
  // Parchment fill
  back.roundRect(-half, -half, CARD_SIZE, CARD_SIZE, 8)
  back.fill(0xf5e8c0)
  // Gold border
  back.roundRect(-half, -half, CARD_SIZE, CARD_SIZE, 8)
  back.stroke({ width: 3, color: 0xd4a017 })
  // Inner subtle border
  back.roundRect(-half + 6, -half + 6, CARD_SIZE - 12, CARD_SIZE - 12, 4)
  back.stroke({ width: 0.8, color: 0xa07010, alpha: 0.5 })
  // Corner diamonds
  const cr = 5
  const inset = 14
  const corners: [number, number][] = [
    [-half + inset, -half + inset],
    [half - inset, -half + inset],
    [-half + inset, half - inset],
    [half - inset, half - inset],
  ]
  for (const [cx, cy] of corners) {
    back.circle(cx, cy, cr)
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

  constructor() {
    super()
    this.visible = false
    this._init()
  }

  private _init() {
    // Full-screen dark forest overlay
    const bg = new Graphics()
    bg.rect(-2000, -2000, 4000, 4000)
    bg.fill({ color: 0x030e02, alpha: 0.88 })
    this.addChild(bg)

    // Parchment title plate
    const titleBg = new Graphics()
    titleBg.roundRect(-320, -310, 640, 60, 10)
    titleBg.fill(0x2a1608)
    titleBg.stroke({ width: 2, color: 0xd4a017 })
    this.addChild(titleBg)

    const title = new Text({
      text: 'PICK A CARD TO FIND A MATCH',
      style: { fontFamily: FONT, fill: '#ffe066', fontSize: 22, fontWeight: '700' },
    })
    title.anchor.set(0.5)
    title.y = -283
    this.addChild(title)

    const gridContainer = new Container()
    const gridW = COLS * (CARD_SIZE + SPACING) - SPACING
    const gridH = ROWS * (CARD_SIZE + SPACING) - SPACING
    const startX = -gridW / 2 + CARD_SIZE / 2
    const startY = -gridH / 2 + CARD_SIZE / 2

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

      gridContainer.addChild(card)
      this._cards.push(card)
      this._labels.push(label)
    }
    this.addChild(gridContainer)
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
        this._cards.forEach((c, i) => {
          c.interactive = true
          const lbl = this._labels[i]!
          lbl.text = '?'
          lbl.style.fill = '#5a3a08'
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
