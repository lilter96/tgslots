import { describe, it, expect, vi } from 'bun:test'
import { GameStateMachine } from '../state-machine'
import { GameUIState } from '../../types'

describe('GameStateMachine', () => {
  it('should start in IDLE state', () => {
    const fsm = new GameStateMachine()
    expect(fsm.state).toBe(GameUIState.IDLE)
  })

  it('should transition from IDLE to SPINNING', () => {
    const fsm = new GameStateMachine()
    fsm.transitionTo(GameUIState.SPINNING)
    expect(fsm.state).toBe(GameUIState.SPINNING)
  })

  it('should transition from IDLE to FEATURE_TRANSITION', () => {
    const fsm = new GameStateMachine()
    fsm.transitionTo(GameUIState.FEATURE_TRANSITION)
    expect(fsm.state).toBe(GameUIState.FEATURE_TRANSITION)
  })

  it('should transition from WIN_SHOW to SPINNING (free spin loop)', () => {
    const fsm = new GameStateMachine()
    fsm.transitionTo(GameUIState.SPINNING)
    fsm.transitionTo(GameUIState.STOPPING)
    fsm.transitionTo(GameUIState.WIN_SHOW)
    fsm.transitionTo(GameUIState.SPINNING)
    expect(fsm.state).toBe(GameUIState.SPINNING)
  })

  it('should transition from STOPPING to SPINNING (free spin loop)', () => {
    const fsm = new GameStateMachine()
    fsm.transitionTo(GameUIState.SPINNING)
    fsm.transitionTo(GameUIState.STOPPING)
    fsm.transitionTo(GameUIState.SPINNING)
    expect(fsm.state).toBe(GameUIState.SPINNING)
  })

  it('should throw error on invalid transition', () => {
    const fsm = new GameStateMachine()
    // IDLE -> WIN_SHOW is still invalid
    expect(() => fsm.transitionTo(GameUIState.WIN_SHOW)).toThrow()
  })

  it('should notify listeners on transition', () => {
    const fsm = new GameStateMachine()
    const callback = vi.fn()
    fsm.addListener(callback)
    fsm.transitionTo(GameUIState.SPINNING)
    expect(callback).toHaveBeenCalledWith(GameUIState.SPINNING)
  })
})
