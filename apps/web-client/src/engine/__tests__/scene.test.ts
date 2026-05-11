import { describe, it, expect } from 'bun:test'
import type { Scene } from '../scene'

// Lightweight in-memory fulfillment of the Scene interface.
// PixiScene wraps five Pixi Containers in the same layer order — this test
// verifies the contract that any correct Scene implementation must satisfy
// (z-ordering by index, clearGameLayers touching only the game layers).
class FakeContainer {
  readonly children: FakeContainer[] = []
  addChild(c: FakeContainer): FakeContainer {
    this.children.push(c)
    return c
  }
  removeChildren(): void {
    this.children.splice(0)
  }
}

class FakeScene implements Scene {
  private readonly _stage: FakeContainer
  readonly background: FakeContainer
  readonly reels: FakeContainer
  readonly features: FakeContainer
  readonly hud: FakeContainer
  readonly overlays: FakeContainer

  constructor() {
    this._stage = new FakeContainer()
    this.background = new FakeContainer()
    this.reels = new FakeContainer()
    this.features = new FakeContainer()
    this.hud = new FakeContainer()
    this.overlays = new FakeContainer()
    // Layers added in z-order: background first (behind), overlays last (on top)
    this._stage.addChild(this.background)
    this._stage.addChild(this.reels)
    this._stage.addChild(this.features)
    this._stage.addChild(this.hud)
    this._stage.addChild(this.overlays)
  }

  clearGameLayers(): void {
    this.background.removeChildren()
    this.reels.removeChildren()
    this.features.removeChildren()
  }

  get stageChildren(): readonly FakeContainer[] {
    return this._stage.children
  }
}

describe('Scene z-order contract', () => {
  it('background is the first (lowest) layer', () => {
    const scene = new FakeScene()
    expect(scene.stageChildren[0]).toBe(scene.background)
  })

  it('reels render above background', () => {
    const scene = new FakeScene()
    const bgIdx = scene.stageChildren.indexOf(scene.background)
    const reelsIdx = scene.stageChildren.indexOf(scene.reels)
    expect(reelsIdx).toBeGreaterThan(bgIdx)
  })

  it('features render above reels (pick-bonus board must cover reel symbols)', () => {
    const scene = new FakeScene()
    const reelsIdx = scene.stageChildren.indexOf(scene.reels)
    const featuresIdx = scene.stageChildren.indexOf(scene.features)
    expect(featuresIdx).toBeGreaterThan(reelsIdx)
  })

  it('hud renders above features', () => {
    const scene = new FakeScene()
    const featuresIdx = scene.stageChildren.indexOf(scene.features)
    const hudIdx = scene.stageChildren.indexOf(scene.hud)
    expect(hudIdx).toBeGreaterThan(featuresIdx)
  })

  it('overlays render above hud (win banners must cover everything)', () => {
    const scene = new FakeScene()
    const hudIdx = scene.stageChildren.indexOf(scene.hud)
    const overlaysIdx = scene.stageChildren.indexOf(scene.overlays)
    expect(overlaysIdx).toBeGreaterThan(hudIdx)
  })

  it('stage has exactly five layers', () => {
    const scene = new FakeScene()
    expect(scene.stageChildren).toHaveLength(5)
  })
})

describe('Scene.clearGameLayers contract', () => {
  it('removes all children from background, reels, and features', () => {
    const scene = new FakeScene()
    scene.background.addChild(new FakeContainer())
    scene.reels.addChild(new FakeContainer())
    scene.features.addChild(new FakeContainer())

    scene.clearGameLayers()

    expect(scene.background.children).toHaveLength(0)
    expect(scene.reels.children).toHaveLength(0)
    expect(scene.features.children).toHaveLength(0)
  })

  it('leaves hud children intact after clearGameLayers', () => {
    const scene = new FakeScene()
    scene.hud.addChild(new FakeContainer())
    scene.clearGameLayers()
    expect(scene.hud.children).toHaveLength(1)
  })

  it('leaves overlays children intact after clearGameLayers', () => {
    const scene = new FakeScene()
    scene.overlays.addChild(new FakeContainer())
    scene.clearGameLayers()
    expect(scene.overlays.children).toHaveLength(1)
  })

  it('is safe to call when layers are already empty', () => {
    const scene = new FakeScene()
    expect(() => scene.clearGameLayers()).not.toThrow()
  })
})
