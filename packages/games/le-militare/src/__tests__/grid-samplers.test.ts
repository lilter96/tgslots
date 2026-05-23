import { describe, it, expect } from 'bun:test'
import { ROW_COUNT, REEL_COUNT, S300_ID, PLANE_ID } from '../constants.js'
import { makeStripChunkSampler } from '../logic.js'
import { leMilitareTestEngine as engine } from './test-engine.js'

// Gravity refill and initial grid build draw a CONTIGUOUS CHUNK from the strip
// rather than independent per-cell draws. This preserves co-placement rules
// authored in the JSON strips and produces natural reel sequences.

describe('contiguous strip chunk sampler', () => {
  it('chunk length matches requested length', () => {
    const strip = new Uint8Array([10, 20, 30, 40, 50, 10, 20])
    const sampler = makeStripChunkSampler(strip, 3)
    const rng = engine.rng(1)
    for (let i = 0; i < 100; i++) {
      const chunk = sampler.sample(rng)
      expect(chunk.length).toBe(3)
    }
  })

  it('chunk symbols are consecutive entries from the strip', () => {
    const n = 5
    const values = [10, 20, 30, 40, 50]
    const strip = new Uint8Array([...values, values[0]!, values[1]!])
    const sampler = makeStripChunkSampler(strip, 3)
    const rng = engine.rng(42)

    for (let i = 0; i < 200; i++) {
      const chunk = sampler.sample(rng)
      const startIdx = values.indexOf(chunk[0]!)
      expect(startIdx).toBeGreaterThanOrEqual(0)
      expect(chunk[1]).toBe(values[(startIdx + 1) % n])
      expect(chunk[2]).toBe(values[(startIdx + 2) % n])
    }
  })

  it('chunk wraps around correctly using strip wrap-around padding', () => {
    const strip = new Uint8Array([10, 20, 30, 10, 20])
    const sampler = makeStripChunkSampler(strip, 3)

    const rng = engine.rng(99)
    const n = 3
    const baseValues = [10, 20, 30]
    for (let i = 0; i < 200; i++) {
      const chunk = sampler.sample(rng)
      const startIdx = baseValues.indexOf(chunk[0]!)
      expect(startIdx).toBeGreaterThanOrEqual(0)
      expect(chunk[1]).toBe(baseValues[(startIdx + 1) % n])
      expect(chunk[2]).toBe(baseValues[(startIdx + 2) % n])
    }
  })

  it('chunk length 0 returns empty array without consuming RNG', () => {
    const strip = new Uint8Array([10, 20, 30, 10, 20])
    const sampler = makeStripChunkSampler(strip, 0)
    const rng1 = engine.rng(7)
    const rng2 = engine.rng(7)
    const chunk = sampler.sample(rng1)
    expect(chunk.length).toBe(0)
    expect(rng1(0, 100)).toBe(rng2(0, 100))
  })

  it('S300 and PLANE never appear on the same reel in any spin (base game)', () => {
    for (let seed = 0; seed < 2_000; seed++) {
      const session = engine.session({ seed })
      session.act('spin')
      const internal = session.sm.state.lastSpinResult!

      for (const step of internal.steps) {
        for (const grid of [step.preCombatGrid, step.postCombatGrid]) {
          for (let reel = 0; reel < REEL_COUNT; reel++) {
            let hasS300 = false
            let hasPlane = false
            for (let row = 0; row < ROW_COUNT; row++) {
              if (grid[row]![reel] === S300_ID) hasS300 = true
              if (grid[row]![reel] === PLANE_ID) hasPlane = true
            }
            expect(hasS300 && hasPlane).toBe(false)
          }
        }
      }
    }
  })
})
