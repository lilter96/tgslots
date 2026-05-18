import { describe, expect, it } from 'bun:test'
import { GameEventBus } from '../../../engine/event-bus.js'
import { LeMilitareRuntime } from '../runtime.js'
import type { LeMilitareSerializedState } from '@tgslots/shared-contracts/states'

function makeBaseState(): LeMilitareSerializedState {
  return { lastGrid: null, freeSpins: null }
}

function makeFreeSpinsState(): LeMilitareSerializedState {
  return {
    lastGrid: null,
    freeSpins: {
      spinsRemaining: 7,
      multiplierSum: 3,
      triggeringMultiplier: 1,
      totalWin: 0,
      armedReels: [],
    },
  }
}

describe('LeMilitareRuntime.applyState', () => {
  it('emits free-spins:updated with remaining=0 when no free spins', () => {
    const eventBus = new GameEventBus()
    const runtime = new LeMilitareRuntime()
    const harness = runtime as unknown as Record<string, unknown>

    let remaining = -1
    eventBus.on('free-spins:updated', (payload) => {
      remaining = payload.remaining
    })

    let hudValue = -1
    harness['_ctx'] = { eventBus }
    harness['_multiplierHud'] = {
      setValue: (v: number) => {
        hudValue = v
      },
    }

    runtime.applyState(makeBaseState())

    expect(remaining).toBe(0)
    expect(hudValue).toBe(1)
  })

  it('emits free-spins:updated with correct remaining and sets multiplier HUD', () => {
    const eventBus = new GameEventBus()
    const runtime = new LeMilitareRuntime()
    const harness = runtime as unknown as Record<string, unknown>

    let remaining = -1
    eventBus.on('free-spins:updated', (payload) => {
      remaining = payload.remaining
    })

    let hudValue = -1
    harness['_ctx'] = { eventBus }
    harness['_multiplierHud'] = {
      setValue: (v: number) => {
        hudValue = v
      },
    }

    runtime.applyState(makeFreeSpinsState())

    expect(remaining).toBe(7)
    expect(hudValue).toBe(3)
  })
})
