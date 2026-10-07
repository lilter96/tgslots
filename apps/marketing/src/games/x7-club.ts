import audit from '../../../../packages/games/x7-club/config/math-audit.json'
import config from '../../../../packages/games/x7-club/config/config.json'
import hero from '../assets/x7-club/nightclub.webp?url'
import boss from '../assets/x7-club/wild-hero.webp?url'
import './x7-club.css'
import hold from '../assets/x7-club/coin.webp?url'
import boost from '../assets/x7-club/seven.webp?url'
import entry from '../assets/x7-club/chill.webp?url'
import type { GamePresentation } from '../types'

const baseRTP = audit.results.find((result) => result.mode === 'base')!.summary.rtp

export const x7Club: GamePresentation = {
  slug: 'x7-club',
  demoOnly: true,
  title: 'X7 Club',
  tagline: 'Come for the memes. Stay for the respins.',
  releaseDate: '2026 · Demo',
  stats: {
    volatility: 'High',
    rtp: `${(baseRTP * 100).toFixed(2)}% MC`,
    maxWin: `${config.maxWinX.toLocaleString('en-US')}× cap`,
    paylines: `${config.baseCost} Lines`,
  },
  lore: [
    'Behind the velvet rope, the capybara runs the show. Violet lights, mirrored shades and a coat with main-character energy. Every coin gets its own place on the dance floor.',
    'Six coins open Hold & Spin. Prizes stay locked while the empty cells spin again. A new arrival brings the counter back to three. No rush. Good energy only.',
    'Fill a column and the booster takes the stage: extra credits for every coin, or a rare ×7 that turns a good night into absolute cinema. MINI, MAJOR and MEGA are fixed prizes in virtual demo credits.',
  ],
  features: [
    {
      title: 'Hold the vibe',
      description: 'Locked credit prizes. Three respins. Every new coin resets the counter.',
      icon: hold,
    },
    {
      title: 'Column afterparty',
      description: 'Full columns unlock an extra prize reel with credit boosts and a rare ×7.',
      icon: boost,
    },
    {
      title: 'Make an entrance',
      description: 'Buy a six-coin Hold & Spin entry for 77× stake, using demo credits.',
      icon: entry,
    },
  ],
  assets: { heroBackground: hero, heroForeground: boss },
  theme: { primary: '#a572ff', accent: '#d9ff43', background: '#130b22', text: '#f6f0ff' },
  launchUrl: '/?game=x7-club',
}
