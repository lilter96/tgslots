import { describe, expect, it } from 'bun:test'
import { GameEventBus } from '../event-bus.js'

describe('GameEventBus error handling', () => {
  it('emit continues to subsequent listeners when one throws', () => {
    const bus = new GameEventBus()
    let secondFired = false

    bus.on('win:awarded', () => {
      throw new Error('listener 1 crash')
    })
    bus.on('win:awarded', () => {
      secondFired = true
    })

    // Should not throw
    expect(() => {
      bus.emit('win:awarded', { amount: 100, multiplierX: 2 })
    }).not.toThrow()

    expect(secondFired).toBe(true)
  })

  it('emit does not throw when there are no listeners', () => {
    const bus = new GameEventBus()
    expect(() => {
      bus.emit('win:awarded', { amount: 50, multiplierX: 1 })
    }).not.toThrow()
  })

  it('on returns an unsubscribe function that removes the listener', () => {
    const bus = new GameEventBus()
    let count = 0
    const unsub = bus.on('balance:changed', () => {
      count++
    })

    bus.emit('balance:changed', { balance: 100 })
    expect(count).toBe(1)

    unsub()
    bus.emit('balance:changed', { balance: 200 })
    expect(count).toBe(1)
  })
})
