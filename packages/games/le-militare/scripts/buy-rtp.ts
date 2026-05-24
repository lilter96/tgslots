/**
 * Buy-RTP harness. The main simulation only drives spin()/next(), so feature-buy
 * options are verified here: each option's RTP = totalWin / (rounds × cost × stake).
 * Costs in config (buy_options) should be tuned so every option returns ≈ 0.984.
 *
 *   bun packages/games/le-militare/scripts/buy-rtp.ts
 */
import { mt19937 } from '@tgslots/math'
import { Wager } from '@tgslots/slots-core/betting'
import { LeMilitareStateMachine, BET_CONFIG } from '../src/index.js'
import { BUY_OPTIONS } from '../src/constants.js'

const ROUNDS = 60_000
const SEED = 20240524

function rtpOf(
  open: (sm: LeMilitareStateMachine, rng: ReturnType<typeof mt19937>) => number,
  cost: number,
): number {
  const rng = mt19937(SEED)
  const wager = new Wager(1, BET_CONFIG)
  const sm = new LeMilitareStateMachine()
  let totalWin = 0
  for (let i = 0; i < ROUNDS; i++) {
    totalWin += open(sm, rng)
    let next
    while ((next = sm.next(rng)) !== null) totalWin += next.win
  }
  return totalWin / (ROUNDS * cost * wager.totalWager)
}

const cases: {
  label: string
  cost: number
  open: (sm: LeMilitareStateMachine, rng: ReturnType<typeof mt19937>) => number
}[] = [
  {
    label: 'standard',
    cost: BUY_OPTIONS.standard.cost,
    open: (sm, rng) => sm.buyBonus(rng, new Wager(1, BET_CONFIG), 'standard').win,
  },
  {
    label: 'elite',
    cost: BUY_OPTIONS.elite.cost,
    open: (sm, rng) => sm.buyBonus(rng, new Wager(1, BET_CONFIG), 'elite').win,
  },
  {
    label: 'super',
    cost: BUY_OPTIONS.super.cost,
    open: (sm, rng) => sm.buyBonus(rng, new Wager(1, BET_CONFIG), 'super').win,
  },
  {
    label: 'chance_spin',
    cost: BUY_OPTIONS.chanceSpin.cost,
    open: (sm, rng) => sm.buyChanceSpin(rng, new Wager(1, BET_CONFIG)).win,
  },
  {
    label: 'air_raid_spin',
    cost: BUY_OPTIONS.airRaidSpin.cost,
    open: (sm, rng) => sm.buyAirRaidSpin(rng, new Wager(1, BET_CONFIG)).win,
  },
]

console.log(`Buy-RTP over ${ROUNDS.toLocaleString()} rounds (seed ${SEED}):`)
for (const c of cases) {
  const rtp = rtpOf(c.open, c.cost)
  console.log(
    `  ${c.label.padEnd(14)} cost=${String(c.cost).padStart(4)}  rtp=${(rtp * 100).toFixed(2)}%`,
  )
}
