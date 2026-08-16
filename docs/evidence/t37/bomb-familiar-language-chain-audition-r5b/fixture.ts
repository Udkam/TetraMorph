import { BOARD_HEIGHT, BOARD_WIDTH, LINE_CLEAR_DELAY_TICKS, VISIBLE_START_ROW, createBoard, createInitialState, dispatch, setCell, type GameEvent, type GameState } from '../../../../src/game/core';
import { mutationChainPresentationPlan } from '../../../../src/animation/mutationChainTimeline';
import { MUTATION_VFX_TOKENS } from '../../../../src/design/mutationTokens';
import { TetrisRenderer } from '../../../../src/game/render/TetrisRenderer';

export type Variant = 'A' | 'B' | 'C';
export type Scene = 'normal' | 'chain';
type Bomb = Extract<GameEvent, { type: 'mutation-activated'; item: 'bomb' }>;
type Chain = Extract<Bomb, { bombOutcome: 'chain-clear' }>;

function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function commit(state: GameState) {
  const started = dispatch(state, { type: 'hard-drop' });
  let settled = started;
  for (let index = 0; index < LINE_CLEAR_DELAY_TICKS; index += 1) settled = dispatch(settled.state, { type: 'tick' });
  const activation = settled.events.find((event): event is Bomb => event.type === 'mutation-activated' && event.item === 'bomb');
  ok(activation, 'Core emitted no Bomb activation.');
  return { initialState: state, hardDropState: started.state, hardDropEvents: started.events, committedState: settled.state, committedEvents: settled.events, activation };
}
function base() { return dispatch(createInitialState(0x37b05b, 'sprint'), { type: 'start' }).state; }

export function createFixtures() {
  let board = createBoard();
  for (let x = 0; x < 8; x += 1) board = setCell(board, x, 39, 'J');
  const common = { ...base(), board, active: { type: 'O', rotation: 0, x: 8, y: 38 } as const, score: 0 };
  const normal = commit({ ...common, mutationActiveCarrier: { id: 9, item: 'bomb' }, mutationCarriers: [], mutationNextCarrierId: 10 });
  const chain = commit({ ...common, board: setCell(board, 0, 38, 'L'), mutationActiveCarrier: { id: 1, item: 'bomb' }, mutationCarriers: [{ id: 2, item: 'bomb', cells: [{ x: 0, y: 38 }, { x: 0, y: 39 }] }], mutationNextCarrierId: 3 });
  ok(normal.activation.bombOutcome === 'blast' && normal.activation.participatingBombCount === 1, 'Normal Core fixture drifted.');
  ok(chain.activation.bombOutcome === 'chain-clear', 'Chain Core fixture drifted.');
  const chainActivation = chain.activation as Chain;
  ok(JSON.stringify(chainActivation.chainTriggerRows) === '[39]' && chainActivation.participatingBombCount === 2, 'Row-39 Core chain drifted.');
  return { normal, chain, plans: { full: mutationChainPresentationPlan(chainActivation.chainTriggerRows, false), reduced: mutationChainPresentationPlan(chainActivation.chainTriggerRows, true) } };
}

export const FIXTURES = createFixtures();
export const NORMAL_IMPACT_MS = MUTATION_VFX_TOKENS.bomb.animation.enterMs + MUTATION_VFX_TOKENS.bomb.animation.pulseMs;
export const REVIEW_HOLD_MS = 280;
export function productDurationMs(scene: Scene, reduced: boolean): number {
  return scene === 'normal' ? MUTATION_VFX_TOKENS.bomb.animation.activationMs : (reduced ? FIXTURES.plans.reduced.durationMs : FIXTURES.plans.full.durationMs);
}
export function reviewDurationMs(scene: Scene, reduced: boolean): number { return productDurationMs(scene, reduced) + REVIEW_HOLD_MS; }

export class ProductRendererSession {
  private renderer: TetrisRenderer | null = null;
  private scene: Scene | null = null;
  private reduced = false;
  private elapsed = 0;
  private raf: number | null = null;
  private lastFrameAt = 0;
  private generation = 0;
  private settledCount = 0;
  private disposed = false;
  constructor(private host: HTMLElement, private changed: () => void = () => {}) {}

  async init() {
    ok(!this.disposed, 'Renderer disposed.');
    const renderer = new TetrisRenderer();
    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: false, modeSwitch: false });
    await renderer.init(this.host);
    if (this.disposed) { renderer.destroy(); return; }
    this.renderer = renderer;
    renderer.render(FIXTURES.normal.hardDropState, [{ type: 'restarted' }], 0);
    ok(this.host.querySelectorAll('canvas').length === 1, 'Renderer must own one Canvas.');
    this.changed();
  }

  play(scene: Scene, reduced = false, deterministic = false) {
    const renderer = this.renderer;
    ok(renderer && !this.disposed, 'Renderer unavailable.');
    this.cancelFrame();
    const generation = ++this.generation;
    this.scene = scene;
    this.reduced = reduced;
    this.elapsed = 0;
    this.lastFrameAt = 0;
    const fixture = FIXTURES[scene];
    renderer.setOptions({ reducedMotion: reduced });
    renderer.render(fixture.committedState, fixture.committedEvents, 0);
    if (!deterministic) this.raf = requestAnimationFrame((now) => this.onFrame(now, generation));
    this.changed();
  }

  private onFrame(now: number, generation: number) {
    if (generation !== this.generation || !this.scene || !this.renderer || this.disposed) return;
    const delta = this.lastFrameAt === 0 ? 0 : Math.min(100, Math.max(0, now - this.lastFrameAt));
    this.lastFrameAt = now;
    this.advance(delta);
    if (!this.scene || generation !== this.generation) return;
    this.raf = requestAnimationFrame((next) => this.onFrame(next, generation));
  }

  advance(ms: number) {
    if (!this.renderer || !this.scene) return;
    let remaining = Math.max(0, ms);
    while (remaining > 0 && this.scene) {
      const delta = Math.min(remaining, 1_000 / 60);
      remaining -= delta;
      this.elapsed += delta;
      this.renderer.render(FIXTURES[this.scene].committedState, [], delta);
      if (this.elapsed >= reviewDurationMs(this.scene, this.reduced)) this.settle();
    }
    this.changed();
  }

  private cancelFrame() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastFrameAt = 0;
  }
  private settle() {
    if (!this.scene) return;
    this.cancelFrame();
    this.scene = null;
    this.elapsed = 0;
    this.settledCount += 1;
    this.renderer?.render(FIXTURES.normal.hardDropState, [{ type: 'restarted' }], 0);
  }
  stop() {
    ++this.generation;
    this.cancelFrame();
    this.scene = null;
    this.elapsed = 0;
    if (this.renderer) this.renderer.render(FIXTURES.normal.hardDropState, [{ type: 'restarted' }], 0);
    this.changed();
  }
  state() {
    const snapshot = this.renderer?.getSnapshot();
    return { ready: !!this.renderer && !this.disposed, disposed: this.disposed, scene: this.scene, reducedMotion: this.reduced, elapsedMs: this.elapsed, frameCallbacks: this.raf === null ? 0 : 1, settledCount: this.settledCount, tickerOwners: this.renderer ? 1 : 0, rendererOwners: this.renderer ? 1 : 0, canvasCount: this.host.querySelectorAll('canvas').length, particles: snapshot?.mutationActiveParticleCount ?? 0 };
  }
  fixtureState() {
    const chain = FIXTURES.chain.activation as Chain;
    return { normalOutcome: FIXTURES.normal.activation.bombOutcome, normalParticipants: FIXTURES.normal.activation.participatingBombCount, chainOutcome: chain.bombOutcome, chainParticipants: chain.participatingBombCount, chainTriggerRows: [...chain.chainTriggerRows], fullBeatStartsMs: [...FIXTURES.plans.full.beatStartsMs], reducedBeatStartsMs: [...FIXTURES.plans.reduced.beatStartsMs], fullDurationMs: FIXTURES.plans.full.durationMs, reducedDurationMs: FIXTURES.plans.reduced.durationMs, normalDurationMs: productDurationMs('normal', false), reviewHoldMs: REVIEW_HOLD_MS, boardWidth: BOARD_WIDTH, boardHeight: BOARD_HEIGHT, visibleStartRow: VISIBLE_START_ROW, normalImpactMs: NORMAL_IMPACT_MS };
  }
  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.renderer?.destroy();
    this.renderer = null;
    this.host.replaceChildren();
    this.changed();
  }
}
