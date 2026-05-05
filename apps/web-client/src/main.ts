import { Application, Graphics, Sprite } from 'pixi.js'
import { AssetLoader } from './engine/asset-loader'
import { GameStateMachine } from './engine/state-machine'
import { ReelSet } from './engine/reel-set'
import { SessionManager } from './engine/session-manager'
import { GameController } from './engine/game-controller'
import { HUD } from './engine/hud'
import { PickBonusUI } from './engine/pick-bonus-ui'
import { WinOverlay } from './engine/win-overlay'
import { AutoSpinPanel } from './engine/auto-spin-panel'
import { GameUIState } from './types'
import type { AutoSpinConfig } from './types'
import {
  getResponsiveLayout,
  REEL_NATURAL_HEIGHT,
  REEL_NATURAL_WIDTH,
} from './engine/layout'
import { SYM_NAMES } from '@tgslots/woodland-whisper'
const FRAME_PAD = 4

async function init() {
  const app = new Application()
  await app.init({
    background: '#060e04',
    resizeTo: window,
    antialias: true,
  })
  document.getElementById('game-container')?.appendChild(app.canvas)

  await AssetLoader.loadAll()

  // ── Background sprite ───────────────────────────────────────────────────
  const bgTex = AssetLoader.getTexture('BG')
  const bgSprite = new Sprite(bgTex)
  bgSprite.anchor.set(0.5)
  app.stage.addChild(bgSprite)

  const fsm = new GameStateMachine()
  const session = new SessionManager(10000)

  const gridConfig = { reels: 5, rows: 3, reelSpacing: 20 }
  const reelConfig = { symbolWidth: 140, symbolHeight: 140, visibleSymbols: 3, totalSymbols: 5 }

  // Initial grid will be fetched from server in controller.init()
  const emptyGrid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0))

  const reelSet = new ReelSet(gridConfig, reelConfig, emptyGrid, [...SYM_NAMES])

  const mask = new Graphics()
  app.stage.addChild(mask)
  reelSet.mask = mask
  app.stage.addChild(reelSet)

  const frame = new Graphics()
  app.stage.addChild(frame)

  const controller = new GameController(fsm, reelSet, session)

  const pickUI = new PickBonusUI()
  app.stage.addChild(pickUI)
  controller.setPickUI(pickUI)

  const overlay = new WinOverlay()
  app.stage.addChild(overlay)
  controller.setOverlay(overlay)

  const hud = new HUD(session, fsm)
  app.stage.addChild(hud)

  controller.addFreeSpinsStatusListener((status) => {
    hud.syncFreeSpinsStatus(status)
  })

  const autoSpinPanel = new AutoSpinPanel()
  app.stage.addChild(autoSpinPanel)

  // ── Bootstrap ───────────────────────────────────────────────────────────

  await controller.init()

  // ── Layout ──────────────────────────────────────────────────────────────

  function doLayout(W: number, H: number) {
    const layout = getResponsiveLayout(W, H)

    // Background — cover the canvas
    const bgScale = Math.max(W / bgTex.width, H / bgTex.height)
    bgSprite.scale.set(bgScale)
    bgSprite.x = W / 2
    bgSprite.y = H / 2

    // Reel set — fit into the shared gameplay area
    const reelScale = layout.reelBounds.width / REEL_NATURAL_WIDTH

    reelSet.scale.set(reelScale)
    reelSet.x = layout.reelBounds.x
    reelSet.y = layout.reelBounds.y

    // Mask — match the scaled reel-set footprint
    mask.clear()
    mask.rect(reelSet.x, reelSet.y, layout.reelBounds.width, layout.reelBounds.height)
    mask.fill(0xffffff)

    // Frame — outer border + column/row separators in screen coordinates
    frame.clear()

    frame.rect(
      reelSet.x - FRAME_PAD,
      reelSet.y - FRAME_PAD,
      layout.reelBounds.width + FRAME_PAD * 2,
      layout.reelBounds.height + FRAME_PAD * 2,
    )
    frame.stroke({ color: 0xd4a017, width: 4, alpha: 1 })

    for (let col = 1; col < gridConfig.reels; col++) {
      const sepX =
        reelSet.x +
        (col * (reelConfig.symbolWidth + gridConfig.reelSpacing) - gridConfig.reelSpacing / 2) *
          reelScale
      frame.moveTo(sepX, reelSet.y)
      frame.lineTo(sepX, reelSet.y + layout.reelBounds.height)
    }
    frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

    for (let row = 1; row < reelConfig.visibleSymbols; row++) {
      const sepY = reelSet.y + row * reelConfig.symbolHeight * reelScale
      frame.moveTo(reelSet.x, sepY)
      frame.lineTo(reelSet.x + layout.reelBounds.width, sepY)
    }
    frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

    hud.resize(layout)
    pickUI.resize(layout)
    overlay.resize(layout)
    autoSpinPanel.resize(layout)
  }

  doLayout(app.screen.width, app.screen.height)
  app.renderer.on('resize', (W: number, H: number) => doLayout(W, H))

  // ── Event wiring ──────────────────────────────────────────────────────────

  hud.on('spin', () => controller.spin().catch(console.error))
  hud.on('buyBonus', () => controller.buyBonus().catch(console.error))

  hud.on('autoSpin', () => autoSpinPanel.show())

  hud.on('stopAutoSpin', () => {
    controller.stopAutoSpin()
    hud.syncAutoSpin(false, 0)
  })

  autoSpinPanel.on('start', (config: AutoSpinConfig) => {
    controller.startAutoSpin(config)
    hud.syncAutoSpin(true, controller.autoSpinRemaining)
  })

  fsm.addListener((state) => {
    if (state === GameUIState.IDLE) {
      hud.syncAutoSpin(controller.isAutoSpin, controller.autoSpinRemaining)
    }
  })

  console.log('Game initialized.')
}

init().catch(console.error)
