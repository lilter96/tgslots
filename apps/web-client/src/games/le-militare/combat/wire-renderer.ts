import { Graphics } from 'pixi.js'

export function drawWires(
  g: Graphics,
  symbolWidth: number,
  reelSpacing: number,
  totalHeight: number,
  scale: number,
  connX: number,
  connY: number,
  activeStates: readonly boolean[],
): void {
  if (symbolWidth === 0) return
  g.clear()

  for (let i = 0; i < activeStates.length; i++) {
    const rx = i * (symbolWidth + reelSpacing) + symbolWidth / 2
    const ry = totalHeight
    const isActive = activeStates[i]
    const cpX = (rx + connX) / 2
    const cpY = Math.max(ry, connY) + 60 * scale

    // 1. Shadow / Outline
    g.moveTo(rx, ry)
    g.quadraticCurveTo(cpX, cpY, connX, connY)
    g.stroke({ color: 0x151a0d, width: 8 * scale, alpha: 0.8 })

    // 2. Main Cable Core
    const coreColor = isActive ? 0xcc1a1a : 0x2e3d18
    g.moveTo(rx, ry)
    g.quadraticCurveTo(cpX, cpY, connX, connY)
    g.stroke({ color: coreColor, width: 5 * scale })

    // 3. Specular Highlight
    const hiColor = isActive ? 0xff6666 : 0x4a5c2a
    g.moveTo(rx, ry)
    g.quadraticCurveTo(cpX, cpY, connX, connY)
    g.stroke({ color: hiColor, width: 1.5 * scale, alpha: 0.4 })

    // 4. Vibrant "Target Designation" Glow
    if (isActive) {
      g.moveTo(rx, ry)
      g.quadraticCurveTo(cpX, cpY, connX, connY)
      g.stroke({ color: 0xff0000, width: 2 * scale })

      g.moveTo(rx, ry)
      g.quadraticCurveTo(cpX, cpY, connX, connY)
      g.stroke({ color: 0xff4444, width: 12 * scale, alpha: 0.25 })

      g.moveTo(rx, ry)
      g.quadraticCurveTo(cpX, cpY, connX, connY)
      g.stroke({ color: 0xffffff, width: 0.8 * scale, alpha: 0.6 })
    }
  }
}
