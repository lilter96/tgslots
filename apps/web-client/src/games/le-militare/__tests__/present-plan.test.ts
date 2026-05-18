import { describe, expect, it } from 'bun:test'
import { derivePresentPlan } from '../helpers/present-plan.js'
import type {
  LeMilitareBaseResult,
  LeMilitareFreeResult,
  LeMilitareBuyResult,
} from '@tgslots/le-militare'

const EMPTY_STEPS: never[] = []

function makeBase(triggeredFreeSpins: boolean): LeMilitareBaseResult {
  return {
    type: 'BASE',
    win: 0,
    multiplierSum: 1,
    scatterCount: 0,
    steps: EMPTY_STEPS,
    triggeredFreeSpins,
  } as unknown as LeMilitareBaseResult
}

function makeFree(retriggered: boolean): LeMilitareFreeResult {
  return {
    type: 'FREE',
    win: 0,
    multiplierSum: 1,
    scatterCount: 0,
    steps: EMPTY_STEPS,
    retriggered,
  } as unknown as LeMilitareFreeResult
}

function makeBuy(): LeMilitareBuyResult {
  return {
    type: 'BUY',
    win: 0,
    multiplierSum: 1,
    scatterCount: 0,
    steps: EMPTY_STEPS,
    triggeredFreeSpins: true,
  } as unknown as LeMilitareBuyResult
}

describe('derivePresentPlan', () => {
  it('returns empty plan for BASE with no free spins triggered', () => {
    const plan = derivePresentPlan(makeBase(false))
    expect(plan.preAnnounce).toBeUndefined()
    expect(plan.retriggerAnnounce).toBeUndefined()
  })

  it('returns retrigger announce for BASE with free spins triggered', () => {
    const plan = derivePresentPlan(makeBase(true))
    expect(plan.preAnnounce).toBeUndefined()
    expect(plan.retriggerAnnounce).toEqual({ text: 'FREE SPINS!', ms: 1500 })
  })

  it('returns empty plan for FREE with no retrigger', () => {
    const plan = derivePresentPlan(makeFree(false))
    expect(plan.preAnnounce).toBeUndefined()
    expect(plan.retriggerAnnounce).toBeUndefined()
  })

  it('returns retrigger announce for FREE with retriggered=true', () => {
    const plan = derivePresentPlan(makeFree(true))
    expect(plan.preAnnounce).toBeUndefined()
    expect(plan.retriggerAnnounce).toEqual({ text: 'FREE SPINS!', ms: 1200 })
  })

  it('FREE retrigger ms differs from BASE (1200 vs 1500)', () => {
    const basePlan = derivePresentPlan(makeBase(true))
    const freePlan = derivePresentPlan(makeFree(true))
    expect(basePlan.retriggerAnnounce!.ms).toBe(1500)
    expect(freePlan.retriggerAnnounce!.ms).toBe(1200)
  })

  it('returns both preAnnounce and retriggerAnnounce for BUY', () => {
    const plan = derivePresentPlan(makeBuy())
    expect(plan.preAnnounce).toEqual({ text: 'COMBAT OPERATION', ms: 1200 })
    expect(plan.retriggerAnnounce).toEqual({ text: 'FREE SPINS!', ms: 1500 })
  })
})
