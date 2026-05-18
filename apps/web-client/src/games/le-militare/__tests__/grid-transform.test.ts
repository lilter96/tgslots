import { describe, expect, it } from 'bun:test'
import { transposeGrid, decodePosition } from '../helpers/grid-transform.js'

describe('transposeGrid', () => {
  it('converts row-major to column-major', () => {
    const rowMajor = [
      [1, 2, 3],
      [4, 5, 6],
    ]
    expect(transposeGrid(rowMajor)).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ])
  })

  it('handles single row', () => {
    expect(transposeGrid([[10, 20]])).toEqual([[10], [20]])
  })

  it('handles single column', () => {
    expect(transposeGrid([[7], [8], [9]])).toEqual([[7, 8, 9]])
  })

  it('returns empty array for empty input', () => {
    expect(transposeGrid([])).toEqual([])
  })

  it('is its own inverse on square grids', () => {
    const grid = [
      [1, 2],
      [3, 4],
    ]
    expect(transposeGrid(transposeGrid(grid))).toEqual(grid)
  })
})

describe('decodePosition', () => {
  it('decodes reel and row for a 5-row grid', () => {
    expect(decodePosition(0, 5)).toEqual({ reel: 0, row: 0 })
    expect(decodePosition(4, 5)).toEqual({ reel: 0, row: 4 })
    expect(decodePosition(5, 5)).toEqual({ reel: 1, row: 0 })
    expect(decodePosition(7, 5)).toEqual({ reel: 1, row: 2 })
    expect(decodePosition(29, 5)).toEqual({ reel: 5, row: 4 })
  })

  it('decodes correctly for a 3-row grid', () => {
    expect(decodePosition(6, 3)).toEqual({ reel: 2, row: 0 })
    expect(decodePosition(8, 3)).toEqual({ reel: 2, row: 2 })
  })
})
