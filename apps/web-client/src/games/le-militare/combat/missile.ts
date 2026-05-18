import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { ANIMATION_CONFIG } from '../animation-config.js'
import { explode } from './explosion.js'
import { playBadge } from './badge.js'

const bz = (t: number, p0: number, p1: number, p2: number): number =>
  (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2

const bzd = (t: number, p0: number, p1: number, p2: number): number =>
  2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1)

export function buildMissile(c: Container, sw: number): void {
  const scale = sw * 0.0085

  const body = new Graphics()
  body.roundRect(-3.5 * scale, -22 * scale, 7 * scale, 32 * scale, 2 * scale)
  body.fill({ color: 0xd0d8e0 })
  body.rect(-3 * scale, -6 * scale, 6 * scale, 14 * scale)
  body.fill({ color: 0xa8b4c0 })
  c.addChild(body)

  const nose = new Graphics()
  nose.moveTo(0, -36 * scale)
  nose.lineTo(-3.5 * scale, -22 * scale)
  nose.lineTo(3.5 * scale, -22 * scale)
  nose.closePath()
  nose.fill({ color: 0xcc1111 })
  c.addChild(nose)

  const band = new Graphics()
  band.rect(-3.8 * scale, -10 * scale, 7.6 * scale, 4 * scale)
  band.fill({ color: 0xee3322 })
  c.addChild(band)

  const finColor = 0x8899aa
  for (const [sign, angle] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as [number, number][]) {
    const fin = new Graphics()
    fin.moveTo(sign * 3.5 * scale, 8 * scale)
    fin.lineTo(sign * 12 * scale + angle * 2 * scale, 18 * scale)
    fin.lineTo(sign * 3.5 * scale, 18 * scale)
    fin.closePath()
    fin.fill({ color: finColor })
    c.addChild(fin)
  }

  const nozzle = new Graphics()
  nozzle.rect(-4 * scale, 10 * scale, 8 * scale, 5 * scale)
  nozzle.fill({ color: 0x445566 })
  c.addChild(nozzle)

  // Engine glow — last child, accessed by index in fireMissile for animation
  const glow = new Graphics()
  glow.ellipse(0, 16 * scale, 6 * scale, 10 * scale)
  glow.fill({ color: 0xff8800, alpha: 0.85 })
  glow.ellipse(0, 16 * scale, 3 * scale, 5 * scale)
  glow.fill({ color: 0xffffff, alpha: 0.9 })
  c.addChild(glow)
}

function drawTrail(g: Graphics, trail: Array<{ x: number; y: number }>, sw: number): void {
  g.clear()
  if (trail.length < 2) return
  const baseW = sw * 0.04
  for (let i = 1; i < trail.length; i++) {
    const age = i / trail.length
    const prev = trail[i - 1]!
    const cur = trail[i]!
    const alpha = age * 0.75
    const w = baseW * age * 1.8
    const color = age > 0.6 ? 0xffa040 : 0xff5500
    g.moveTo(prev.x, prev.y)
    g.lineTo(cur.x, cur.y)
    g.stroke({ color, width: w, alpha })
  }
  const tip = trail[trail.length - 1]!
  g.circle(tip.x, tip.y, baseW * 1.1)
  g.fill({ color: 0xffffff, alpha: 0.9 })
}

export interface FireMissileParams {
  parent: Container
  lx: number
  ly: number
  tx: number
  ty: number
  sw: number
  sh: number
  reel: number
  row: number
  multiplier: number
  wildId: number
  onTransform: (reel: number, row: number, wildId: number) => void
  onMultiplierStick: (reel: number, row: number, multiplier: number, badge: Container) => void
}

export async function fireMissile(p: FireMissileParams): Promise<void> {
  const { parent, lx, ly, tx, ty, sw, sh, reel, row, multiplier, wildId } = p
  const cpX = lx + (tx - lx) * 0.15
  const cpY = Math.min(ly, ty) - sh * 2

  const missile = new Container()
  buildMissile(missile, sw)
  missile.x = lx
  missile.y = ly
  missile.rotation = -Math.PI / 2
  parent.addChild(missile)

  const trail: Array<{ x: number; y: number }> = []
  const trailG = new Graphics()
  parent.addChildAt(trailG, parent.getChildIndex(missile))

  const engineGlow = missile.getChildAt(missile.children.length - 1) as Graphics
  gsap.to(engineGlow, { alpha: 0.4, duration: 0.12, repeat: -1, yoyo: true, ease: 'none' })

  const progress = { t: 0 }
  await new Promise<void>((resolve) => {
    gsap.to(progress, {
      t: 1,
      duration: ANIMATION_CONFIG.MISSILE_FLIGHT_MS / 1000,
      ease: 'power1.in',
      onUpdate: () => {
        const t = progress.t
        const px = bz(t, lx, cpX, tx)
        const py = bz(t, ly, cpY, ty)
        missile.x = px
        missile.y = py
        const dx = bzd(t, lx, cpX, tx)
        const dy = bzd(t, ly, cpY, ty)
        missile.rotation = Math.atan2(dy, dx) + Math.PI / 2
        trail.push({ x: px, y: py })
        if (trail.length > ANIMATION_CONFIG.TRAIL_LEN) trail.shift()
        drawTrail(trailG, trail, sw)
      },
      onComplete: resolve,
    })
  })

  gsap.killTweensOf(engineGlow)
  parent.removeChild(missile)
  missile.destroy({ children: true })

  p.onTransform(reel, row, wildId)

  void (async () => {
    await new Promise<void>((r) => {
      gsap.to(trailG, {
        alpha: 0,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          if (parent.destroyed) {
            r()
            return
          }
          parent.removeChild(trailG)
          trailG.destroy()
          r()
        },
      })
    })
  })()

  await Promise.all([
    explode(parent, tx, ty, sw),
    playBadge(parent, tx, ty, multiplier, sh, reel, row, p.onMultiplierStick),
  ])
}
