import { t } from 'elysia'

// --- Common Components ---

export const PaylineHitSchema = t.Object({
  lineIndex: t.Number(),
  symbolName: t.String(),
  matchCount: t.Number(),
  basePayout: t.Number(),
  wildMultiplier: t.Number(),
  totalPayout: t.Number(),
})

export const GridSchema = t.Array(t.Array(t.Number()))

export const GameStateSummarySchema = t.Object({
  freeSpinsLeft: t.Number(),
  totalFreeSpinWin: t.Number(),
})

// --- Feature States ---

export const FreeSpinStateSchema = t.Object({
  totalWin: t.Number(),
  spinsRemaining: t.Number(),
})

export const PickBonusStateSchema = t.Object({
  board: t.Array(t.Number()),
  currentPickIndex: t.Number(),
  userPicks: t.Array(t.Number()),
  revealedValues: t.Array(t.Number()),
  winValue: t.Number(),
})

export const WoodlandWhisperStateSchema = t.Object({
  lastGrid: t.Nullable(GridSchema),
  freeSpins: t.Nullable(FreeSpinStateSchema),
  pickBonus: t.Nullable(PickBonusStateSchema),
})

// --- Result Schemas ---

export const BaseResultSchema = t.Object({
  type: t.Literal('BASE'),
  win: t.Number(),
  sc: t.Number(),
  scatterWin: t.Number(),
  grid: GridSchema,
  hits: t.Array(PaylineHitSchema),
  pickedBonus: t.Number(),
  triggeredPickBonus: t.Boolean(),
  state: GameStateSummarySchema,
})

export const FreeResultSchema = t.Object({
  type: t.Literal('FREE'),
  win: t.Number(),
  sc: t.Number(),
  scatterWin: t.Number(),
  grid: GridSchema,
  hits: t.Array(PaylineHitSchema),
  pickedBonus: t.Number(),
  retriggeredPickBonus: t.Boolean(),
  state: GameStateSummarySchema,
})

export const PickResultSchema = t.Object({
  type: t.Literal('PICK'),
  win: t.Number(),
  pick: t.Object({
    userIndex: t.Number(),
    revealedIndex: t.Number(),
    value: t.Number(),
    isMatch: t.Boolean(),
    board: t.Array(t.Number()),
    picks: t.Array(t.Number()),
  }),
  state: GameStateSummarySchema,
})

export const BuyResultSchema = t.Object({
  type: t.Literal('BUY'),
  win: t.Number(),
  sc: t.Number(),
  scatterWin: t.Number(),
  grid: GridSchema,
  hits: t.Array(PaylineHitSchema),
  pickedBonus: t.Number(),
  triggeredPickBonus: t.Literal(true),
  state: GameStateSummarySchema,
})

export const WoodlandWhisperResultSchema = t.Union([
  BaseResultSchema,
  FreeResultSchema,
  PickResultSchema,
  BuyResultSchema,
])

// --- Response DTOs ---

export const SpinResponseSchema = t.Object({
  sessionId: t.String(),
  result: WoodlandWhisperResultSchema,
  state: WoodlandWhisperStateSchema,
})

export const ActionResponseSchema = t.Object({
  sessionId: t.String(),
  result: WoodlandWhisperResultSchema,
  state: WoodlandWhisperStateSchema,
})

export const StateResponseSchema = t.Object({
  sessionId: t.String(),
  state: WoodlandWhisperStateSchema,
})

export const ErrorResponseSchema = t.Object({
  error: t.String(),
})

// --- Le Militare Schemas ---

export const LMFreeSpinStateSchema = t.Object({
  triggeringMultiplier: t.Number(),
  spinsRemaining: t.Number(),
  totalWin: t.Number(),
  armedReels: t.Array(t.Number()),
  multiplierSum: t.Number(),
})

export const LeMilitareStateSchema = t.Object({
  lastGrid: t.Nullable(GridSchema),
  freeSpins: t.Nullable(LMFreeSpinStateSchema),
})

export const LeMilitareSpinResponseSchema = t.Object({
  sessionId: t.String(),
  result: t.Any(),
  state: LeMilitareStateSchema,
})

export const LeMilitareActionResponseSchema = t.Object({
  sessionId: t.String(),
  result: t.Any(),
  state: LeMilitareStateSchema,
})

export const LeMilitareStateResponseSchema = t.Object({
  sessionId: t.String(),
  state: LeMilitareStateSchema,
})
