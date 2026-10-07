import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { Window } from 'happy-dom'
import { Container, Texture, Ticker } from 'pixi.js'
import { gsap } from 'gsap'
import { Reel } from '../reel.js'
import { manifest } from '../../games/le-militare/manifest.js'

const tickerAutoStart = Ticker.shared.autoStart
const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
beforeAll(() => {
  Ticker.shared.autoStart = false
  Object.defineProperty(globalThis, 'document', {
    value: new Window().document,
    configurable: true,
  })
})
afterAll(() => {
  Ticker.shared.autoStart = tickerAutoStart
  if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor)
  else Reflect.deleteProperty(globalThis, 'document')
})

function makeReel(): Reel {
  return new Reel(
    { symbolWidth: 120, symbolHeight: 120, visibleSymbols: 5, totalSymbols: 5 },
    [1, 0, 3, 4, 5],
    {
      manifest,
      getSymbolTexture: () => Texture.EMPTY,
      getSymbolTextureSafe: () => Texture.EMPTY,
      getTexture: () => Texture.EMPTY,
      hasSymbol: () => true,
    },
    12,
  )
}

describe('reel multiplier ownership', () => {
  it('destroys the intercepted-plane badge and its pulse before the next spin', async () => {
    const reel = makeReel()
    const cell = reel.getSymbolAt(1)!
    const badge = new Container()
    cell.multiplierContainer.addChild(badge)
    gsap.to(badge, { alpha: 0.3, duration: 0.4, repeat: -1, yoyo: true })
    gsap.to(badge.scale, { x: 1.1, duration: 0.4, repeat: -1, yoyo: true })
    await reel.spin()
    expect(cell.multiplierContainer.children).toHaveLength(0)
    expect(badge.destroyed).toBe(true)
    expect(gsap.getTweensOf(badge)).toHaveLength(0)
    expect(gsap.getTweensOf(badge.scale)).toHaveLength(0)
    reel.destroy({ children: true })
  })

  it('preserves the badge when synchronizing the same result between combat and cascade', () => {
    const reel = makeReel()
    const badge = new Container()
    reel.getSymbolAt(1)!.multiplierContainer.addChild(badge)
    reel.setSymbols([1, 0, 3, 4, 5])
    expect(reel.getSymbolAt(1)!.multiplierContainer.children).toEqual([badge])
    expect(badge.destroyed).toBe(false)
    reel.destroy({ children: true })
  })

  it('moves a surviving badge with gravity and destroys a consumed badge', async () => {
    const reel = makeReel()
    const survivor = new Container()
    const consumed = new Container()
    reel.getSymbolAt(1)!.multiplierContainer.addChild(survivor)
    reel.getSymbolAt(3)!.multiplierContainer.addChild(consumed)
    await reel.cascade([3], [2, 1, 0, 3, 5])
    expect(reel.getSymbolAt(2)!.multiplierContainer.children).toEqual([survivor])
    expect(consumed.destroyed).toBe(true)
    expect(reel.getSymbolAt(0)!.multiplierContainer.children).toHaveLength(0)
    reel.destroy({ children: true })
  })
})
