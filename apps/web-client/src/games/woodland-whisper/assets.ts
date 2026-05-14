import type { AssetManifest } from '@tgslots/shared-contracts'
import { ENVIRONMENT_SVG } from '../../assets/symbols.js'

export const assets: AssetManifest = {
  images: {
    COIN: '/assets/images/woodland-whisper/coin-symbol.png',
    WOMAN: '/assets/images/woodland-whisper/woman-symbol.png',
    MUSHROOMS: '/assets/images/woodland-whisper/mushrooms-symbol.png',
    CHEST: '/assets/images/woodland-whisper/chest-symbol.png',
    TIARA: '/assets/images/woodland-whisper/tiara-symbol.png',
    PINECONE: '/assets/images/woodland-whisper/pinecone-symbol.png',
    A: '/assets/images/woodland-whisper/a-symbol.png',
    K: '/assets/images/woodland-whisper/k-symbol.png',
    Q: '/assets/images/woodland-whisper/q-symbol.png',
    J: '/assets/images/woodland-whisper/j-symbol.png',
    '9': '/assets/images/woodland-whisper/9-symbol.png',
    '10': '/assets/images/woodland-whisper/10-symbol.png',
  },
  env: {
    FRAME: { svg: ENVIRONMENT_SVG.FRAME, width: 390, height: 340 },
    WIN_SMALL: { svg: ENVIRONMENT_SVG.WIN_SMALL, width: 800, height: 200 },
    WIN_BIG: { svg: ENVIRONMENT_SVG.WIN_BIG, width: 800, height: 260 },
    WIN_MEGA: { svg: ENVIRONMENT_SVG.WIN_MEGA, width: 800, height: 360 },
    ANNOUNCE_BONUS: { svg: ENVIRONMENT_SVG.ANNOUNCE_BONUS, width: 800, height: 200 },
    ANNOUNCE_FREE: { svg: ENVIRONMENT_SVG.ANNOUNCE_FREE, width: 800, height: 200 },
  },
  audio: {
    'bgm-forest': '/assets/sounds/woodland-whisper/bgm-forest.mp3',
    'spin-start': '/assets/sounds/woodland-whisper/spin-start.mp3',
    'reel-stop': '/assets/sounds/woodland-whisper/reel-stop.mp3',
    'win-small': '/assets/sounds/woodland-whisper/win-small.mp3',
    'win-big': '/assets/sounds/woodland-whisper/win-big.mp3',
  },
}
