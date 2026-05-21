import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import type { ActivationEvent } from '@tgslots/le-militare'
import { ANIMATION_CONFIG } from '../animation-config.js'
import { drawWires } from './wire-renderer.js'
import type { CombatLayout } from './combat-layout.js'

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const LABEL_STYLE_OPTS = {
  fontFamily: 'serif',
  fontSize: 20,
  fontWeight: '900' as const,
  fill: '#ff4444',
  stroke: '#1a0000',
  strokeThickness: 3,
  letterSpacing: 3,
}

export async function animateActivations(
  parent: Container,
  overlay: Graphics,
  wiresG: Graphics,
  activations: readonly ActivationEvent[],
  layout: CombatLayout,
  connX: number,
  connY: number,
  activeStates: boolean[],
): Promise<void> {
  if (activations.length === 0) return

  const { symbolWidth, reelSpacing, totalHeight, scale } = layout
  const reduced = prefersReducedMotion()

  for (const activation of activations) {
    activeStates[activation.reel] = true
    drawWires(wiresG, symbolWidth, reelSpacing, totalHeight, scale, connX, connY, activeStates)

    if (!reduced) {
      await new Promise((r) => setTimeout(r, ANIMATION_CONFIG.LOCK_ON_DELAY_MS))
    }

    const x = activation.reel * (symbolWidth + reelSpacing)

    overlay.clear()
    overlay.rect(x, 0, symbolWidth, totalHeight).fill({ color: 0xc41e1e, alpha: 0.35 })
    overlay.alpha = 0

    const label = new Text({
      text: 'LOCK-ON',
      style: LABEL_STYLE_OPTS,
      accessible: true,
      accessibleHint: `S300 system locking onto reel ${activation.reel + 1}`,
    })
    label.anchor.set(0.5)
    label.x = x + symbolWidth / 2
    label.y = totalHeight / 2
    label.alpha = 0
    label.scale.set(0.6)
    parent.addChild(label)

    if (reduced) {
      // Skip strobing — just show a brief static flash then fade
      overlay.alpha = 0.35
      label.alpha = 1
      label.scale.set(1.0)
      await new Promise((r) => setTimeout(r, 400))
      overlay.clear()
      parent.removeChild(label)
      gsap.killTweensOf(label)
      gsap.killTweensOf(label.scale)
      label.destroy({ children: true })
      continue
    }

    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (parent.destroyed) {
            resolve()
            return
          }
          overlay.clear()
          parent.removeChild(label)
          gsap.killTweensOf(label)
          gsap.killTweensOf(label.scale)
          label.destroy({ children: true })
          resolve()
        },
      })
      // Reduced-intensity strobing: fewer pulses with lower peak alpha
      tl.to(overlay, { alpha: 0.45, duration: 0.12, ease: 'none' })
        .to(overlay, { alpha: 0.1, duration: 0.12, ease: 'none' })
        .to(overlay, { alpha: 0.55, duration: 0.15, ease: 'none' })
        .to(label, { alpha: 1, duration: 0.16, ease: 'power2.out' }, '-=0.1')
        .to(label.scale, { x: 1.1, y: 1.1, duration: 0.16, ease: 'back.out(2)' }, '<')
        .to(label.scale, { x: 1.0, y: 1.0, duration: 0.1 })
        .to(overlay, { alpha: 0, duration: 0.32, ease: 'power1.in' })
        .to(label, { alpha: 0, y: label.y - 20, duration: 0.32, ease: 'power1.in' }, '<')
    })
  }
}
