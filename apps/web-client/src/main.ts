import { Application, Graphics } from 'pixi.js'
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
import { SYM_NAMES } from '@tgslots/woodland-whisper'

async function init() {
  const app = new Application()
  await app.init({
    background: '#0a2a0a',
    resizeTo: window,
    antialias: true,
  })
  document.getElementById('game-container')?.appendChild(app.canvas)

  await AssetLoader.loadAll()

  const fsm = new GameStateMachine()
  const session = new SessionManager(10000)

  const gridConfig = { reels: 5, rows: 3, reelSpacing: 20 }
  const reelConfig = { symbolWidth: 140, symbolHeight: 140, visibleSymbols: 3, totalSymbols: 5 }

  // Initial display: 5 reels × 5 pooled symbols, excluding REPLACEMENT (last index)
  const initialGrid = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => Math.floor(Math.random() * (SYM_NAMES.length - 1))),
  )

  const reelSet = new ReelSet(gridConfig, reelConfig, initialGrid, [...SYM_NAMES])
  const totalWidth =
    gridConfig.reels * reelConfig.symbolWidth + (gridConfig.reels - 1) * gridConfig.reelSpacing
  const totalHeight = reelConfig.visibleSymbols * reelConfig.symbolHeight
  reelSet.x = (app.screen.width - totalWidth) / 2
  reelSet.y = (app.screen.height - totalHeight) / 2

  const mask = new Graphics()
  mask.rect(reelSet.x, reelSet.y, totalWidth, totalHeight)
  mask.fill(0xffffff)
  app.stage.addChild(mask)
  reelSet.mask = mask
  app.stage.addChild(reelSet)

  const controller = new GameController(fsm, reelSet, session)

  const pickUI = new PickBonusUI()
  pickUI.x = app.screen.width / 2
  pickUI.y = app.screen.height / 2
  app.stage.addChild(pickUI)
  controller.setPickUI(pickUI)

  const overlay = new WinOverlay()
  overlay.x = app.screen.width / 2
  overlay.y = app.screen.height / 2
  app.stage.addChild(overlay)
  controller.setOverlay(overlay)

  const hud = new HUD(session, fsm)
  app.stage.addChild(hud)

  const autoSpinPanel = new AutoSpinPanel()
  autoSpinPanel.x = app.screen.width / 2
  autoSpinPanel.y = app.screen.height / 2
  app.stage.addChild(autoSpinPanel)

  // ── Event wiring ──────────────────────────────────────────────────────────

  hud.on('spin', () => controller.spin().catch(console.error))

  // Open the configuration panel (only fires when auto-spin is not active)
  hud.on('autoSpin', () => autoSpinPanel.show())

  // Cancel from the HUD button (fires when auto-spin is active)
  hud.on('stopAutoSpin', () => {
    controller.stopAutoSpin()
    hud.syncAutoSpin(false, 0)
  })

  // User confirmed config in the panel
  autoSpinPanel.on('start', (config: AutoSpinConfig) => {
    controller.startAutoSpin(config)
    hud.syncAutoSpin(true, controller.autoSpinRemaining)
  })

  // Keep HUD button in sync whenever the FSM returns to IDLE.
  // The controller decrements / clears _autoSpinState before transitioning to IDLE,
  // so reading isAutoSpin / autoSpinRemaining here always reflects the new state.
  fsm.addListener((state) => {
    if (state === GameUIState.FEATURE_TRANSITION || state === GameUIState.SPINNING) {
      app.renderer.background.color = controller.isFreeSpins ? 0x2a0a0a : 0x0a2a0a
    }
    if (state === GameUIState.IDLE) {
      hud.syncAutoSpin(controller.isAutoSpin, controller.autoSpinRemaining)
    }
  })

  console.log('Game initialized.')
}

init().catch(console.error)
