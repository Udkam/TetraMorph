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
import { createMutationActivationTimeline } from '../../../../src/animation/mutationTimeline';
import { MUTATION_VFX_TOKENS } from '../../../../src/design/mutationTokens';
import { TetrisRenderer } from '../../../../src/game/render/TetrisRenderer';

export const NORMAL_BOMB_IMPACT_MS = MUTATION_VFX_TOKENS.bomb.animation.enterMs
  + MUTATION_VFX_TOKENS.bomb.animation.pulseMs;
export const NORMAL_BOMB_DURATION_MS = createMutationActivationTimeline('bomb').duration;
export const REVIEW_HOLD_MS = 850;
export const NORMAL_BOMB_REVIEW_MS = NORMAL_BOMB_DURATION_MS + REVIEW_HOLD_MS;

type BombActivation = Extract<GameEvent, { type: 'mutation-activated'; item: 'bomb' }>;

export interface NormalBombFixture {
  initialState: GameState;
  hardDropState: GameState;
  hardDropEvents: readonly GameEvent[];
  committedState: GameState;
  committedEvents: readonly GameEvent[];
  clearStarted: Extract<GameEvent, { type: 'clear-started' }>;
  activation: BombActivation;
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function createNormalBombFixture(): NormalBombFixture {
  let board = createBoard();
  for (let x = 0; x < 8; x += 1) board = setCell(board, x, 39, 'J');
  board = setCell(board, 0, 37, 'L');
  board = setCell(board, 1, 38, 'S');
  const started = dispatch(createInitialState(0x37b04a, 'sprint'), { type: 'start' }).state;
  const initialState: GameState = {
    ...started,
    board,
    active: { type: 'O', rotation: 0, x: 8, y: 38 },
    queue: ['T', 'I', 'S', 'Z', 'J'],
    mutationActiveCarrier: { id: 9, item: 'bomb' },
    mutationCarriers: [],
    mutationNextCarrierId: 10,
    score: 0,
    status: 'playing',
    phase: 'active',
    phaseTicks: 0,
    pendingClearRows: [],
  };
  const hardDrop = dispatch(initialState, { type: 'hard-drop' });
  let commit = hardDrop;
  for (let tick = 0; tick < LINE_CLEAR_DELAY_TICKS; tick += 1) {
    commit = dispatch(commit.state, { type: 'tick' });
  }

  const clearStarted = hardDrop.events.find((event): event is Extract<GameEvent, { type: 'clear-started' }> => (
    event.type === 'clear-started'
  ));
  const activation = commit.events.find((event): event is BombActivation => (
    event.type === 'mutation-activated' && event.item === 'bomb'
  ));
  const lineCleared = commit.events.find((event) => event.type === 'lines-cleared');
  invariant(clearStarted, 'Core fixture did not emit clear-started.');
  invariant(activation, 'Core fixture did not emit a Bomb activation.');
  invariant(JSON.stringify(clearStarted.rows) === '[39]', 'Core clear rows drifted from [39].');
  invariant(clearStarted.mutationBombOutcome === 'blast', 'Core preview is not a normal blast.');
  invariant(activation.bombOutcome === 'blast', 'Core activation is not a normal blast.');
  invariant(JSON.stringify(activation.blastRows) === '[38,39]', 'Core blast rows drifted from [38,39].');
  invariant(activation.participatingBombCount === 1, 'Normal fixture no longer has exactly one Bomb.');
  invariant(JSON.stringify(activation.triggerCells) === JSON.stringify([
    { x: 8, y: 38 }, { x: 9, y: 38 }, { x: 8, y: 39 }, { x: 9, y: 39 },
  ]), 'Normal fixture trigger cells drifted.');
  invariant(!('chainOriginCarrierId' in activation), 'Normal activation leaked chainOriginCarrierId.');
  invariant(!('chainOriginCells' in activation), 'Normal activation leaked chainOriginCells.');
  invariant(!('chainTriggerRows' in activation), 'Normal activation leaked chainTriggerRows.');
  invariant(JSON.stringify(lineCleared?.rows) === '[39]', 'Core committed clear row drifted.');
  invariant(NORMAL_BOMB_IMPACT_MS === 220, 'Production token impact is no longer 220 ms.');
  const timeline = createMutationActivationTimeline('bomb');
  timeline.advance(NORMAL_BOMB_IMPACT_MS);
  invariant(timeline.sample('impact').active && timeline.sample('impact').progress === 0, 'Production timeline impact drifted.');

  return {
    initialState,
    hardDropState: hardDrop.state,
    hardDropEvents: hardDrop.events,
    committedState: commit.state,
    committedEvents: commit.events,
    clearStarted,
    activation,
  };
}

export interface RendererState {
  ready: boolean;
  reducedMotion: boolean;
  elapsedMs: number;
  reviewElapsedMs: number;
  impactMs: number;
  durationMs: number;
  activeCandidate: string | null;
  canvasCount: number;
  activeParticles: number;
  cleanupComplete: boolean;
  mutationActivation: ReturnType<TetrisRenderer['getSnapshot']>['mutationActivation'];
}

export class NormalBombRendererSession {
  private renderer: TetrisRenderer | null = null;
  private readonly fixture = createNormalBombFixture();
  private elapsedMs = 0;
  private reducedMotion = false;
  private activeCandidate: string | null = null;
  private disposed = false;

  constructor(private readonly host: HTMLElement, private readonly onFrame: () => void) {}

  async init(): Promise<void> {
    const renderer = new TetrisRenderer();
    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: false, modeSwitch: false });
    await renderer.init(this.host);
    if (this.disposed) { renderer.destroy(); return; }
    this.renderer = renderer;
    renderer.render(this.fixture.hardDropState, [{ type: 'restarted' }], 0);
    invariant(this.host.querySelectorAll('canvas').length === 1, 'Renderer init did not preserve one Canvas.');
    this.onFrame();
  }

  play(candidate: string, reducedMotion: boolean): void {
    invariant(this.renderer, 'Production Renderer is not ready.');
    this.renderer.setFrameCallback(() => {});
    this.reducedMotion = reducedMotion;
    this.activeCandidate = candidate;
    this.elapsedMs = 0;
    this.renderer.render(this.fixture.hardDropState, [{ type: 'restarted' }], 0);
    this.renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion, modeSwitch: false });
    this.renderer.render(this.fixture.committedState, this.fixture.committedEvents, 0);
    invariant(this.host.querySelectorAll('canvas').length === 1, 'Replay did not preserve one Canvas.');
    this.resume();
    this.onFrame();
  }

  pause(): void {
    this.renderer?.setFrameCallback(() => {});
  }

  resume(): void {
    if (!this.renderer || !this.activeCandidate || this.elapsedMs >= NORMAL_BOMB_REVIEW_MS) return;
    this.renderer.setFrameCallback((deltaMs) => this.advance(Math.min(deltaMs, 100)));
  }

  advance(ms: number): void {
    if (!this.renderer || !this.activeCandidate || ms <= 0) return;
    let remaining = Math.min(ms, Math.max(0, NORMAL_BOMB_REVIEW_MS - this.elapsedMs));
    while (remaining > 0) {
      const delta = Math.min(remaining, 1_000 / 60);
      this.elapsedMs += delta;
      remaining -= delta;
      this.renderer.render(this.fixture.committedState, [], delta);
    }
    if (this.elapsedMs >= NORMAL_BOMB_REVIEW_MS) {
      this.renderer.setFrameCallback(() => {});
      const snapshot = this.renderer.getSnapshot();
      invariant(snapshot.mutationActivation === null, 'Normal Bomb activation survived the review hold.');
      invariant(snapshot.mutationActiveParticleCount === 0, 'Normal Bomb particles survived the review hold.');
      this.activeCandidate = null;
    }
    this.onFrame();
  }

  state(): RendererState {
    const snapshot = this.renderer?.getSnapshot();
    return {
      ready: this.renderer !== null,
      reducedMotion: this.reducedMotion,
      elapsedMs: Math.min(this.elapsedMs, NORMAL_BOMB_DURATION_MS),
      reviewElapsedMs: this.elapsedMs,
      impactMs: NORMAL_BOMB_IMPACT_MS,
      durationMs: NORMAL_BOMB_DURATION_MS,
      activeCandidate: this.activeCandidate,
      canvasCount: this.host.querySelectorAll('canvas').length,
      activeParticles: snapshot?.mutationActiveParticleCount ?? 0,
      cleanupComplete: this.elapsedMs >= NORMAL_BOMB_REVIEW_MS
        && snapshot?.mutationActivation === null
        && (snapshot?.mutationActiveParticleCount ?? 0) === 0,
      mutationActivation: snapshot?.mutationActivation ?? null,
    };
  }

  fixtureState() {
    return {
      clearRows: [...this.fixture.clearStarted.rows],
      previewOutcome: this.fixture.clearStarted.mutationBombOutcome,
      bombOutcome: this.fixture.activation.bombOutcome,
      blastRows: [...this.fixture.activation.blastRows],
      participatingBombCount: this.fixture.activation.participatingBombCount,
      triggerCells: this.fixture.activation.triggerCells?.map((cell) => ({ ...cell })) ?? [],
      hasChainOriginCarrierId: 'chainOriginCarrierId' in this.fixture.activation,
      hasChainOriginCells: 'chainOriginCells' in this.fixture.activation,
      hasChainTriggerRows: 'chainTriggerRows' in this.fixture.activation,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      visibleStartRow: VISIBLE_START_ROW,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer?.setFrameCallback(() => {});
    this.renderer?.destroy();
    this.renderer = null;
    this.host.replaceChildren();
    this.activeCandidate = null;
    this.onFrame();
  }
}
