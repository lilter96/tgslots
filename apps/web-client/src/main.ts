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
import { SYM_NAMES } from '@tgslots/woodland-whisper'

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
  const bgScale = Math.max(app.screen.width / bgTex.width, app.screen.height / bgTex.height)
  bgSprite.scale.set(bgScale)
  bgSprite.anchor.set(0.5)
  bgSprite.x = app.screen.width / 2
  bgSprite.y = app.screen.height / 2
  app.stage.addChild(bgSprite)

  const fsm = new GameStateMachine()
  const session = new SessionManager(10000)

  const gridConfig = { reels: 5, rows: 3, reelSpacing: 20 }
  const reelConfig = { symbolWidth: 140, symbolHeight: 140, visibleSymbols: 3, totalSymbols: 5 }

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

  // ── Reel frame overlay ──────────────────────────────────────────────────
  const frame = new Graphics()
  const framePad = 4

  // Outer gold border
  frame.rect(reelSet.x - framePad, reelSet.y - framePad, totalWidth + framePad * 2, totalHeight + framePad * 2)
  frame.stroke({ color: 0xd4a017, width: 4, alpha: 1 })

  // Column separators (center of each 20px gap between reels)
  for (let col = 1; col < gridConfig.reels; col++) {
    const sepX = reelSet.x + col * (reelConfig.symbolWidth + gridConfig.reelSpacing) - gridConfig.reelSpacing / 2
    frame.moveTo(sepX, reelSet.y)
    frame.lineTo(sepX, reelSet.y + totalHeight)
  }
  frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

  // Row separators (at each symbolHeight boundary)
  for (let row = 1; row < reelConfig.visibleSymbols; row++) {
    const sepY = reelSet.y + row * reelConfig.symbolHeight
    frame.moveTo(reelSet.x, sepY)
    frame.lineTo(reelSet.x + totalWidth, sepY)
  }
  frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

  app.stage.addChild(frame)

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
  hud.resize(app.screen.width, app.screen.height)
  app.renderer.on('resize', (w: number, h: number) => hud.resize(w, h))

  const autoSpinPanel = new AutoSpinPanel()
  autoSpinPanel.x = app.screen.width / 2
  autoSpinPanel.y = app.screen.height / 2
  app.stage.addChild(autoSpinPanel)

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
