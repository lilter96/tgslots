import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { assets as dragon } from '../../games/ancient-dragon/assets.js'
import { assets as woodland } from '../../games/woodland-whisper/assets.js'
import { assets as military } from '../../games/le-militare/assets.js'

const publicRoot = resolve(import.meta.dir, '../../../public')
describe('playable game asset manifests', () => {
  for (const [game, assets] of Object.entries({ dragon, woodland, military })) {
    test(`${game} references shipped image and audio files`, () => {
      const paths = [...Object.values(assets.images ?? {}), ...Object.values(assets.audio ?? {})]
      expect(paths.length).toBeGreaterThan(0)
      for (const path of paths) {
        const file = resolve(publicRoot, path.replace(/^\//, ''))
        expect(existsSync(file)).toBe(true)
        expect(statSync(file).size).toBeGreaterThan(100)
      }
    })
  }
})
