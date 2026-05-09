import { Graphics } from 'pixi.js'

export const COMMON_FONT = 'Cinzel, serif'

export function drawWoodPanel(g: Graphics, w: number, h: number, fill = 0x2a1608) {
  g.clear()
  g.roundRect(0, 0, w, h, 12)
  g.fill(fill)
  g.roundRect(0, 0, w, h, 12)
  g.stroke({ width: 2, color: 0xd4a017 })
  g.roundRect(3, 3, w - 6, h - 6, 9)
  g.stroke({ width: 0.9, color: 0xffe066, alpha: 0.32 })
}
