import audit from '../../../../packages/games/nine-lives/config/math-audit.json'
import type { GamePresentation } from '../types'
import background from '../assets/nine-lives/promo.webp'
import chip from '../assets/nine-lives/coin.webp'
import scatter from '../assets/nine-lives/scatter.webp'
import cat from '../assets/nine-lives/cat.webp'
import { config } from '@tgslots/nine-lives'
import './nine-lives.css'
export const nineLives: GamePresentation = {
  slug: 'nine-lives',
  title: 'Nine Lives',
  demoOnly: true,
  tagline: 'One more spin before the afterlife.',
  lore: [
    'The casino opens at midnight. A red moon hangs over the rooftops. At the door, a cat Reaper flips a paw chip between ivory fingers. Death has a soft spot for cats.',
    'Connect five matching symbols and watch the board fall apart. Fresh symbols tumble in, and every winning cascade turns the multiplier up. Four hourglasses open the afterlife: nine free spins, with a multiplier that carries between lives.',
    'The Reaper collects every paw chip at the start of a free spin, then leaves Wild symbols in their place. He takes the chips. You keep the credits. Some nights are quiet. Some nights, you come back from the dead.',
  ],
  stats: {
    volatility: 'High',
    rtp: `${(audit.results.find((result) => result.mode === 'base')!.summary.rtp * 100).toFixed(2)}% MC`,
    maxWin: `${config.maxWinX.toLocaleString('en-US')}× cap`,
    paylines: '6×5 clusters',
  },
  features: [
    {
      title: 'DEAD LUCKY',
      description:
        'Clusters of five. Winning symbols vanish, fresh symbols fall, and your multiplier climbs.',
      icon: cat,
    },
    {
      title: 'NINE LIVES',
      description:
        'Four hourglasses award nine free spins. Your cascade multiplier carries between lives.',
      icon: scatter,
    },
    {
      title: "THE REAPER'S TAKE",
      description:
        'Paw chips pay at your current multiplier and become Wild. Make a deal with Death and buy entry.',
      icon: chip,
    },
  ],
  assets: { heroBackground: background },
  theme: { primary: '#26110d', accent: '#e95c3b', background: '#120d0b', text: '#f4e7cc' },
  launchUrl: '/?game=nine-lives',
  releaseDate: '2026 · DEMO',
}
