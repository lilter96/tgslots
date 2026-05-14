import heroBg from '../assets/ancient-dragon/hero-bg.svg?url'
import iconFreeSpins from '../assets/ancient-dragon/feature-free-spins.svg?url'
import type { GamePresentation } from '../types'

export const ancientDragon: GamePresentation = {
  slug: 'ancient-dragon',
  title: 'Ancient Dragon',
  tagline: "Awaken the sleeping flame. Claim the dragon's hoard.",
  releaseDate: 'Q2 2026',
  stats: {
    volatility: 'High',
    rtp: '87.50%',
    maxWin: '5,000x bet',
    paylines: '25 Lines',
  },
  lore: [
    'Beneath a mountain older than the empire, where rivers of lava carve scripture into obsidian walls, the dragon sleeps. Its scales are lacquered in centuries of gold dust; its breath, when it stirs, ignites the cavern with a light that no lantern can match. The temple built above its lair stands as both offering and prison — a bargain struck in a forgotten age.',
    "Monks of the Ember Order tend the shrine day and night, feeding sacred fires and tracing the dragon's name across silk in ink made from melted coins. They do not worship the creature — they remember it. And memory, here, is currency.",
    'When five Dragon symbols align across the sacred paylines, the mountain trembles. The dragon opens one eye. Twenty-five free spins are granted to those bold enough to remain standing — each spin a breath of fire across five reels of treasure, multiplying every aligned reward without mercy.',
    'The hoard is real. The dragon is patient. But patience has a cost, and the ember that wakes it burns in you.',
  ],
  features: [
    {
      title: 'Free Spins — Dragon Awakens',
      description:
        'Land 5 Dragon scatters across the 25 paylines to ignite the ancient rite. Twenty-five free spins are awarded as the dragon breathes fire across all reels. Every win is tallied in gold — the hoard grows with each passing spin.',
      icon: iconFreeSpins,
    },
  ],
  assets: {
    heroBackground: heroBg,
  },
  theme: {
    primary: '#cc1a1a',
    accent: '#d4a017',
    background: '#1a0000',
    text: '#ffe066',
  },
  launchUrl: '/?game=ancient-dragon',
}
