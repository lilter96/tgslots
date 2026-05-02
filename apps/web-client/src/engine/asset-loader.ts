import { Texture } from 'pixi.js'
import { SYMBOL_SVG } from '../assets/symbols'

const RASTER_SIZE = 256 // px — rasterize SVG at 2× symbol size for crisp display

export class AssetLoader {
  private static _textures = new Map<string, Texture>()

  public static async loadAll(): Promise<void> {
    await Promise.all(Object.entries(SYMBOL_SVG).map(([name, svg]) => this._rasterize(name, svg)))
  }

  private static async _rasterize(name: string, svg: string): Promise<void> {
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
    canvas.width = RASTER_SIZE
    canvas.height = RASTER_SIZE
    canvas.getContext('2d')!.drawImage(img, 0, 0, RASTER_SIZE, RASTER_SIZE)

    this._textures.set(name, Texture.from(canvas))
  }

  public static getTexture(name: string): Texture {
    const texture = this._textures.get(name)
    if (!texture) throw new Error(`Texture not found: ${name}`)
    return texture
  }

  public static getSymbolTexture(id: number, symbolNames: string[]): Texture {
    const name = symbolNames[id]
    if (!name) throw new Error(`Symbol name not found for id: ${id}`)
    return this.getTexture(name)
  }
}
