import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import type { ActivationEvent } from '@tgslots/le-militare'
import { ANIMATION_CONFIG } from '../animation-config.js'
import { drawWires } from './wire-renderer.js'

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
  symbolWidth: number,
  totalHeight: number,
  reelSpacing: number,
  scale: number,
  symbolHeight: number,
  connX: number,
  connY: number,
  activeStates: boolean[],
): Promise<void> {
  if (activations.length === 0) return

  for (const activation of activations) {
    activeStates[activation.reel] = true
    drawWires(wiresG, symbolWidth, reelSpacing, totalHeight, scale, connX, connY, activeStates)

    await new Promise((r) => setTimeout(r, ANIMATION_CONFIG.LOCK_ON_DELAY_MS))

    const x = activation.reel * (symbolWidth + reelSpacing)

    overlay.clear()
    overlay.rect(x, 0, symbolWidth, totalHeight).fill({ color: 0xc41e1e, alpha: 1 })
    overlay.alpha = 0

    const label = new Text({ text: 'LOCK-ON', style: LABEL_STYLE_OPTS })
    label.anchor.set(0.5)
    label.x = x + symbolWidth / 2
    label.y = totalHeight / 2
    label.alpha = 0
    label.scale.set(0.6)
    parent.addChild(label)

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
      tl.to(overlay, { alpha: 0.7, duration: 0.1, ease: 'none' })
        .to(overlay, { alpha: 0.1, duration: 0.1, ease: 'none' })
        .to(overlay, { alpha: 0.8, duration: 0.1, ease: 'none' })
        .to(overlay, { alpha: 0.1, duration: 0.1, ease: 'none' })
        .to(overlay, { alpha: 0.9, duration: 0.13, ease: 'none' })
        .to(label, { alpha: 1, duration: 0.16, ease: 'power2.out' }, '-=0.1')
        .to(label.scale, { x: 1.1, y: 1.1, duration: 0.16, ease: 'back.out(2)' }, '<')
        .to(label.scale, { x: 1.0, y: 1.0, duration: 0.1 })
        .to(overlay, { alpha: 0, duration: 0.32, ease: 'power1.in' })
        .to(label, { alpha: 0, y: label.y - 20, duration: 0.32, ease: 'power1.in' }, '<')
    })
  }
}
