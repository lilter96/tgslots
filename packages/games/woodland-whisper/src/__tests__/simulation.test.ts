import { expect, test } from 'bun:test'
import { createSlotsTestEngine } from '@tgslots/slots-simulation-engine/testing/slots-test-engine'
import { BET_CONFIG } from '../constants.js'
import { WoodlandWhisperSimulationStateMachine } from '../simulation-state-machine.js'

const engine = createSlotsTestEngine(WoodlandWhisperSimulationStateMachine, BET_CONFIG).build()

test('Monte Carlo rounds resolve picks, consume awarded spins and include free-spin metrics', () => {
  const seed = engine.findSeed((session) => {
    session.act('spin')
    return session.sm.state.pickBonus !== null
  })
  expect(seed).not.toBeNull()
  const session = engine.session({ seed: seed! })
  let awarded = 0
  let played = 0
  let steps = 0
  session.withinRound(() => {
    session.act('spin')
    while (true) {
      const pendingAward = session.sm.state.pickBonus?.winValue ?? 0
      const result = session.act('next')
      if (!result) break
      if (++steps > 10000) throw new Error('Simulation round did not complete')
      if (result.type === 'PICK' && result.pick.isMatch) awarded += pendingAward
      if (result.type === 'FREE') played++
    }
  })
  expect(awarded).toBeGreaterThan(0)
  expect(played).toBe(awarded)
  expect(session.sm.state.pickBonus).toBeNull()
  expect(session.sm.state.freeSpins?.spinsRemaining).toBe(0)
  session.assertMetricDefined('features/free-spins', 'feature-rtp')
})
