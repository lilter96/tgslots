import heroBg from '../assets/woodland-whisper/hero-bg.svg?url'
import iconFreeSpins from '../assets/woodland-whisper/feature-free-spins.svg?url'
import iconPickBonus from '../assets/woodland-whisper/feature-pick-bonus.svg?url'
import iconBuyBonus from '../assets/woodland-whisper/feature-buy-bonus.svg?url'
import iconMystery from '../assets/woodland-whisper/feature-mystery.svg?url'
import type { GamePresentation } from '../types'

export const woodlandWhisper: GamePresentation = {
  slug: 'woodland-whisper',
  title: 'Woodland Whisper',
  tagline: 'Enter the spirit realm. Claim the ancient rite.',
  releaseDate: 'Q2 2026',
  stats: {
    volatility: 'High',
    rtp: '88.04%',
    maxWin: '5,000× bet',
    paylines: '30 Lines',
  },
  lore: [
    'Deep within an ancient woodland where mortal paths dare not tread, a hollow tree older than memory stands as the axis between worlds. Its bark carries runes of forgotten tongues — ✦ ⟁ ◈ — carved by hands not entirely human. By day it is silent. By night, its heartwood glows with captured starlight and the forest breathes.',
    'The forest spirit — the Wild — has guarded this glade since before the first winters. Neither benevolent nor cruel, she moves between the worlds at will, her form woven from leaf-light and river mist. Those she favours find their paths lit by fireflies; those she does not, find only fog.',
    "Three golden COIN scatters aligned beneath moonlight unlock the ancient ritual. Enter the Whisper — a matching ceremony of twenty hidden cards that grants anything from eight to one hundred free spins, all wins doubled by the spirit's blessing. Mystery symbols ripple across the reels like shadows shifting in candle-flame, transforming into creatures of the wood on every spin.",
    "The woodland does not yield its secrets easily. But for those willing to purchase passage — at the cost of a hundred spins' wager — the ritual begins at once, no matter the phase of the moon. The hollow tree is waiting.",
  ],
  features: [
    {
      title: 'Free Spins — 2× Multiplier',
      description:
        "Land 3 or more COIN scatters to enter the spirit realm. Every win during free spins is doubled by the forest spirit's 2× blessing. The Pick Bonus can retrigger from inside the feature, awarding additional spins.",
      icon: iconFreeSpins,
    },
    {
      title: 'Pick Bonus',
      description:
        'Before free spins begin, face 20 concealed cards hiding 10 matched pairs. Flip until a match is found — your award ranges from 8 to 100 free spins. The distribution favours patience, but 100 spins awaits the truly fortunate.',
      icon: iconPickBonus,
    },
    {
      title: 'Buy Bonus — 100× Wager',
      description:
        "Skip the natural trigger. Pay 100× your current wager to guarantee immediate entry into the Pick Bonus ceremony. The spirit's door opens for those bold enough to knock.",
      icon: iconBuyBonus,
    },
    {
      title: 'Mystery Replacement Symbols',
      description:
        'REPLACEMENT symbols appear in stacked clusters across all five reels. Each transforms independently into a regular symbol on evaluation, turning silent columns into explosive multi-line reveals.',
      icon: iconMystery,
    },
  ],
  assets: {
    heroBackground: heroBg,
  },
  theme: {
    primary: '#d4a017',
    accent: '#2d7a2d',
    background: '#060e04',
    text: '#ffe066',
  },
  launchUrl: '/?game=woodland-whisper',
}
