import { mt19937 } from '@tgslots/math/rng/mt19937'
import { Wager } from '@tgslots/slots-core/betting'
import { BET_CONFIG } from './constants'
import { X7ClubMachine } from './machine'
import type { MathCommand, MathReply } from './types'

/** Pure, seeded command execution. Redelivery has no side effects. */
export function execute(command: MathCommand): MathReply {
  if (
    command.version !== 1 ||
    !Number.isInteger(command.seed) ||
    command.seed < 0 ||
    command.seed > 0xffffffff ||
    !command.requestId ||
    !command.state ||
    !['spin', 'buybonus', 'next'].includes(command.action)
  ) {
    throw new Error('Invalid v1 math command')
  }
  const machine = new X7ClubMachine(command.state)
  const rng = mt19937(command.seed)
  const wager = new Wager(command.multiplier, BET_CONFIG)
  const result =
    command.action === 'spin'
      ? machine.spin(rng, wager)
      : command.action === 'buybonus'
        ? machine.buyBonus(wager)
        : machine.next(rng)
  if (!result) throw new Error('No active bonus')
  return { version: 1, requestId: command.requestId, state: machine.state, result }
}
