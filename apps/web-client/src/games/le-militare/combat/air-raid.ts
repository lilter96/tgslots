import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import type { AirRaidPlacement } from '@tgslots/le-militare'
import type { GameEventBus } from '../../../engine/event-bus.js'
import { ANIMATION_CONFIG } from '../animation-config.js'
import { explode } from './explosion.js'
import { playBadge } from './badge.js'

const bz = (t: number, p0: number, p1: number, p2: number): number =>
  (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2

const bzd = (t: number, p0: number, p1: number, p2: number): number =>
  2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1)

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// Top-down fighter silhouette, nose pointing +x (rotate to flight direction).
function buildPlane(c: Container, sw: number): void {
  const s = sw * 0.013

  const wings = new Graphics()
  wings
    .moveTo(6 * s, -4 * s)
    .lineTo(-24 * s, -30 * s)
    .lineTo(-12 * s, -30 * s)
    .lineTo(12 * s, -4 * s)
    .closePath()
    .fill({ color: 0x6f8597 })
  wings
    .moveTo(6 * s, 4 * s)
    .lineTo(-24 * s, 30 * s)
    .lineTo(-12 * s, 30 * s)
    .lineTo(12 * s, 4 * s)
    .closePath()
    .fill({ color: 0x6f8597 })
  c.addChild(wings)

  const tail = new Graphics()
  tail
    .moveTo(-22 * s, -3 * s)
    .lineTo(-34 * s, -13 * s)
    .lineTo(-26 * s, -13 * s)
    .lineTo(-18 * s, -3 * s)
    .closePath()
    .fill({ color: 0x607585 })
  c.addChild(tail)

  const body = new Graphics()
  body.roundRect(-26 * s, -5 * s, 52 * s, 10 * s, 4 * s).fill({ color: 0x8aa0b4 })
  body.roundRect(-26 * s, -5 * s, 16 * s, 10 * s, 3 * s).fill({ color: 0x5a6e80 })
  c.addChild(body)

  const nose = new Graphics()
  nose
    .moveTo(26 * s, -5 * s)
    .lineTo(40 * s, 0)
    .lineTo(26 * s, 5 * s)
    .closePath()
    .fill({ color: 0x9fb4c6 })
  c.addChild(nose)

  const canopy = new Graphics()
  canopy.ellipse(10 * s, 0, 6 * s, 3.5 * s).fill({ color: 0x10202c })
  c.addChild(canopy)
}

function drawSmoke(g: Graphics, trail: Array<{ x: number; y: number }>, sw: number): void {
  g.clear()
  if (trail.length < 2) return
  for (let i = 1; i < trail.length; i++) {
    const age = i / trail.length
    const prev = trail[i - 1]!
    const cur = trail[i]!
    g.moveTo(prev.x, prev.y)
      .lineTo(cur.x, cur.y)
      .stroke({ color: age > 0.6 ? 0xffa040 : 0x9a9a9a, width: sw * 0.06 * age, alpha: age * 0.55 })
  }
}

function destroyChild(parent: Container, child: Container | Graphics): void {
  if (!parent.destroyed && parent.children.includes(child)) parent.removeChild(child)
  if (!child.destroyed) child.destroy({ children: true })
}

// A plane the S300 misses: it just cruises across the sky and exits.
async function flyMiss(
  parent: Container,
  sw: number,
  gridW: number,
  y: number,
  delayMs: number,
): Promise<void> {
  await wait(delayMs)
  if (parent.destroyed) return
  const plane = new Container()
  buildPlane(plane, sw)
  plane.y = y
  plane.x = -sw * 2
  parent.addChild(plane)

  await new Promise<void>((resolve) => {
    gsap.to(plane, {
      x: gridW + sw * 2,
      duration: 1.8,
      ease: 'none',
      onUpdate: () => {
        if (parent.destroyed) return
      },
      onComplete: () => {
        destroyChild(parent, plane)
        resolve()
      },
    })
    gsap.to(plane, { y: y - sw * 0.06, duration: 0.6, yoyo: true, repeat: 2, ease: 'sine.inOut' })
  })
}

async function fireTracer(
  parent: Container,
  lx: number,
  ly: number,
  tx: number,
  ty: number,
  sw: number,
): Promise<void> {
  const line = new Graphics()
  parent.addChild(line)
  const dot = new Graphics()
  dot.circle(0, 0, sw * 0.05).fill({ color: 0xffee88 })
  dot.x = lx
  dot.y = ly
  parent.addChild(dot)

  const prog = { t: 0 }
  await new Promise<void>((resolve) => {
    gsap.to(prog, {
      t: 1,
      duration: 0.2,
      ease: 'power2.in',
      onUpdate: () => {
        if (parent.destroyed) return
        const x = lx + (tx - lx) * prog.t
        const y = ly + (ty - ly) * prog.t
        dot.x = x
        dot.y = y
        line.clear()
        line
          .moveTo(lx, ly)
          .lineTo(x, y)
          .stroke({ color: 0xffcc44, width: sw * 0.02, alpha: 0.45 })
      },
      onComplete: resolve,
    })
  })

  destroyChild(parent, dot)
  gsap.to(line, {
    alpha: 0,
    duration: 0.14,
    onComplete: () => destroyChild(parent, line),
  })
}

async function interceptOne(
  p: AirRaidParams,
  gridW: number,
  skyY: number,
  pl: AirRaidPlacement,
): Promise<void> {
  const { parent, sw, sh, rs, lx, ly, wildId, bus } = p
  const tx = pl.reel * (sw + rs) + sw / 2
  const ty = pl.row * sh + sh / 2
  const bx = Math.min(gridW - sw * 0.5, Math.max(sw * 0.5, tx))

  const plane = new Container()
  buildPlane(plane, sw)
  plane.x = -sw * 1.5
  plane.y = skyY
  parent.addChild(plane)

  // Cruise in to a break point above the target column.
  await new Promise<void>((resolve) => {
    gsap.to(plane, {
      x: bx,
      duration: 0.5,
      ease: 'sine.in',
      onUpdate: () => {
        if (parent.destroyed) return
      },
      onComplete: resolve,
    })
  })
  if (parent.destroyed) return

  // S300 fires up at the plane.
  await fireTracer(parent, lx, ly, bx, skyY, sw)
  if (parent.destroyed) return

  // Ignite and dive into the cell on a curved path, trailing smoke.
  const glow = new Graphics()
  glow.ellipse(0, 0, sw * 0.16, sw * 0.1).fill({ color: 0xff7a30, alpha: 0.9 })
  plane.addChild(glow)

  const cpX = bx + (tx - bx) * 0.2
  const cpY = skyY - sh * 0.6
  const trail: Array<{ x: number; y: number }> = []
  const trailG = new Graphics()
  parent.addChildAt(trailG, parent.getChildIndex(plane))

  const prog = { t: 0 }
  await new Promise<void>((resolve) => {
    gsap.to(prog, {
      t: 1,
      duration: 0.5,
      ease: 'power1.in',
      onUpdate: () => {
        if (parent.destroyed) return
        const t = prog.t
        const px = bz(t, bx, cpX, tx)
        const py = bz(t, skyY, cpY, ty)
        plane.x = px
        plane.y = py
        plane.rotation = Math.atan2(bzd(t, skyY, cpY, ty), bzd(t, bx, cpX, tx))
        trail.push({ x: px, y: py })
        if (trail.length > 16) trail.shift()
        drawSmoke(trailG, trail, sw)
      },
      onComplete: resolve,
    })
  })

  destroyChild(parent, plane)
  gsap.to(trailG, {
    alpha: 0,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => destroyChild(parent, trailG),
  })

  bus.emit('le-militare:symbol:transform', { reel: pl.reel, row: pl.row, newSymbolId: wildId })
  await Promise.all([
    explode(parent, tx, ty, sw),
    playBadge(parent, tx, ty, pl.multiplier, sh, pl.reel, pl.row, bus),
  ])
}

export interface AirRaidParams {
  parent: Container
  lx: number
  ly: number
  sw: number
  sh: number
  rs: number
  reelCount: number
  placements: readonly AirRaidPlacement[]
  wildId: number
  bus: GameEventBus
}

// Squadron flies over the grid; the S300 intercepts each placement (plane
// crashes onto its cell → multiplier WILD); a few unhit planes fly past.
export async function playAirRaid(p: AirRaidParams): Promise<void> {
  if (p.placements.length === 0) return
  const gridW = p.reelCount * (p.sw + p.rs) - p.rs
  const skyY = -p.sh * 1.15

  const missCount = Math.min(3, Math.max(1, 5 - p.placements.length))
  const missTasks: Array<Promise<void>> = []
  for (let i = 0; i < missCount; i++) {
    missTasks.push(flyMiss(p.parent, p.sw, gridW, skyY + (i - 1) * p.sh * 0.3, i * 150))
  }

  for (let i = 0; i < p.placements.length; i++) {
    await interceptOne(p, gridW, skyY, p.placements[i]!)
    if (i < p.placements.length - 1) await wait(ANIMATION_CONFIG.INTER_MISSILE_PAUSE_MS)
  }

  await Promise.all(missTasks)
}
