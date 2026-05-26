import { describe, expect, it } from 'bun:test'
import { ProjectedGrid, createGrid } from '../spin-grid/spin-grid.js'

describe('ProjectedGrid', () => {
  const strips = [new Uint8Array([10, 20, 30, 40, 50])]
  const positions = [1]
  const rowCount = 3
  const reelCount = 1

  it('projects a single row correctly', () => {
    const grid = new ProjectedGrid(strips, positions, rowCount, reelCount)
    expect(grid.getSymbol(0, 0)).toBe(20)
    expect(grid.getSymbol(0, 1)).toBe(30)
    expect(grid.getSymbol(0, 2)).toBe(40)
  })

  it('returns 0 for out-of-bounds reel', () => {
    const grid = new ProjectedGrid(strips, positions, rowCount, reelCount)
    expect(grid.getSymbol(1, 0)).toBe(0)
  })

  it('returns 0 for out-of-bounds row', () => {
    const grid = new ProjectedGrid(strips, positions, rowCount, reelCount)
    expect(grid.getSymbol(0, 999)).toBe(0)
  })

  it('getMultiplier always returns 1', () => {
    const grid = new ProjectedGrid(strips, positions, rowCount, reelCount)
    expect(grid.getMultiplier(0, 0)).toBe(1)
    expect(grid.getMultiplier(99, 99)).toBe(1)
  })

  it('has correct reelCount and rowCount', () => {
    const grid = new ProjectedGrid(strips, positions, rowCount, reelCount)
    expect(grid.reelCount).toBe(reelCount)
    expect(grid.rowCount).toBe(rowCount)
  })

  it('defaults reelCount to 5', () => {
    const fiveStrips = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
      new Uint8Array([7, 8, 9]),
      new Uint8Array([10, 11, 12]),
      new Uint8Array([13, 14, 15]),
    ]
    const grid = new ProjectedGrid(fiveStrips, [0, 0, 0, 0, 0], 1)
    expect(grid.reelCount).toBe(5)
  })

  it('throws when strips length does not match reelCount', () => {
    const strips = [new Uint8Array([1, 2, 3])]
    expect(() => new ProjectedGrid(strips, [0], 1, 5)).toThrow(/strips/)
  })

  it('throws when positions length does not match reelCount', () => {
    const strips = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), new Uint8Array([7, 8, 9])]
    expect(() => new ProjectedGrid(strips, [0], 1, 3)).toThrow(/positions/)
  })
})

describe('createGrid', () => {
  it('creates a ProjectedGrid with default reel count', () => {
    const strips = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
      new Uint8Array([7, 8, 9]),
      new Uint8Array([10, 11, 12]),
      new Uint8Array([13, 14, 15]),
    ]
    const grid = createGrid(strips, [0, 0, 0, 0, 0], 3)
    expect(grid.reelCount).toBe(5)
    expect(grid.rowCount).toBe(3)
    expect(grid.getSymbol(0, 0)).toBe(1)
    expect(grid.getSymbol(4, 2)).toBe(15)
  })

  it('accepts custom reel count', () => {
    const strips = [new Uint8Array([10, 20, 30])]
    const grid = createGrid(strips, [0], 3, 1)
    expect(grid.reelCount).toBe(1)
    expect(grid.getSymbol(0, 0)).toBe(10)
  })
})
