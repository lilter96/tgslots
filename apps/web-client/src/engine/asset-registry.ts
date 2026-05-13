import { Texture, Assets } from 'pixi.js'
import { sound } from '@pixi/sound'
import type { GameManifest, AssetManifest } from '@tgslots/shared-contracts'

export interface GameAssets {
  readonly manifest: GameManifest // Access to symbol logic, paylines, etc.
  getSymbolTexture(symbolId: number): Texture
  getTexture(name: string): Texture
  rasterizeSvg(name: string, svg: string, w: number, h: number): Promise<Texture>
}

export class AssetRegistry {
  private readonly _textures = new Map<string, Map<string, Texture>>()
  private readonly _manifests = new Map<string, GameManifest>()

  // Trackers for cleanup
  private readonly _soundKeys = new Map<string, string[]>()

  async loadGame(manifest: GameManifest, assets: AssetManifest): Promise<GameAssets> {
    const { gameId } = manifest

    // 1. Prevent memory leaks from double-loading
    if (this._manifests.has(gameId)) this.unloadGame(gameId)

    this._manifests.set(gameId, manifest)
    const textures = new Map<string, Texture>()
    this._textures.set(gameId, textures)

    const soundKeys: string[] = []
    this._soundKeys.set(gameId, soundKeys)

    // 2. Register PNG/JPG assets as a Pixi Bundle
    // This is the "Proper" v8 way. It lets Pixi optimize the loading queue.
    const bundleAssets = Object.entries(assets.images || {}).map(([alias, src]) => ({
      alias,
      src,
    }))

    Assets.addBundle(gameId, bundleAssets)

    // 3. Start Loading Jobs
    const jobs: Promise<void>[] = []

    // Job: Load PNG Bundle
    jobs.push(
      Assets.loadBundle(gameId).then((loadedAssets) => {
        for (const [alias, texture] of Object.entries(loadedAssets)) {
          const t = texture as Texture
          t.source.autoGenerateMipmaps = true
          t.source.scaleMode = 'linear'
          textures.set(alias, t)
        }
      }),
    )

    // Job: Rasterize Symbol SVGs
    for (const [name, svg] of Object.entries(assets.symbols)) {
      jobs.push(
        this.rasterizeSvg(name, svg, manifest.symbolSize, manifest.symbolSize).then((t) => {
          textures.set(name, t)
        }),
      )
    }

    // Job: Rasterize Environment SVGs
    for (const [name, env] of Object.entries(assets.env)) {
      jobs.push(
        this.rasterizeSvg(name, env.svg, env.width, env.height).then((t) => {
          textures.set(name, t)
        }),
      )
    }

    // Job: Audio (Parallel)
    if (assets.audio) {
      for (const [name, url] of Object.entries(assets.audio)) {
        if (!sound.exists(name)) {
          sound.add(name, url)
          soundKeys.push(name)
        }
      }
    }

    await Promise.all(jobs)
    return this._makeAccessor(gameId)
  }

  /**
   * High-Quality Rasterizer (as perfected in previous steps)
   */
  async rasterizeSvg(name: string, svg: string, w: number, h: number): Promise<Texture> {
    const dpr = window.devicePixelRatio || 1
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.width = w * dpr
    img.height = h * dpr
    img.src = url

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error(`SVG load failed: ${name}`))
      })
    } finally {
      URL.revokeObjectURL(url)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w * dpr, h * dpr)

    const texture = Texture.from(canvas)
    texture.source.resolution = dpr
    texture.source.autoGenerateMipmaps = true
    return texture
  }

  unloadGame(gameId: string): void {
    // 1. Unload Pixi Bundle (PNGs/JPGs)
    Assets.unloadBundle(gameId)

    // 2. Destroy SVG Textures (Manual)
    const textures = this._textures.get(gameId)
    if (textures) {
      for (const [, texture] of textures.entries()) {
        // Only destroy if it WASN'T loaded via the bundle (managed by Pixi)
        // We know our SVGs aren't in the bundle because we didn't add them to Assets.addBundle
        if (!Assets.cache.has(texture.source)) {
          texture.destroy(true)
        }
      }
      this._textures.delete(gameId)
    }

    // 3. Clear Sounds
    const sounds = this._soundKeys.get(gameId)
    sounds?.forEach((k) => sound.remove(k))
    this._soundKeys.delete(gameId)

    // 4. Clear Manifest
    this._manifests.delete(gameId)
  }

  private _makeAccessor(gameId: string): GameAssets {
    const manifest = this._manifests.get(gameId)!
    const textures = this._textures.get(gameId)!
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const registry = this

    return {
      manifest, // Now the UI can read manifest.reels, manifest.paylines, etc.

      getSymbolTexture(symbolId: number): Texture {
        const meta = manifest.symbols[symbolId]
        if (!meta) throw new Error(`Symbol ${symbolId} missing in manifest`)
        const t = textures.get(meta.name)
        if (!t) throw new Error(`Texture missing: ${meta.name}`)
        return t
      },

      getTexture(name: string): Texture {
        const t = textures.get(name)
        if (!t) throw new Error(`Texture missing: ${name}`)
        return t
      },

      rasterizeSvg(name, svg, w, h) {
        return registry.rasterizeSvg(name, svg, w, h)
      },
    }
  }
}
