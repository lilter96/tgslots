/** Full-round audit, including every cascade, retrigger and the 15,000× round cap.
 * MODE=assault ROUNDS=20000000 PURCHASES=0 SEED=20261008 bun .../math-audit.ts
 * MODE=assault ROUNDS=0 PURCHASES=500000 SEED=20261009 bun .../math-audit.ts
 * JSON lines go to stdout, so independent mode runs can be collected separately.
 */
import { createLeMilitareTestEngine } from '../src/__tests__/test-engine.js'
import {
  getFeatureBuyCost,
  MAX_CASCADE_STEPS,
  MAX_WIN_MULTIPLIER,
  MODE_IDS,
} from '../src/constants.js'
import type { LeMilitareResult } from '../src/game-state-machine.js'

const rounds = Number(process.env.ROUNDS ?? 1_000_000)
const purchases = Number(process.env.PURCHASES ?? 100_000)
const seed = Number(process.env.SEED ?? 20261008)
for (const count of [rounds, purchases, seed]) {
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error('Counts and seed must be nonnegative safe integers')
}
if (process.env.MODE && !MODE_IDS.some((mode) => mode === process.env.MODE))
  throw new Error('Invalid MODE')

for (const mode of MODE_IDS.filter((id) => !process.env.MODE || id === process.env.MODE)) {
  const engine = createLeMilitareTestEngine(mode)
  const machine = engine.createMachine()
  const wager = engine.wager()
  for (const option of ['natural', 'standard', 'elite', 'super', 'chance', 'airraid'] as const) {
    if (process.env.OPTION && option !== process.env.OPTION) continue
    if (process.env.OPTIONS && !process.env.OPTIONS.split(',').includes(option)) continue
    const count = option === 'natural' ? rounds : purchases
    if (count === 0) continue
    const rng = engine.rng(
      seed + ['natural', 'standard', 'elite', 'super', 'chance', 'airraid'].indexOf(option),
    )
    let total = 0,
      square = 0,
      baseWin = 0,
      freeWin = 0,
      baseHits = 0
    let triggers = 0,
      armedBonuses = 0,
      emptyBonuses = 0,
      freeSpins = 0,
      freeHits = 0
    let retriggers = 0,
      activations = 0,
      interceptions = 0,
      maxSteps = 0,
      capRounds = 0
    let maxRoundWin = 0,
      emptyRounds = 0,
      cascadeWins = 0
    const quantiles: number[] = []
    for (let index = 0; index < count; index++) {
      const entry =
        option === 'natural'
          ? machine.spin(rng, wager)
          : option === 'chance'
            ? machine.buyChanceSpin(rng, wager)
            : option === 'airraid'
              ? machine.buyAirRaidSpin(rng, wager)
              : machine.buyBonus(rng, wager, option)
      let roundWin = entry.win
      baseWin += entry.win
      baseHits += Number(entry.win > 0)
      const triggered = entry.state.freeSpinsLeft > 0
      triggers += Number(triggered)
      const verify = (result: LeMilitareResult): void => {
        if (!Number.isSafeInteger(result.win) || result.win < 0)
          throw new Error(`Invalid payout in ${mode}/${option}/${index}`)
        maxSteps = Math.max(maxSteps, result.steps.length)
        if (result.steps.length >= MAX_CASCADE_STEPS)
          throw new Error(`Cascade safety limit reached in ${mode}/${option}/${index}`)
        cascadeWins += result.steps.filter((step) => step.hits.length > 0).length
      }
      verify(entry)
      let next
      while ((next = machine.next(rng)) !== null) {
        verify(next)
        roundWin += next.win
        freeWin += next.win
        freeSpins++
        freeHits += Number(next.win > 0)
        if (next.type === 'FREE') retriggers += Number(next.retriggered)
        for (const step of next.steps) {
          activations += step.activations.length
          interceptions += step.shootdowns.length
        }
      }
      if (triggered) {
        armedBonuses += Number((machine.state.freeSpins?.armedReels.size ?? 0) > 0)
        emptyBonuses += Number(machine.state.freeSpins?.totalWin === 0)
      }
      if (roundWin > MAX_WIN_MULTIPLIER || roundWin !== machine.state.roundWin)
        throw new Error(`Round accounting mismatch in ${mode}/${option}/${index}`)
      capRounds += Number(roundWin === MAX_WIN_MULTIPLIER)
      maxRoundWin = Math.max(maxRoundWin, roundWin)
      emptyRounds += Number(roundWin === 0)
      total += roundWin
      square += roundWin * roundWin
      if (option !== 'natural') quantiles.push(roundWin)
    }
    const cost =
      option === 'natural' ? wager.totalWager : getFeatureBuyCost(mode, option) * wager.totalWager
    const mean = total / count
    const standardError = Math.sqrt(Math.max(0, square / count - mean * mean) / (count - 1))
    quantiles.sort((a, b) => a - b)
    console.log(
      JSON.stringify({
        mode,
        option,
        seed: seed + ['natural', 'standard', 'elite', 'super', 'chance', 'airraid'].indexOf(option),
        rounds: count,
        cost,
        meanWin: mean,
        rtp: mean / cost,
        rtpConfidence95: [
          (mean - 1.96 * standardError) / cost,
          (mean + 1.96 * standardError) / cost,
        ],
        standardError,
        baseRtp: baseWin / (count * cost),
        freeRtp: freeWin / (count * cost),
        baseHitRate: baseHits / count,
        triggerRate: triggers / count,
        triggerCycle: triggers ? count / triggers : null,
        bonusMean: triggers ? freeWin / triggers : null,
        armedBonusRate: triggers ? armedBonuses / triggers : null,
        emptyBonusRate: triggers ? emptyBonuses / triggers : null,
        emptyRoundRate: emptyRounds / count,
        freeSpinHitRate: freeSpins ? freeHits / freeSpins : null,
        freeSpinsPerBonus: triggers ? freeSpins / triggers : null,
        retriggers,
        activations,
        interceptions,
        maxCascadeSteps: maxSteps,
        cascadeWins,
        capRounds,
        maxRoundWin,
        median: quantiles.length ? quantiles[Math.floor(count * 0.5)] : null,
        p90: quantiles.length ? quantiles[Math.floor(count * 0.9)] : null,
        p99: quantiles.length ? quantiles[Math.floor(count * 0.99)] : null,
      }),
    )
  }
}
