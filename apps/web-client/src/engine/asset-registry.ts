import { Texture } from 'pixi.js'
import type { GameManifest, AssetManifest } from '@tgslots/shared-contracts'

export interface GameAssets {
  getSymbolTexture(symbolId: number): Texture
  getTexture(name: string): Texture
}

export class AssetRegistry {
  private readonly _store = new Map<string, Map<string, Texture>>()

  async loadGame(manifest: GameManifest, assets: AssetManifest): Promise<GameAssets> {
    const { gameId } = manifest
    if (this._store.has(gameId)) this.unloadGame(gameId)

    const textures = new Map<string, Texture>()
    this._store.set(gameId, textures)

    const jobs: Promise<void>[] = []

    for (const [name, svg] of Object.entries(assets.symbols)) {
      jobs.push(
        this._rasterize(name, svg, manifest.symbolSize, manifest.symbolSize).then((t) => {
          textures.set(name, t)
        }),
      )
    }

    for (const [name, env] of Object.entries(assets.env)) {
      jobs.push(
        this._rasterize(name, env.svg, env.width, env.height).then((t) => {
          textures.set(name, t)
        }),
      )
    }

    await Promise.all(jobs)

    return this._makeAccessor(manifest, textures)
  }

  unloadGame(gameId: string): void {
    const textures = this._store.get(gameId)
    if (!textures) return
    for (const texture of textures.values()) texture.destroy(true)
    this._store.delete(gameId)
  }

  private _makeAccessor(manifest: GameManifest, textures: Map<string, Texture>): GameAssets {
    return {
      getSymbolTexture(symbolId: number): Texture {
        const meta = manifest.symbols[symbolId]
        if (!meta) throw new Error(`Symbol id ${symbolId} not in manifest`)
        const texture = textures.get(meta.name)
        if (!texture) throw new Error(`Texture not loaded for symbol: ${meta.name}`)
        return texture
      },
      getTexture(name: string): Texture {
        const texture = textures.get(name)
        if (!texture) throw new Error(`Texture not found: ${name}`)
        return texture
      },
    }
  }

  private async _rasterize(name: string, svg: string, w: number, h: number): Promise<Texture> {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.src = url
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`SVG load failed: ${name}`))
    })
    URL.revokeObjectURL(url)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

    // Pass the HTMLCanvasElement directly — DOM-element uploads avoid the
    // deprecated alpha-premult / y-flip WebGL warnings produced by ImageBitmap.
    return Texture.from(canvas)
  }
}
