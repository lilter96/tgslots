import { Container, Graphics, Text } from 'pixi.js'
import type { Application, Texture } from 'pixi.js'

const specs = [
  { id: 'CHILL', copy: 'chill', color: 0x9dcfff },
  { id: 'HYPE', copy: 'HYPE', color: 0xff85bf },
  { id: 'LOL', copy: 'LOL', color: 0xb7a1ff },
  { id: 'GG', copy: 'gg', color: 0xaff79a },
  { id: 'SEVEN', copy: '7', color: 0xffdc70 },
  { id: 'WILD', copy: 'WILD', color: 0xd9ff43 },
  { id: 'COIN', copy: '', color: 0xffd161 },
  { id: 'STOP', copy: 'BANK', color: 0x9e89b3 },
  { id: 'PLUS1', copy: '+1×', color: 0xd9ff43 },
  { id: 'PLUS2', copy: '+2×', color: 0xff85bf },
  { id: 'X7', copy: '×7', color: 0xffdc70 },
]
export function buildTextures(app: Application): Record<string, Texture> {
  return Object.fromEntries(
    specs.map(({ id, copy, color }) => {
      const container = new Container()
      const drawing = new Graphics()
        .roundRect(5, 5, 122, 122, 24)
        .fill({ color: 0x1c102d })
        .stroke({ color, width: 2, alpha: 0.45 })
      if (id === 'COIN') {
        drawing
          .circle(66, 66, 53)
          .fill({ color: 0x8a4c14 })
          .stroke({ color: 0xffd773, width: 5 })
          .circle(66, 66, 45)
          .fill({ color: 0xd9a341 })
          .stroke({ color: 0xffeea6, width: 2 })
          .circle(66, 66, 37)
          .fill({ color: 0x382415 })
      } else {
        drawing.roundRect(17, 30, 98, 72, 19).fill({ color, alpha: 0.13 })
        const text = new Text({
          text: copy,
          style: {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: id === 'SEVEN' ? 85 : copy.length > 3 ? 30 : 46,
            fontWeight: '900',
            fill: color,
            stroke: { color: 0x140a23, width: 3 },
            dropShadow: { color, alpha: 0.4, blur: 8, distance: 0 },
          },
        })
        text.anchor.set(0.5)
        text.position.set(66, 64)
        text.rotation = id === 'LOL' ? -0.1 : id === 'HYPE' ? 0.09 : 0
        container.addChild(text)
      }
      container.addChildAt(drawing, 0)
      const texture = app.renderer.generateTexture({ target: container, resolution: 2 })
      container.destroy({ children: true })
      return [id, texture]
    }),
  )
}
