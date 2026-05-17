import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import type { UILayoutSnapshot } from '../../engine/layout.js'

// ── Palette ────────────────────────────────────────────────────────────────
const P = {
  olive: 0x4a5c2a,
  oliveDark: 0x2e3d18,
  oliveLight: 0x637a36,
  steel: 0x8899aa,
  steelDark: 0x4a6070,
  rubber: 0x181818,
  hub: 0x9aaabb,
  glass: 0x5588aa,
  glassHi: 0x88ccee,
  red: 0xcc1a1a,
  exhaust: 0x2e2e2e,
  shadow: 0x0e1a08,
} as const

// ── Design-space constants ─────────────────────────────────────────────────
// All drawing coordinates live in this space; the container is scaled to fit.
const GND = 580 // ground Y
const WR = 64 // wheel radius
const WCY = GND - WR // wheel-centre Y = 516

// Approximate content bounds used by resize() to compute the fit scale
const NATURAL_W = 800
const NATURAL_H = GND // from y=0 (tip of exhaust stacks) to ground

/**
 * S-300 Air Defence System mascot, drawn entirely with Pixi Graphics.
 *
 * Container hierarchy (swap Graphics → Sprite here later):
 *   S300Mascot
 *     masterContainer   — animated for idle bob / impact shake
 *       chassisContainer  — truck body, wheels, cab
 *       radarContainer    — phased-array radar dish (pivots from base)
 *       launcherContainer — missile tube box (pivots from rear-bottom hinge)
 */
export class S300Mascot extends Container {
  readonly masterContainer: Container
  readonly chassisContainer: Container
  readonly radarContainer: Container
  readonly launcherContainer: Container

  private _bobTween: gsap.core.Tween | null = null
  private _radarTween: gsap.core.Tween | null = null
  private _isDeployed = false

  constructor() {
    super()

    this.masterContainer = new Container()
    this.chassisContainer = new Container()
    this.radarContainer = new Container()
    this.launcherContainer = new Container()

    this.masterContainer.addChild(this.chassisContainer)
    this.masterContainer.addChild(this.radarContainer)
    this.masterContainer.addChild(this.launcherContainer)
    this.addChild(this.masterContainer)

    this._drawChassis()
    this._drawRadar()
    this._drawLauncher()
    this._startIdle()
  }

  // ──────────────────────────────── Layout ────────────────────────────────

  resize(layout: UILayoutSnapshot): void {
    const rightEdge = layout.reelBounds.x + layout.reelBounds.width
    const availW = layout.screenWidth - rightEdge - layout.safePadding
    const availH = layout.reelBounds.height

    if (availW < 80) {
      this.visible = false
      return
    }
    this.visible = true

    const scale = Math.min(availW / NATURAL_W, availH / NATURAL_H, 1.4)
    this.scale.set(scale)

    // Align truck left edge (design x ≈ 82) flush with the reel right edge
    this.x = rightEdge - 82 * scale
    // Ground line (y = GND) aligns with the bottom of the reel area
    this.y = layout.reelBounds.y + layout.reelBounds.height - GND * scale
  }

  // ──────────────────────────── Idle animation ────────────────────────────

  private _startIdle(): void {
    this._killIdle()

    // Gentle engine-vibration bob — oscillates masterContainer.y 0 → 5
    this._bobTween = gsap.to(this.masterContainer, {
      y: 5,
      duration: 1.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })

    // Radar scan — swings ±28° from rest position
    this._radarTween = gsap.to(this.radarContainer, {
      angle: 28,
      duration: 2.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  }

  private _startIdleDeployed(): void {
    this._killIdle()

    // Subtler bob; the truck is under load
    this._bobTween = gsap.to(this.masterContainer, {
      y: 3,
      duration: 2.0,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })

    // Radar spins continuously (on full alert)
    this._radarTween = gsap.to(this.radarContainer, {
      angle: '+=360',
      duration: 3.2,
      ease: 'none',
      repeat: -1,
    })
  }

  private _killIdle(): void {
    this._bobTween?.kill()
    this._bobTween = null
    this._radarTween?.kill()
    this._radarTween = null
  }

  // ─────────────────── Feature animation (S-300 deploy) ───────────────────

  triggerS300Feature(): Promise<void> {
    if (this._isDeployed) return Promise.resolve()
    this._isDeployed = true
    this._killIdle()

    return new Promise<void>((resolve) => {
      const tl = gsap.timeline()

      // Chassis settles under the weight shift
      tl.to(this.masterContainer, { y: 8, duration: 0.22, ease: 'power2.in' })

      // Hydraulic lift: heavy slow start → accelerate → bounce at 90°
      tl.to(
        this.launcherContainer,
        {
          angle: -90,
          duration: 2.5,
          ease: 'back.out(1.4)',
        },
        '>',
      )

      // Impact shudder — chassis jolts then settles
      tl.to(this.masterContainer, { y: 22, duration: 0.06, ease: 'none' }, '-=0.04')
      tl.to(this.masterContainer, { y: -4, duration: 0.07, ease: 'none' })
      tl.to(this.masterContainer, { y: 16, duration: 0.07, ease: 'none' })
      tl.to(this.masterContainer, { y: 2, duration: 0.08, ease: 'none' })
      tl.to(this.masterContainer, { y: 10, duration: 0.1, ease: 'none' })
      tl.to(this.masterContainer, { y: 4, duration: 0.14, ease: 'none' })

      // Settle back to baseline, then resume deployed idle
      tl.to(this.masterContainer, {
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          this._startIdleDeployed()
          resolve()
        },
      })
    })
  }

  retractLauncher(): Promise<void> {
    if (!this._isDeployed) return Promise.resolve()
    this._isDeployed = false
    this._killIdle()

    return new Promise<void>((resolve) => {
      gsap.to(this.launcherContainer, {
        angle: 0,
        duration: 1.8,
        ease: 'power2.inOut',
        onComplete: () => {
          this._startIdle()
          resolve()
        },
      })
    })
  }

  override destroy(options?: { children?: boolean }): void {
    this._killIdle()
    gsap.killTweensOf(this.masterContainer)
    gsap.killTweensOf(this.launcherContainer)
    gsap.killTweensOf(this.radarContainer)
    super.destroy(options)
  }

  // ──────────────────────────────── Drawing ───────────────────────────────

  private _drawChassis(): void {
    const g = new Graphics()
    this.chassisContainer.addChild(g)

    // Ground shadow
    g.ellipse(460, GND + 10, 340, 18)
    g.fill({ color: P.shadow, alpha: 0.48 })

    // ── Wheels (4 axle positions visible from the side) ──────────────────
    const wheelXs = [130, 240, 540, 655]
    for (const wx of wheelXs) this._drawWheel(g, wx, WCY)

    // Axle housings — connect wheel centre to underbody
    for (const wx of wheelXs) {
      g.roundRect(wx - 10, WCY, 20, 46, 3)
      g.fill({ color: P.steelDark })
    }

    // ── Hull underbody ────────────────────────────────────────────────────
    g.rect(82, 498, 762, 20)
    g.fill({ color: P.oliveDark })
    // Cross-frame ribs
    for (let rx = 100; rx < 840; rx += 72) {
      g.rect(rx, 498, 10, 20)
      g.fill({ color: P.shadow, alpha: 0.4 })
    }

    // ── Main hull body ────────────────────────────────────────────────────
    g.rect(82, 274, 762, 226)
    g.fill({ color: P.olive })

    // Top-edge highlight stripe
    g.rect(82, 274, 762, 14)
    g.fill({ color: P.oliveLight })

    // Horizontal armour plate division lines
    for (const ly of [332, 394, 454]) {
      g.rect(90, ly, 750, 4)
      g.fill({ color: P.oliveDark, alpha: 0.6 })
    }

    // Ventilation slits — 3 rows × 6 columns (left 60% of hull, avoids cab)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        g.roundRect(96 + col * 72, 296 + row * 68, 52, 9, 3)
        g.fill({ color: P.oliveDark, alpha: 0.72 })
      }
    }

    // Rivet rows (4 columns of rivets along plate seams)
    for (const rx of [160, 260, 360, 460]) {
      for (const ry of [310, 364, 420, 472]) {
        g.circle(rx, ry, 4)
        g.fill({ color: P.oliveDark })
      }
    }

    // Hull body outline
    g.rect(82, 274, 762, 226)
    g.stroke({ color: P.oliveDark, width: 3 })

    // Skirt lower lip
    g.rect(82, 515, 762, 6)
    g.fill({ color: P.oliveLight, alpha: 0.2 })

    // ── Rear tow hook ─────────────────────────────────────────────────────
    g.roundRect(68, 456, 18, 18, 4)
    g.fill({ color: P.steelDark })
    g.stroke({ color: P.steel, width: 2 })
    g.circle(77, 465, 5)
    g.stroke({ color: P.steel, width: 3 })

    // ── Cab (forward section, right side; truck faces left → cab on right) ─
    // Cab box aligns with hull, then extends upward for the roof
    g.rect(556, 274, 288, 226)
    g.fill({ color: P.olive })
    g.stroke({ color: P.oliveDark, width: 3 })

    // Cab roof polygon (slopes from hull top upward)
    g.moveTo(556, 274)
    g.lineTo(556, 162)
    g.lineTo(592, 144)
    g.lineTo(826, 144)
    g.lineTo(842, 162)
    g.lineTo(842, 274)
    g.closePath()
    g.fill({ color: P.olive })
    g.stroke({ color: P.oliveDark, width: 3 })

    // Roof top-edge highlight
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
    g.fill({ color: P.oliveLight, alpha: 0.5 })

    // Windshield (angled quad)
    g.moveTo(576, 274)
    g.lineTo(590, 178)
    g.lineTo(820, 178)
    g.lineTo(820, 274)
    g.closePath()
    g.fill({ color: P.glass, alpha: 0.88 })

    // Windshield highlight (bright vertical band on left side)
    g.moveTo(578, 273)
    g.lineTo(591, 186)
    g.lineTo(624, 186)
    g.lineTo(612, 273)
    g.closePath()
    g.fill({ color: P.glassHi, alpha: 0.42 })

    // Windshield frame
    g.moveTo(576, 274)
    g.lineTo(590, 178)
    g.lineTo(820, 178)
    g.lineTo(820, 274)
    g.closePath()
    g.stroke({ color: P.oliveDark, width: 3 })

    // Single wiper
    g.moveTo(700, 274)
    g.lineTo(718, 196)
    g.stroke({ color: P.steelDark, width: 3, alpha: 0.65 })

    // Door divider
    g.moveTo(702, 178)
    g.lineTo(702, 274)
    g.stroke({ color: P.oliveDark, width: 2.5 })

    // Door handle
    g.roundRect(716, 236, 28, 9, 4)
    g.fill({ color: P.steel })

    // Headlights (right/front of cab)
    g.roundRect(824, 222, 18, 36, 5)
    g.fill({ color: 0xeeeebb })
    g.roundRect(826, 224, 14, 30, 4)
    g.fill({ color: 0xffffcc, alpha: 0.9 })
    g.roundRect(824, 268, 18, 16, 4)
    g.fill({ color: 0xddcc88 })

    // Front bumper
    g.roundRect(834, 460, 22, 46, 5)
    g.fill({ color: P.steelDark })
    g.stroke({ color: P.steel, width: 2 })

    // Exhaust stacks (twin pipes, right of cab roof)
    for (const ex of [804, 820]) {
      g.rect(ex, 88, 9, 60)
      g.fill({ color: P.exhaust })
      g.ellipse(ex + 4.5, 88, 7, 4)
      g.fill({ color: 0x404040 })
      // Heat shimmer cloud
      g.ellipse(ex + 4.5, 80, 5, 9)
      g.fill({ color: 0x222222, alpha: 0.3 })
    }

    // Cab step plates
    g.roundRect(830, 400, 24, 10, 3)
    g.fill({ color: P.steelDark })
    g.roundRect(830, 420, 24, 10, 3)
    g.fill({ color: P.steelDark })

    // Side mirror
    g.roundRect(834, 186, 22, 18, 4)
    g.fill({ color: P.oliveDark })
    g.roundRect(836, 188, 18, 14, 3)
    g.fill({ color: P.glass, alpha: 0.5 })

    // Soviet red star on cab door
    this._drawStar(g, 644, 232, 20, P.red)

    // Military number plate hint
    for (let i = 0; i < 4; i++) {
      g.rect(758 + i * 10, 226, 6, 6)
      g.fill({ color: P.oliveDark, alpha: 0.55 })
    }

    // Cab/body junction seam
    g.moveTo(556, 144)
    g.lineTo(556, 500)
    g.stroke({ color: P.oliveDark, width: 5 })
  }

  private _drawWheel(g: Graphics, cx: number, cy: number): void {
    // Outer tyre
    g.circle(cx, cy, WR)
    g.fill({ color: P.rubber })

    // Tread band
    g.circle(cx, cy, WR)
    g.stroke({ color: 0x282828, width: 8 })

    // Sidewall shoulder ring
    g.circle(cx, cy, WR - 12)
    g.stroke({ color: 0x242424, width: 3 })

    // Alloy rim disc
    g.circle(cx, cy, WR - 16)
    g.fill({ color: P.hub })

    // Rim inner ring
    g.circle(cx, cy, WR - 26)
    g.stroke({ color: P.steelDark, width: 2.5 })

    // 6 lug nuts
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      g.circle(cx + Math.cos(a) * (WR - 31), cy + Math.sin(a) * (WR - 31), 5)
      g.fill({ color: P.steelDark })
    }

    // Centre cap
    g.circle(cx, cy, 11)
    g.fill({ color: P.steel })
    g.circle(cx, cy, 5)
    g.fill({ color: P.steelDark })

    // Top-of-tyre highlight arc
    g.arc(cx, cy, WR - 3, -Math.PI * 0.82, -Math.PI * 0.5)
    g.stroke({ color: 0x3a3a3a, width: 4, alpha: 0.5 })
  }

  private _drawStar(g: Graphics, cx: number, cy: number, r: number, color: number): void {
    const pts: number[] = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const rad = i % 2 === 0 ? r : r * 0.42
      pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
    }
    g.poly(pts)
    g.fill({ color })
  }

  private _drawRadar(): void {
    // Radar is mounted on the hull top at x=340, y=274 (masterContainer space).
    // pivot.set(0,0) = base connection point; dish extends upward (–y).
    this.radarContainer.x = 340
    this.radarContainer.y = 274
    this.radarContainer.pivot.set(0, 0)

    const g = new Graphics()
    this.radarContainer.addChild(g)

    // Base mounting ring
    g.roundRect(-30, -20, 60, 22, 4)
    g.fill({ color: P.steelDark })
    g.stroke({ color: P.steel, width: 2 })

    // Vertical mast
    g.rect(-7, -118, 14, 100)
    g.fill({ color: P.steel })
    // Mast highlight
    g.rect(-3, -118, 5, 100)
    g.fill({ color: P.oliveLight, alpha: 0.18 })

    // Horizontal pivot crossbar
    g.rect(-82, -126, 164, 12)
    g.fill({ color: P.steelDark })

    // ── Phased-array dish ─────────────────────────────────────────────────
    // Outer structural frame
    g.roundRect(-80, -230, 160, 108, 7)
    g.fill({ color: P.oliveDark })
    g.stroke({ color: P.steelDark, width: 3 })

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
        // Per-element highlight
        g.roundRect(ex, ey, 14, 4, 2)
        g.fill({ color: 0x6699cc, alpha: 0.45 })
      }
    }

    // Alert indicator light (top centre of dish)
    g.circle(0, -236, 6)
    g.fill({ color: 0x22cc44 })
    g.circle(0, -236, 9)
    g.stroke({ color: 0x33ff55, width: 2, alpha: 0.55 })

    // Diagonal support braces from mast to dish corners
    g.moveTo(-5, -118)
    g.lineTo(-74, -222)
    g.stroke({ color: P.steelDark, width: 3, alpha: 0.65 })
    g.moveTo(5, -118)
    g.lineTo(74, -222)
    g.stroke({ color: P.steelDark, width: 3, alpha: 0.65 })
  }

  private _drawLauncher(): void {
    // Hinge in masterContainer space: rear-top-left corner of hull (x=108, y=274).
    // pivot.set(0,0) = hinge point is origin.
    // At angle=0 (horizontal): box occupies local [0,LEN] × [-HT,0] — extends right.
    // At angle=-90 (vertical):  box rotates CCW; tips point straight up.
    const HINGE_X = 108
    const HINGE_Y = 274

    this.launcherContainer.x = HINGE_X
    this.launcherContainer.y = HINGE_Y
    this.launcherContainer.pivot.set(0, 0)

    const g = new Graphics()
    this.launcherContainer.addChild(g)

    const LEN = 390 // tube length (local +x direction at angle=0)
    const HT = 120 // box height
    const TR = 24 // tube outer radius

    // ── Main box frame ────────────────────────────────────────────────────
    g.rect(0, -HT, LEN, HT)
    g.fill({ color: P.oliveDark })

    // Box top lid with highlight
    g.rect(0, -HT, LEN, 13)
    g.fill({ color: P.oliveLight })
    g.stroke({ color: P.oliveDark, width: 2 })

    // Box bottom rail
    g.rect(0, -12, LEN, 12)
    g.fill({ color: P.oliveDark })

    // Rear face plate at hinge (x=0)
    g.rect(0, -HT, 16, HT)
    g.fill({ color: P.steelDark })
    g.stroke({ color: P.steel, width: 2 })

    // Vertical rib reinforcements
    for (const rx of [80, 160, 240, 320]) {
      g.rect(rx, -HT, 9, HT)
      g.fill({ color: P.oliveDark, alpha: 0.6 })
    }

    // Centre separator between upper and lower tubes
    g.rect(0, -HT / 2 - 3, LEN, 6)
    g.fill({ color: P.oliveDark })

    // Box outline
    g.rect(0, -HT, LEN, HT)
    g.stroke({ color: P.oliveDark, width: 4 })

    // ── Missile tubes (2 visible from side) ───────────────────────────────
    const tubeYs = [-HT + TR + 6, -TR - 6] // upper and lower tube centres

    for (const tY of tubeYs) {
      // Tube barrel
      g.roundRect(14, tY - TR, LEN - 24, TR * 2, TR)
      g.fill({ color: 0x556670 })
      g.stroke({ color: P.steelDark, width: 2 })

      // Barrel surface highlight (upper strip)
      g.roundRect(16, tY - TR + 4, LEN - 32, TR * 0.55, TR * 0.5)
      g.fill({ color: 0x7a8fa0, alpha: 0.5 })

      // Three retention bands
      for (const bFrac of [0.28, 0.52, 0.76]) {
        g.rect(14 + (LEN - 28) * bFrac, tY - TR, 9, TR * 2)
        g.fill({ color: P.oliveDark, alpha: 0.78 })
      }

      // Nose cone (front/right end at angle=0)
      g.moveTo(LEN - 12, tY - TR + 4)
      g.lineTo(LEN + 26, tY)
      g.lineTo(LEN - 12, tY + TR - 4)
      g.closePath()
      g.fill({ color: 0x888899 })
      // Nose tip cap
      g.circle(LEN + 23, tY, 5)
      g.fill({ color: 0xaaaacc })

      // Open rear aperture (dark ring at hinge end)
      g.circle(14, tY, TR - 5)
      g.stroke({ color: 0x2a3540, width: 3 })
      g.circle(14, tY, TR - 11)
      g.fill({ color: 0x0d1520 })
    }

    // ── Hydraulic lift arm ────────────────────────────────────────────────
    // Runs along the bottom edge of the box from the hinge outward
    g.roundRect(0, 0, LEN * 0.44, 12, 4)
    g.fill({ color: P.steelDark })
    g.stroke({ color: P.steel, width: 1.5 })

    // Piston rod (thinner inner cylinder)
    g.roundRect(0, 2, LEN * 0.27, 8, 3)
    g.fill({ color: P.steel })

    // Hinge pivot pin
    g.circle(0, 0, 17)
    g.fill({ color: P.steel })
    g.stroke({ color: P.steelDark, width: 3 })
    g.circle(0, 0, 9)
    g.fill({ color: P.steelDark })
    g.circle(0, 0, 4)
    g.fill({ color: P.steel })
  }
}
