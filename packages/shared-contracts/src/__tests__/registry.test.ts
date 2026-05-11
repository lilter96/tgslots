import { describe, it, expect } from 'bun:test'
import type { GameId, ActionType, ActionPayload, GameState, GameResult } from '../game-registry'

// Local augmentation for type-contract verification.
// Excluded from the root tsconfig (*.test.ts) so it doesn't pollute the production type graph.
declare module '../game-registry' {
  interface GameRegistry {
    'test-game': {
      state: { score: number }
      result: { type: 'base'; win: number }
      actions: {
        roll: { multiplier: number }
        reset: Record<string, never>
      }
    }
  }
}

describe('GameRegistry utility types', () => {
  it('GameId resolves to registered keys', () => {
    const id: GameId = 'test-game'
    expect(id).toBe('test-game')
  })

  it('ActionType resolves to the union of action keys for a game', () => {
    const a: ActionType<'test-game'> = 'roll'
    const b: ActionType<'test-game'> = 'reset'
    expect(['roll', 'reset']).toContain(a)
    expect(['roll', 'reset']).toContain(b)
  })

  it('ActionPayload resolves to the correct payload shape', () => {
    const payload: ActionPayload<'test-game', 'roll'> = { multiplier: 3 }
    expect(payload).toMatchObject({ multiplier: 3 })
  })

  it('ActionPayload for a no-arg action is an empty record', () => {
    const payload: ActionPayload<'test-game', 'reset'> = {}
    expect(payload).toEqual({})
  })

  it('GameState resolves to the registered state type', () => {
    const state: GameState<'test-game'> = { score: 42 }
    expect(state.score).toBe(42)
  })

  it('GameResult resolves to the registered result type', () => {
    const result: GameResult<'test-game'> = { type: 'base', win: 100 }
    expect(result.win).toBe(100)
  })
})

// Type-safety assertions verified by the package-level tsc --noEmit:
// @ts-expect-error — 'not-a-game' must not be assignable to GameId
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unknownId: GameId = 'not-a-game'

// @ts-expect-error — 'invalid-action' is not an ActionType of 'test-game'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _badAction: ActionType<'test-game'> = 'invalid-action'

// @ts-expect-error — multiplier field is required for 'roll' payload
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _badPayload: ActionPayload<'test-game', 'roll'> = {}
