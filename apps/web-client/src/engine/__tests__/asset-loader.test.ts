import { describe, it, expect, mock } from 'bun:test'

mock.module('pixi.js', () => ({
  Texture: {
    from: (_canvas: unknown) => ({ width: 256, height: 256, label: 'mock-texture' }),
  },
}))

// Must import after mock.module so the mock is already registered
const { AssetLoader } = await import('../asset-loader')

// Stub browser APIs absent in Bun's runtime
const g = global as Record<string, unknown>

g.Blob = class {
  constructor(
    public parts: unknown[],
    public opts: unknown,
  ) {}
}

g.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} }

class MockImage {
  onload?: () => void
  private _src = ''
  get src() {
    return this._src
  }
  set src(_v: string) {
    this._src = _v
    setTimeout(() => this.onload?.(), 0)
  }
}
g.Image = MockImage

class MockCanvas {
  width = 0
  height = 0
  getContext() {
    return { drawImage: () => {} }
  }
}
g.document = { createElement: (tag: string) => (tag === 'canvas' ? new MockCanvas() : null) }

g.createImageBitmap = async (_canvas: unknown) => ({ width: 0, height: 0 })

describe('AssetLoader', () => {
  it('loadAll resolves and symbol textures are retrievable', async () => {
    await AssetLoader.loadAll()
    expect(AssetLoader.getTexture('COIN')).toBeDefined()
    expect(AssetLoader.getTexture('WOMAN')).toBeDefined()
    expect(AssetLoader.getTexture('REPLACEMENT')).toBeDefined()
  })

  it('getSymbolTexture retrieves by numeric id', async () => {
    await AssetLoader.loadAll()
    const names = ['WOMAN', 'COIN']
    expect(AssetLoader.getSymbolTexture(0, names)).toBeDefined()
    expect(AssetLoader.getSymbolTexture(1, names)).toBeDefined()
  })

  it('environment textures are retrievable after loadAll', async () => {
    await AssetLoader.loadAll()
    for (const key of [
      'BG',
      'FRAME',
      'WIN_SMALL',
      'WIN_BIG',
      'WIN_MEGA',
      'ANNOUNCE_BONUS',
      'ANNOUNCE_FREE',
    ]) {
      expect(AssetLoader.getTexture(key)).toBeDefined()
    }
  })

  it('getTexture throws for unknown key', () => {
    expect(() => AssetLoader.getTexture('DOES_NOT_EXIST')).toThrow()
  })
})
