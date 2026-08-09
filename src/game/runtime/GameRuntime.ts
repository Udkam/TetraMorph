import { AudioEngine } from '../audio/AudioEngine';
import {
  CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
  CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
  createInitialState,
  dispatch,
  normalizeClassicGravityFloorTicks,
  normalizeClassicStartingGravityTicks,
  type GameCommand,
  type GameEvent,
  type GameMode,
  type GameState,
  type PuzzleId,
} from '../core';
import { InputController, type InputAction } from '../input/InputController';
import {
  TetrisRenderer,
  type RendererBoardCapture,
  type RendererSnapshot,
} from '../render/TetrisRenderer';
import { browserPlatform, type BrowserPlatform, type PlatformUnsubscribe } from '../../platform/browserPlatform';
import { DEFAULT_VISUAL_THEME, type VisualThemeId } from '../../design/visualThemes';

const FIXED_STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;
const UI_SYNC_INTERVAL_MS = 100;
let runtimeSeedNonce = 0;

/** A non-zero presentation/runtime seed for an ordinary new run. Puzzle replaces it with its authored seed. */
export function randomRunSeed(): number {
  const cryptographic = globalThis.crypto;
  if (cryptographic?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptographic.getRandomValues(values);
    return values[0] || 1;
  }
  runtimeSeedNonce = (runtimeSeedNonce + 0x9e3779b9) >>> 0;
  return ((Date.now() ^ Math.floor(browserPlatform.now() * 1000) ^ runtimeSeedNonce) >>> 0) || 1;
}

export interface RuntimeOptions {
  seed?: number;
  mode?: GameMode;
  puzzleId?: PuzzleId;
  inputEnabled?: boolean;
  reducedMotion?: boolean;
  visualTheme?: VisualThemeId;
  survivalEntryBedrockRows?: number | null;
  classicStartingGravityTicks?: number;
  classicGravityFloorTicks?: number;
  audioEnabled?: boolean;
  audioVolume?: number;
  platform?: BrowserPlatform;
  onState?: (state: GameState, events: readonly GameEvent[]) => void;
}

export interface RuntimeQaSurface {
  getState: () => GameState;
  getRendererSnapshot: () => RendererSnapshot;
  captureBoardPng: () => RendererBoardCapture;
  start: () => void;
  selectMode: (mode: GameMode) => void;
  selectPuzzle: (puzzleId: PuzzleId) => void;
  restart: () => void;
  action: (action: InputAction) => void;
  release: (action: InputAction) => void;
  advanceTicks: (ticks: number) => void;
  setFrozen: (frozen: boolean) => void;
  benchmarkRender: (iterations?: number) => { meanMs: number; p95Ms: number; maxMs: number };
}

declare global {
  interface Window {
    __TETRAMORPH_QA__?: RuntimeQaSurface;
  }
}

export class GameRuntime {
  private state: GameState;
  private readonly renderer = new TetrisRenderer();
  private readonly audio: AudioEngine;
  private readonly platform: BrowserPlatform;
  private input: InputController | null = null;
  private removeVisibilityListener: PlatformUnsubscribe | null = null;
  private accumulator = 0;
  private pendingEvents: GameEvent[] = [];
  private pendingUiEvents: GameEvent[] = [];
  private uiSyncElapsedMs = 0;
  private uiStateDirty = false;
  private destroyed = false;
  private qaFrozen = false;
  private inputEnabled: boolean;
  private survivalEntryBedrockRows: number | null;
  private nextClassicStartingGravityTicks: number;
  private nextClassicGravityFloorTicks: number;
  private readonly onState?: RuntimeOptions['onState'];

  constructor(private readonly options: RuntimeOptions = {}) {
    this.platform = options.platform ?? browserPlatform;
    this.audio = new AudioEngine(this.platform);
    this.nextClassicStartingGravityTicks = normalizeClassicStartingGravityTicks(
      options.classicStartingGravityTicks ?? CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS,
    );
    this.nextClassicGravityFloorTicks = normalizeClassicGravityFloorTicks(
      options.classicGravityFloorTicks ?? CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS,
      this.nextClassicStartingGravityTicks,
    );
    this.state = createInitialState(
      options.seed,
      options.mode,
      options.puzzleId,
      this.nextClassicStartingGravityTicks,
      this.nextClassicGravityFloorTicks,
    );
    this.inputEnabled = options.inputEnabled ?? true;
    this.survivalEntryBedrockRows = options.survivalEntryBedrockRows ?? null;
    this.onState = options.onState;
    this.audio.setEnabled(options.audioEnabled ?? true);
    this.audio.setVolume(options.audioVolume ?? 1);
    this.audio.setAmbientTheme(options.visualTheme ?? DEFAULT_VISUAL_THEME);
  }

  async mount(host: HTMLElement): Promise<void> {
    await this.renderer.init(host);
    if (this.destroyed) {
      this.renderer.destroy();
      return;
    }
    this.renderer.setOptions({
      reducedMotion: this.options.reducedMotion ?? false,
      visualTheme: this.options.visualTheme ?? DEFAULT_VISUAL_THEME,
      survivalEntryBedrockRows: this.survivalEntryBedrockRows,
    });
    this.renderer.setFrameCallback(this.frame);
    this.input = new InputController((action) => this.handleAction(action, true), this.platform.windowTarget(), this.onWindowBlur);
    this.removeVisibilityListener = this.platform.listenVisibility(this.onVisibilityChange);
    this.onState?.(this.state, []);
    this.renderer.render(this.state, [], 0);

    if (import.meta.env.DEV) {
      const target = this.platform.windowTarget();
      if (target) target.__TETRAMORPH_QA__ = {
        getState: () => structuredClone(this.state),
        getRendererSnapshot: () => this.renderer.getSnapshot(),
        captureBoardPng: () => this.renderer.captureBoardPng(),
        start: () => this.start(),
        selectMode: (mode) => this.selectMode(mode),
        selectPuzzle: (puzzleId) => this.selectPuzzle(puzzleId),
        restart: () => this.restart(),
        action: (action) => this.handleAction(action, false),
        release: (action) => this.input?.release(action),
        advanceTicks: (ticks) => {
          for (let index = 0; index < ticks; index += 1) this.fixedStep();
          this.flushUiState();
          this.flushRender(0);
        },
        setFrozen: (frozen) => {
          this.qaFrozen = frozen;
          this.accumulator = 0;
        },
        benchmarkRender: (iterations) => this.renderer.benchmark(this.state, iterations),
      };
    }
  }

  press(action: InputAction): void {
    this.input?.press(action);
  }

  start(): void {
    if (!this.inputEnabled) return;
    void this.audio.prime();
    this.apply({ type: 'start' });
  }

  togglePause(): void {
    if (!this.inputEnabled) return;
    void this.audio.prime();
    if (this.state.status === 'paused') this.apply({ type: 'resume' });
    else if (this.state.status === 'playing') this.apply({ type: 'pause' });
    this.input?.clearHeld();
  }

  resume(): void {
    if (!this.inputEnabled || this.state.status !== 'paused') return;
    void this.audio.prime();
    this.apply({ type: 'resume' });
    this.input?.clearHeld();
  }

  /** Puzzle-only undo entrypoint for the touch-safe game control. */
  undoPuzzle(): void {
    if (!this.inputEnabled) return;
    void this.audio.prime();
    this.input?.clearHeld();
    this.apply({ type: 'undo' });
  }

  restart(seed?: number, mode = this.state.mode, puzzleId = this.state.puzzleId ?? undefined): void {
    if (!this.inputEnabled) return;
    void this.audio.prime();
    this.apply({
      type: 'restart',
      seed: mode === 'puzzle' ? this.state.seed : seed ?? randomRunSeed(),
      mode,
      puzzleId,
      classicStartingGravityTicks: this.nextClassicStartingGravityTicks,
      classicGravityFloorTicks: this.nextClassicGravityFloorTicks,
    });
    this.input?.clearHeld();
  }

  selectMode(mode: GameMode): void {
    if (!this.inputEnabled) return;
    if (this.state.status !== 'ready' && this.state.status !== 'game-over' && this.state.status !== 'finished') return;
    this.apply({
      type: 'restart',
      seed: mode === 'puzzle' ? this.state.seed : randomRunSeed(),
      mode,
      classicStartingGravityTicks: this.nextClassicStartingGravityTicks,
      classicGravityFloorTicks: this.nextClassicGravityFloorTicks,
    });
    this.input?.clearHeld();
  }

  /** Selects a validated authored Puzzle level through the public restart command. */
  selectPuzzle(puzzleId: PuzzleId): void {
    if (!this.inputEnabled) return;
    if (this.state.status !== 'ready' && this.state.status !== 'game-over' && this.state.status !== 'finished') return;
    this.apply({
      type: 'restart',
      seed: this.state.seed,
      mode: 'puzzle',
      puzzleId,
      classicStartingGravityTicks: this.nextClassicStartingGravityTicks,
      classicGravityFloorTicks: this.nextClassicGravityFloorTicks,
    });
    this.input?.clearHeld();
  }

  setModeSwitch(open: boolean): void {
    this.renderer.setOptions({ modeSwitch: open });
    this.flushRender(0);
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.renderer.setOptions({ reducedMotion });
  }

  setVisualTheme(visualTheme: VisualThemeId): void {
    this.renderer.setOptions({ visualTheme });
    this.audio.setAmbientTheme(visualTheme);
    this.flushRender(0);
  }

  setSurvivalEntryBedrockRows(rows: number | null): void {
    this.survivalEntryBedrockRows = rows;
    this.renderer.setOptions({ survivalEntryBedrockRows: rows });
    this.flushRender(0);
  }

  /** Stores both Classic pace bounds for the next run without mutating this run. */
  setClassicGravityRange(startingTicks: number, floorTicks: number): void {
    this.nextClassicStartingGravityTicks = normalizeClassicStartingGravityTicks(startingTicks);
    this.nextClassicGravityFloorTicks = normalizeClassicGravityFloorTicks(
      floorTicks,
      this.nextClassicStartingGravityTicks,
    );
  }

  /** Re-renders renderer-owned presentation after React commits new layout geometry. */
  refreshPresentation(): void {
    if (this.destroyed) return;
    this.flushRender(0);
  }

  setInputEnabled(enabled: boolean): void {
    if (this.inputEnabled === enabled) return;
    this.inputEnabled = enabled;
    this.input?.clearHeld();
  }

  release(action: InputAction): void {
    this.input?.release(action);
  }

  setAudioEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
    if (enabled) void this.audio.prime().then(() => this.audio.syncMutationState(this.state));
  }

  setAudioVolume(volume: number): void {
    this.audio.setVolume(volume);
  }

  /** Countdown presentation may sound while gameplay input is still gated. */
  playEntryCountdown(digit: 3 | 2 | 1): void {
    if (this.destroyed) return;
    void this.audio.prime()
      .then(() => {
        if (!this.destroyed) this.audio.playEntryCountdown(digit);
      })
      .catch(() => {
        // Hosts may deny autoplay until a later gesture; countdown remains visual.
      });
  }

  /** Resolves the countdown as its cover begins the final gated exit. */
  playEntryCountdownResolve(): void {
    if (this.destroyed) return;
    void this.audio.prime()
      .then(() => {
        if (!this.destroyed) this.audio.playEntryCountdownResolve();
      })
      .catch(() => {
        // Hosts may deny autoplay until a later gesture; countdown remains visual.
      });
  }

  getState(): GameState {
    return this.state;
  }

  getRendererSnapshot(): RendererSnapshot {
    return this.renderer.getSnapshot();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removeVisibilityListener?.();
    this.removeVisibilityListener = null;
    this.input?.destroy();
    this.input = null;
    this.renderer.destroy();
    this.audio.destroy();
    this.pendingEvents = [];
    this.pendingUiEvents = [];
    this.state = { ...this.state, puzzleUndoHistory: Object.freeze([]) };
    const target = this.platform.windowTarget();
    if (target) delete target.__TETRAMORPH_QA__;
  }

  private readonly frame = (deltaMs: number): void => {
    if (this.destroyed) return;
    if (this.qaFrozen) {
      this.flushRender(deltaMs);
      return;
    }
    this.accumulator += deltaMs;
    this.uiSyncElapsedMs += deltaMs;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.fixedStep();
      this.accumulator -= FIXED_STEP_MS;
      steps += 1;
    }
    if (this.uiStateDirty && this.uiSyncElapsedMs >= UI_SYNC_INTERVAL_MS) this.flushUiState();
    this.flushRender(deltaMs);
  };

  private fixedStep(): void {
    this.input?.step();
    this.apply({ type: 'tick' });
  }

  private flushRender(deltaMs: number): void {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    this.renderer.render(this.state, events, deltaMs);
  }

  private apply(command: GameCommand): void {
    const transition = dispatch(this.state, command);
    if (transition.state === this.state && transition.events.length === 0) return;
    this.state = transition.state;
    this.pendingEvents.push(...transition.events);
    this.pendingUiEvents.push(...transition.events);
    this.uiStateDirty = true;
    this.audio.play(transition.events);
    this.audio.syncMutationState(this.state);
    if (transition.events.some(isImmediateUiEvent)) this.flushUiState();
  }

  private flushUiState(): void {
    if (!this.uiStateDirty) return;
    const events = this.pendingUiEvents;
    this.pendingUiEvents = [];
    this.uiStateDirty = false;
    this.uiSyncElapsedMs = 0;
    this.onState?.(this.state, events);
  }

  private readonly handleAction = (action: InputAction, shouldPrimeAudio: boolean): void => {
    if (!this.inputEnabled) return;
    if (shouldPrimeAudio) void this.audio.prime();
    if (action === 'pause') {
      if (this.state.status === 'playing') this.apply({ type: 'pause' });
      this.input?.clearHeld();
      return;
    }
    if (action === 'restart') {
      this.restart();
      this.start();
      return;
    }
    if (action === 'undo') {
      this.input?.clearHeld();
      this.apply({ type: 'undo' });
      return;
    }
    if (this.state.status === 'ready') this.apply({ type: 'start' });
    if (this.state.status !== 'playing') return;

    const command: Record<Exclude<InputAction, 'pause' | 'restart' | 'undo'>, GameCommand> = {
      left: { type: 'move', dx: -1 },
      right: { type: 'move', dx: 1 },
      'soft-drop': { type: 'soft-drop' },
      'hard-drop': { type: 'hard-drop' },
      'rotate-cw': { type: 'rotate', direction: 1 },
      'rotate-ccw': { type: 'rotate', direction: -1 },
    };
    this.apply(command[action]);
  };

  private readonly onVisibilityChange = (): void => {
    if (this.platform.documentHidden() && this.state.status === 'playing') {
      this.apply({ type: 'pause' });
      this.input?.clearHeld();
      this.audio.suspend();
    }
  };

  private readonly onWindowBlur = (): void => {
    if (this.state.status !== 'playing') return;
    this.apply({ type: 'pause' });
    this.audio.suspend();
  };
}

function isImmediateUiEvent(event: GameEvent): boolean {
  return event.type === 'started'
    || event.type === 'restarted'
    || event.type === 'paused'
    || event.type === 'resumed'
    || event.type === 'puzzle-undone'
    || event.type === 'clear-started'
    || event.type === 'lines-cleared'
    || event.type === 'level-up'
    || event.type === 'finished'
    || event.type === 'game-over';
}
