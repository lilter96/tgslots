import { describe, it, expect, mock } from 'bun:test'
import { AssetLoader } from '../asset-loader'

// Mock PixiJS Assets
mock.module('pixi.js', () => {
  const assets: Record<string, any> = {}
  return {
    Assets: {
      add: (bundle: { alias: string; src: string }) => {
        assets[bundle.alias] = { texture: 'mock-texture' }
      },
      load: async (keys: string[]) => {
        // simulate loading
      },
      get: (alias: string) => assets[alias],
    },
    Texture: class {},
  }
})

describe('AssetLoader', () => {
  it('should load and retrieve symbols', async () => {
    await AssetLoader.loadAll()

    // Check if COIN is available
    const coin = AssetLoader.getTexture('COIN')
    expect(coin).toBeDefined()

    // Check if WOMAN is available
    const woman = AssetLoader.getTexture('WOMAN')
    expect(woman).toBeDefined()
  })

  it('should get symbol texture by id', async () => {
    await AssetLoader.loadAll()
    const symbolNames = ['WOMAN', 'COIN']

    const texture = AssetLoader.getSymbolTexture(1, symbolNames)
    expect(texture).toBeDefined()
  })
})
