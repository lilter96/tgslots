import { Application, Container, Text } from 'pixi.js'
import { gsap } from 'gsap'
import {
  ReelSetBuilder,
  HoldAndWinBuilder,
  SpriteSymbol,
  SpeedPresets,
  driveGsapWithTicker,
  enableDebug,
} from 'pixi-reels'
import type { HwCoin } from 'pixi-reels'
import { SYMBOLS, PAYLINES, config } from '@tgslots/x7-club'
import type { ClubCoin, ClubResponse } from '@tgslots/x7-club'
import { ClubApi, ClubApiError } from './api'
import { buildTextures } from './symbols'
import './style.css'

const format = (n: number) => n.toLocaleString('en-US')
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const coordinate = (coin: ClubCoin) => ({
  reel: Math.floor(coin.position / 3),
  cell: coin.position % 3,
})
const hwCoins = (coins: ClubCoin[]): HwCoin<ClubCoin>[] =>
  coins.map((coin) => ({ cell: coordinate(coin), id: 'COIN', data: coin }))

export async function launchX7Club(): Promise<void> {
  document.getElementById('game-loader')?.remove()
  document.title = 'X7 Club — TGSlots'
  const root = document.createElement('main')
  root.className = 'x7-club'
  root.innerHTML = `
    <header class="x7-header"><a href="${location.pathname}" aria-label="Back to game library">← TG / SLOTS</a><span class="x7-demo">DEMO CREDITS</span><button class="x7-sound" aria-label="Enable sound">SOUND OFF</button></header>
    <section class="x7-main"><div class="x7-heading"><p>HIGH SPIRITS. STICKY PRIZES.</p><h1>X7<span>CLUB</span><i>✦</i></h1><div class="x7-subtitle">come for the memes. stay for the respins.</div></div>
    <div class="x7-machine"><div class="x7-prizes">${['MINI', 'MAJOR', 'MEGA'].map((tier) => `<div><span>${tier}</span><strong>${config.prizes.find(([name]) => name === tier)![1]}×</strong></div>`).join('')}</div>
      <div class="x7-canvas" role="img" aria-label="Five reels with three rows"></div>
      <div class="x7-status" role="status" aria-live="polite">Opening the club…</div>
    </div>
    <div class="x7-controls"><div class="x7-wallet"><span>BALANCE</span><strong class="x7-balance">—</strong></div><div class="x7-bet"><span>BET</span><div><button class="x7-minus" aria-label="Decrease bet">−</button><strong class="x7-stake">${config.baseCost}</strong><button class="x7-plus" aria-label="Increase bet">+</button></div></div><button class="x7-spin" disabled>LOADING</button><button class="x7-buy" disabled>BUY BONUS<span>${config.buyCost}× BET</span></button></div>
    <div class="x7-bottom"><button class="x7-rules">HOW TO PLAY ↗</button><span class="x7-bank">YOUR BONUS: 0</span><button class="x7-turbo" aria-pressed="false">TURBO OFF</button></div>
    <p class="x7-footnote">20 lines · 6 coins unlock Hold & Spin · full columns unlock a booster</p>
    <div class="x7-error" role="alert" hidden></div>
    <button class="x7-refresh" hidden>REFRESH SESSION</button>
    </section>`
  document.body.append(root)
  const element = <T extends HTMLElement>(selector: string) => {
    const found = root.querySelector<T>(selector)
    if (!found) throw new Error(`Missing X7 element: ${selector}`)
    return found
  }
  const holder = element<HTMLDivElement>('.x7-canvas')
  const spinButton = element<HTMLButtonElement>('.x7-spin')
  const buyButton = element<HTMLButtonElement>('.x7-buy')
  const status = element<HTMLDivElement>('.x7-status')
  const errorBox = element<HTMLDivElement>('.x7-error')
  const refresh = element<HTMLButtonElement>('.x7-refresh')
  const api = new ClubApi(import.meta.env.VITE_API_URL ?? '')
  const app = new Application()
  await app.init({
    width: 700,
    height: 520,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(devicePixelRatio || 1, 2),
    autoDensity: true,
  })
  holder.append(app.canvas)
  const stopGsap = driveGsapWithTicker(app.ticker, gsap)
  const textures = buildTextures(app)
  const register = (registry: Parameters<Parameters<ReelSetBuilder['symbols']>[0]>[0]) => {
    for (const [id, texture] of Object.entries(textures))
      registry.register(id, SpriteSymbol, { textures: { [id]: texture } })
  }
  const reels = new ReelSetBuilder()
    .reels(5)
    .visibleCells(3)
    .symbolSize(132, 132)
    .symbolGap(8, 8)
    .symbols(register)
    .ticker(app.ticker)
    .gsap(gsap)
    .weights({ CHILL: 25, HYPE: 23, LOL: 20, GG: 17, SEVEN: 12, WILD: 3, COIN: 9 })
    .speed('normal', SpeedPresets.NORMAL)
    .speed('turbo', SpeedPresets.TURBO)
    .initialFrame(Array.from({ length: 5 }, () => ({ visible: ['CHILL', 'HYPE', 'LOL'] })))
    .build()
  reels.position.set(4, 100)
  app.stage.addChild(reels)
  enableDebug(reels)
  const board = new HoldAndWinBuilder<ClubCoin>()
    .grid(5, 3)
    .cellSize(132, { gap: 8 })
    .symbols(register)
    .weights({ COIN: 1, empty: 3 })
    .respins(3)
    .lockAnimation('none')
    .speeds({ normal: SpeedPresets.NORMAL, turbo: SpeedPresets.TURBO })
    .ticker(app.ticker)
    .cellChrome((g, width, height) =>
      g
        .roundRect(3, 3, width - 6, height - 6, 22)
        .fill({ color: 0x140b22, alpha: 0.8 })
        .stroke({ color: 0x885ba8, alpha: 0.35, width: 2 }),
    )
    .build()
  board.container.position.set(4, 100)
  board.container.visible = false
  app.stage.addChild(board.container)
  const labels = new Container()
  labels.position.set(4, 100)
  app.stage.addChild(labels)
  const booster = new ReelSetBuilder()
    .reels(1)
    .visibleCells(1)
    .symbolSize(132, 76)
    .symbols(register)
    .weights({ STOP: 65, PLUS1: 24, PLUS2: 10, X7: 1 })
    .speed('normal', SpeedPresets.NORMAL)
    .speed('turbo', SpeedPresets.TURBO)
    .ticker(app.ticker)
    .gsap(gsap)
    .initialFrame([{ visible: ['X7'] }])
    .build()
  booster.position.set(284, 10)
  app.stage.addChild(booster)
  let busy = false
  let multiplier = 1
  let turbo = false
  let muted = true
  let audio: AudioContext | null = null
  let previousCoins: ClubCoin[] = []
  let lastResponse: ClubResponse | null = null
  function tone(frequency: number, seconds = 0.08): void {
    if (muted) return
    audio ??= new AudioContext()
    void audio.resume()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.045, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + seconds)
  }
  reels.events.on('spin:reelLanded', (index) => tone(240 + index * 90))
  board.events.on('coin:locked', () => tone(780))
  function drawLabels(coins: ClubCoin[]): void {
    for (const child of labels.removeChildren()) child.destroy()
    for (const coin of coins) {
      const { x, y } = board.cellCenter(coordinate(coin))
      const value = new Text({
        text: format(coin.value),
        style: {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: coin.value >= 100000 ? 21 : 28,
          fontWeight: '900',
          fill: 0xffedaa,
        },
      })
      value.anchor.set(0.5)
      value.position.set(x, y + 8)
      labels.addChild(value)
      const tier = new Text({
        text: coin.tier === 'CREDIT' ? 'LOCKED' : coin.tier,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 13,
          fontWeight: '700',
          fill: 0xd9ff43,
          letterSpacing: 1,
        },
      })
      tier.anchor.set(0.5)
      tier.position.set(x, y - 20)
      labels.addChild(tier)
    }
  }
  function showBoard(coins: ClubCoin[]): void {
    board.reset()
    board.enter(hwCoins(coins))
    board.container.visible = true
    reels.visible = false
    previousCoins = structuredClone(coins)
    drawLabels(coins)
  }
  function sync(response: ClubResponse): void {
    lastResponse = response
    const bonus = response.state.bonus
    element('.x7-balance').textContent = format(response.balance)
    element('.x7-stake').textContent = format(config.baseCost * multiplier)
    element('.x7-bank').textContent =
      `YOUR BONUS: ${format(bonus?.coins.reduce((sum, c) => sum + c.value, 0) ?? 0)}`
    spinButton.textContent = api.hasPending
      ? 'RETRY'
      : bonus
        ? response.state.phase === 'BOOST'
          ? 'BOOST'
          : `RESPIN · ${bonus.respins}`
        : 'SPIN ↻'
    spinButton.disabled = busy
    buyButton.disabled = busy || !!bonus || api.hasPending
    buyButton.querySelector('span')!.textContent =
      `${format(config.buyCost * config.baseCost * multiplier)} CREDITS`
    for (const selector of ['.x7-plus', '.x7-minus'])
      element<HTMLButtonElement>(selector).disabled = busy || !!bonus || api.hasPending
    app.canvas.dataset.gameState = busy ? 'BUSY' : response.state.phase
    app.canvas.dataset.revision = String(response.revision)
    app.canvas.setAttribute('aria-busy', String(busy))
    if (response.state.phase === 'BOOST') {
      booster.position.x = 4 + response.state.bonus!.pendingColumns[0]! * 140
      status.textContent = 'FULL COLUMN! Spin the booster. A rare ×7 brings the big mood.'
    } else if (bonus) status.textContent = `${bonus.respins} respins left. New coins reset to 3.`
  }
  async function present(response: ClubResponse): Promise<void> {
    const result = response.result
    if (!result) {
      if (response.state.bonus) showBoard(response.state.bonus.coins)
      else {
        reels.visible = true
        board.container.visible = false
        drawLabels([])
        response.state.lastGrid.forEach((column, reel) =>
          column.forEach((id, cell) => reels.setSymbolAt(reel, cell, SYMBOLS[id]!)),
        )
      }
      return
    }
    if (result.type === 'BASE' || result.type === 'BUY') {
      reels.spotlight.hide()
      board.container.visible = false
      reels.visible = true
      drawLabels([])
      const animation = reels.spin()
      reels.setResult(result.grid.map((column) => ({ visible: column.map((id) => SYMBOLS[id]!) })))
      await animation
      if (result.hits.length) {
        const positions = result.hits.flatMap(({ lineIndex, matchCount }) =>
          PAYLINES[lineIndex]!.slice(0, matchCount).map((cell, reel) => ({
            reelIndex: reel,
            cellIndex: cell,
          })),
        )
        await reels.spotlight.show(positions)
        tone(900, 0.2)
        await wait(turbo ? 80 : 400)
      }
      if (result.bonusTriggered) {
        showBoard(result.coins)
        tone(1200, 0.3)
      } else {
        status.textContent = result.win
          ? `${format(result.win)} CREDITS. That's a vibe.`
          : 'Good vibes. Next spin?'
      }
    } else if (result.boost) {
      booster.position.x = 4 + result.boost.column * 140
      const animation = booster.spin()
      booster.setResult([{ visible: [result.boost.kind] }])
      await animation
      for (const coin of result.coins) board.setSymbolAt(coordinate(coin), 'COIN', coin)
      previousCoins = structuredClone(result.coins)
      drawLabels(result.coins)
      tone(result.boost.kind === 'X7' ? 1600 : 640, 0.2)
      status.textContent =
        result.boost.kind === 'X7'
          ? '×7. ABSOLUTE CINEMA.'
          : result.boost.kind === 'STOP'
            ? 'Column banked. Keep the good times rolling.'
            : `${result.boost.kind === 'PLUS1' ? '+1×' : '+2×'} BET TO EVERY COIN IN THE COLUMN`
    } else {
      // Re-seed the presentation ledger from the authoritative previous snapshot.
      showBoard(previousCoins)
      await board.respin(hwCoins(result.newCoins))
      previousCoins = structuredClone(result.coins)
      drawLabels(result.coins)
    }
    if (result.bonusEnded) {
      tone(1000, 0.3)
      status.textContent = `BONUS BANKED: ${format(result.win)} CREDITS${result.capped ? ' · MAX WIN' : ''}`
      element('.x7-bank').textContent = `LAST BONUS: ${format(result.win)}`
    }
  }
  function showError(error: Error): void {
    errorBox.hidden = false
    errorBox.textContent = error.message
    refresh.hidden = !(error instanceof ClubApiError && [404, 409].includes(error.status))
  }
  async function run(buy = false): Promise<void> {
    if (busy) return
    busy = true
    errorBox.hidden = true
    refresh.hidden = true
    if (lastResponse) sync(lastResponse)
    try {
      const response = api.hasPending
        ? await api.retry()
        : await api.action(
            buy ? 'buybonus' : lastResponse?.state.bonus ? 'next' : 'spin',
            multiplier,
          )
      await present(response)
      sync(response)
    } catch (error) {
      showError(error instanceof Error ? error : new Error('Unable to finish the action'))
    } finally {
      busy = false
      if (api.response) sync(api.response)
      else spinButton.textContent = 'RETRY'
      spinButton.disabled = false
    }
  }
  spinButton.addEventListener('click', () => {
    if (!api.response && !api.hasPending) void restore()
    else void run()
  })
  buyButton.addEventListener('click', () => {
    const dialog = document.createElement('dialog')
    dialog.className = 'x7-dialog'
    dialog.innerHTML = `<h2>MAKE AN ENTRANCE</h2><p>Start Hold & Spin with six locked coins for ${format(config.buyCost * config.baseCost * multiplier)} demo credits (${config.buyCost}× bet).</p><form method="dialog"><button value="cancel">NOT YET</button><button value="buy">LET'S GO</button></form>`
    root.append(dialog)
    dialog.showModal()
    dialog.addEventListener('close', () => {
      const buy = dialog.returnValue === 'buy'
      dialog.remove()
      if (buy) void run(true)
    })
  })
  for (const [selector, delta] of [
    ['.x7-minus', -1],
    ['.x7-plus', 1],
  ] as const)
    element<HTMLButtonElement>(selector).addEventListener('click', () => {
      multiplier = Math.min(10000, Math.max(1, multiplier + delta))
      if (lastResponse) sync(lastResponse)
    })
  element('.x7-sound').addEventListener('click', () => {
    muted = !muted
    element('.x7-sound').textContent = muted ? 'SOUND OFF' : 'SOUND ON'
    element('.x7-sound').setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound')
    tone(440)
  })
  element('.x7-turbo').addEventListener('click', () => {
    turbo = !turbo
    const speed = turbo ? 'turbo' : 'normal'
    reels.setSpeed(speed)
    booster.setSpeed(speed)
    board.setSpeed(speed)
    element('.x7-turbo').textContent = turbo ? 'TURBO ON' : 'TURBO OFF'
    element('.x7-turbo').setAttribute('aria-pressed', String(turbo))
  })
  element('.x7-rules').addEventListener('click', () => {
    const dialog = document.createElement('dialog')
    dialog.className = 'x7-dialog'
    dialog.innerHTML = `<h2>THE CLUB RULES</h2><p>5 reels × 3 rows. All 20 lines are active. Match 3+ symbols from the left; WILD substitutes for paying symbols. The first non-wild symbol determines the combination; only its longest paying prefix pays. An all-wild line pays as SEVEN.</p><p>6+ COIN symbols trigger Hold & Spin. Coins lock; each new coin resets the counter to 3. Three misses end the feature. MINI / MAJOR / MEGA are fixed 10× / 50× / 250× stake prizes, not progressive pools.</p><p>Every filled column earns one booster. +1× and +2× add stake multiples to its three coins. ×7 multiplies their current values and banks the column. BANK ends the booster; a maximum of 7 pulls also banks it. Boosters don't consume respins. Complete pending boosters before collecting a full board.</p><p>The bonus pays once at the end. The total round cap is 7,777× stake. BUY BONUS costs ${config.buyCost}× stake. This is a demo with ephemeral sessions and virtual credits.</p><table><thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>${config.paytable.map((pays, id) => `<tr><th>${SYMBOLS[id]}</th>${pays.map((pay) => `<td>${pay}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Paytable values × bet per line (total bet ÷ 20).</p><details><summary>All 20 paylines (rows 1–3, left to right)</summary><ol>${PAYLINES.map((line) => `<li>${line.map((row) => row + 1).join(' → ')}</li>`).join('')}</ol></details><form method="dialog"><button>GOT IT</button></form>`
    root.append(dialog)
    dialog.showModal()
    dialog.addEventListener('close', () => dialog.remove())
  })
  refresh.addEventListener('click', () => {
    api.resetExpiredSession()
    void restore()
  })
  async function restore(): Promise<void> {
    busy = true
    spinButton.disabled = true
    errorBox.hidden = true
    try {
      const response = await api.restore()
      multiplier = response.state.triggeringMultiplier
      await present(response)
      sync(response)
      if (!response.state.bonus && !response.result)
        status.textContent = 'The club is open. Bring your lucky energy.'
    } catch (error) {
      showError(error instanceof Error ? error : new Error('Unable to open the club'))
    } finally {
      busy = false
      if (api.response) sync(api.response)
      spinButton.disabled = false
      if (!api.response) spinButton.textContent = 'RETRY'
    }
  }
  document.addEventListener('keydown', (event) => {
    if (
      event.code === 'Space' &&
      !root.querySelector('dialog[open]') &&
      !(event.target instanceof HTMLButtonElement) &&
      !(event.target instanceof HTMLInputElement)
    ) {
      event.preventDefault()
      spinButton.click()
    }
  })
  window.addEventListener(
    'pagehide',
    () => {
      stopGsap()
      board.destroy()
      reels.destroy()
      booster.destroy()
      app.destroy(true, { children: true })
      for (const texture of Object.values(textures)) texture.destroy(true)
      void audio?.close()
    },
    { once: true },
  )
  await restore()
}
