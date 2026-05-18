import { Container, Graphics } from 'pixi.js'
import { GND, WR, WCY } from './design.js'
import type { Palette } from './palette.js'

function drawWheel(g: Graphics, cx: number, cy: number, palette: Palette): void {
  g.circle(cx, cy, WR)
  g.fill({ color: palette.rubber })
  g.circle(cx, cy, WR)
  g.stroke({ color: 0x282828, width: 8 })
  g.circle(cx, cy, WR - 12)
  g.stroke({ color: 0x242424, width: 3 })
  g.circle(cx, cy, WR - 16)
  g.fill({ color: palette.hub })
  g.circle(cx, cy, WR - 26)
  g.stroke({ color: palette.steelDark, width: 2.5 })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    g.circle(cx + Math.cos(a) * (WR - 31), cy + Math.sin(a) * (WR - 31), 5)
    g.fill({ color: palette.steelDark })
  }
  g.circle(cx, cy, 11)
  g.fill({ color: palette.steel })
  g.circle(cx, cy, 5)
  g.fill({ color: palette.steelDark })
  g.arc(cx, cy, WR - 3, -Math.PI * 0.82, -Math.PI * 0.5)
  g.stroke({ color: 0x3a3a3a, width: 4, alpha: 0.5 })
}

function drawStar(g: Graphics, cx: number, cy: number, r: number, color: number): void {
  const pts: number[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.42
    pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  g.poly(pts)
  g.fill({ color })
}

export function drawChassis(chassisContainer: Container, palette: Palette): void {
  const g = new Graphics()
  chassisContainer.addChild(g)

  // Ground shadow
  g.ellipse(460, GND + 10, 340, 18)
  g.fill({ color: palette.shadow, alpha: 0.48 })

  // Wheels (4 axle positions visible from the side)
  const wheelXs = [130, 240, 540, 655]
  for (const wx of wheelXs) drawWheel(g, wx, WCY, palette)

  // Axle housings
  for (const wx of wheelXs) {
    g.roundRect(wx - 10, WCY, 20, 46, 3)
    g.fill({ color: palette.steelDark })
  }

  // Hull underbody
  g.rect(82, 498, 762, 20)
  g.fill({ color: palette.oliveDark })
  for (let rx = 100; rx < 840; rx += 72) {
    g.rect(rx, 498, 10, 20)
    g.fill({ color: palette.shadow, alpha: 0.4 })
  }

  // Main hull body
  g.rect(82, 274, 762, 226)
  g.fill({ color: palette.olive })
  g.rect(82, 274, 762, 14)
  g.fill({ color: palette.oliveLight })
  for (const ly of [332, 394, 454]) {
    g.rect(90, ly, 750, 4)
    g.fill({ color: palette.oliveDark, alpha: 0.6 })
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      g.roundRect(96 + col * 72, 296 + row * 68, 52, 9, 3)
      g.fill({ color: palette.oliveDark, alpha: 0.72 })
    }
  }
  for (const rx of [160, 260, 360, 460]) {
    for (const ry of [310, 364, 420, 472]) {
      g.circle(rx, ry, 4)
      g.fill({ color: palette.oliveDark })
    }
  }
  g.rect(82, 274, 762, 226)
  g.stroke({ color: palette.oliveDark, width: 3 })
  g.rect(82, 515, 762, 6)
  g.fill({ color: palette.oliveLight, alpha: 0.2 })

  // Rear tow hook
  g.roundRect(68, 456, 18, 18, 4)
  g.fill({ color: palette.steelDark })
  g.stroke({ color: palette.steel, width: 2 })
  g.circle(77, 465, 5)
  g.stroke({ color: palette.steel, width: 3 })

  // Cab
  g.rect(556, 274, 288, 226)
  g.fill({ color: palette.olive })
  g.stroke({ color: palette.oliveDark, width: 3 })
  g.moveTo(556, 274)
  g.lineTo(556, 162)
  g.lineTo(592, 144)
  g.lineTo(826, 144)
  g.lineTo(842, 162)
  g.lineTo(842, 274)
  g.closePath()
  g.fill({ color: palette.olive })
  g.stroke({ color: palette.oliveDark, width: 3 })
  g.moveTo(558, 268)
  g.lineTo(558, 166)
  g.lineTo(594, 150)
  g.lineTo(824, 150)
  g.lineTo(840, 166)
  g.lineTo(840, 160)
  g.lineTo(594, 160)
  g.lineTo(560, 178)
  g.lineTo(560, 268)
  g.closePath()
  g.fill({ color: palette.oliveLight, alpha: 0.5 })

  // Windshield
  g.moveTo(576, 274)
  g.lineTo(590, 178)
  g.lineTo(820, 178)
  g.lineTo(820, 274)
  g.closePath()
  g.fill({ color: palette.glass, alpha: 0.88 })
  g.moveTo(578, 273)
  g.lineTo(591, 186)
  g.lineTo(624, 186)
  g.lineTo(612, 273)
  g.closePath()
  g.fill({ color: palette.glassHi, alpha: 0.42 })
  g.moveTo(576, 274)
  g.lineTo(590, 178)
  g.lineTo(820, 178)
  g.lineTo(820, 274)
  g.closePath()
  g.stroke({ color: palette.oliveDark, width: 3 })
  g.moveTo(700, 274)
  g.lineTo(718, 196)
  g.stroke({ color: palette.steelDark, width: 3, alpha: 0.65 })
  g.moveTo(702, 178)
  g.lineTo(702, 274)
  g.stroke({ color: palette.oliveDark, width: 2.5 })
  g.roundRect(716, 236, 28, 9, 4)
  g.fill({ color: palette.steel })

  // Headlights
  g.roundRect(824, 222, 18, 36, 5)
  g.fill({ color: 0xeeeebb })
  g.roundRect(826, 224, 14, 30, 4)
  g.fill({ color: 0xffffcc, alpha: 0.9 })
  g.roundRect(824, 268, 18, 16, 4)
  g.fill({ color: 0xddcc88 })

  // Front bumper
  g.roundRect(834, 460, 22, 46, 5)
  g.fill({ color: palette.steelDark })
  g.stroke({ color: palette.steel, width: 2 })

  // Exhaust stacks
  for (const ex of [804, 820]) {
    g.rect(ex, 88, 9, 60)
    g.fill({ color: palette.exhaust })
    g.ellipse(ex + 4.5, 88, 7, 4)
    g.fill({ color: 0x404040 })
    g.ellipse(ex + 4.5, 80, 5, 9)
    g.fill({ color: 0x222222, alpha: 0.3 })
  }

  // Cab step plates
  g.roundRect(830, 400, 24, 10, 3)
  g.fill({ color: palette.steelDark })
  g.roundRect(830, 420, 24, 10, 3)
  g.fill({ color: palette.steelDark })

  // Side mirror
  g.roundRect(834, 186, 22, 18, 4)
  g.fill({ color: palette.oliveDark })
  g.roundRect(836, 188, 18, 14, 3)
  g.fill({ color: palette.glass, alpha: 0.5 })

  // Soviet red star on cab door
  drawStar(g, 644, 232, 20, palette.red)

  // Military number plate hint
  for (let i = 0; i < 4; i++) {
    g.rect(758 + i * 10, 226, 6, 6)
    g.fill({ color: palette.oliveDark, alpha: 0.55 })
  }

  // Cab/body junction seam
  g.moveTo(556, 144)
  g.lineTo(556, 500)
  g.stroke({ color: palette.oliveDark, width: 5 })
}
