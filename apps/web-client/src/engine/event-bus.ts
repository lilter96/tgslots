import type { Unsubscribe } from './signal.js'

export interface GameEventMap {
  'win:awarded': { amount: number; multiplierX: number }
  'feature:enter': { type: string }
  'feature:exit': { type: string }
  'balance:changed': { balance: number }
  'free-spins:updated': { remaining: number; awarded?: number }
  'pick-card-selected': { index: number }
  'error:api': { message: string }
}

export type GameEventType = keyof GameEventMap

export class GameEventBus {
  private readonly _listeners = new Map<
    string,
    Set<(payload: GameEventMap[GameEventType]) => void>
  >()

  on<K extends GameEventType>(event: K, fn: (payload: GameEventMap[K]) => void): Unsubscribe {
    let set = this._listeners.get(event)
    if (!set) {
      set = new Set()
      this._listeners.set(event, set)
    }
    set.add(fn as (payload: GameEventMap[GameEventType]) => void)
    return () => set!.delete(fn as (payload: GameEventMap[GameEventType]) => void)
  }

  emit<K extends GameEventType>(event: K, payload: GameEventMap[K]): void {
    const set = this._listeners.get(event)
    if (!set) return
    for (const fn of set) fn(payload)
  }

  clearAll(): void {
    this._listeners.clear()
  }
}
