import { Texture } from 'pixi.js'
import { ENVIRONMENT_SVG, SYMBOL_SVG } from '../assets/symbols'

const SYMBOL_SIZE = 256

const ENV_SIZES: Record<string, [number, number]> = {
  BG: [780, 1384],
  FRAME: [780, 680],
  WIN_SMALL: [800, 200],
  WIN_BIG: [800, 260],
  WIN_MEGA: [800, 360],
  ANNOUNCE_BONUS: [800, 200],
  ANNOUNCE_FREE: [800, 200],
}

export class AssetLoader {
  private static _textures = new Map<string, Texture>()

  public static async loadAll(): Promise<void> {
    const symbolJobs = Object.entries(SYMBOL_SVG).map(([name, svg]) =>
      this._rasterize(name, svg, SYMBOL_SIZE, SYMBOL_SIZE),
    )
    const envJobs = Object.entries(ENVIRONMENT_SVG).map(([name, svg]) => {
      const [w, h] = ENV_SIZES[name] ?? [512, 512]
      return this._rasterize(name, svg, w, h)
    })
    await Promise.all([...symbolJobs, ...envJobs])
  }

  private static async _rasterize(name: string, svg: string, w: number, h: number): Promise<void> {
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

    // createImageBitmap gives PixiJS v8 a GPU-ready resource, avoiding the
    // deprecated alpha-premult/y-flip texImage2D path used for raw canvas uploads.
    const bitmap = await createImageBitmap(canvas)
    this._textures.set(name, Texture.from(bitmap))
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
