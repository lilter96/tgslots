/** Deterministic Hold & Spin mechanics. Games supply sampled arrivals and prize values. */
export interface HeldPrize {
  position: number
  value: number
}
export interface HoldSpinRules {
  columns: number
  rows: number
  respins: number
}
export interface HoldSpinState<TPrize extends HeldPrize> {
  coins: TPrize[]
  respins: number
}
export interface ColumnBoostState {
  boostedColumns: number[]
  pendingColumns: number[]
  boostPulls: number
}
export interface ColumnBoostOperation {
  mode: 'bank' | 'add' | 'multiply'
  amount: number
  finish?: boolean
}

function validateRules(rules: HoldSpinRules): void {
  if (![rules.columns, rules.rows, rules.respins].every((n) => Number.isSafeInteger(n) && n > 0))
    throw new Error('Hold & Spin dimensions and respins must be positive integers')
}
function validatePrizes<T extends HeldPrize>(coins: readonly T[], rules: HoldSpinRules): void {
  const positions = new Set<number>()
  for (const coin of coins) {
    if (
      !Number.isSafeInteger(coin.position) ||
      coin.position < 0 ||
      coin.position >= rules.columns * rules.rows ||
      !Number.isSafeInteger(coin.value) ||
      coin.value <= 0 ||
      positions.has(coin.position)
    )
      throw new Error('Invalid or duplicate held prize')
    positions.add(coin.position)
  }
}
export function enterHoldSpin<T extends HeldPrize>(
  coins: readonly T[],
  rules: HoldSpinRules,
): HoldSpinState<T> {
  validateRules(rules)
  validatePrizes(coins, rules)
  return { coins: structuredClone([...coins]), respins: rules.respins }
}
export function advanceHoldSpin<T extends HeldPrize>(
  state: HoldSpinState<T>,
  arrivals: readonly T[],
  rules: HoldSpinRules,
): HoldSpinState<T> {
  validateRules(rules)
  if (isHoldSpinComplete(state, rules)) throw new Error('Hold & Spin is complete')
  const coins = [...state.coins, ...arrivals]
  validatePrizes(coins, rules)
  return {
    coins: structuredClone(coins),
    respins: arrivals.length ? rules.respins : state.respins - 1,
  }
}
export function isHoldSpinComplete<T extends HeldPrize>(
  state: HoldSpinState<T>,
  rules: HoldSpinRules,
): boolean {
  return state.respins <= 0 || state.coins.length === rules.columns * rules.rows
}
export function collectHeldPrizes<T extends HeldPrize>(state: HoldSpinState<T>): number {
  const value = state.coins.reduce((sum, coin) => sum + coin.value, 0)
  if (!Number.isSafeInteger(value)) throw new Error('Held prize total exceeds safe integer range')
  return value
}
export function queueColumnBoosts<
  T extends HeldPrize,
  S extends HoldSpinState<T> & ColumnBoostState,
>(state: S, rules: HoldSpinRules): S {
  const next = structuredClone(state)
  for (let column = 0; column < rules.columns; column++) {
    const full =
      next.coins.filter((coin) => Math.floor(coin.position / rules.rows) === column).length ===
      rules.rows
    if (full && !next.boostedColumns.includes(column)) {
      next.boostedColumns.push(column)
      next.pendingColumns.push(column)
    }
  }
  return next
}
export function advanceColumnBoost<
  T extends HeldPrize,
  S extends HoldSpinState<T> & ColumnBoostState,
>(
  state: S,
  rules: HoldSpinRules,
  operation: ColumnBoostOperation,
  maxPulls: number,
): { state: S; column: number; finished: boolean } {
  if (
    !Number.isSafeInteger(maxPulls) ||
    maxPulls <= 0 ||
    !Number.isSafeInteger(operation.amount) ||
    operation.amount < 0 ||
    (operation.mode === 'multiply' && operation.amount === 0)
  )
    throw new Error('Invalid column boost')
  const column = state.pendingColumns[0]
  if (column === undefined) throw new Error('No pending column boost')
  const next = structuredClone(state)
  const prizes = next.coins.filter((coin) => Math.floor(coin.position / rules.rows) === column)
  if (prizes.length !== rules.rows) throw new Error('Column boost requires a full column')
  for (const coin of prizes) {
    if (operation.mode === 'add') coin.value += operation.amount
    if (operation.mode === 'multiply') coin.value *= operation.amount
  }
  validatePrizes(next.coins, rules)
  next.boostPulls++
  const finished = operation.mode === 'bank' || !!operation.finish || next.boostPulls >= maxPulls
  if (finished) {
    next.pendingColumns.shift()
    next.boostPulls = 0
  }
  return { state: next, column, finished }
}
