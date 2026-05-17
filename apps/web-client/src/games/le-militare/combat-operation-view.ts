import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { gsap } from 'gsap'
import type { ReelSet } from '../../engine/reel-set.js'
import type { ShootdownEvent, ActivationEvent } from '@tgslots/le-militare'

const BADGE_STYLE = new TextStyle({
  fontFamily: 'serif',
  fontSize: 30,
  fontWeight: '900',
  fill: '#ffe066',
  stroke: '#8a6010',
  strokeThickness: 4,
  dropShadow: {
    color: '#000000',
    blur: 4,
    distance: 2,
    alpha: 0.9,
  },
})

const LABEL_STYLE = new TextStyle({
  fontFamily: 'serif',
  fontSize: 20,
  fontWeight: '900',
  fill: '#ff4444',
  stroke: '#1a0000',
  strokeThickness: 3,
  letterSpacing: 3,
})

// Quadratic Bezier position
const bz = (t: number, p0: number, p1: number, p2: number): number =>
  (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2

// Quadratic Bezier tangent (derivative, un-normalised)
const bzd = (t: number, p0: number, p1: number, p2: number): number =>
  2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1)

const TRAIL_LEN = 22
const MISSILE_FLIGHT_MS = 620

export class CombatOperationView extends Container {
  private _overlay: Graphics
  // Shared trail graphics node (recreated per missile)
  private _trailGraphics: Graphics | null = null

  constructor() {
    super()
    this._overlay = new Graphics()
    this.addChild(this._overlay)
  }

  async animateActivations(
    reelSet: ReelSet,
    activations: readonly ActivationEvent[],
  ): Promise<void> {
    if (activations.length === 0) return

    const { symbolWidth, symbolHeight, visibleSymbols } = reelSet.reelConfig
    const { reelSpacing } = reelSet.gridConfig
    const totalHeight = symbolHeight * visibleSymbols

    for (const activation of activations) {
      const x = activation.reel * (symbolWidth + reelSpacing)

      this._overlay.clear()
      this._overlay.rect(x, 0, symbolWidth, totalHeight).fill({ color: 0xc41e1e, alpha: 1 })
      this._overlay.alpha = 0

      const label = new Text({ text: 'S-300', style: LABEL_STYLE })
      label.anchor.set(0.5)
      label.x = x + symbolWidth / 2
      label.y = totalHeight / 2
      label.alpha = 0
      label.scale.set(0.6)
      this.addChild(label)

      await new Promise<void>((resolve) => {
        const tl = gsap.timeline({
          onComplete: () => {
            this._overlay.clear()
            this.removeChild(label)
            label.destroy()
            resolve()
          },
        })
        tl.to(this._overlay, { alpha: 0.7, duration: 0.08, ease: 'none' })
          .to(this._overlay, { alpha: 0.1, duration: 0.08, ease: 'none' })
          .to(this._overlay, { alpha: 0.8, duration: 0.08, ease: 'none' })
          .to(this._overlay, { alpha: 0.1, duration: 0.08, ease: 'none' })
          .to(this._overlay, { alpha: 0.9, duration: 0.1, ease: 'none' })
          .to(label, { alpha: 1, duration: 0.12, ease: 'power2.out' }, '-=0.1')
          .to(label.scale, { x: 1.1, y: 1.1, duration: 0.12, ease: 'back.out(2)' }, '<')
          .to(label.scale, { x: 1.0, y: 1.0, duration: 0.08 })
          .to(this._overlay, { alpha: 0, duration: 0.25, ease: 'power1.in' })
          .to(label, { alpha: 0, y: label.y - 20, duration: 0.25, ease: 'power1.in' }, '<')
      })
    }
  }

  async animateShootdowns(
    reelSet: ReelSet,
    shootdowns: readonly ShootdownEvent[],
    activations: readonly ActivationEvent[],
  ): Promise<void> {
    if (shootdowns.length === 0) return

    const { symbolWidth, symbolHeight, visibleSymbols } = reelSet.reelConfig
    const { reelSpacing } = reelSet.gridConfig
    const totalHeight = symbolHeight * visibleSymbols

    // Derive launch reel from activations, fall back to the shootdown's own reel
    const launchReel = activations.length > 0 ? activations[0]!.reel : shootdowns[0]!.reel
    const launchX = launchReel * (symbolWidth + reelSpacing) + symbolWidth / 2
    // Launch from below the grid (S-300 fires upward then arcs)
    const launchY = totalHeight + symbolHeight * 0.4

    // Fire all missiles in parallel
    const promises = shootdowns.map((sd) =>
      this._fireMissile(
        launchX,
        launchY,
        sd.reel * (symbolWidth + reelSpacing) + symbolWidth / 2,
        sd.row * symbolHeight + symbolHeight / 2,
        sd.multiplier,
        symbolWidth,
        symbolHeight,
      ),
    )

    await Promise.all(promises)
  }

  private async _fireMissile(
    lx: number,
    ly: number,
    tx: number,
    ty: number,
    multiplier: number,
    sw: number,
    sh: number,
  ): Promise<void> {
    // Control point: near-vertical launch, arc toward target
    // Rises steeply, then hooks toward the plane
    const cpX = lx + (tx - lx) * 0.15
    const cpY = -sh * 0.8

    // --- Build missile container ---
    const missile = new Container()
    this._buildMissile(missile, sw)
    missile.x = lx
    missile.y = ly
    // Orient tip upward initially (−y direction → rotation = 0 in screen coords means right, so −π/2 = up)
    missile.rotation = -Math.PI / 2
    this.addChild(missile)

    // --- Smoke trail points ---
    const trail: Array<{ x: number; y: number }> = []
    const trailG = new Graphics()
    this.addChildAt(trailG, this.getChildIndex(missile)) // behind missile

    // --- Engine glow pulse ---
    const engineGlow = missile.getChildAt(missile.children.length - 1) as Graphics
    gsap.to(engineGlow, { alpha: 0.4, duration: 0.12, repeat: -1, yoyo: true, ease: 'none' })

    // --- Animate along bezier ---
    const progress = { t: 0 }
    await new Promise<void>((resolve) => {
      gsap.to(progress, {
        t: 1,
        duration: MISSILE_FLIGHT_MS / 1000,
        ease: 'power1.in',
        onUpdate: () => {
          const t = progress.t
          const px = bz(t, lx, cpX, tx)
          const py = bz(t, ly, cpY, ty)
          missile.x = px
          missile.y = py

          // Rotation: tangent direction
          const dx = bzd(t, lx, cpX, tx)
          const dy = bzd(t, ly, cpY, ty)
          missile.rotation = Math.atan2(dy, dx) + Math.PI / 2

          // Trail
          trail.push({ x: px, y: py })
          if (trail.length > TRAIL_LEN) trail.shift()
          this._drawTrail(trailG, trail, sw)
        },
        onComplete: resolve,
      })
    })

    // Kill engine glow tween
    gsap.killTweensOf(engineGlow)

    // Remove missile immediately on impact
    this.removeChild(missile)
    missile.destroy({ children: true })

    // Fade out trail
    await new Promise<void>((r) => {
      gsap.to(trailG, {
        alpha: 0,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          this.removeChild(trailG)
          trailG.destroy()
          r()
        },
      })
    })

    // --- Impact explosion + badge ---
    await Promise.all([this._explode(tx, ty, sw), this._badge(tx, ty, multiplier, sh)])
  }

  /** Draw the missile as Pixi Graphics children on the given container (tip points in -y). */
  private _buildMissile(c: Container, sw: number): void {
    const scale = sw * 0.0085 // ~1 for 120px symbol

    // Body — elongated silver cylinder
    const body = new Graphics()
    body.roundRect(-3.5 * scale, -22 * scale, 7 * scale, 32 * scale, 2 * scale)
    body.fill({ color: 0xd0d8e0 })
    body.rect(-3 * scale, -6 * scale, 6 * scale, 14 * scale)
    body.fill({ color: 0xa8b4c0 })
    c.addChild(body)

    // Nose cone — red, pointed
    const nose = new Graphics()
    nose.moveTo(0, -36 * scale)
    nose.lineTo(-3.5 * scale, -22 * scale)
    nose.lineTo(3.5 * scale, -22 * scale)
    nose.closePath()
    nose.fill({ color: 0xcc1111 })
    c.addChild(nose)

    // Red mid-band (recognition stripe)
    const band = new Graphics()
    band.rect(-3.8 * scale, -10 * scale, 7.6 * scale, 4 * scale)
    band.fill({ color: 0xee3322 })
    c.addChild(band)

    // Fins (4 × delta, symmetrically placed)
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

    // Engine nozzle
    const nozzle = new Graphics()
    nozzle.rect(-4 * scale, 10 * scale, 8 * scale, 5 * scale)
    nozzle.fill({ color: 0x445566 })
    c.addChild(nozzle)

    // Engine glow (animated separately)
    const glow = new Graphics()
    glow.ellipse(0, 16 * scale, 6 * scale, 10 * scale)
    glow.fill({ color: 0xff8800, alpha: 0.85 })
    // Inner hot core
    glow.ellipse(0, 16 * scale, 3 * scale, 5 * scale)
    glow.fill({ color: 0xffffff, alpha: 0.9 })
    c.addChild(glow)
  }

  private _drawTrail(g: Graphics, trail: Array<{ x: number; y: number }>, sw: number): void {
    g.clear()
    if (trail.length < 2) return
    const baseW = sw * 0.04
    for (let i = 1; i < trail.length; i++) {
      const age = i / trail.length // 0 = oldest, 1 = newest
      const prev = trail[i - 1]!
      const cur = trail[i]!
      const alpha = age * 0.75
      const w = baseW * age * 1.8
      // Inner hot core (white-orange gradient simulation: alternate two colors)
      const color = age > 0.6 ? 0xffa040 : 0xff5500
      g.moveTo(prev.x, prev.y)
      g.lineTo(cur.x, cur.y)
      g.stroke({ color, width: w, alpha })
    }
    // White-hot tip
    const tip = trail[trail.length - 1]!
    g.circle(tip.x, tip.y, baseW * 1.1)
    g.fill({ color: 0xffffff, alpha: 0.9 })
  }

  private async _explode(cx: number, cy: number, sw: number): Promise<void> {
    const el: Array<Container | Graphics> = []

    // White flash
    const flash = new Graphics()
    flash.circle(0, 0, sw * 0.6)
    flash.fill({ color: 0xffffff, alpha: 1 })
    flash.x = cx
    flash.y = cy
    flash.scale.set(0.1)
    this.addChild(flash)
    el.push(flash)

    // Fireball
    const fireball = new Graphics()
    fireball.circle(0, 0, sw * 0.52)
    fireball.fill({ color: 0xff6600, alpha: 0.95 })
    fireball.circle(0, 0, sw * 0.3)
    fireball.fill({ color: 0xffcc00, alpha: 1 })
    fireball.x = cx
    fireball.y = cy
    fireball.scale.set(0)
    this.addChild(fireball)
    el.push(fireball)

    // 3 expanding rings (orange, red, dark-red)
    const rings: Graphics[] = []
    for (const [color, rMult, delay] of [
      [0xff8800, 0.55, 0],
      [0xff4400, 0.75, 0.05],
      [0xaa1100, 1.0, 0.1],
    ] as [number, number, number][]) {
      const ring = new Graphics()
      ring.circle(0, 0, sw * rMult)
      ring.stroke({ color, width: 4 })
      ring.x = cx
      ring.y = cy
      ring.scale.set(0.15)
      this.addChild(ring)
      rings.push(ring)
      el.push(ring)
      gsap.to(ring.scale, { x: 3.2, y: 3.2, duration: 0.55, delay, ease: 'power2.out' })
      gsap.to(ring, { alpha: 0, duration: 0.55, delay, ease: 'power2.in' })
    }

    // 8 debris chunks flying outward
    const debris: Graphics[] = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const chunk = new Graphics()
      const size = sw * (0.055 + Math.random() * 0.05)
      chunk.rect(-size / 2, -size / 2, size, size)
      chunk.fill({ color: i % 2 === 0 ? 0xff6600 : 0xffcc00 })
      chunk.x = cx
      chunk.y = cy
      chunk.rotation = angle
      this.addChild(chunk)
      debris.push(chunk)
      el.push(chunk)
      const dist = sw * (0.8 + Math.random() * 0.6)
      gsap.to(chunk, {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        rotation: angle + Math.PI * 3,
        alpha: 0,
        duration: 0.6,
        delay: 0.05,
        ease: 'power2.out',
      })
    }

    await new Promise<void>((resolve) => {
      // Flash burst
      gsap.to(flash.scale, { x: 1.4, y: 1.4, duration: 0.14, ease: 'power3.out' })
      gsap.to(flash, { alpha: 0, duration: 0.22, ease: 'power3.in' })

      // Fireball rises and fades
      gsap.to(fireball.scale, { x: 1.2, y: 1.2, duration: 0.35, ease: 'power2.out' })
      gsap.to(fireball, {
        alpha: 0,
        duration: 0.45,
        delay: 0.1,
        ease: 'power2.in',
        onComplete: () => {
          for (const node of el) {
            if (this.children.includes(node)) this.removeChild(node)
            node.destroy({ children: true })
          }
          resolve()
        },
      })
    })
  }

  private async _badge(cx: number, cy: number, multiplier: number, sh: number): Promise<void> {
    const badge = new Container()
    const bg = new Graphics()
    bg.roundRect(-38, -22, 76, 44, 11)
    bg.fill({ color: 0x0a0a0a, alpha: 0.92 })
    bg.stroke({ color: 0xd4af37, width: 2.5 })
    const txt = new Text({ text: `×${multiplier}`, style: BADGE_STYLE })
    txt.anchor.set(0.5)
    badge.addChild(bg)
    badge.addChild(txt)
    badge.x = cx
    badge.y = cy - sh * 0.15
    badge.scale.set(0)
    badge.alpha = 1
    this.addChild(badge)

    await new Promise<void>((resolve) => {
      gsap.to(badge.scale, {
        x: 1.18,
        y: 1.18,
        duration: 0.3,
        delay: 0.18,
        ease: 'back.out(2.8)',
        onComplete: () => {
          gsap.to(badge.scale, { x: 1.0, y: 1.0, duration: 0.1 })
        },
      })
      gsap.to(badge, {
        y: cy - sh * 0.8,
        alpha: 0,
        duration: 0.55,
        delay: 0.52,
        ease: 'power1.in',
        onComplete: () => {
          if (this.children.includes(badge)) this.removeChild(badge)
          badge.destroy({ children: true })
          resolve()
        },
      })
    })
  }
}
