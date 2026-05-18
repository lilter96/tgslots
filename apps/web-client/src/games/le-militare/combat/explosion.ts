import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'

export async function explode(
  parent: Container,
  cx: number,
  cy: number,
  sw: number,
): Promise<void> {
  const el: Array<Container | Graphics> = []

  const flash = new Graphics()
  flash.circle(0, 0, sw * 0.6)
  flash.fill({ color: 0xffffff, alpha: 1 })
  flash.x = cx
  flash.y = cy
  flash.scale.set(0.1)
  parent.addChild(flash)
  el.push(flash)

  const fireball = new Graphics()
  fireball.circle(0, 0, sw * 0.52)
  fireball.fill({ color: 0xff6600, alpha: 0.95 })
  fireball.circle(0, 0, sw * 0.3)
  fireball.fill({ color: 0xffcc00, alpha: 1 })
  fireball.x = cx
  fireball.y = cy
  fireball.scale.set(0)
  parent.addChild(fireball)
  el.push(fireball)

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
    parent.addChild(ring)
    el.push(ring)
    gsap.to(ring.scale, { x: 3.2, y: 3.2, duration: 0.55, delay, ease: 'power2.out' })
    gsap.to(ring, { alpha: 0, duration: 0.55, delay, ease: 'power2.in' })
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const chunk = new Graphics()
    const size = sw * (0.055 + Math.random() * 0.05)
    chunk.rect(-size / 2, -size / 2, size, size)
    chunk.fill({ color: i % 2 === 0 ? 0xff6600 : 0xffcc00 })
    chunk.x = cx
    chunk.y = cy
    chunk.rotation = angle
    parent.addChild(chunk)
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
    gsap.to(flash.scale, { x: 1.4, y: 1.4, duration: 0.14, ease: 'power3.out' })
    gsap.to(flash, { alpha: 0, duration: 0.22, ease: 'power3.in' })

    gsap.to(fireball.scale, { x: 1.2, y: 1.2, duration: 0.35, ease: 'power2.out' })
    gsap.to(fireball, {
      alpha: 0,
      duration: 0.45,
      delay: 0.1,
      ease: 'power2.in',
      onComplete: () => {
        for (const node of el) {
          if (parent.children.includes(node)) parent.removeChild(node)
          node.destroy({ children: true })
        }
        resolve()
      },
    })
  })
}
