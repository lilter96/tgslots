import { Container, Graphics } from 'pixi.js'
import { LAUNCHER_HINGE_X, LAUNCHER_HINGE_Y, LAUNCHER_LEN } from './design.js'
import type { Palette } from './palette.js'

const HT = 120 // box height
const TR = 24 // tube outer radius

export function drawLauncher(launcherContainer: Container, palette: Palette): void {
  launcherContainer.x = LAUNCHER_HINGE_X
  launcherContainer.y = LAUNCHER_HINGE_Y
  launcherContainer.pivot.set(0, 0)

  const g = new Graphics()
  launcherContainer.addChild(g)

  const LEN = LAUNCHER_LEN

  // Main box frame
  g.rect(0, -HT, LEN, HT)
  g.fill({ color: palette.oliveDark })
  g.rect(0, -HT, LEN, 13)
  g.fill({ color: palette.oliveLight })
  g.stroke({ color: palette.oliveDark, width: 2 })
  g.rect(0, -12, LEN, 12)
  g.fill({ color: palette.oliveDark })
  g.rect(0, -HT, 16, HT)
  g.fill({ color: palette.steelDark })
  g.stroke({ color: palette.steel, width: 2 })

  // Vertical rib reinforcements
  for (const rx of [80, 160, 240, 320]) {
    g.rect(rx, -HT, 9, HT)
    g.fill({ color: palette.oliveDark, alpha: 0.6 })
  }

  // Centre separator
  g.rect(0, -HT / 2 - 3, LEN, 6)
  g.fill({ color: palette.oliveDark })

  // Box outline
  g.rect(0, -HT, LEN, HT)
  g.stroke({ color: palette.oliveDark, width: 4 })

  // Missile tubes (upper and lower)
  const tubeYs = [-HT + TR + 6, -TR - 6]
  for (const tY of tubeYs) {
    g.roundRect(14, tY - TR, LEN - 24, TR * 2, TR)
    g.fill({ color: 0x556670 })
    g.stroke({ color: palette.steelDark, width: 2 })
    g.roundRect(16, tY - TR + 4, LEN - 32, TR * 0.55, TR * 0.5)
    g.fill({ color: 0x7a8fa0, alpha: 0.5 })
    for (const bFrac of [0.28, 0.52, 0.76]) {
      g.rect(14 + (LEN - 28) * bFrac, tY - TR, 9, TR * 2)
      g.fill({ color: palette.oliveDark, alpha: 0.78 })
    }
    g.moveTo(LEN - 12, tY - TR + 4)
    g.lineTo(LEN + 26, tY)
    g.lineTo(LEN - 12, tY + TR - 4)
    g.closePath()
    g.fill({ color: 0x888899 })
    g.circle(LEN + 23, tY, 5)
    g.fill({ color: 0xaaaacc })
    g.circle(14, tY, TR - 5)
    g.stroke({ color: 0x2a3540, width: 3 })
    g.circle(14, tY, TR - 11)
    g.fill({ color: 0x0d1520 })
  }

  // Hydraulic lift arm
  g.roundRect(0, 0, LEN * 0.44, 12, 4)
  g.fill({ color: palette.steelDark })
  g.stroke({ color: palette.steel, width: 1.5 })
  g.roundRect(0, 2, LEN * 0.27, 8, 3)
  g.fill({ color: palette.steel })

  // Hinge pivot pin
  g.circle(0, 0, 17)
  g.fill({ color: palette.steel })
  g.stroke({ color: palette.steelDark, width: 3 })
  g.circle(0, 0, 9)
  g.fill({ color: palette.steelDark })
  g.circle(0, 0, 4)
  g.fill({ color: palette.steel })
}
