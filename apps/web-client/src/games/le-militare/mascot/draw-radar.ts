import { Container, Graphics } from 'pixi.js'
import type { Palette } from './palette.js'

export function drawRadar(radarContainer: Container, palette: Palette): void {
  radarContainer.x = 340
  radarContainer.y = 274
  radarContainer.pivot.set(0, 0)

  const g = new Graphics()
  radarContainer.addChild(g)

  // Base mounting ring
  g.roundRect(-30, -20, 60, 22, 4)
  g.fill({ color: palette.steelDark })
  g.stroke({ color: palette.steel, width: 2 })

  // Vertical mast
  g.rect(-7, -118, 14, 100)
  g.fill({ color: palette.steel })
  g.rect(-3, -118, 5, 100)
  g.fill({ color: palette.oliveLight, alpha: 0.18 })

  // Horizontal pivot crossbar
  g.rect(-82, -126, 164, 12)
  g.fill({ color: palette.steelDark })

  // Phased-array dish outer frame
  g.roundRect(-80, -230, 160, 108, 7)
  g.fill({ color: palette.oliveDark })
  g.stroke({ color: palette.steelDark, width: 3 })

  // Dish face background
  g.roundRect(-76, -226, 152, 100, 5)
  g.fill({ color: 0x2a3a4a })

  // Array element grid — 5 rows × 8 cols
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const ex = -70 + col * 18
      const ey = -220 + row * 18
      g.roundRect(ex, ey, 14, 13, 2)
      g.fill({ color: 0x4477aa })
      g.roundRect(ex, ey, 14, 4, 2)
      g.fill({ color: 0x6699cc, alpha: 0.45 })
    }
  }

  // Alert indicator light
  g.circle(0, -236, 6)
  g.fill({ color: 0x22cc44 })
  g.circle(0, -236, 9)
  g.stroke({ color: 0x33ff55, width: 2, alpha: 0.55 })

  // Diagonal support braces
  g.moveTo(-5, -118)
  g.lineTo(-74, -222)
  g.stroke({ color: palette.steelDark, width: 3, alpha: 0.65 })
  g.moveTo(5, -118)
  g.lineTo(74, -222)
  g.stroke({ color: palette.steelDark, width: 3, alpha: 0.65 })
}
