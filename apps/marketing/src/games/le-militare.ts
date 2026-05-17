import heroBg from '../assets/le-militare/hero-bg.svg?url'
import iconCluster from '../assets/le-militare/feature-cluster.svg?url'
import iconCascade from '../assets/le-militare/feature-cascade.svg?url'
import iconCombat from '../assets/le-militare/feature-combat.svg?url'
import iconFreeSpins from '../assets/le-militare/feature-freespins.svg?url'
import type { GamePresentation } from '../types'

export const leMilitare: GamePresentation = {
  slug: 'le-militare',
  title: 'Le Militare',
  tagline: 'Cluster strike. Air defense engaged.',
  releaseDate: 'Q2 2026',
  stats: {
    volatility: 'High',
    rtp: '96.20%',
    maxWin: '10,000x bet',
    paylines: 'Cluster Pays',
  },
  lore: [
    'Somewhere beyond the radar horizon, at a Cold-War installation buried under a metre of Soviet concrete, the S-300 batteries are live. The reel strips rotate like tumblers on a cipher machine: each stop a decision, each cluster of matching symbols a confirmed target lock.',
    'PLANEs cross the grid at irregular intervals — slow, arrogant, certain of their own impunity. They are wrong. The moment an S-300 fires on any reel, its entire column floods with Wild signal, and every PLANE in the airspace is shot down. The wreckage does not scatter; it converts: each destroyed aircraft becomes a multiplier Wild, tagged with a random value drawn from the ordnance register. Warhead yields: ×2, ×3, ×5, ×10, ×25, ×50, ×100, ×500.',
    'The cascade tumbles onward — gravity refills the grid, new contacts emerge, and the multiplier sum accumulates. When the last cluster is resolved, the final win is the product of all cluster payouts multiplied by the aggregate multiplier. A single well-placed S-300 volley can turn a modest base win into a classified figure.',
    'Reconnaissance Free Spins — triggered by 4 or more scatter signals on the initial grid — carry both the armed-reel status and the running multiplier across every subsequent spin. The counter does not reset until the mission ends. Buy Bonus costs 100× the wager and guarantees immediate scramble-to-free-spins entry.',
  ],
  features: [
    {
      title: 'Cluster Pays — Signal Lock',
      description:
        'Adjacent groups of 5 or more matching symbols pay regardless of payline position. The 6×5 grid rewards dense formations: the larger the cluster, the higher the payout. WILD symbols bridge and extend every cluster they touch.',
      icon: iconCluster,
    },
    {
      title: 'Tumble Cascades — Grid Cleared',
      description:
        'Every winning cluster vanishes. Symbols above fall down, and fresh contacts drop from the top of each reel. The cascade continues until no new clusters form — every tumble is a new engagement.',
      icon: iconCascade,
    },
    {
      title: 'Combat Operation — S-300 Volley',
      description:
        'When an S-300 lands on a new reel, two things happen simultaneously: every PLANE on the grid is shot down and converted to a multiplier Wild (×2 through ×500, drawn at random from the ordnance register), and the entire S-300 reel floods with Wilds — a Giant Wild column that persists for the remainder of the cascade. Multipliers accumulate; the total multiplies the final cluster win.',
      icon: iconCombat,
    },
    {
      title: 'Reconnaissance Free Spins — Persistent Multiplier',
      description:
        'Land 4+ scatter signals for 10–25 free spins. Armed reels and the running multiplier sum carry across every free spin in the session — the S-300 batteries stay hot, and each new combat operation adds to the same accumulator. Retrigger by landing 4+ scatters again. Buy Bonus enters the feature instantly for 100× the wager.',
      icon: iconFreeSpins,
    },
  ],
  assets: {
    heroBackground: heroBg,
  },
  theme: {
    primary: '#c41e1e',
    accent: '#d4af37',
    background: '#1a2e1f',
    text: '#ffffff',
  },
  launchUrl: '/?game=le-militare',
}
