import { Graphics } from 'pixi.js'

export interface WirePath {
  rx: number
  ry: number
  cpX: number
  cpY: number
  ex: number
  ey: number
}

// Quadratic cable from a reel's base down to the launcher connection point.
// The control point is forced *below* the grid so cables always sag downward
// toward the launcher and never arc up over the reels.
export function wirePath(
  i: number,
  symbolWidth: number,
  reelSpacing: number,
  totalHeight: number,
  scale: number,
  connX: number,
  connY: number,
): WirePath {
  const rx = i * (symbolWidth + reelSpacing) + symbolWidth / 2
  const ry = totalHeight
  const cpX = (rx + connX) / 2
  const cpY = Math.max(ry, connY) + 40 * scale
  return { rx, ry, cpX, cpY, ex: connX, ey: connY }
}

export function quadPoint(t: number, p0: number, p1: number, p2: number): number {
  return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
}

function strokePath(
  g: Graphics,
  p: WirePath,
  color: number,
  width: number,
  scale: number,
  alpha = 1,
): void {
  g.moveTo(p.rx, p.ry)
    .quadraticCurveTo(p.cpX, p.cpY, p.ex, p.ey)
    .stroke({ color, width: width * scale, alpha })
}

// Cables are drawn ONLY for armed reels — idle reels have none, so there's no
// ugly always-on web. An armed cable reads as a dark insulated line with a
// powered amber core.
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
    if (!activeStates[i]) continue
    const p = wirePath(i, symbolWidth, reelSpacing, totalHeight, scale, connX, connY)
    strokePath(g, p, 0x0d1206, 14, scale, 0.85) // casing shadow
    strokePath(g, p, 0x3a2a0e, 10, scale) // insulation
    strokePath(g, p, 0xffb43c, 5, scale, 0.95) // powered amber core
    strokePath(g, p, 0xfff1c0, 2, scale, 0.6) // sheen
  }
}

// A bright electric pulse climbing the cable from the reel (t=0) toward the
// launcher (t=1), leaving an energised, crackling trail behind it.
export function drawCurrent(g: Graphics, p: WirePath, headT: number, scale: number): void {
  g.clear()

  // Faint conduit so the current has a visible track for its whole run.
  strokePath(g, p, 0x2a2f22, 6, scale, 0.6)

  const SEG = 22
  for (let s = 0; s < SEG; s++) {
    const t0 = (s / SEG) * headT
    const t1 = ((s + 1) / SEG) * headT
    const x0 = quadPoint(t0, p.rx, p.cpX, p.ex)
    const y0 = quadPoint(t0, p.ry, p.cpY, p.ey)
    const x1 = quadPoint(t1, p.rx, p.cpX, p.ex)
    const y1 = quadPoint(t1, p.ry, p.cpY, p.ey)
    const a = s / SEG
    const jitter = (1 - a) * 4 * scale
    g.moveTo(x0, y0)
      .lineTo(x1 + (Math.random() - 0.5) * jitter, y1 + (Math.random() - 0.5) * jitter)
      .stroke({ color: 0x9fe8ff, width: (1 + a * 3) * scale, alpha: 0.3 + a * 0.55 })
  }

  const hx = quadPoint(headT, p.rx, p.cpX, p.ex)
  const hy = quadPoint(headT, p.ry, p.cpY, p.ey)
  g.circle(hx, hy, 16 * scale).fill({ color: 0x6cd6ff, alpha: 0.35 })
  g.circle(hx, hy, 9 * scale).fill({ color: 0xffffff, alpha: 0.9 })

  for (let k = 0; k < 4; k++) {
    const ang = Math.random() * Math.PI * 2
    const len = (8 + Math.random() * 10) * scale
    g.moveTo(hx, hy)
      .lineTo(hx + Math.cos(ang) * len, hy + Math.sin(ang) * len)
      .stroke({ color: 0xcdeeff, width: 1.2 * scale, alpha: 0.7 })
  }
}
