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

// Natural reel-set dimensions (5 reels × 140 + 4 gaps × 20 = 780; 3 rows × 140 = 420)
const REEL_W = 780
const REEL_H = 420
const FRAME_PAD = 4
// Space reserved at the bottom for the HUD button panel (PANEL_H=88 + PAD=16)
const BTN_ZONE = 104
const PAD = 16

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

  const initialGrid = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => Math.floor(Math.random() * (SYM_NAMES.length - 1))),
  )

  const reelSet = new ReelSet(gridConfig, reelConfig, initialGrid, [...SYM_NAMES])

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

  const autoSpinPanel = new AutoSpinPanel()
  app.stage.addChild(autoSpinPanel)

  // ── Layout ──────────────────────────────────────────────────────────────

  function doLayout(W: number, H: number) {
    // Background — cover the canvas
    const bgScale = Math.max(W / bgTex.width, H / bgTex.height)
    bgSprite.scale.set(bgScale)
    bgSprite.x = W / 2
    bgSprite.y = H / 2

    // Reel set — scale to fit the area above the button zone
    const availW = W - PAD * 2
    const availH = H - BTN_ZONE - PAD * 2
    const reelScale = Math.min(1, availW / REEL_W, availH / REEL_H)
    const scaledW = REEL_W * reelScale
    const scaledH = REEL_H * reelScale

    reelSet.scale.set(reelScale)

    // Keep reel centred, but shift right if the info panel would overlap it
    const infoPanelRight = PAD + 200 * Math.min(1, W * 0.45 / 216) + PAD
    const centeredX = (W - scaledW) / 2
    reelSet.x = centeredX < infoPanelRight
      ? Math.min(infoPanelRight, W - scaledW - PAD)
      : centeredX
    reelSet.y = PAD + (availH - scaledH) / 2

    // Mask — match the scaled reel-set footprint
    mask.clear()
    mask.rect(reelSet.x, reelSet.y, scaledW, scaledH)
    mask.fill(0xffffff)

    // Frame — outer border + column/row separators in screen coordinates
    frame.clear()

    frame.rect(
      reelSet.x - FRAME_PAD,
      reelSet.y - FRAME_PAD,
      scaledW + FRAME_PAD * 2,
      scaledH + FRAME_PAD * 2,
    )
    frame.stroke({ color: 0xd4a017, width: 4, alpha: 1 })

    for (let col = 1; col < gridConfig.reels; col++) {
      const sepX =
        reelSet.x +
        (col * (reelConfig.symbolWidth + gridConfig.reelSpacing) - gridConfig.reelSpacing / 2) *
          reelScale
      frame.moveTo(sepX, reelSet.y)
      frame.lineTo(sepX, reelSet.y + scaledH)
    }
    frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

    for (let row = 1; row < reelConfig.visibleSymbols; row++) {
      const sepY = reelSet.y + row * reelConfig.symbolHeight * reelScale
      frame.moveTo(reelSet.x, sepY)
      frame.lineTo(reelSet.x + scaledW, sepY)
    }
    frame.stroke({ color: 0xd4a017, width: 1, alpha: 0.4 })

    // Overlays — always centred on screen
    pickUI.x = W / 2
    pickUI.y = H / 2
    overlay.x = W / 2
    overlay.y = H / 2
    autoSpinPanel.x = W / 2
    autoSpinPanel.y = H / 2

    hud.resize(W, H)
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
