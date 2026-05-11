import { describe, it, expect } from 'bun:test'
import { signal } from '../signal'

describe('signal', () => {
  it('starts with the initial value', () => {
    const s = signal(42)
    expect(s.value).toBe(42)
  })

  it('set updates the value', () => {
    const s = signal(0)
    s.set(5)
    expect(s.value).toBe(5)
  })

  it('update transforms the value', () => {
    const s = signal(3)
    s.update((v) => v * 2)
    expect(s.value).toBe(6)
  })

  it('notifies subscribers in subscription order', () => {
    const s = signal(0)
    const order: number[] = []
    s.subscribe(() => order.push(1))
    s.subscribe(() => order.push(2))
    s.set(1)
    expect(order).toEqual([1, 2])
  })

  it('unsubscribe stops future notifications', () => {
    const s = signal(0)
    const received: number[] = []
    const unsub = s.subscribe((v) => received.push(v))
    s.set(1)
    unsub()
    s.set(2)
    expect(received).toEqual([1])
  })

  it('unsubscribe is idempotent', () => {
    const s = signal(0)
    const received: number[] = []
    const unsub = s.subscribe((v) => received.push(v))
    unsub()
    expect(() => unsub()).not.toThrow()
    s.set(1)
    expect(received).toHaveLength(0)
  })

  it('does not notify when set to the same value', () => {
    const s = signal(5)
    let callCount = 0
    s.subscribe(() => callCount++)
    s.set(5)
    expect(callCount).toBe(0)
  })

  it('multiple independent signals do not cross-notify', () => {
    const a = signal(0)
    const b = signal(0)
    const aReceived: number[] = []
    const bReceived: number[] = []
    a.subscribe((v) => aReceived.push(v))
    b.subscribe((v) => bReceived.push(v))
    a.set(1)
    expect(aReceived).toEqual([1])
    expect(bReceived).toEqual([])
  })
})
