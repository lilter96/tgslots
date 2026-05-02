import { describe, it, expect } from 'bun:test'
import { SessionManager } from '../session-manager'

describe('SessionManager', () => {
  it('should initialize with balance', () => {
    const session = new SessionManager(1000)
    expect(session.balance).toBe(1000)
  })

  it('should deduct wager if balance is enough', () => {
    const session = new SessionManager(1000)
    const success = session.deductWager(100)
    expect(success).toBe(true)
    expect(session.balance).toBe(900)
  })

  it('should not deduct wager if balance is not enough', () => {
    const session = new SessionManager(50)
    const success = session.deductWager(100)
    expect(success).toBe(false)
    expect(session.balance).toBe(50)
  })

  it('should add win', () => {
    const session = new SessionManager(1000)
    session.addWin(500)
    expect(session.balance).toBe(1500)
    expect(session.lastWin).toBe(500)
  })
})
