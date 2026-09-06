import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LINE_CLEAR_DELAY_TICKS,
  VISIBLE_START_ROW,
  createBoard,
  createInitialState,
  dispatch,
  setCell,
  type GameEvent,
  type GameState,
} from '../../../../src/game/core';
import { mutationChainPresentationPlan } from '../../../../src/animation/mutationChainTimeline';
import { BOMB_BLOCK_PLAYBACK_CONTRACT } from '../../../../src/game/audio/bombBlockPlayback';
import { MUTATION_VFX_TOKENS } from '../../../../src/design/mutationTokens';
import { TetrisRenderer } from '../../../../src/game/render/TetrisRenderer';
import type { Application, Ticker } from 'pixi.js';

export type Scene = 'normal' | 'chain';

type Bomb = Extract<GameEvent, { type: 'mutation-activated'; item: 'bomb' }>;
type Chain = Extract<Bomb, { bombOutcome: 'chain-clear' }>;
type RendererInternals = { app: Application | null };

let nextTickerIdentity = 0;

function ok(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function resolveBomb(state: GameState) {
  const started = dispatch(state, { type: 'hard-drop' });
  let settled = started;
  for (let index = 0; index < LINE_CLEAR_DELAY_TICKS; index += 1) {
    settled = dispatch(settled.state, { type: 'tick' });
  }
  const activation = settled.events.find(
    (event): event is Bomb => event.type === 'mutation-activated' && event.item === 'bomb',
  );
  ok(activation, 'Core emitted no Bomb activation.');
  return Object.freeze({
    hardDropState: started.state,
    committedState: settled.state,
    committedEvents: settled.events,
    activation,
  });
}

function baseState(): GameState {
  return dispatch(createInitialState(0x37b05c, 'sprint'), { type: 'start' }).state;
}

/** Real Core events: one ordinary blast and one row-39 chain-clear. */
export function createFixtures() {
  let board = createBoard();
  for (let x = 0; x < 8; x += 1) board = setCell(board, x, 39, 'J');
  const common = {
    ...baseState(),
    board,
    active: { type: 'O', rotation: 0, x: 8, y: 38 } as const,
    score: 0,
  };
  const normal = resolveBomb({
    ...common,
    mutationActiveCarrier: { id: 9, item: 'bomb' },
    mutationCarriers: [],
    mutationNextCarrierId: 10,
  });
  const chain = resolveBomb({
    ...common,
    board: setCell(board, 0, 38, 'L'),
    mutationActiveCarrier: { id: 1, item: 'bomb' },
    mutationCarriers: [{ id: 2, item: 'bomb', cells: [{ x: 0, y: 38 }, { x: 0, y: 39 }] }],
    mutationNextCarrierId: 3,
  });
  ok(normal.activation.bombOutcome === 'blast' && normal.activation.participatingBombCount === 1,
    'Normal Core fixture drifted.');
  ok(chain.activation.bombOutcome === 'chain-clear', 'Chain Core fixture drifted.');
  const chainActivation = chain.activation as Chain;
  ok(JSON.stringify(chainActivation.chainTriggerRows) === '[39]' && chainActivation.participatingBombCount === 2,
    'Row-39 Core chain fixture drifted.');
  return Object.freeze({
    normal,
    chain,
    plans: Object.freeze({
      full: mutationChainPresentationPlan(chainActivation.chainTriggerRows, false),
      reduced: mutationChainPresentationPlan(chainActivation.chainTriggerRows, true),
    }),
  });
}

export const FIXTURES = createFixtures();
export const NORMAL_IMPACT_MS = BOMB_BLOCK_PLAYBACK_CONTRACT.normalImpactMs;
export const REVIEW_HOLD_MS = 280;

export function productDurationMs(scene: Scene, reducedMotion: boolean): number {
  if (scene === 'normal') return MUTATION_VFX_TOKENS.bomb.animation.activationMs;
  return reducedMotion ? FIXTURES.plans.reduced.durationMs : FIXTURES.plans.full.durationMs;
}

export function reviewDurationMs(scene: Scene, reducedMotion: boolean): number {
  return productDurationMs(scene, reducedMotion) + REVIEW_HOLD_MS;
}

/** A real production renderer owner with a small deterministic advance seam for browser proof. */
export class ProductRendererSession {
  private renderer: TetrisRenderer | null = null;
  private application: Application | null = null;
  private ticker: Ticker | null = null;
  private tickerIdentity = 0;
  private initialTickerListenerCount = 0;
  private tickerDestroyed = false;
  private scene: Scene | null = null;
  private reducedMotion = false;
  private elapsedMs = 0;
  private raf: number | null = null;
  private lastFrameAt = 0;
  private generation = 0;
  private settledCount = 0;
  private disposed = false;

  constructor(private readonly host: HTMLElement, private readonly changed: () => void = () => {}) {}

  async init(): Promise<void> {
    ok(!this.disposed, 'Renderer is disposed.');
    const renderer = new TetrisRenderer();
    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: false, modeSwitch: false });
    await renderer.init(this.host);
    if (this.disposed) {
      renderer.destroy();
      return;
    }
    const application = (renderer as unknown as RendererInternals).app;
    ok(application?.ticker, 'Production Renderer did not retain its Pixi ticker.');
    this.renderer = renderer;
    this.application = application;
    this.ticker = application.ticker;
    this.tickerIdentity = ++nextTickerIdentity;
    this.initialTickerListenerCount = application.ticker.count;
    ok(application.ticker.started && application.ticker.count > 0,
      'Production Pixi ticker must be started with real listeners.');
    renderer.render(FIXTURES.normal.hardDropState, [{ type: 'restarted' }], 0);
    ok(this.host.querySelectorAll('canvas').length === 1, 'Renderer must own exactly one Canvas.');
    this.changed();
  }

  play(scene: Scene, reducedMotion = false, deterministic = false): void {
    const renderer = this.renderer;
    ok(renderer && !this.disposed, 'Renderer is unavailable.');
    this.cancelFrame();
    const generation = ++this.generation;
    this.scene = scene;
    this.reducedMotion = reducedMotion;
    this.elapsedMs = 0;
    const fixture = FIXTURES[scene];
    renderer.setOptions({ reducedMotion });
    renderer.render(fixture.committedState, fixture.committedEvents, 0);
    if (!deterministic) this.raf = requestAnimationFrame((now) => this.onFrame(now, generation));
    this.changed();
  }

  advance(milliseconds: number): void {
    if (!this.renderer || !this.scene) return;
    let remaining = Math.max(0, milliseconds);
    while (remaining > 0 && this.scene) {
      const delta = Math.min(remaining, 1_000 / 60);
      remaining -= delta;
      this.elapsedMs += delta;
      this.renderer.render(FIXTURES[this.scene].committedState, [], delta);
      if (this.elapsedMs >= reviewDurationMs(this.scene, this.reducedMotion)) this.settle();
    }
    this.changed();
  }

  stop(): void {
    this.generation += 1;
    this.cancelFrame();
    this.scene = null;
    this.elapsedMs = 0;
    this.renderer?.render(FIXTURES.normal.hardDropState, [{ type: 'restarted' }], 0);
    this.changed();
  }

  state() {
    const snapshot = this.renderer?.getSnapshot();
    const ticker = this.ticker;
    const tickerApplicationBound = !!ticker && this.application?.ticker === ticker;
    const tickerListenerCount = ticker?.count ?? 0;
    const tickerStarted = ticker?.started ?? false;
    return Object.freeze({
      ready: !!this.renderer && !this.disposed,
      disposed: this.disposed,
      scene: this.scene,
      reducedMotion: this.reducedMotion,
      elapsedMs: this.elapsedMs,
      frameCallbacks: this.raf === null ? 0 : 1,
      settledCount: this.settledCount,
      rendererOwners: this.renderer ? 1 : 0,
      canvasCount: this.host.querySelectorAll('canvas').length,
      tickerOwners: tickerApplicationBound && !this.tickerDestroyed && tickerStarted && tickerListenerCount > 0 ? 1 : 0,
      tickerObserved: !!ticker,
      tickerIdentity: this.tickerIdentity,
      tickerApplicationBound,
      tickerListenerCount,
      initialTickerListenerCount: this.initialTickerListenerCount,
      tickerStarted,
      tickerDestroyed: this.tickerDestroyed,
      particles: snapshot?.mutationActiveParticleCount ?? 0,
    });
  }

  fixtureState() {
    const chain = FIXTURES.chain.activation as Chain;
    return Object.freeze({
      normalOutcome: FIXTURES.normal.activation.bombOutcome,
      normalParticipants: FIXTURES.normal.activation.participatingBombCount,
      chainOutcome: chain.bombOutcome,
      chainParticipants: chain.participatingBombCount,
      chainTriggerRows: [...chain.chainTriggerRows],
      fullBeatStartsMs: [...FIXTURES.plans.full.beatStartsMs],
      reducedBeatStartsMs: [...FIXTURES.plans.reduced.beatStartsMs],
      fullDurationMs: FIXTURES.plans.full.durationMs,
      reducedDurationMs: FIXTURES.plans.reduced.durationMs,
      normalImpactMs: NORMAL_IMPACT_MS,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      visibleStartRow: VISIBLE_START_ROW,
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    const ticker = this.ticker;
    this.renderer?.destroy();
    this.application = null;
    this.renderer = null;
    if (ticker) ok(ticker.count === 0 && !ticker.started,
      'Destroyed Pixi ticker retained listeners or remained started.');
    this.tickerDestroyed = !!ticker;
    this.host.replaceChildren();
    this.changed();
  }

  private onFrame(now: number, generation: number): void {
    if (generation !== this.generation || !this.scene || this.disposed) return;
    const delta = this.lastFrameAt === 0 ? 0 : Math.min(100, Math.max(0, now - this.lastFrameAt));
    this.lastFrameAt = now;
    this.advance(delta);
    if (generation !== this.generation || !this.scene || this.disposed) return;
    this.raf = requestAnimationFrame((next) => this.onFrame(next, generation));
  }

  private cancelFrame(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastFrameAt = 0;
  }

  private settle(): void {
    if (!this.scene) return;
    this.cancelFrame();
    this.scene = null;
    this.elapsedMs = 0;
    this.settledCount += 1;
    this.renderer?.render(FIXTURES.normal.hardDropState, [{ type: 'restarted' }], 0);
  }
}
