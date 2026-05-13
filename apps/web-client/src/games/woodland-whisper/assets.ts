import type { AssetManifest } from '@tgslots/shared-contracts'
import { SYMBOL_SVG, ENVIRONMENT_SVG } from '../../assets/symbols.js'

export const assets: AssetManifest = {
  symbols: {
    WOMAN: SYMBOL_SVG['WOMAN']!,
    CHEST: SYMBOL_SVG['CHEST']!,
    TIARA: SYMBOL_SVG['TIARA']!,
    MUSHROOMS: SYMBOL_SVG['MUSHROOMS']!,
    PINECONE: SYMBOL_SVG['PINECONE']!,
    A: SYMBOL_SVG['A']!,
    K: SYMBOL_SVG['K']!,
    Q: SYMBOL_SVG['Q']!,
    J: SYMBOL_SVG['J']!,
    '10': SYMBOL_SVG['10']!,
    '9': SYMBOL_SVG['9']!,
    COIN: SYMBOL_SVG['COIN']!,
    REPLACEMENT: SYMBOL_SVG['REPLACEMENT']!,
  },
  env: {
    FRAME: { svg: ENVIRONMENT_SVG.FRAME, width: 390, height: 340 },
    WIN_SMALL: { svg: ENVIRONMENT_SVG.WIN_SMALL, width: 800, height: 200 },
    WIN_BIG: { svg: ENVIRONMENT_SVG.WIN_BIG, width: 800, height: 260 },
    WIN_MEGA: { svg: ENVIRONMENT_SVG.WIN_MEGA, width: 800, height: 360 },
    ANNOUNCE_BONUS: { svg: ENVIRONMENT_SVG.ANNOUNCE_BONUS, width: 800, height: 200 },
    ANNOUNCE_FREE: { svg: ENVIRONMENT_SVG.ANNOUNCE_FREE, width: 800, height: 200 },
  },
}
