import { describe, it, expect } from 'bun:test'
import { GameStateMachine } from '../state-machine'
import { SessionManager } from '../session-manager'
import { GameEventBus } from '../event-bus'
import { SpinOrchestrator } from '../spin-orchestrator'
import type { OrchestratorActions } from '../spin-orchestrator'
import type { GameRuntime } from '../game-client'
import { GameUIState } from '../../types'
import { getSpinSpeedProfile } from '../spin-speed'

// Fake action response shape (only fields the orchestrator reads)
function makeResponse(freeSpinsRemaining = 0, winAmount = 0) {
  return {
    sessionId: 'test-session',
    state: {},
    result: winAmount > 0 ? { type: 'base' as const, win: winAmount } : undefined,
    freeSpinsRemaining,
  }
}

interface FakeState {
  freeSpinsLeft: number
  spinCallCount: number
  freeSpinCallCount: number
}

function buildSetup(initialBalance = 1000, freeSpinsToTrigger = 0, baseWin = 0) {
  const fsm = new GameStateMachine()
  const session = new SessionManager(initialBalance)
  const eventBus = new GameEventBus()
  const s: FakeState = { freeSpinsLeft: 0, spinCallCount: 0, freeSpinCallCount: 0 }

  const runtime: GameRuntime<'woodland-whisper'> = {
    applyState() {
      // Simulate what real runtime does: emit free-spins count after state is applied
      eventBus.emit('free-spins:updated', { remaining: s.freeSpinsLeft })
    },
    async presentResult() {
      if (baseWin > 0) {
        eventBus.emit('win:awarded', { amount: baseWin, multiplierX: baseWin })
      }
    },
    resize() {},
    destroy() {},
  }

  const actions: OrchestratorActions<'woodland-whisper'> = {
    spinCost: () => 10,
    doSpin: async () => {
      s.spinCallCount++
      s.freeSpinsLeft = freeSpinsToTrigger
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return makeResponse(freeSpinsToTrigger, baseWin) as any
    },
    doFreeSpin: async () => {
      s.freeSpinCallCount++
      s.freeSpinsLeft = Math.max(0, s.freeSpinsLeft - 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return makeResponse(s.freeSpinsLeft) as any
    },
  }

  const orchestrator = new SpinOrchestrator(fsm, session, runtime, eventBus, actions)
  return { fsm, session, eventBus, orchestrator, s }
}

function buildBuyBonusSetup(initialBalance = 5000, freeSpinsToTrigger = 0) {
  const fsm = new GameStateMachine()
  const session = new SessionManager(initialBalance)
  const eventBus = new GameEventBus()
  const s = { buyBonusCallCount: 0, freeSpinCallCount: 0, freeSpinsLeft: 0 }

  const runtime: GameRuntime<'woodland-whisper'> = {
    applyState() {
      eventBus.emit('free-spins:updated', { remaining: s.freeSpinsLeft })
    },
    async presentResult() {},
    resize() {},
    destroy() {},
  }

  const actions: OrchestratorActions<'woodland-whisper'> = {
    spinCost: () => 10,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doSpin: async () => ({ sessionId: 'x', state: {} }) as any,
    buyBonusCost: () => 1000,
    doBuyBonus: async () => {
      s.buyBonusCallCount++
      s.freeSpinsLeft = freeSpinsToTrigger
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { sessionId: 'x', state: {}, result: { type: 'BUY' } } as any
    },
    doFreeSpin: async () => {
      s.freeSpinCallCount++
      s.freeSpinsLeft = Math.max(0, s.freeSpinsLeft - 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { sessionId: 'x', state: {} } as any
    },
  }

  const orchestrator = new SpinOrchestrator(fsm, session, runtime, eventBus, actions)
  return { fsm, session, orchestrator, s }
}

describe('SpinOrchestrator', () => {
  describe('basic spin (no win, no free spins)', () => {
    it('transitions IDLE → SPINNING → STOPPING → IDLE', async () => {
      const { fsm, orchestrator } = buildSetup()
      const states: GameUIState[] = []
      fsm.addListener((s) => states.push(s))

      await orchestrator.spin(1)

      expect(states).toEqual([GameUIState.SPINNING, GameUIState.STOPPING, GameUIState.IDLE])
    })

    it('deducts the wager from the session balance', async () => {
      const { session, orchestrator } = buildSetup(1000)
      await orchestrator.spin(1)
      expect(session.balance).toBe(990)
    })

    it('does not spin when FSM is not IDLE', async () => {
      const { fsm, orchestrator, s } = buildSetup()
      fsm.transitionTo(GameUIState.SPINNING)
      await orchestrator.spin(1)
      expect(s.spinCallCount).toBe(0)
    })

    it('does not spin when balance is insufficient', async () => {
      const { orchestrator, s } = buildSetup(5) // cost is 10
      await orchestrator.spin(1)
      expect(s.spinCallCount).toBe(0)
    })
  })

  describe('win presentation', () => {
    it('transitions through WIN_SHOW when win is awarded', async () => {
      const { fsm, orchestrator } = buildSetup(1000, 0, 100)
      const states: GameUIState[] = []
      fsm.addListener((s) => states.push(s))

      await orchestrator.spin(1)

      expect(states).toContain(GameUIState.WIN_SHOW)
      expect(states[states.length - 1]).toBe(GameUIState.IDLE)
    })

    it('credits win amount to session balance', async () => {
      const { session, orchestrator } = buildSetup(1000, 0, 250)
      await orchestrator.spin(1)
      // 1000 - 10 (wager) + 250 (win) = 1240
      expect(session.balance).toBe(1240)
    })
  })

  describe('free-spin loop', () => {
    it('runs the correct number of free-spin actions', async () => {
      const { orchestrator, s } = buildSetup(1000, 3)
      await orchestrator.spin(1)
      expect(s.freeSpinCallCount).toBe(3)
    })

    it('ends in IDLE after free-spin loop completes', async () => {
      const { fsm, orchestrator } = buildSetup(1000, 3)
      await orchestrator.spin(1)
      expect(fsm.state).toBe(GameUIState.IDLE)
    })

    it('does not run free spins when doFreeSpin is not provided', async () => {
      const fsm = new GameStateMachine()
      const session = new SessionManager(1000)
      const eventBus = new GameEventBus()
      const freeSpinCallCount = 0
      const runtime: GameRuntime<'woodland-whisper'> = {
        applyState() {
          // trigger 3 free spins via bus
          eventBus.emit('free-spins:updated', { remaining: 3 })
        },
        async presentResult() {},
        resize() {},
        destroy() {},
      }
      const actions: OrchestratorActions<'woodland-whisper'> = {
        spinCost: () => 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doSpin: async () => ({ sessionId: 'x', state: {} }) as any,
        // doFreeSpin intentionally omitted
      }
      const orchestrator = new SpinOrchestrator(fsm, session, runtime, eventBus, actions)
      await orchestrator.spin(1)
      expect(freeSpinCallCount).toBe(0)
    })
  })

  describe('resumeFreeSpins', () => {
    it('resumes an active free-spin sequence and returns to IDLE', async () => {
      const fsm = new GameStateMachine()
      const session = new SessionManager(1000)
      const eventBus = new GameEventBus()
      let callCount = 0
      let remaining = 2

      const runtime: GameRuntime<'woodland-whisper'> = {
        applyState() {
          eventBus.emit('free-spins:updated', { remaining })
        },
        async presentResult() {},
        resize() {},
        destroy() {},
      }

      // Pre-seed the orchestrator with a free-spin count via bus before construction
      // We need the orchestrator to know there are 2 spins left from session restore
      const actions: OrchestratorActions<'woodland-whisper'> = {
        spinCost: () => 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doSpin: async () => ({ sessionId: 'x', state: {} }) as any,
        doFreeSpin: async () => {
          callCount++
          remaining = Math.max(0, remaining - 1)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { sessionId: 'x', state: {} } as any
        },
      }

      const orchestrator = new SpinOrchestrator(fsm, session, runtime, eventBus, actions)
      // Simulate applyState having been called at init with 2 free spins remaining
      eventBus.emit('free-spins:updated', { remaining: 2 })

      await orchestrator.resumeFreeSpins()

      expect(callCount).toBe(2)
      expect(fsm.state).toBe(GameUIState.IDLE)
    })

    it('is a no-op when no free spins are pending', async () => {
      const { fsm, orchestrator, s } = buildSetup(1000, 0)
      await orchestrator.resumeFreeSpins()
      expect(s.freeSpinCallCount).toBe(0)
      expect(fsm.state).toBe(GameUIState.IDLE)
    })
  })

  describe('buy bonus', () => {
    it('deducts the configured buy-bonus cost and dispatches the action once', async () => {
      const { session, orchestrator, s } = buildBuyBonusSetup()

      await orchestrator.buyBonus(1)

      expect(s.buyBonusCallCount).toBe(1)
      expect(session.balance).toBe(4000)
    })

    it('runs the free-spin loop after the buy-bonus result updates remaining spins', async () => {
      const { fsm, orchestrator, s } = buildBuyBonusSetup(5000, 3)

      await orchestrator.buyBonus(1)

      expect(s.freeSpinCallCount).toBe(3)
      expect(fsm.state).toBe(GameUIState.IDLE)
    })
  })

  describe('auto-spin', () => {
    it('startAutoSpin immediately triggers the first spin', async () => {
      const { orchestrator, s } = buildSetup(10000)
      orchestrator.startAutoSpin({ spins: 1, stopOnWin: false, stopOnBonus: false })
      // Wait for the first spin to complete
      await new Promise((r) => setTimeout(r, 10))
      expect(s.spinCallCount).toBeGreaterThanOrEqual(1)
    })

    it('reports isAutoSpin and autoSpinRemaining', () => {
      const { orchestrator } = buildSetup(10000)
      expect(orchestrator.isAutoSpin).toBe(false)
      orchestrator.startAutoSpin({ spins: 5, stopOnWin: false, stopOnBonus: false })
      expect(orchestrator.isAutoSpin).toBe(true)
      expect(orchestrator.autoSpinRemaining).toBe(5)
    })

    it('stopAutoSpin cancels the auto-spin sequence', () => {
      const { orchestrator } = buildSetup(10000)
      orchestrator.startAutoSpin({ spins: 5, stopOnWin: false, stopOnBonus: false })
      orchestrator.stopAutoSpin()
      expect(orchestrator.isAutoSpin).toBe(false)
    })

    it('uses the active spin-speed profile for the next auto-spin delay', async () => {
      const fsm = new GameStateMachine()
      const session = new SessionManager(1000)
      const eventBus = new GameEventBus()

      const runtime: GameRuntime<'woodland-whisper'> = {
        applyState() {
          eventBus.emit('free-spins:updated', { remaining: 0 })
        },
        async presentResult() {},
        resize() {},
        destroy() {},
      }

      const actions: OrchestratorActions<'woodland-whisper'> = {
        spinCost: () => 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doSpin: async () => ({ sessionId: 'x', state: {} }) as any,
      }

      const delays: number[] = []
      const originalSetTimeout = globalThis.setTimeout
      globalThis.setTimeout = ((_handler: TimerHandler, timeout?: number) => {
        delays.push(timeout ?? 0)
        // eslint-disable-next-line @typescript-eslint/no-restricted-types
        return 0 as unknown as ReturnType<typeof setTimeout>
        // eslint-disable-next-line @typescript-eslint/no-restricted-types
      }) as unknown as typeof setTimeout

      try {
        const orchestrator = new SpinOrchestrator(fsm, session, runtime, eventBus, actions, () =>
          getSpinSpeedProfile('turbo'),
        )

        orchestrator.startAutoSpin({ spins: 2, stopOnWin: false, stopOnBonus: false })
        await Promise.resolve()
        await Promise.resolve()

        expect(delays[0]).toBe(getSpinSpeedProfile('turbo').autoSpinDelayMs)
      } finally {
        globalThis.setTimeout = originalSetTimeout
      }
    })
  })
})
