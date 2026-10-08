/** Sum authoritative credit prizes exactly once; no randomness or wager rounding. */
export function collectCashPrizes(prizes: readonly { value: number }[], multiplier = 1): number {
  if (!Number.isSafeInteger(multiplier) || multiplier < 1)
    throw new Error('Invalid collector multiplier')
  let total = 0
  for (const prize of prizes) {
    if (!Number.isSafeInteger(prize.value) || prize.value < 0) throw new Error('Invalid cash prize')
    total += prize.value * multiplier
  }
  if (!Number.isSafeInteger(total)) throw new Error('Cash prize overflow')
  return total
}
