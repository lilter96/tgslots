import { expect } from 'bun:test'
import { mt19937 } from '@tgslots/math/rng/mt19937'
import type { Rng } from '@tgslots/math/rng/types'
import type { BetConfiguration } from '@tgslots/slots-core/betting'
import { Wager } from '@tgslots/slots-core/betting'
import type {
  RawMetricScope,
  RawScopedMetric,
  RawSimulationMetrics,
  RoundMetricsSnapshot,
  SpinResult,
  StateMachine,
} from '../core/state-machine.js'
import { ModernDataCollector, runCycle } from '../core/state-machine.js'

type AnySlotsStateMachine = StateMachine<SpinResult, object>
type SlotsTestValue = object | string | number | boolean | symbol | bigint | null | undefined
type SlotsTestArgList = readonly SlotsTestValue[]
type ResultOf<TSM extends AnySlotsStateMachine> =
  TSM extends StateMachine<infer TResult, object> ? TResult : SpinResult

export type SlotsTestMetricPhase = 'spin' | 'next'

export interface SlotsTestRunOptions<TState extends object = object> {
  seed?: number
  betLevel?: number
  initialState?: TState
}

export interface FindSeedOptions<
  TState extends object = object,
> extends SlotsTestRunOptions<TState> {
  maxSeeds?: number
}

export interface SlotsTestStepOptions {
  collect?: boolean
  metricPhase?: SlotsTestMetricPhase | null
}

export interface SlotsTestRecordedResult<TResult extends SpinResult = SpinResult> {
  action: string
  metricPhase: SlotsTestMetricPhase | null
  result: TResult
}

export interface SlotsTestCompletedRound<TResult extends SpinResult = SpinResult> {
  results: TResult[]
  snapshot: RoundMetricsSnapshot | null
}

class RecordingDataCollector extends ModernDataCollector {
  readonly recordedResults: SpinResult[] = []

  override collect(result: SpinResult): void {
    this.recordedResults.push(result)
    super.collect(result)
  }
}

/**
 * The handler-facing surface of a session. Custom action/scenario/probe handlers
 * receive this contract (not the concrete session), which deliberately omits the
 * typed `act`/`scenario`/`probe` namespaces — those reference the registries, and
 * exposing them here would create a circular handler↔registry type dependency.
 * Handlers compose via the primitives below (`executeResultStep`, `runSpin`,
 * `withinRound`, `sm`, …).
 */
export interface SlotsTestRunner<TSM extends AnySlotsStateMachine> {
  readonly seed: number
  readonly wager: Wager
  readonly rng: Rng
  sm: TSM
  readonly scratch: Map<string, SlotsTestValue>

  readonly results: readonly ResultOf<TSM>[]
  readonly trace: readonly SlotsTestRecordedResult<ResultOf<TSM>>[]
  readonly rounds: readonly SlotsTestCompletedRound<ResultOf<TSM>>[]
  readonly lastResult: ResultOf<TSM> | null
  readonly lastRound: SlotsTestCompletedRound<ResultOf<TSM>> | null

  resetMachine(initialState?: TSM['state']): TSM
  setScratch<T extends SlotsTestValue>(key: string, value: T): T
  getScratch<T extends SlotsTestValue>(key: string): T | undefined
  startRound(): void
  finishRound(): SlotsTestCompletedRound<ResultOf<TSM>> | null
  withinRound<T>(fn: () => T): T
  executeResultStep<TResult extends ResultOf<TSM> | null>(
    action: string,
    runner: () => TResult,
    options?: SlotsTestStepOptions,
  ): TResult
  runSpin(): ResultOf<TSM>
  runNext(): ResultOf<TSM> | null
  runCycle(): SlotsTestCompletedRound<ResultOf<TSM>>
  resultsOfType<TType extends ResultOf<TSM>['type']>(
    type: TType,
  ): Extract<ResultOf<TSM>, { type: TType }>[]
  getScope(path: string): RawMetricScope | undefined
  getMetric(path: string, metricName: string): RawScopedMetric | undefined
  getRawMetrics(): RawSimulationMetrics
  assertScopeDefined(path: string): void
  assertMetricDefined(path: string, metricName: string): void
}

export type SlotsTestActionHandler<
  TSM extends AnySlotsStateMachine,
  TArgs extends SlotsTestArgList = readonly [],
  TReturn extends SlotsTestValue | void = void,
> = (session: SlotsTestRunner<TSM>, ...args: TArgs) => TReturn

export type SlotsTestScenarioHandler<
  TSM extends AnySlotsStateMachine,
  TArgs extends SlotsTestArgList = readonly [],
  TReturn extends SlotsTestValue | void = void,
> = (session: SlotsTestRunner<TSM>, ...args: TArgs) => TReturn

export type SlotsTestProbeHandler<
  TSM extends AnySlotsStateMachine,
  TArgs extends SlotsTestArgList = readonly [],
  TReturn extends SlotsTestValue | void = void,
> = (session: SlotsTestRunner<TSM>, ...args: TArgs) => TReturn

type SlotsTestHandlerArgs<TSM extends AnySlotsStateMachine, TFn> =
  NonNullable<TFn> extends (
    session: SlotsTestRunner<TSM>,
    ...args: infer TArgs extends SlotsTestArgList
  ) => SlotsTestValue | void
    ? TArgs
    : SlotsTestArgList

type SlotsTestNamedActionRegistry<TSM extends AnySlotsStateMachine> = Record<
  string,
  SlotsTestActionHandler<TSM, SlotsTestArgList, SlotsTestValue | void>
>

type SlotsTestNamedScenarioRegistry<TSM extends AnySlotsStateMachine> = Record<
  string,
  SlotsTestScenarioHandler<TSM, SlotsTestArgList, SlotsTestValue | void>
>

type SlotsTestNamedProbeRegistry<TSM extends AnySlotsStateMachine> = Record<
  string,
  SlotsTestProbeHandler<TSM, SlotsTestArgList, SlotsTestValue | void>
>

// The empty registries use a `symbol` index (not `string`). A `string` index
// would widen `Extract<keyof TRegistry, string>` to `string` (so `act`/`scenario`/
// `probe` would accept any string and lose name-narrowing) and would make an empty
// registry's callable-name set non-`never`. The symbol index keeps unregistered
// names un-callable while still satisfying the base-registry constraint.
type SlotsTestEmptyActionRegistry<TSM extends AnySlotsStateMachine> = {
  [key: symbol]: SlotsTestActionHandler<TSM, readonly [], void>
}

type SlotsTestEmptyScenarioRegistry<TSM extends AnySlotsStateMachine> = {
  [key: symbol]: SlotsTestScenarioHandler<TSM, readonly [], void>
}

type SlotsTestEmptyProbeRegistry<TSM extends AnySlotsStateMachine> = {
  [key: symbol]: SlotsTestProbeHandler<TSM, readonly [], void>
}

type SlotsTestActionRegistry<TSM extends AnySlotsStateMachine> = SlotsTestEmptyActionRegistry<TSM> &
  Partial<SlotsTestNamedActionRegistry<TSM>>

type SlotsTestScenarioRegistry<TSM extends AnySlotsStateMachine> =
  SlotsTestEmptyScenarioRegistry<TSM> & Partial<SlotsTestNamedScenarioRegistry<TSM>>

type SlotsTestProbeRegistry<TSM extends AnySlotsStateMachine> = SlotsTestEmptyProbeRegistry<TSM> &
  Partial<SlotsTestNamedProbeRegistry<TSM>>

type DefaultSlotsTestActions<TSM extends AnySlotsStateMachine> = {
  cycle: SlotsTestActionHandler<TSM, [], SlotsTestCompletedRound<ResultOf<TSM>>>
  next: SlotsTestActionHandler<TSM, [], ResultOf<TSM> | null>
  round: SlotsTestActionHandler<TSM, [], SlotsTestCompletedRound<ResultOf<TSM>>>
  spin: SlotsTestActionHandler<TSM, [], ResultOf<TSM>>
}

function createDefaultActions<TSM extends AnySlotsStateMachine>(): DefaultSlotsTestActions<TSM> {
  return {
    spin: (session) => session.runSpin(),
    next: (session) => session.runNext(),
    cycle: (session) => session.runCycle(),
    // `round` is an alias of `cycle`.
    round: (session) => session.runCycle(),
  }
}

export class SlotsTestSession<
  TSM extends AnySlotsStateMachine,
  TActions extends SlotsTestActionRegistry<TSM>,
  TScenarios extends SlotsTestScenarioRegistry<TSM>,
  TProbes extends SlotsTestProbeRegistry<TSM>,
> implements SlotsTestRunner<TSM> {
  private readonly collector = new RecordingDataCollector()
  readonly scratch = new Map<string, SlotsTestValue>()

  readonly seed: number
  readonly wager: Wager
  readonly rng: Rng

  sm: TSM

  private currentRoundStart = 0
  private roundOpen = false
  private readonly completedRounds: SlotsTestCompletedRound<ResultOf<TSM>>[] = []
  private readonly traceEntries: SlotsTestRecordedResult<ResultOf<TSM>>[] = []

  constructor(
    private readonly engine: SlotsTestEngine<TSM, TActions, TScenarios, TProbes>,
    options: SlotsTestRunOptions<TSM['state']> = {},
  ) {
    const { seed = 0, betLevel = 1, initialState } = options
    this.seed = seed
    this.wager = engine.wager(betLevel)
    this.rng = engine.rng(seed)
    this.sm = engine.createMachine(initialState)
  }

  private get rawResults(): ResultOf<TSM>[] {
    return this.collector.recordedResults as ResultOf<TSM>[]
  }

  get results(): readonly ResultOf<TSM>[] {
    return [...this.rawResults]
  }

  get trace(): readonly SlotsTestRecordedResult<ResultOf<TSM>>[] {
    return this.traceEntries
  }

  get rounds(): readonly SlotsTestCompletedRound<ResultOf<TSM>>[] {
    return this.completedRounds
  }

  get lastResult(): ResultOf<TSM> | null {
    return this.rawResults.at(-1) ?? null
  }

  get lastRound(): SlotsTestCompletedRound<ResultOf<TSM>> | null {
    return this.completedRounds.at(-1) ?? null
  }

  resetMachine(initialState?: TSM['state']): TSM {
    // Collected results, trace, and rounds are intentionally preserved across a
    // reset; only the machine is swapped. Resetting mid-round would desync the
    // round bookkeeping, so require a closed round.
    if (this.roundOpen) {
      throw new Error('Cannot reset the machine while a round is open; finish it first')
    }
    this.sm = this.engine.createMachine(initialState)
    return this.sm
  }

  setScratch<T extends SlotsTestValue>(key: string, value: T): T {
    this.scratch.set(key, value)
    return value
  }

  getScratch<T extends SlotsTestValue>(key: string): T | undefined {
    return this.scratch.get(key) as T | undefined
  }

  startRound(): void {
    if (this.roundOpen) return
    this.currentRoundStart = this.rawResults.length
    this.collector.beginRound(this.wager.totalWager)
    this.roundOpen = true
  }

  finishRound(): SlotsTestCompletedRound<ResultOf<TSM>> | null {
    if (!this.roundOpen) return null

    this.collector.endRound()
    this.roundOpen = false

    const snapshot = this.collector.getLastRoundSnapshot()
    if (snapshot) {
      this.sm.recordRoundMetrics?.(this.collector, snapshot, this.wager)
    }

    const completedRound: SlotsTestCompletedRound<ResultOf<TSM>> = {
      results: this.rawResults.slice(this.currentRoundStart),
      snapshot,
    }

    this.completedRounds.push(completedRound)
    return completedRound
  }

  withinRound<T>(fn: () => T): T {
    const openedHere = !this.roundOpen
    if (openedHere) {
      this.startRound()
    }

    try {
      return fn()
    } finally {
      if (openedHere) {
        this.finishRound()
      }
    }
  }

  executeResultStep<TResult extends ResultOf<TSM> | null>(
    action: string,
    runner: () => TResult,
    options: SlotsTestStepOptions = {},
  ): TResult {
    const { collect = true, metricPhase = null } = options
    const result = runner()
    if (result === null) {
      return result
    }

    // Opting out of collection must also opt out of round tracking: otherwise the
    // round open/close would still mutate global metrics (rounds, totalBet, rtp)
    // for a result that was never recorded.
    if (!collect) {
      return result
    }

    const openedHere = !this.roundOpen
    if (openedHere) {
      this.startRound()
    }

    this.collector.collect(result)
    this.traceEntries.push({ action, metricPhase, result })

    if (metricPhase) {
      this.sm.recordResultMetrics?.(this.collector, result, {
        phase: metricPhase,
        wager: this.wager,
      })
    }

    if (openedHere) {
      this.finishRound()
    }

    return result
  }

  runSpin(): ResultOf<TSM> {
    return this.executeResultStep(
      'spin',
      () => this.sm.spin(this.rng, this.wager) as ResultOf<TSM>,
      {
        metricPhase: 'spin',
      },
    ) as ResultOf<TSM>
  }

  runNext(): ResultOf<TSM> | null {
    return this.executeResultStep('next', () => this.sm.next(this.rng) as ResultOf<TSM> | null, {
      metricPhase: 'next',
    }) as ResultOf<TSM> | null
  }

  runCycle(): SlotsTestCompletedRound<ResultOf<TSM>> {
    if (this.roundOpen) {
      throw new Error('Cannot run a full cycle while a round is already open')
    }

    const startIndex = this.rawResults.length
    runCycle(this.sm, this.rng, this.collector, this.wager)
    const roundResults = this.rawResults.slice(startIndex)

    roundResults.forEach((result, index) => {
      this.traceEntries.push({
        action: 'cycle',
        metricPhase: index === 0 ? 'spin' : 'next',
        result,
      })
    })

    const completedRound: SlotsTestCompletedRound<ResultOf<TSM>> = {
      results: roundResults,
      snapshot: this.collector.getLastRoundSnapshot(),
    }

    this.completedRounds.push(completedRound)
    return completedRound
  }

  resultsOfType<TType extends ResultOf<TSM>['type']>(
    type: TType,
  ): Extract<ResultOf<TSM>, { type: TType }>[] {
    return this.rawResults.filter(
      (result): result is Extract<ResultOf<TSM>, { type: TType }> => result.type === type,
    )
  }

  getScope(path: string): RawMetricScope | undefined {
    return this.engine.getScope(this.collector, path)
  }

  getMetric(path: string, metricName: string): RawScopedMetric | undefined {
    return this.getScope(path)?.metrics[metricName]
  }

  getRawMetrics(): RawSimulationMetrics {
    return this.collector.getRawMetrics()
  }

  assertScopeDefined(path: string): void {
    this.engine.assertScopeDefined(this.collector, path)
  }

  assertMetricDefined(path: string, metricName: string): void {
    this.engine.assertMetricDefined(this.collector, path, metricName)
  }

  act<TName extends Extract<keyof TActions, string>>(
    name: TName,
    ...args: SlotsTestHandlerArgs<TSM, TActions[TName]>
  ): ReturnType<NonNullable<TActions[TName]>> {
    const handler = this.engine.resolveAction(name) as SlotsTestActionHandler<
      TSM,
      SlotsTestArgList,
      SlotsTestValue | void
    >
    return handler(this, ...args) as ReturnType<NonNullable<TActions[TName]>>
  }

  scenario<TName extends Extract<keyof TScenarios, string>>(
    name: TName,
    ...args: SlotsTestHandlerArgs<TSM, TScenarios[TName]>
  ): ReturnType<NonNullable<TScenarios[TName]>> {
    const handler = this.engine.resolveScenario(name) as SlotsTestScenarioHandler<
      TSM,
      SlotsTestArgList,
      SlotsTestValue | void
    >
    return handler(this, ...args) as ReturnType<NonNullable<TScenarios[TName]>>
  }

  probe<TName extends Extract<keyof TProbes, string>>(
    name: TName,
    ...args: SlotsTestHandlerArgs<TSM, TProbes[TName]>
  ): ReturnType<NonNullable<TProbes[TName]>> {
    const handler = this.engine.resolveProbe(name) as SlotsTestProbeHandler<
      TSM,
      SlotsTestArgList,
      SlotsTestValue | void
    >
    return handler(this, ...args) as ReturnType<NonNullable<TProbes[TName]>>
  }
}

export class SlotsTestEngine<
  TSM extends AnySlotsStateMachine,
  TActions extends SlotsTestActionRegistry<TSM>,
  TScenarios extends SlotsTestScenarioRegistry<TSM>,
  TProbes extends SlotsTestProbeRegistry<TSM>,
> {
  constructor(
    private readonly MachineClass: new (initialState?: TSM['state']) => TSM,
    private readonly betConfig: BetConfiguration,
    private readonly actions: SlotsTestActionRegistry<TSM>,
    private readonly scenarios: SlotsTestScenarioRegistry<TSM>,
    private readonly probes: SlotsTestProbeRegistry<TSM>,
  ) {}

  createMachine(initialState?: TSM['state']): TSM {
    return new this.MachineClass(initialState)
  }

  wager(betLevel = 1): Wager {
    return new Wager(betLevel, this.betConfig)
  }

  rng(seed = 0): Rng {
    return mt19937(seed)
  }

  session(
    options: SlotsTestRunOptions<TSM['state']> = {},
  ): SlotsTestSession<TSM, TActions, TScenarios, TProbes> {
    return new SlotsTestSession(this, options)
  }

  findSeed(
    predicate: (session: SlotsTestSession<TSM, TActions, TScenarios, TProbes>) => boolean,
    options: FindSeedOptions<TSM['state']> = {},
  ): number | null {
    const { maxSeeds = 200, betLevel = 1, initialState } = options

    for (let seed = 0; seed < maxSeeds; seed++) {
      const session = this.session({ seed, betLevel, initialState })
      if (predicate(session)) {
        return seed
      }
    }

    return null
  }

  getScope(collector: ModernDataCollector, path: string): RawMetricScope | undefined {
    const raw = collector.getRawMetrics()
    const segments = path.split('/').filter(Boolean)
    let current: RawMetricScope | undefined = raw.rootScope

    for (const segment of segments) {
      current = current?.scopes[segment]
      if (!current) return undefined
    }

    return current
  }

  assertScopeDefined(collector: ModernDataCollector, path: string): void {
    const scope = this.getScope(collector, path)
    expect(scope, `Metric scope "${path}" should be defined`).toBeDefined()
  }

  assertMetricDefined(collector: ModernDataCollector, scopePath: string, metricName: string): void {
    const scope = this.getScope(collector, scopePath)
    expect(scope, `Metric scope "${scopePath}" should be defined`).toBeDefined()
    expect(
      scope?.metrics[metricName],
      `Metric "${metricName}" should be defined in scope "${scopePath}"`,
    ).toBeDefined()
  }

  resolveAction<TName extends keyof TActions>(name: TName): TActions[TName] {
    return this.actions[String(name)] as TActions[TName]
  }

  resolveScenario<TName extends keyof TScenarios>(name: TName): TScenarios[TName] {
    return this.scenarios[String(name)] as TScenarios[TName]
  }

  resolveProbe<TName extends keyof TProbes>(name: TName): TProbes[TName] {
    return this.probes[String(name)] as TProbes[TName]
  }
}

export class SlotsTestEngineBuilder<
  TSM extends AnySlotsStateMachine,
  TActions extends SlotsTestActionRegistry<TSM> = DefaultSlotsTestActions<TSM>,
  TScenarios extends SlotsTestScenarioRegistry<TSM> = SlotsTestEmptyScenarioRegistry<TSM>,
  TProbes extends SlotsTestProbeRegistry<TSM> = SlotsTestEmptyProbeRegistry<TSM>,
> {
  constructor(
    private readonly MachineClass: new (initialState?: TSM['state']) => TSM,
    private readonly betConfig: BetConfiguration,
    private readonly actions: SlotsTestActionRegistry<TSM> = createDefaultActions<TSM>(),
    private readonly scenarios: SlotsTestScenarioRegistry<TSM> = {},
    private readonly probes: SlotsTestProbeRegistry<TSM> = {},
  ) {}

  registerAction<
    TName extends string,
    TArgs extends SlotsTestArgList,
    TReturn extends SlotsTestValue | void,
  >(
    name: TName,
    handler: SlotsTestActionHandler<TSM, TArgs, TReturn>,
  ): SlotsTestEngineBuilder<
    TSM,
    TActions & Record<TName, SlotsTestActionHandler<TSM, TArgs, TReturn>>,
    TScenarios,
    TProbes
  > {
    return new SlotsTestEngineBuilder(
      this.MachineClass,
      this.betConfig,
      { ...this.actions, [name]: handler } as SlotsTestActionRegistry<TSM>,
      this.scenarios,
      this.probes,
    ) as SlotsTestEngineBuilder<
      TSM,
      TActions & Record<TName, SlotsTestActionHandler<TSM, TArgs, TReturn>>,
      TScenarios,
      TProbes
    >
  }

  registerScenario<
    TName extends string,
    TArgs extends SlotsTestArgList,
    TReturn extends SlotsTestValue | void,
  >(
    name: TName,
    handler: SlotsTestScenarioHandler<TSM, TArgs, TReturn>,
  ): SlotsTestEngineBuilder<
    TSM,
    TActions,
    TScenarios & Record<TName, SlotsTestScenarioHandler<TSM, TArgs, TReturn>>,
    TProbes
  > {
    return new SlotsTestEngineBuilder(
      this.MachineClass,
      this.betConfig,
      this.actions,
      { ...this.scenarios, [name]: handler } as SlotsTestScenarioRegistry<TSM>,
      this.probes,
    ) as SlotsTestEngineBuilder<
      TSM,
      TActions,
      TScenarios & Record<TName, SlotsTestScenarioHandler<TSM, TArgs, TReturn>>,
      TProbes
    >
  }

  registerProbe<
    TName extends string,
    TArgs extends SlotsTestArgList,
    TReturn extends SlotsTestValue | void,
  >(
    name: TName,
    handler: SlotsTestProbeHandler<TSM, TArgs, TReturn>,
  ): SlotsTestEngineBuilder<
    TSM,
    TActions,
    TScenarios,
    TProbes & Record<TName, SlotsTestProbeHandler<TSM, TArgs, TReturn>>
  > {
    return new SlotsTestEngineBuilder(
      this.MachineClass,
      this.betConfig,
      this.actions,
      this.scenarios,
      { ...this.probes, [name]: handler } as SlotsTestProbeRegistry<TSM>,
    ) as SlotsTestEngineBuilder<
      TSM,
      TActions,
      TScenarios,
      TProbes & Record<TName, SlotsTestProbeHandler<TSM, TArgs, TReturn>>
    >
  }

  build(): SlotsTestEngine<TSM, TActions, TScenarios, TProbes> {
    return new SlotsTestEngine(
      this.MachineClass,
      this.betConfig,
      this.actions,
      this.scenarios,
      this.probes,
    )
  }
}

export function createSlotsTestEngine<TSM extends AnySlotsStateMachine>(
  MachineClass: new (initialState?: TSM['state']) => TSM,
  betConfig: BetConfiguration,
): SlotsTestEngineBuilder<TSM> {
  return new SlotsTestEngineBuilder(MachineClass, betConfig)
}
