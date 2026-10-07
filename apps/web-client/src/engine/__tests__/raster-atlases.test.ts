import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { assets as dragon } from '../../games/ancient-dragon/assets.js'
import { assets as woodland } from '../../games/woodland-whisper/assets.js'
import { assets as military } from '../../games/le-militare/assets.js'
import { manifest as dragonManifest } from '../../games/ancient-dragon/manifest.js'
import { manifest as woodlandManifest } from '../../games/woodland-whisper/manifest.js'
import { manifest as militaryManifest } from '../../games/le-militare/manifest.js'

const publicRoot = resolve(import.meta.dir, '../../../public')
describe('raster-only game art', () => {
  for (const [manifest, assets] of [
    [dragonManifest, dragon],
    [woodlandManifest, woodland],
    [militaryManifest, military],
  ] as const) {
    test(`${manifest.gameId} has an image for every math symbol and bounded atlas frames`, () => {
      const available = new Set(Object.keys(assets.images ?? {}))
      for (const spec of assets.atlases ?? []) {
        const image = assets.images?.[spec.image]
        expect(image).toBeDefined()
        const png = readFileSync(resolve(publicRoot, image!.replace(/^\//, '')))
        expect(png.subarray(1, 4).toString()).toBe('PNG')
        const width = png.readUInt32BE(16),
          height = png.readUInt32BE(20)
        for (const [name, frame] of Object.entries(spec.frames)) {
          expect(frame.width).toBeGreaterThan(20)
          expect(frame.height).toBeGreaterThan(20)
          expect(frame.x).toBeGreaterThanOrEqual(0)
          expect(frame.y).toBeGreaterThanOrEqual(0)
          expect(frame.x + frame.width).toBeLessThanOrEqual(width)
          expect(frame.y + frame.height).toBeLessThanOrEqual(height)
          available.add(name)
        }
      }
      for (const symbol of manifest.symbols) expect(available.has(symbol.name)).toBe(true)
      for (const image of Object.values(assets.images ?? {}))
        expect(image).not.toMatch(/\.svg(?:$|\?)/i)
    })
  }
})
