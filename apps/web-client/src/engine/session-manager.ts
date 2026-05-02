export class SessionManager {
  private _balance: number
  private _betMultiplier: number = 1
  private _lastWin: number = 0

  constructor(initialBalance: number) {
    this._balance = initialBalance
  }

  get balance(): number {
    return this._balance
  }

  get betMultiplier(): number {
    return this._betMultiplier
  }

  get lastWin(): number {
    return this._lastWin
  }

  public setBetMultiplier(multiplier: number) {
    if (multiplier < 1) return
    this._betMultiplier = multiplier
  }

  public deductWager(amount: number): boolean {
    if (this._balance < amount) return false
    this._balance = this._balance - amount
    return true
  }

  public addWin(amount: number) {
    this._balance = this._balance + amount
    this._lastWin = amount
  }
}
