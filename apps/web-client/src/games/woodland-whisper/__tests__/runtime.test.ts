import { describe, expect, it } from 'bun:test'
import { GameEventBus } from '../../../engine/event-bus.js'
import { WoodlandWhisperRuntime } from '../runtime.js'
import type { WoodlandWhisperSerializedState } from '@tgslots/shared-contracts/states'

function makePickBonusState(): WoodlandWhisperSerializedState {
  return {
    lastGrid: [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
    ],
    freeSpins: null,
    pickBonus: {
      board: Array.from({ length: 20 }, (_, i) => i % 10),
      pickSequence: Array.from({ length: 20 }, (_, i) => i),
      currentPickIndex: 2,
      userPicks: [1, 5],
      revealedValues: [3, 7],
      winValue: 8,
      triggeringMultiplier: 1,
    },
  }
}

describe('WoodlandWhisperRuntime', () => {
  it('does not open pick bonus during applyState for a triggering spin result', () => {
    const eventBus = new GameEventBus()
    const runtime = new WoodlandWhisperRuntime()
    const harness = runtime as unknown as Record<string, unknown>

    let setSymbolsCalls = 0
    let showCalls = 0
    let restoreCalls = 0
    let remaining = -1

    eventBus.on('free-spins:updated', (payload) => {
      remaining = payload.remaining
    })

    harness['_ctx'] = { eventBus }
    harness['_reelSet'] = { setSymbols: () => setSymbolsCalls++ }
    harness['_pickUI'] = {
      show: () => showCalls++,
      restoreState: () => restoreCalls++,
    }

    runtime.applyState(makePickBonusState())

    expect(setSymbolsCalls).toBe(1)
    expect(showCalls).toBe(0)
    expect(restoreCalls).toBe(0)
    expect(remaining).toBe(0)
  })

  it('restores the pending pick bonus only when resumeFeatures is invoked', async () => {
    const eventBus = new GameEventBus()
    const runtime = new WoodlandWhisperRuntime()
    const harness = runtime as unknown as Record<string, unknown>
    const state = makePickBonusState()

    let showCalls = 0
    const restoreCalls: Array<{ picks: number[]; values: number[] }> = []
    let runPickBonusCalls = 0

    harness['_ctx'] = { eventBus }
    harness['_reelSet'] = { setSymbols: () => {} }
    harness['_pickUI'] = {
      show: () => showCalls++,
      restoreState: (picks: number[], values: number[]) => restoreCalls.push({ picks, values }),
    }
    harness['_runPickBonus'] = async () => {
      runPickBonusCalls++
    }

    runtime.applyState(state)
    await runtime.resumeFeatures()

    expect(showCalls).toBe(1)
    expect(restoreCalls).toEqual([
      { picks: state.pickBonus!.userPicks, values: state.pickBonus!.revealedValues },
    ])
    expect(runPickBonusCalls).toBe(1)
  })
})
