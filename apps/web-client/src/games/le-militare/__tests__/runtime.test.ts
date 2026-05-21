import { describe, expect, it } from 'bun:test'
import { GameEventBus } from '../../../engine/event-bus.js'
import { LeMilitareRuntime } from '../runtime.js'
import type { LeMilitareSerializedState } from '@tgslots/shared-contracts/states'
import '../events.js'

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

describe('LeMilitareRuntime event bus wiring', () => {
  it('bus.on listeners are registered after init and unsubscribed after destroy', () => {
    const eventBus = new GameEventBus()
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const harness = runtime as unknown as Record<string, unknown>

    harness['_ctx'] = { eventBus }
    harness['_multiplierHud'] = { setValue: (_v: number) => {} }

    const unsubsBefore = (harness['_unsubs'] as Array<() => void>).length

    harness['_reelSet'] = {
      setSymbolAt: () => {},
      getReel: () => ({ getSymbolAt: () => null }),
    }

    harness['_unsubs'] = [
      eventBus.on('le-militare:symbol:transform', () => {}),
      eventBus.on('le-militare:multiplier:stick', () => {}),
    ]
    expect((harness['_unsubs'] as Array<() => void>).length).toBe(unsubsBefore + 2)

    let transformFired = false
    eventBus.on('le-militare:symbol:transform', () => {
      transformFired = true
    })
    eventBus.emit('le-militare:symbol:transform', { reel: 0, row: 0, newSymbolId: 1 })
    expect(transformFired).toBe(true)

    for (const unsub of harness['_unsubs'] as Array<() => void>) unsub()
    ;(harness['_unsubs'] as Array<() => void>).length = 0

    let firedAfterDestroy = false
    const check = eventBus.on('le-militare:symbol:transform', () => {
      firedAfterDestroy = true
    })
    eventBus.emit('le-militare:symbol:transform', { reel: 0, row: 0, newSymbolId: 1 })
    check()
    expect(firedAfterDestroy).toBe(true)
    expect((harness['_unsubs'] as Array<() => void>).length).toBe(0)
  })

  it('le-militare:symbol:transform payload is correctly typed', () => {
    const eventBus = new GameEventBus()
    let captured: { reel: number; row: number; newSymbolId: number } | undefined

    eventBus.on('le-militare:symbol:transform', (e) => {
      captured = e
    })
    eventBus.emit('le-militare:symbol:transform', { reel: 2, row: 1, newSymbolId: 0 })

    expect(captured?.reel).toBe(2)
    expect(captured?.row).toBe(1)
    expect(captured?.newSymbolId).toBe(0)
  })

  it('le-militare:multiplier:stick payload carries badge reference', () => {
    const eventBus = new GameEventBus()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const fakeBadge = { destroy: () => {} } as unknown as import('pixi.js').Container
    let captured:
      | { reel: number; row: number; multiplier: number; badge: import('pixi.js').Container }
      | undefined

    eventBus.on('le-militare:multiplier:stick', (e) => {
      captured = e
    })
    eventBus.emit('le-militare:multiplier:stick', {
      reel: 1,
      row: 3,
      multiplier: 2,
      badge: fakeBadge,
    })

    expect(captured?.multiplier).toBe(2)
    expect(captured?.badge).toBe(fakeBadge)
  })
})

describe('LeMilitareRuntime.applyState', () => {
  it('emits free-spins:updated with remaining=0 when no free spins', () => {
    const eventBus = new GameEventBus()
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
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
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
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

describe('LeMilitareRuntime.restoreGrid', () => {
  it('calls setSymbols on the reel set with transposed grid', () => {
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const harness = runtime as unknown as Record<string, unknown>

    const setSymbolsCalls: number[][][] = []
    harness['_reelSet'] = {
      setSymbols: (grid: number[][]) => {
        setSymbolsCalls.push(grid)
      },
    }

    const grid = [
      [1, 0],
      [2, 0],
    ]
    runtime.restoreGrid(grid)

    expect(setSymbolsCalls.length).toBe(1)
    // transposeGrid swaps rows and cols
    expect(setSymbolsCalls[0]!.length).toBe(2)
  })

  it('no-ops on empty grid', () => {
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const harness = runtime as unknown as Record<string, unknown>

    let called = false
    harness['_reelSet'] = {
      setSymbols: () => {
        called = true
      },
    }

    runtime.restoreGrid([])
    expect(called).toBe(false)
  })

  it('no-ops on grid with empty first row', () => {
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const harness = runtime as unknown as Record<string, unknown>

    let called = false
    harness['_reelSet'] = {
      setSymbols: () => {
        called = true
      },
    }

    runtime.restoreGrid([[]])
    expect(called).toBe(false)
  })
})

describe('LeMilitareRuntime.destroy', () => {
  it('sets _destroyed flag and clears unsubs', () => {
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const harness = runtime as unknown as Record<string, unknown>

    // Set up minimal state so destroy() doesn't crash
    harness['_unsubs'] = []
    harness['_combatOpView'] = { destroy: () => {} }
    harness['_multiplierHud'] = { destroy: () => {} }
    harness['_reelSet'] = { destroy: () => {} }
    harness['_overlay'] = { destroy: () => {} }
    harness['_bgSprite'] = { destroy: () => {} }
    harness['_mask'] = { destroy: () => {} }
    harness['_frame'] = { destroy: () => {} }
    harness['_mascot'] = { destroy: () => {} }
    harness['_buyBonusControl'] = undefined

    expect(harness['_destroyed']).toBe(false)
    runtime.destroy()
    expect(harness['_destroyed']).toBe(true)
  })

  it('calls unsubscribe functions and clears the array', () => {
    const runtime = new LeMilitareRuntime()
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
    const harness = runtime as unknown as Record<string, unknown>

    let unsubCalled = false
    harness['_unsubs'] = [
      () => {
        unsubCalled = true
      },
    ]
    harness['_combatOpView'] = { destroy: () => {} }
    harness['_multiplierHud'] = { destroy: () => {} }
    harness['_reelSet'] = { destroy: () => {} }
    harness['_overlay'] = { destroy: () => {} }
    harness['_bgSprite'] = { destroy: () => {} }
    harness['_mask'] = { destroy: () => {} }
    harness['_frame'] = { destroy: () => {} }
    harness['_mascot'] = { destroy: () => {} }
    harness['_buyBonusControl'] = undefined

    runtime.destroy()

    expect(unsubCalled).toBe(true)
    expect((harness['_unsubs'] as Array<() => void>).length).toBe(0)
  })
})
