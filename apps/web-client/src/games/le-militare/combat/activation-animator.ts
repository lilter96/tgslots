import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import type { ActivationEvent } from '@tgslots/le-militare'
import { drawWires, drawCurrent, wirePath } from './wire-renderer.js'
import type { CombatLayout } from './combat-layout.js'

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

async function flashReel(
  overlay: Graphics,
  parent: Container,
  reel: number,
  layout: CombatLayout,
): Promise<void> {
  const { symbolWidth, reelSpacing, totalHeight } = layout
  const x = reel * (symbolWidth + reelSpacing)
  overlay.clear()
  overlay.rect(x, 0, symbolWidth, totalHeight).fill({ color: 0xffc24d, alpha: 0.45 })
  overlay.alpha = 0
  await new Promise<void>((resolve) => {
    gsap.to(overlay, {
      alpha: 1,
      duration: 0.1,
      ease: 'sine.out',
      onComplete: () => {
        gsap.to(overlay, {
          alpha: 0,
          duration: 0.28,
          ease: 'power1.in',
          onComplete: () => {
            if (!parent.destroyed) overlay.clear()
            overlay.alpha = 1
            resolve()
          },
        })
      },
    })
  })
}

export async function animateActivations(
  parent: Container,
  overlay: Graphics,
  wiresG: Graphics,
  currentG: Graphics,
  activations: readonly ActivationEvent[],
  layout: CombatLayout,
  connX: number,
  connY: number,
  activeStates: boolean[],
): Promise<void> {
  if (activations.length === 0) return

  const { symbolWidth, reelSpacing, totalHeight, scale } = layout
  const redraw = (): void =>
    drawWires(wiresG, symbolWidth, reelSpacing, totalHeight, scale, connX, connY, activeStates)
  const reduced = prefersReducedMotion()

  for (const activation of activations) {
    const r = activation.reel
    const path = wirePath(r, symbolWidth, reelSpacing, totalHeight, scale, connX, connY)

    if (reduced) {
      activeStates[r] = true
      redraw()
      await flashReel(overlay, parent, r, layout)
      continue
    }

    // The S300 has landed: an electric current sparks at the reel and travels
    // up the cable toward the launcher.
    await new Promise<void>((resolve) => {
      const head = { t: 0 }
      gsap.to(head, {
        t: 1,
        duration: 0.6,
        ease: 'power1.in',
        onUpdate: () => {
          if (parent.destroyed) return
          drawCurrent(currentG, path, head.t, scale)
        },
        onComplete: resolve,
      })
    })
    if (parent.destroyed) return
    currentG.clear()

    // Cable now carries power (steady), and the reel energises.
    activeStates[r] = true
    redraw()
    await flashReel(overlay, parent, r, layout)
  }
}
