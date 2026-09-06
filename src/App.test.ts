// @vitest-environment jsdom

// @ts-expect-error Vitest runs this test in Node while the product tsconfig intentionally omits Node globals.
import { readFileSync } from 'node:fs';
import { act, createElement, StrictMode, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import styles from './styles.css?raw';
import { CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS, CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS, MUTATION_EFFECT_TICKS, MUTATION_SUPERGRAVITY_PIECES, PIECE_TYPES, createInitialState, dispatch, getEndgameDefinition, nextMutationPreviewItem, type GameEvent, type GameMode, type GameState, type PieceType, type EndgameId } from './game/core';
import App, {
  cloneQaState,
  countdownTimeLabel,
  elapsedClockLabel,
  elapsedTimeLabel,
  eventMessage,
  eventMessages,
  fallCadenceLabel,
  fallCadenceParts,
  GameSession,
  LeaderboardPanel,
  MutationStatus,
  ModeHome,
  EndgameLibrary,
  parseReducedMotionOverride,
  parseClassicGravityRange,
  endgameAnchorSilhouettePath,
  endgameCelebrationCopy,
  endgameCelebrationOutcome,
  endgameSilhouettePaths,
  runResultMetrics,
  RunResultSummary,
  RunStats,
  REDUCED_MOTION_STORAGE_KEY,
  CLASSIC_PACE_STORAGE_KEY,
  CLASSIC_GRAVITY_RANGE_STORAGE_KEY,
  SettingsRecord,
  scoreRecordRank,
  scoreRecordForState,
  survivalCountdownLabel,
  survivalStoneCountdownPieces,
  terminalCopy,
} from './App';
import {
  CAMPAIGN_LEVELS,
  defaultEndgameProgress,
  ENDGAME_CATEGORIES,
  ENDGAME_CAMPAIGN_REVISION,
  ENDGAME_PROGRESS_KEY,
  type EndgameProgress,
} from './endgameProgress';
import { ENDGAME_HARD_MASTERY_GROUPS, ENDGAME_OPTIMAL_CERTIFICATES } from './endgameMastery';
import { LEADERBOARD_KEY, emptyLeaderboard, type ScoreRecord } from './leaderboard';
import { appCopy, itemLabel, modeIntroRules, modeRules, modeRulesTitle } from './ui/localization';
import type { VisualThemeId } from './design/visualThemes';
import { appHistoryStateFor, appNavigationFromHistory } from './navigation/appRoute';
import { ActionSheet, ActionSheetFamily } from './ui/ActionSheet';
import { browserPlatform } from './platform/browserPlatform';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const sourceStyles = readFileSync('src/styles.css', 'utf8');
const sourceHudStyles = readFileSync('src/styles/hud.css', 'utf8');
const sourceSettingsStyles = readFileSync('src/styles/settings.css', 'utf8');
const sourceResultStyles = readFileSync('src/styles/result.css', 'utf8');
const endgameLibraryStyles = readFileSync('src/styles/endgame-library.css', 'utf8');
const sourceIndex = readFileSync('index.html', 'utf8');

interface RuntimeTestOptions {
  seed?: number;
  mode?: GameMode;
  endgameId?: EndgameId;
  inputEnabled?: boolean;
  reducedMotion?: boolean;
  visualTheme?: VisualThemeId;
  survivalEntryBedrockRows?: number | null;
  classicStartingGravityTicks?: number;
  classicGravityFloorTicks?: number;
  onState?: (state: GameState, events: readonly GameEvent[]) => void;
}

interface RuntimeTestInstance {
  options: RuntimeTestOptions;
  setInputEnabled: ReturnType<typeof vi.fn>;
  setSurvivalEntryBedrockRows: ReturnType<typeof vi.fn>;
  setReducedMotion: ReturnType<typeof vi.fn>;
  setVisualTheme: ReturnType<typeof vi.fn>;
  setClassicGravityRange: ReturnType<typeof vi.fn>;
  refreshPresentation: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  restart: ReturnType<typeof vi.fn>;
  undoEndgame: ReturnType<typeof vi.fn>;
  togglePause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  setAudioEnabled: ReturnType<typeof vi.fn>;
  setAudioVolume: ReturnType<typeof vi.fn>;
  playEntryCountdown: ReturnType<typeof vi.fn>;
  playEntryCountdownResolve: ReturnType<typeof vi.fn>;
  press: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  getState: () => GameState;
  setState: (state: GameState) => void;
}

const runtimeHarness = vi.hoisted(() => ({
  instances: [] as RuntimeTestInstance[],
  mountGate: null as Promise<void> | null,
  mountError: null as Error | null,
}));

vi.mock('./game/runtime/GameRuntime', async () => {
  const core = await vi.importActual<typeof import('./game/core')>('./game/core');
  return {
    randomRunSeed: () => 0x51a1f00d,
    GameRuntime: class {
    private state: GameState;
    private nextClassicStartingGravityTicks: number;
    private nextClassicGravityFloorTicks: number;
    private canvas: HTMLCanvasElement | null = null;
    private destroyed = false;
    readonly setInputEnabled = vi.fn();
    readonly setSurvivalEntryBedrockRows = vi.fn();
    readonly setReducedMotion = vi.fn();
    readonly setVisualTheme = vi.fn();
    readonly setClassicGravityRange = vi.fn((startingTicks: number, floorTicks: number) => {
      this.nextClassicStartingGravityTicks = startingTicks;
      this.nextClassicGravityFloorTicks = floorTicks;
    });
    readonly refreshPresentation = vi.fn();
    readonly setAudioEnabled = vi.fn();
    readonly setAudioVolume = vi.fn();
    readonly playEntryCountdown = vi.fn();
    readonly playEntryCountdownResolve = vi.fn();
    readonly start = vi.fn(() => {
      const transition = core.dispatch(this.state, { type: 'start' });
      this.state = transition.state;
      this.options.onState?.(this.state, transition.events);
    });

    constructor(readonly options: RuntimeTestOptions) {
      this.nextClassicStartingGravityTicks = options.classicStartingGravityTicks ?? CLASSIC_STARTING_GRAVITY_DEFAULT_TICKS;
      this.nextClassicGravityFloorTicks = options.classicGravityFloorTicks ?? CLASSIC_GRAVITY_FLOOR_DEFAULT_TICKS;
      this.state = core.createInitialState(
        options.seed,
        options.mode,
        options.endgameId,
        this.nextClassicStartingGravityTicks,
        this.nextClassicGravityFloorTicks,
      );
      runtimeHarness.instances.push(this);
    }

    async mount(host: HTMLElement): Promise<void> {
      if (runtimeHarness.mountGate) await runtimeHarness.mountGate;
      if (this.destroyed) return;
      if (runtimeHarness.mountError) throw runtimeHarness.mountError;
      this.canvas = document.createElement('canvas');
      this.canvas.tabIndex = 0;
      host.append(this.canvas);
    }

    readonly press = vi.fn();
    readonly release = vi.fn();
    readonly togglePause = vi.fn(() => {
      if (this.state.status === 'playing') this.state = { ...this.state, status: 'paused' };
      else if (this.state.status === 'paused') this.state = { ...this.state, status: 'playing' };
      this.options.onState?.(this.state, []);
    });
    readonly resume = vi.fn(() => {
      if (this.state.status === 'paused') this.state = { ...this.state, status: 'playing' };
      this.options.onState?.(this.state, []);
    });
    readonly restart = vi.fn(() => {
      const transition = core.dispatch(this.state, {
        type: 'restart',
        classicStartingGravityTicks: this.nextClassicStartingGravityTicks,
        classicGravityFloorTicks: this.nextClassicGravityFloorTicks,
      });
      this.state = transition.state;
      this.options.onState?.(this.state, transition.events);
    });
    readonly undoEndgame = vi.fn(() => {
      const transition = core.dispatch(this.state, { type: 'undo' });
      this.state = transition.state;
      this.options.onState?.(this.state, transition.events);
    });
    getState(): GameState { return this.state; }
    setState(state: GameState): void {
      this.state = state;
      this.options.onState?.(this.state, []);
    }
    getRendererSnapshot(): Record<string, never> { return {}; }
    destroy(): void {
      this.destroyed = true;
      this.canvas?.remove();
    }
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document as unknown as Record<string, unknown>, 'startViewTransition');
  delete document.documentElement.dataset.routeDirection;
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  runtimeHarness.instances.length = 0;
  runtimeHarness.mountGate = null;
  runtimeHarness.mountError = null;
});

describe('T37 Settled Handoff route boundary', () => {
  interface ControlledTransition {
    readonly readyCatch: ReturnType<typeof vi.spyOn>;
    readonly updateCallbackDone: Promise<void>;
    readonly skipTransition: ReturnType<typeof vi.fn>;
    runUpdate(): Promise<void>;
    finish(): void;
    rejectFinished(error?: unknown): void;
  }

  function installControlledViewTransition() {
    const transitions: ControlledTransition[] = [];
    const startViewTransition = vi.fn((update: () => void | Promise<void>) => {
      let updatePromise: Promise<void> | null = null;
      let resolveUpdate!: () => void;
      let rejectUpdate!: (error: unknown) => void;
      let resolveReady!: () => void;
      let rejectReady!: (error: unknown) => void;
      let resolveFinished!: () => void;
      let rejectFinished!: (error: unknown) => void;
      const updateCallbackDone = new Promise<void>((resolve, reject) => {
        resolveUpdate = resolve;
        rejectUpdate = reject;
      });
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const readyCatch = vi.spyOn(ready, 'catch');
      const finished = new Promise<void>((resolve, reject) => {
        resolveFinished = resolve;
        rejectFinished = reject;
      });
      const controlled: ControlledTransition = {
        readyCatch,
        updateCallbackDone,
        skipTransition: vi.fn(() => {
          rejectReady(new Error('Transition was skipped'));
          resolveFinished();
        }),
        runUpdate: () => {
          if (updatePromise) return updatePromise;
          try {
            updatePromise = Promise.resolve(update());
          } catch (error) {
            updatePromise = Promise.reject(error);
          }
          void updatePromise.then(
            () => {
              resolveUpdate();
              resolveReady();
            },
            (error) => {
              rejectUpdate(error);
              rejectReady(error);
            },
          );
          return updatePromise;
        },
        finish: () => {
          resolveReady();
          resolveFinished();
        },
        rejectFinished: (error = new Error('transition failed')) => {
          resolveReady();
          rejectFinished(error);
        },
      };
      transitions.push(controlled);
      return { ready, finished, updateCallbackDone, skipTransition: controlled.skipTransition };
    });
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: startViewTransition,
    });
    return { startViewTransition, transitions };
  }

  function allowModes(...modes: GameMode[]) {
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(modes));
  }

  it('waits for the real game Canvas before completing the native update snapshot', async () => {
    allowModes('marathon');
    let releaseMount!: () => void;
    runtimeHarness.mountGate = new Promise<void>((resolve) => { releaseMount = resolve; });
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    expect(control.transitions).toHaveLength(1);
    let updateSettled = false;
    const update = control.transitions[0]!.runUpdate().then(() => { updateSettled = true; });
    await act(async () => Promise.resolve());

    expect(window.location.pathname).toBe('/play/classic');
    expect(view.container.querySelector('[data-testid="game-screen"]')).not.toBeNull();
    expect(view.container.querySelectorAll('canvas')).toHaveLength(0);
    expect(updateSettled).toBe(false);
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('native');

    releaseMount();
    await act(async () => update);
    expect(updateSettled).toBe(true);
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    control.transitions[0]!.finish();
    await act(async () => Promise.resolve());
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    view.unmount();
  });

  it('fails closed instead of treating the Canvas readiness timeout as success', async () => {
    vi.useFakeTimers();
    allowModes('marathon');
    let releaseMount!: () => void;
    runtimeHarness.mountGate = new Promise<void>((resolve) => { releaseMount = resolve; });
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    const update = control.transitions[0]!.runUpdate();
    await act(async () => Promise.resolve());
    expect(view.container.querySelectorAll('canvas')).toHaveLength(0);

    await act(async () => vi.advanceTimersByTimeAsync(800));
    await act(async () => update);
    expect(control.transitions[0]!.skipTransition).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    expect(view.container.querySelectorAll('canvas')).toHaveLength(0);

    view.unmount();
    releaseMount();
    await act(async () => Promise.resolve());
  });

  it('consumes a rejected runtime mount and skips the empty native destination', async () => {
    allowModes('marathon');
    runtimeHarness.mountError = new Error('WebGL unavailable');
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    await act(async () => control.transitions[0]!.runUpdate());

    expect(control.transitions[0]!.skipTransition).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    expect(view.container.querySelectorAll('canvas')).toHaveLength(0);
    view.unmount();
  });

  it('lets only the latest deferred navigation mutate History and React state', async () => {
    allowModes('marathon', 'endgame');
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')?.click());
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    expect(control.transitions).toHaveLength(2);
    expect(control.transitions[0]!.skipTransition).toHaveBeenCalledTimes(1);
    expect(control.transitions[0]!.readyCatch).toHaveBeenCalledTimes(1);
    expect(control.transitions[1]!.readyCatch).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/');

    await act(async () => control.transitions[1]!.runUpdate());
    await act(async () => control.transitions[0]!.runUpdate());
    expect(window.location.pathname).toBe('/play/classic');
    expect(view.container.querySelector('[data-testid="game-screen"]')).not.toBeNull();
    expect(view.container.querySelectorAll('.app-route-surface')).toHaveLength(1);
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);

    control.transitions[1]!.finish();
    await act(async () => Promise.resolve());
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    view.unmount();
  });

  it('uses a bounded continuously-visible fallback and restores library focus', async () => {
    vi.useFakeTimers();
    allowModes('endgame');
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')?.click());
    expect(window.location.pathname).toBe('/endgames');
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('fallback');
    await act(async () => vi.advanceTimersByTimeAsync(16));
    expect(document.activeElement).toBe(view.container.querySelector('[data-testid="level-row"][aria-pressed="true"]'));
    expect(view.container.querySelectorAll('[data-testid="route-viewport"]')).toHaveLength(1);

    const libraryViewport = view.container.querySelector('[data-testid="route-viewport"]');
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]')?.click());
    await act(async () => Promise.resolve());
    expect(window.location.pathname).toMatch(/^\/play\/endgame\//);
    expect(view.container.querySelector('[data-testid="route-viewport"]')).not.toBe(libraryViewport);
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('fallback');
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);

    await act(async () => vi.advanceTimersByTimeAsync(160));
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    view.unmount();
  });

  it('uses resolved reduced motion without a native transition or spatial route change', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    allowModes('endgame');
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')?.click());
    expect(control.startViewTransition).not.toHaveBeenCalled();
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('reduced');
    expect(view.container.querySelector('.app')?.getAttribute('data-route-direction')).toBe('forward');

    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    expect(view.container.querySelector('.app')?.getAttribute('data-route-direction')).toBe('neutral');

    const routeRoot = view.container.querySelector('[data-testid="endgame-library"]');
    const nextLevel = view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')[1]!;
    act(() => nextLevel.click());
    expect(window.location.pathname).toBe('/endgames');
    expect(appNavigationFromHistory('/endgames', window.history.state)?.selectedEndgameId)
      .toBe(nextLevel.dataset.levelId);
    expect(view.container.querySelector('[data-testid="endgame-library"]')).toBe(routeRoot);
    expect(control.startViewTransition).not.toHaveBeenCalled();
    view.unmount();
  });

  it('routes in-page selection through the same owner and skips an active native snapshot', async () => {
    allowModes('endgame');
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')?.click());
    await act(async () => control.transitions[0]!.runUpdate());
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('native');

    const nextLevel = view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')[1]!;
    act(() => nextLevel.click());
    expect(control.transitions[0]!.skipTransition).toHaveBeenCalledTimes(1);
    expect(control.transitions).toHaveLength(1);
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    expect(view.container.querySelector('.app')?.getAttribute('data-route-direction')).toBe('neutral');
    expect(appNavigationFromHistory('/endgames', window.history.state)?.selectedEndgameId)
      .toBe(nextLevel.dataset.levelId);
    view.unmount();
  });

  it('restores validated Endgame context and avoids double animation for UA history gestures', () => {
    const secondEndgameId = CAMPAIGN_LEVELS[1]!.id;
    const library = { screen: 'endgame-library', mode: 'endgame', selectedEndgameId: secondEndgameId } as const;
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => {
      window.history.pushState(appHistoryStateFor(library), '', '/endgames');
      const event = new PopStateEvent('popstate', { state: appHistoryStateFor(library) });
      Object.defineProperty(event, 'hasUAVisualTransition', { value: true });
      window.dispatchEvent(event);
    });

    expect(control.startViewTransition).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="endgame-library"]')).not.toBeNull();
    expect(view.container.querySelector(`[data-level-id="${secondEndgameId}"]`)?.getAttribute('aria-pressed')).toBe('true');
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    view.unmount();
  });

  it('cleans a rejected native completion back to idle without changing the committed route', async () => {
    allowModes('endgame');
    const control = installControlledViewTransition();
    const view = render(createElement(App));

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')?.click());
    await act(async () => control.transitions[0]!.runUpdate());
    control.transitions[0]!.rejectFinished();
    await act(async () => Promise.resolve());

    expect(window.location.pathname).toBe('/endgames');
    expect(view.container.querySelector('[data-testid="endgame-library"]')).not.toBeNull();
    expect(view.container.querySelector('.app')?.getAttribute('data-route-transition')).toBe('idle');
    view.unmount();
  });
});

function render(element: ReactNode): {
  container: HTMLDivElement;
  rerender: (next: ReactNode) => void;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => act(() => {
      root.unmount();
      container.remove();
    }),
  };
}

async function advanceEntryCountdown(): Promise<void> {
  for (let step = 0; step < 3; step += 1) {
    await act(async () => vi.advanceTimersByTimeAsync(500));
  }
  await act(async () => vi.advanceTimersByTimeAsync(220));
}

function expectRetiredSheet(container: HTMLElement, testId: string): HTMLElement {
  const content = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const backdrop = content?.closest<HTMLElement>('[data-testid="action-sheet-backdrop"]') ?? null;
  expect(backdrop?.dataset.sheetPhase).toBe('exit');
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(backdrop?.hasAttribute('inert')).toBe(true);
  expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
  return backdrop!;
}

function testSheet(open: boolean, label: string, reducedMotion = false, onClose = () => undefined) {
  return createElement(ActionSheetFamily, null,
    createElement(ActionSheet, { open, title: 'Layer', description: '', reducedMotion, onCancel: onClose, children: null },
      createElement('button', { type: 'button', 'data-autofocus': true, 'data-sheet-close': true, onClick: onClose }, label)));
}

function CloseRaceSheet({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const close = () => {
    onClose();
    setOpen(false);
  };
  return createElement('div', null,
    createElement('button', { type: 'button', 'data-testid': 'reopen-sheet', onClick: () => setOpen(true) }, 'reopen'),
    createElement(ActionSheet, { open, title: 'Race', description: '', onCancel: close, children: null },
      createElement('button', { type: 'button', 'data-autofocus': true, 'data-sheet-close': true, onClick: close }, 'close')));
}

describe('T37 D2A ActionSheet presence', () => {
  it('freezes committed content in an inert 120ms release shell', async () => {
    vi.useFakeTimers();
    const view = render(testSheet(true, 'committed'));
    expect(view.container.querySelector('[data-sheet-phase="enter"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(180));
    expect(view.container.querySelector('[data-sheet-phase="steady"]')).not.toBeNull();
    view.rerender(testSheet(false, 'new'));
    const retired = view.container.querySelector<HTMLElement>('[data-sheet-phase="exit"]')!;
    expect(retired.textContent).toContain('committed');
    expect(retired.textContent).not.toContain('new');
    expect(retired.hasAttribute('inert')).toBe(true);
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(119));
    expect(view.container.querySelector('[data-sheet-phase="exit"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(view.container.querySelector('[data-testid="action-sheet-backdrop"]')).toBeNull();
    view.unmount();
  });

  it('shortens an active phase when motion is reduced and ignores a stale exit timer', async () => {
    vi.useFakeTimers();
    const view = render(testSheet(true, 'one'));
    await act(async () => vi.advanceTimersByTimeAsync(48));
    view.rerender(testSheet(true, 'one', true));
    expect(view.container.querySelector('[data-sheet-motion="reduced"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('[data-sheet-phase="steady"]')).not.toBeNull();
    view.rerender(testSheet(false, 'one', true));
    view.rerender(testSheet(true, 'two', true));
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('two');
    expect(view.container.querySelector('[data-sheet-phase="steady"]')).not.toBeNull();
    view.unmount();
  });

  it('keeps reduced motion frozen when the preference returns to full during the same epoch', async () => {
    vi.useFakeTimers();
    const view = render(testSheet(true, 'one', true));
    expect(view.container.querySelector('[data-sheet-motion="reduced"]')).not.toBeNull();
    view.rerender(testSheet(true, 'one', false));
    expect(view.container.querySelector('[data-sheet-motion="reduced"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('[data-sheet-phase="steady"][data-sheet-motion="reduced"]')).not.toBeNull();
    view.unmount();
  });

  it('retires an older family shell immediately and never steals explicit focus', () => {
    const pair = (first: boolean, second: boolean) => createElement(ActionSheetFamily, null,
      createElement(ActionSheet, { open: first, title: 'First', description: '', children: null }, createElement('button', null, 'old')),
      createElement(ActionSheet, { open: second, title: 'Second', description: '', children: null }, createElement('button', null, 'new')));
    const view = render(pair(true, false));
    view.rerender(pair(false, true));
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(view.container.textContent).not.toContain('old');
    const outside = document.createElement('button');
    document.body.append(outside);
    act(() => outside.focus());
    expect(document.activeElement).toBe(outside);
    outside.remove();
    view.unmount();
  });

  it('gives simultaneous family requests to only the latest owner without reviving a stale request', async () => {
    vi.useFakeTimers();
    const pair = (first: boolean, second: boolean) => createElement(ActionSheetFamily, null,
      createElement(ActionSheet, { open: first, title: 'First', description: '', children: null }, createElement('button', null, 'old')),
      createElement(ActionSheet, { open: second, title: 'Second', description: '', children: null }, createElement('button', null, 'new')));
    const view = render(pair(true, true));
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('new');

    view.rerender(pair(true, false));
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(0);
    await act(async () => vi.advanceTimersByTimeAsync(120));
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(0);

    view.rerender(pair(false, false));
    view.rerender(pair(true, false));
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('old');
    view.unmount();
  });

  it('reclaims an open family sheet after the production StrictMode effect replay', async () => {
    const view = render(createElement(StrictMode, null,
      createElement(ActionSheetFamily, null,
        createElement(ActionSheet, { open: true, title: 'Layer', description: '', children: null },
          createElement('button', null, 'action')))));
    await act(async () => Promise.resolve());
    expect(view.container.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('action');
    view.unmount();
  });

  it('disarms the old keyboard owner before a close commit can flush', () => {
    const onClose = vi.fn();
    const view = render(createElement(CloseRaceSheet, { onClose }));
    const close = [...view.container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === 'close')!;
    act(() => {
      close.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="reopen-sheet"]')?.click());
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it('cleans ActionSheet frames, timers, and document listeners on unmount', () => {
    const cancelFrame = vi.spyOn(browserPlatform, 'cancelFrame');
    const cancelTimeout = vi.spyOn(browserPlatform, 'cancelTimeout');
    const removeKeyDown = vi.fn();
    const listen = vi.spyOn(browserPlatform, 'listenDocument').mockReturnValue(removeKeyDown);
    const view = render(testSheet(true, 'one'));
    view.unmount();
    expect(cancelFrame).toHaveBeenCalled();
    expect(cancelTimeout).toHaveBeenCalled();
    expect(removeKeyDown).toHaveBeenCalledTimes(1);
    listen.mockRestore();
    cancelTimeout.mockRestore();
    cancelFrame.mockRestore();
  });

});

describe('DEV QA state snapshot isolation', () => {
  it('detaches scalar, active piece, queue, and nested board state', () => {
    const canonical = createInitialState(0x51a1f00d, 'endgame', 't3r-shaft-01');
    const snapshot = cloneQaState(canonical);
    const original = structuredClone(canonical);

    expect(snapshot).not.toBe(canonical);
    expect(snapshot.active).not.toBe(canonical.active);
    expect(snapshot.queue).not.toBe(canonical.queue);
    expect(snapshot.board).not.toBe(canonical.board);
    expect(snapshot.board[0]).not.toBe(canonical.board[0]);

    snapshot.status = 'game-over';
    if (snapshot.active) snapshot.active.x += 3;
    snapshot.queue[0] = snapshot.queue[0] === 'I' ? 'T' : 'I';
    snapshot.board[0]![0] = snapshot.board[0]![0] === 'O' ? 'Z' : 'O';

    expect(canonical).toEqual(original);
  });
});

describe('Endgame progress boot persistence', () => {
  it('loads an existing canonical v7 record without rewriting it', () => {
    const currentId = CAMPAIGN_LEVELS[1]!.id;
    const current = JSON.stringify({
      version: 7,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: [currentId],
      bestLockedPieceCounts: { [currentId]: 7 },
    });
    localStorage.setItem(ENDGAME_PROGRESS_KEY, current);

    const view = render(createElement(App));
    expect(localStorage.getItem(ENDGAME_PROGRESS_KEY)).toBe(current);
    view.unmount();
  });

});

describe('Survival stone timing presentation', () => {
  it('reveals one, two, and three bedrock rows across the 3-2-1 entry countdown', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const view = render(createElement(GameSession, {
      mode: 'race',
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());

    const runtime = runtimeHarness.instances.at(-1)!;
    expect(runtime.options.survivalEntryBedrockRows).toBe(1);
    expect(runtime.setSurvivalEntryBedrockRows).toHaveBeenLastCalledWith(1);

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(runtime.setSurvivalEntryBedrockRows).toHaveBeenLastCalledWith(2);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(runtime.setSurvivalEntryBedrockRows).toHaveBeenLastCalledWith(3);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(runtime.setSurvivalEntryBedrockRows).toHaveBeenLastCalledWith(null);
    expect(runtime.start).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(220));
    expect(runtime.start).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('copies the former v8 leaderboard key into the TetraMorph key', () => {
    const legacy = JSON.stringify(emptyLeaderboard());
    localStorage.setItem('tetris:leaderboard:v8', legacy);

    const view = render(createElement(App));
    expect(localStorage.getItem(LEADERBOARD_KEY)).toBe(legacy);
    expect(localStorage.getItem('tetris:leaderboard:v8')).toBe(legacy);
    view.unmount();
  });

  it('reports the piece-count rockfall cadence from the canonical Core state', () => {
    const initial = createInitialState(0x51a1f00d, 'race');
    expect(survivalStoneCountdownPieces(initial)).toBe(8);
    expect(survivalStoneCountdownPieces({
      ...initial,
      survivalDebrisPiecesRemaining: 1,
    })).toBe(1);
    expect(survivalStoneCountdownPieces(createInitialState(0x51a1f00d, 'marathon'))).toBe(0);
  });

  it('reads the live runtime snapshot immediately after a deterministic state change', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const view = render(createElement(GameSession, {
      mode: 'race',
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
      onRunFinished: vi.fn(),
    }));
    await act(async () => Promise.resolve());

    const runtime = runtimeHarness.instances[0]!;
    const current = {
      ...runtime.getState(),
      status: 'playing' as const,
      survivalDebrisPieceInterval: 7,
      survivalDebrisPiecesRemaining: 6,
      survivalDebris: [{ id: 1, x: 4, y: 21, height: 2 as const }],
    };
    // Deliberately bypass a React wait: the QA text path must still report the
    // same Core frame that Pixi has just rendered.
    runtime.setState(current);
    const text = JSON.parse(window.render_game_to_text?.() ?? '{}') as Record<string, unknown>;
    expect(text).toMatchObject({
      mode: 'race',
      stoneIntervalPieces: 7,
      stoneNextPieces: 6,
      fallingStones: [{ x: 4, y: 21 }, { x: 4, y: 22 }],
    });
    view.unmount();
  });
});

describe('Endgame completion ceremony', () => {
  it('renders distinct first-clear, record, and replay results from the best that existed before persistence', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const endgameId = CAMPAIGN_LEVELS[0]!.id;

    const renderCompletion = async (endgameProgress = defaultEndgameProgress(), pieces = 9) => {
      const onCanonicalCompletion = vi.fn();
      const view = render(createElement(GameSession, {
        mode: 'endgame', endgameId, onExit: vi.fn(), onCanonicalCompletion, endgameProgress,
      }));
      await act(async () => Promise.resolve());
      const runtime = runtimeHarness.instances.at(-1)!;
      const finished = {
        ...runtime.getState(),
        status: 'finished' as const,
        endgameCompletion: 'finished' as const,
        completedLevelId: endgameId,
        endgameTargetCells: [],
        pieceCount: pieces,
        lines: 5,
      };
      act(() => runtime.setState(finished));
      return { view, onCanonicalCompletion };
    };

    const first = await renderCompletion();
    expect(first.view.container.querySelector<HTMLElement>('[data-testid="endgame-celebration"]')?.dataset.outcome).toBe('first');
    expect(first.view.container.textContent).toContain('恭喜你完成残局');
    expect(first.view.container.textContent).not.toContain('首次完成 · 9 步 · 5 消行');
    expect(first.view.container.querySelector('[data-testid="endgame-celebration"]')?.getAttribute('aria-label')).toBe('当前最优步数：9步');
    expect(first.view.container.querySelector('.endgame-celebration__value strong')?.textContent).toBe('9');
    expect(first.view.container.querySelector('.endgame-celebration__value small')?.textContent).toBe('步');
    expect(first.view.container.querySelector('.endgame-celebration__summary > span')?.textContent).toBe('当前最优步数');
    expect(first.view.container.textContent).not.toContain('首次破解');
    expect(first.view.container.querySelector('.endgame-celebration__constellation')).toBeNull();
    expect(first.view.container.querySelector('.endgame-celebration__prism')).toBeNull();
    expect(first.onCanonicalCompletion).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ completedLevelId: endgameId, pieceCount: 9 }));
    const firstReplay = first.view.container.querySelector<HTMLButtonElement>('.action-sheet--endgame-celebration .primary-action')!;
    act(() => firstReplay.click());
    const frozenResult = expectRetiredSheet(first.view.container, 'endgame-celebration');
    expect(frozenResult.textContent).toContain('恭喜你完成残局');
    expect(frozenResult.textContent).toContain('9');
    expect(frozenResult.textContent).not.toContain('重新开始');
    expect(runtimeHarness.instances.at(-1)?.restart).toHaveBeenCalledTimes(1);
    expect(runtimeHarness.instances.at(-1)?.getState().status).toBe('playing');
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(first.view.container.querySelector('[data-testid="endgame-celebration"]')).toBeNull();
    first.view.unmount();

    const priorBest: EndgameProgress = {
      version: 7,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: [endgameId],
      bestLockedPieceCounts: { [endgameId]: 12 },
    };
    const record = await renderCompletion(priorBest, 9);
    expect(record.view.container.querySelector<HTMLElement>('[data-testid="endgame-celebration"]')?.dataset.outcome).toBe('record');
    expect(record.view.container.textContent).toContain('刷新个人纪录');
    expect(record.view.container.textContent).not.toContain('从 12 步精炼至 9 步 · 5 消行');
    expect(record.view.container.textContent).not.toContain('个人最佳');
    record.view.unmount();

    const replayBest: EndgameProgress = {
      version: 7,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: [endgameId],
      bestLockedPieceCounts: { [endgameId]: 9 },
    };
    const replay = await renderCompletion(replayBest, 9);
    expect(replay.view.container.querySelector<HTMLElement>('[data-testid="endgame-celebration"]')?.dataset.outcome).toBe('replay');
    expect(replay.view.container.textContent).toContain('残局已破解');
    expect(replay.view.container.textContent).not.toContain('刷新个人纪录');
    expect(replay.view.container.textContent).not.toContain('再次完成');
    replay.view.unmount();
  });

  it('persists and marks a success from any open gallery entry before result dismissal', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon', 'race', 'sprint', 'endgame']));
    const level = CAMPAIGN_LEVELS[2]!;
    const view = render(createElement(App));
    expect(JSON.parse(localStorage.getItem('tetramorph:mode-rule-intros:v2') ?? '[]')).toContain('endgame');

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]')!.click());
    const levelButton = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')]
      .find((button) => button.dataset.levelId === level.id)!;
    act(() => levelButton.click());
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]')!.click());
    await act(async () => Promise.resolve());

    const runtime = runtimeHarness.instances.at(-1)!;
    act(() => runtime.setState({
      ...runtime.getState(),
      status: 'finished',
      endgameCompletion: 'finished',
      completedLevelId: null,
      endgameTargetCells: [],
      pieceCount: 13,
      lines: 4,
    }));
    await act(async () => Promise.resolve());

    expect(JSON.parse(localStorage.getItem(ENDGAME_PROGRESS_KEY) ?? 'null')).toMatchObject({
      completedLevelIds: [level.id],
      bestLockedPieceCounts: { [level.id]: 13 },
    });
    const resultButtons = [...view.container.querySelectorAll<HTMLButtonElement>('.action-sheet button')];
    expect(resultButtons.map((button) => button.textContent)).toContain('返回关卡库');
    const backToLibrary = resultButtons.find((button) => button.textContent === '返回关卡库')!;
    act(() => backToLibrary.click());
    const completedButton = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')]
      .find((button) => button.dataset.levelId === level.id)!;
    expect(completedButton.querySelector('.endgame-gallery__completion-tick')).not.toBeNull();
    expect(view.container.textContent).toContain('当前最优步数：13步');
    view.unmount();
  });
});

describe('entry countdown', () => {
  it('starts Endgame immediately on entry, restart confirmation, Settings restart, and replay', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }));
    const endgameId = CAMPAIGN_LEVELS[0]!.id;
    const view = render(createElement(GameSession, {
      mode: 'endgame',
      endgameId,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());

    const runtime = runtimeHarness.instances.at(-1)!;
    const countdown = () => view.container.querySelector('[data-testid="entry-countdown"]');
    expect(runtime.options.inputEnabled).toBe(true);
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(runtime.getState().status).toBe('playing');
    expect(runtime.playEntryCountdown).not.toHaveBeenCalled();
    expect(runtime.playEntryCountdownResolve).not.toHaveBeenCalled();
    expect(countdown()).toBeNull();

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.click());
    expect(runtime.restart).toHaveBeenCalledTimes(1);
    expect(runtime.start).toHaveBeenCalledTimes(2);
    expect(runtime.getState().status).toBe('playing');
    expect(runtime.playEntryCountdown).not.toHaveBeenCalled();
    expect(runtime.playEntryCountdownResolve).not.toHaveBeenCalled();
    expect(countdown()).toBeNull();

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).not.toBeNull();
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(runtime.restart).toHaveBeenCalledTimes(2);
    expect(runtime.start).toHaveBeenCalledTimes(3);
    expect(runtime.getState().status).toBe('playing');
    expect(runtime.playEntryCountdown).not.toHaveBeenCalled();
    expect(runtime.playEntryCountdownResolve).not.toHaveBeenCalled();
    expect(countdown()).toBeNull();

    act(() => runtime.setState({
      ...runtime.getState(),
      status: 'finished',
      endgameCompletion: 'finished',
      completedLevelId: endgameId,
      endgameTargetCells: [],
      pieceCount: 8,
      lines: 4,
    }));
    act(() => view.container.querySelector<HTMLButtonElement>('.action-sheet--endgame-celebration .primary-action')?.click());
    expect(runtime.restart).toHaveBeenCalledTimes(3);
    expect(runtime.start).toHaveBeenCalledTimes(4);
    expect(runtime.getState().status).toBe('playing');
    expect(runtime.playEntryCountdown).not.toHaveBeenCalled();
    expect(runtime.playEntryCountdownResolve).not.toHaveBeenCalled();
    expect(countdown()).toBeNull();
    view.unmount();
  });

  it('preserves the accepted 500 ms cadence remainder across Settings and Exit, then resolves at 1500 ms exactly once', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }));
    const onRunFinished = vi.fn();
    const onExit = vi.fn();
    const view = render(createElement(GameSession, {
      mode: 'marathon',
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit,
      onCanonicalCompletion: vi.fn(),
      onRunFinished,
    }));
    await act(async () => Promise.resolve());

    const runtime = runtimeHarness.instances[0]!;
    const countdown = () => view.container.querySelector<HTMLElement>('[data-testid="entry-countdown"]');
    const settings = view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')!;
    const back = view.container.querySelector<HTMLButtonElement>('[data-testid="exit-game"]')!;
    const textState = JSON.parse(window.render_game_to_text?.() ?? '{}') as Record<string, unknown>;

    expect(runtime.options.inputEnabled).toBe(false);
    expect(textState).not.toHaveProperty('level');
    expect(textState).toMatchObject({ combo: 0, bedrockRows: 0, fallTicks: 36 });
    expect(countdown()?.dataset.countdown).toBe('3');
    expect(runtime.playEntryCountdown).toHaveBeenCalledExactlyOnceWith(3);
    expect(runtime.playEntryCountdownResolve).not.toHaveBeenCalled();
    expect(settings.disabled).toBe(false);
    expect(back.disabled).toBe(false);
    expect(view.container.querySelector('[data-testid="touch-rail"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="board-frame"]')?.hasAttribute('aria-label')).toBe(false);
    expect(view.container.querySelector('canvas')?.getAttribute('aria-description')).toContain('触控');
    expect(runtime.start).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(400));
    act(() => settings.click());
    expect(view.container.querySelector('[data-testid="settings-sheet"]')).not.toBeNull();
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.disabled).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(countdown()?.dataset.countdown).toBe('3');
    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.setInputEnabled.mock.calls.some(([enabled]) => enabled === true)).toBe(false);
    expect(view.container.querySelector<HTMLElement>('[role="dialog"]')?.contains(document.activeElement)).toBe(true);

    act(() => view.container.querySelector<HTMLElement>('[data-testid="action-sheet-backdrop"]')?.click());
    await act(async () => vi.advanceTimersByTimeAsync(99));
    expect(countdown()?.dataset.countdown).toBe('3');
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(countdown()?.dataset.countdown).toBe('2');
    expect(runtime.playEntryCountdown).toHaveBeenLastCalledWith(2);

    await act(async () => vi.advanceTimersByTimeAsync(200));
    act(() => back.click());
    expect(view.container.querySelector('.action-sheet')?.textContent).toContain('离开本局？');
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(countdown()?.dataset.countdown).toBe('2');
    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.setInputEnabled.mock.calls.some(([enabled]) => enabled === true)).toBe(false);
    expect(view.container.querySelector<HTMLElement>('[role="dialog"]')?.contains(document.activeElement)).toBe(true);

    act(() => [...view.container.querySelectorAll<HTMLButtonElement>('.action-sheet__actions > button')]
      .find((button) => button.textContent === '留在本局')?.click());
    await act(async () => vi.advanceTimersByTimeAsync(299));
    expect(countdown()?.dataset.countdown).toBe('2');
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(countdown()?.dataset.countdown).toBe('1');
    expect(runtime.playEntryCountdown).toHaveBeenLastCalledWith(1);
    await act(async () => vi.advanceTimersByTimeAsync(499));
    expect(countdown()?.dataset.countdown).toBe('1');
    expect(runtime.start).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(1));

    expect(countdown()?.dataset.countdown).toBe('exit');
    expect(countdown()?.textContent).toBe('');
    expect(runtime.playEntryCountdownResolve).toHaveBeenCalledTimes(1);
    expect(runtime.setInputEnabled.mock.calls.some(([enabled]) => enabled === true)).toBe(false);
    expect(runtime.setInputEnabled).toHaveBeenCalledWith(false);
    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.playEntryCountdown.mock.calls.map(([digit]) => digit)).toEqual([3, 2, 1]);
    expect(settings.disabled).toBe(false);
    expect(back.disabled).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(50));
    act(() => settings.click());
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(countdown()?.dataset.countdown).toBe('exit');
    expect(runtime.start).not.toHaveBeenCalled();
    act(() => view.container.querySelector<HTMLElement>('[data-testid="action-sheet-backdrop"]')?.click());
    await act(async () => vi.advanceTimersByTimeAsync(69));
    expect(countdown()?.dataset.countdown).toBe('exit');
    expect(runtime.start).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(countdown()).toBeNull();
    expect(runtime.setInputEnabled).toHaveBeenLastCalledWith(true);
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(runtime.setInputEnabled.mock.invocationCallOrder.at(-1)).toBeLessThan(runtime.start.mock.invocationCallOrder[0]!);
    expect(document.activeElement).toBe(view.container.querySelector('canvas'));
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(runtime.start).toHaveBeenCalledTimes(1);
    expect(runtime.playEntryCountdownResolve).toHaveBeenCalledTimes(1);

    const terminalState = {
      ...createInitialState(0x51a1f00d, 'marathon'),
      status: 'game-over' as const,
      score: 4321,
      lines: 12,
      pieceCount: 44,
      elapsedTicks: 3600,
    };
    act(() => {
      runtime.options.onState?.(terminalState, []);
      runtime.options.onState?.(terminalState, []);
    });
    expect(onRunFinished).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ mode: 'marathon', score: 4321, lines: 12 }));
    const resultLeaderboard = view.container.querySelector<HTMLElement>('.result-leaderboard')!;
    expect(resultLeaderboard.querySelector('header')?.textContent).toBe('排行榜前 5');
    expect(resultLeaderboard.querySelector('[data-current-record="true"]')?.textContent).toContain('0112 行44 方块');
    expect(view.container.querySelector('[data-current-record="true"]')?.textContent).toContain('12 行');
    expect(view.container.querySelector('.action-sheet--run-result > h2')?.textContent).toBe('消行');
    expect(view.container.querySelector('[data-metric="lines"]')?.textContent).toBe('12');
    expect(view.container.querySelector('[data-metric="pieces"]')?.textContent).toBe('使用方块44');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onExit).toHaveBeenCalledExactlyOnceWith('home');
    view.unmount();
  });

  it('cancels the pending countdown step on unmount without enabling input or starting the runtime', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    const view = render(createElement(GameSession, {
      mode: 'marathon',
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    const runtime = runtimeHarness.instances.at(-1)!;

    await act(async () => vi.advanceTimersByTimeAsync(400));
    view.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(5000));

    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.playEntryCountdownResolve).not.toHaveBeenCalled();
    expect(runtime.setInputEnabled.mock.calls.some(([enabled]) => enabled === true)).toBe(false);
  });
});

describe('T15 Phase 2 Settings layout contract', () => {
  it('uses one authoritative connected console without undersized interface text', () => {
    const startMarker = '/* T15 Phase 2 authoritative Settings console';
    const endMarker = '/* End T15 Phase 2 authoritative Settings console */';
    const start = sourceStyles.indexOf(startMarker);
    const end = sourceStyles.indexOf(endMarker, start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(sourceStyles.indexOf(startMarker, start + startMarker.length)).toBe(-1);

    const block = sourceStyles.slice(start, end);
    const fontSizes = [...block.matchAll(/font-size:\s*([\d.]+)px/g)].map((match) => Number(match[1]));
    expect(Math.min(...fontSizes)).toBeGreaterThanOrEqual(12);
    expect(block).toMatch(/\.action-sheet--settings\s*\{[\s\S]*?box-sizing:\s*border-box[\s\S]*?width:\s*min\(800px,\s*100%\)/);
    expect(block).toMatch(/\.settings-console\s*\{[\s\S]*?gap:\s*0\s*;/);
    expect(block).toMatch(/padding:\s*12px 16px\s*;/);
    expect(block).toMatch(/\.settings-console__controls[\s\S]*?grid-template-columns:\s*52px/);
    expect(block).toMatch(/\.settings-console__keyboard[\s\S]*?grid-template-columns:\s*52px/);
    expect(block).toMatch(/\.settings-console__controls \.language-control button\s*\{[\s\S]*?min-height:\s*44px/);
    expect(block).toMatch(/\.settings-console__controls \.audio-toggle\s*\{[\s\S]*?min-height:\s*44px/);
    expect(block).toMatch(/\.settings-console__actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(block).toMatch(/\.settings-console__actions > button\s*\{[\s\S]*?min-height:\s*44px/);
    expect(block).not.toMatch(/\.action-sheet--settings\s*\{[^}]*width:[^;]*100vw/);
    expect(block).not.toMatch(/align-content:\s*space-between|grid-auto-rows:\s*1fr/);
  });
});

describe('T6 frontend mode binding', () => {
  it('keeps the authoritative countdown veil translucent above staged Survival bedrock', () => {
    const start = sourceStyles.lastIndexOf('.entry-countdown {');
    const end = sourceStyles.indexOf('\n}', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = sourceStyles.slice(start, end);
    expect(block).toMatch(/color-mix\(in srgb,\s*var\(--well\)\s*68%,\s*transparent\)/);
    expect(block).not.toContain('#071427');
  });

  it('keeps the live canvas visible at its gameplay layer while a modal owns the compositor', () => {
    const selector = '.play-shell:has(.sheet-backdrop) .canvas-host';
    const start = sourceStyles.indexOf(selector);
    const end = sourceStyles.indexOf('\n}', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = sourceStyles.slice(start, end);

    expect(block).toMatch(/z-index:\s*6\s*;/);
    expect(block).toMatch(/transform:\s*none\s*;/);
    expect(block).toMatch(/visibility:\s*visible\s*;/);
    expect(block).not.toMatch(/display:\s*none|visibility:\s*hidden|opacity:\s*0(?:\D|$)/);
  });

  it('preserves and refocuses the same canvas node across the Settings compositor', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();

    const canvas = view.container.querySelector<HTMLCanvasElement>('canvas')!;
    expect(canvas).not.toBeNull();
    act(() => canvas.focus());
    expect(document.activeElement).toBe(canvas);

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })));
    await act(async () => Promise.resolve());
    const sheet = view.container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    expect(view.container.querySelector('canvas')).toBe(canvas);
    expect(sheet.contains(document.activeElement)).toBe(true);

    act(() => view.container.querySelector<HTMLElement>('[data-testid="action-sheet-backdrop"]')?.click());
    await act(async () => Promise.resolve());
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    expect(view.container.querySelector('canvas')).toBe(canvas);
    expect(document.activeElement).toBe(canvas);
    view.unmount();
  });

  it('moves mode rules out of home, then shows and stores the first-entry introduction', () => {
    vi.useFakeTimers();
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    const view = render(createElement(App));
    const mutation = view.container.querySelector<HTMLButtonElement>('[data-testid="enter-sprint"]')!;
    expect(view.container.querySelector('[data-testid="entry-mode-rules"]')).toBeNull();
    expect(view.container.textContent).not.toContain('带核心标记的方块携带道具。');

    act(() => mutation.click());
    const sheet = view.container.querySelector<HTMLElement>('.action-sheet')!;
    const rules = view.container.querySelector<HTMLElement>('[data-testid="entry-mode-rules"]')!;
    expect(sheet.querySelector('h2')?.textContent).toBe('异变规则');
    expect(sheet.textContent).not.toContain('首次进入说明');
    expect(rules.querySelector('strong')).toBeNull();
    expect([...rules.querySelectorAll('[data-rule-id]')].map((fact) => fact.getAttribute('data-rule-id'))).toEqual([
      'objective',
      'mechanic',
      'challenge',
    ]);
    expect(rules.textContent).toContain('消除异变材质方块的任意一格，即可触发整件方块对应的道具');
    expect(rules.textContent).not.toMatch(/核心|携带/);
    expect(rules.textContent).not.toContain('计时效果再次触发会刷新为 10 秒');
    expect(view.container.querySelector('[data-testid="mode-home"]')).not.toBeNull();

    const start = [...(view.container.querySelector('.action-sheet')?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent === '好的')!;
    act(() => start.click());
    expect(JSON.parse(localStorage.getItem('tetramorph:mode-rule-intros:v2') ?? '[]')).toContain('sprint');
    expect(view.container.querySelector('[data-testid="game-screen"]')).not.toBeNull();
    const routeViewport = view.container.querySelector('[data-testid="route-viewport"]');
    const retiredIntro = expectRetiredSheet(view.container, 'entry-mode-rules');
    expect(routeViewport?.contains(retiredIntro)).toBe(false);
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(120));
    expect(view.container.querySelector('[data-testid="entry-mode-rules"]')).toBeNull();
    view.unmount();
  });

  it('keeps every first-entry briefing to Goal, Mechanic, and Challenge in both languages', () => {
    for (const language of ['zh-CN', 'en'] as const) {
      for (const mode of ['marathon', 'race', 'sprint', 'endgame'] as const) {
        const facts = modeIntroRules(language, mode);
        expect(facts.map((fact) => fact.id)).toEqual(['objective', 'mechanic', 'challenge']);
        expect(facts.map((fact) => fact.label)).toEqual(
          language === 'zh-CN' ? ['目标', '机制', '挑战'] : ['Goal', 'Mechanic', 'Challenge'],
        );
        if (language === 'zh-CN') {
          expect(facts.reduce((total, fact) => total + fact.value.length, 0)).toBeLessThan(100);
        }
      }
    }
  });

  it('covers the board for pause and restart while retaining the live Next forecast', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'race', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;
    const nextSlot = view.container.querySelector<HTMLElement>('[data-testid="next-slot"]')!;
    const queuedPiece = runtime.getState().queue[0]!;
    expect(nextSlot.getAttribute('aria-label')).toContain(queuedPiece);

    runtime.refreshPresentation.mockClear();
    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    expect(runtime.refreshPresentation).toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="game-screen"]')?.classList.contains('play-shell--interrupted')).toBe(true);
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="exit-game"]')?.disabled).toBe(false);
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.disabled).toBe(false);
    const pauseCurtain = view.container.querySelector<HTMLElement>('[data-testid="pause-curtain"]')!;
    expect(pauseCurtain.textContent).toContain('暂停');
    expect(pauseCurtain.textContent).toContain('回车继续');
    expect(view.container.querySelector('[data-testid="action-sheet-backdrop"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="next-slot"]')).toBe(nextSlot);
    expect(nextSlot.getAttribute('aria-label')).toContain(queuedPiece);

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.click());
    expectRetiredSheet(view.container, 'settings-sheet');
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown')).toBe('3');
    expect(runtime.restart).toHaveBeenCalledTimes(1);
    expect(runtime.setInputEnabled).toHaveBeenLastCalledWith(false);
    expect(view.container.querySelector('[data-testid="next-slot"]')).toBe(nextSlot);
    expect(nextSlot.getAttribute('aria-label')).toBe('下一个方块');

    await advanceEntryCountdown();
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    const restartCurtain = view.container.querySelector<HTMLElement>('[data-testid="restart-curtain"]')!;
    expect(restartCurtain.textContent).toContain('重新开始');
    expect(restartCurtain.textContent).not.toContain('？');
    expect(restartCurtain.textContent).toContain('回车确认，按 R 取消');
    expect(view.container.querySelector('[data-testid="action-sheet-backdrop"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="next-slot"]')).toBe(nextSlot);
    expect(nextSlot.getAttribute('aria-label')).toContain(runtime.getState().queue[0]!);
    expect(view.container.querySelector('[data-testid="game-screen"]')?.classList.contains('play-shell--interrupted')).toBe(true);

    expect(sourceHudStyles).toMatch(/\.entry-countdown--pause,\s*\.entry-countdown--restart\s*\{[^}]*width:\s*100%[^}]*pointer-events:\s*none/s);
    expect(sourceHudStyles).toMatch(/\.entry-countdown__digit--pause,\s*\.entry-countdown__digit--restart\s*\{[^}]*font-size:\s*clamp\(48px,\s*8vmin,\s*76px\)/s);
    expect(sourceHudStyles).toMatch(/\.play-shell--interrupted \.play-topbar\s*\{[\s\S]*?z-index:\s*110;[\s\S]*?isolation:\s*isolate;[\s\S]*?pointer-events:\s*auto/);
    expect(sourceStyles).toMatch(/\.play-shell\s*\{[\s\S]*?--play-topbar-height:\s*64px/);
    expect(sourceHudStyles).toMatch(/\.run-stats strong\s*\{[^}]*font-size:\s*clamp\(34px,\s*3vw,\s*44px\)/s);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')?.getAttribute('data-curtain-phase')).toBe('exit');
    expect(view.container.querySelector('[data-testid="restart-curtain"]')?.hasAttribute('inert')).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    expect(runtime.getState().status).toBe('playing');
    view.unmount();
  });

  it('keeps Back and Settings actionable while the pause sheet is visible', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;

    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="exit-game"]')?.click());
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('离开本局？');
    expect(view.container.querySelector('[data-testid="game-screen"]')?.classList.contains('play-shell--interrupted')).toBe(false);

    const stay = [...view.container.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent === '留在本局')!;
    act(() => stay.click());
    expect(view.container.textContent).toContain('暂停');
    expect(view.container.querySelector('[data-testid="game-screen"]')?.classList.contains('play-shell--interrupted')).toBe(true);

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    expect(view.container.querySelector('[data-testid="settings-sheet"]')).not.toBeNull();
    expect(view.container.querySelector('[data-testid="game-screen"]')?.classList.contains('play-shell--interrupted')).toBe(false);
    view.unmount();
  });

  it('releases pause on resume, but removes it immediately when restart replaces it', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(), reducedMotion: false,
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;

    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    await act(async () => vi.advanceTimersByTimeAsync(180));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase')).toBe('steady');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    const release = view.container.querySelector<HTMLElement>('[data-testid="pause-curtain"]')!;
    expect(release.dataset.curtainPhase).toBe('exit');
    expect(release.hasAttribute('inert')).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(119));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();

    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="restart-curtain"]')?.getAttribute('data-curtain-phase')).toBe('enter');
    view.unmount();
  });

  it('shortens an active curtain when motion is reduced without replaying when it returns to full', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const props = (reducedMotion: boolean) => ({
      mode: 'marathon' as const,
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
      reducedMotion,
    });
    const view = render(createElement(GameSession, props(false)));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;

    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    await act(async () => vi.advanceTimersByTimeAsync(48));
    view.rerender(createElement(GameSession, props(true)));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-motion')).toBe('reduced');
    view.rerender(createElement(GameSession, props(false)));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-motion')).toBe('reduced');
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase')).toBe('steady');

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    await act(async () => vi.advanceTimersByTimeAsync(8));
    view.rerender(createElement(GameSession, props(true)));
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    view.unmount();
  });

  it('finishes a curtain phase synchronously when the host cannot schedule a timer', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const schedule = vi.spyOn(browserPlatform, 'scheduleTimeout').mockReturnValue(null);
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(), reducedMotion: false,
    }));
    await act(async () => Promise.resolve());
    const runtime = runtimeHarness.instances.at(-1)!;
    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase')).toBe('steady');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    view.unmount();
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    schedule.mockRestore();
  });

  it('cancels active curtain enter and exit timers on unmount', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const cancelTimeout = vi.spyOn(browserPlatform, 'cancelTimeout');

    const enterView = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(), reducedMotion: false,
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const enterRuntime = runtimeHarness.instances.at(-1)!;
    act(() => enterRuntime.setState({ ...enterRuntime.getState(), status: 'paused' }));
    expect(enterView.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase')).toBe('enter');
    const beforeEnterUnmount = cancelTimeout.mock.calls.length;
    enterView.unmount();
    const afterEnterUnmount = cancelTimeout.mock.calls.length;
    expect(afterEnterUnmount).toBeGreaterThan(beforeEnterUnmount);
    await act(async () => vi.advanceTimersByTimeAsync(180));
    expect(cancelTimeout.mock.calls).toHaveLength(afterEnterUnmount);

    const exitView = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(), reducedMotion: false,
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const exitRuntime = runtimeHarness.instances.at(-1)!;
    act(() => exitRuntime.setState({ ...exitRuntime.getState(), status: 'paused' }));
    await act(async () => vi.advanceTimersByTimeAsync(180));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    expect(exitView.container.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase')).toBe('exit');
    const beforeExitUnmount = cancelTimeout.mock.calls.length;
    exitView.unmount();
    const afterExitUnmount = cancelTimeout.mock.calls.length;
    expect(afterExitUnmount).toBeGreaterThan(beforeExitUnmount);
    await act(async () => vi.advanceTimersByTimeAsync(120));
    expect(cancelTimeout.mock.calls).toHaveLength(afterExitUnmount);
    cancelTimeout.mockRestore();
  });

  it('replaces the restart curtain with Back or Settings flows without resuming the run', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).not.toBeNull();
    expect(runtime.getState().status).toBe('paused');
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="settings-sheet"]')).not.toBeNull();
    expect(runtime.getState().status).toBe('paused');

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.click());
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expectRetiredSheet(view.container, 'settings-sheet');
    expect(view.container.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown')).toBe('3');
    expect(runtime.restart).toHaveBeenCalledTimes(1);
    await advanceEntryCountdown();
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).not.toBeNull();
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="exit-game"]')?.click());
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('离开本局？');
    expect(runtime.getState().status).toBe('paused');
    view.unmount();
  });

  it('uses localized compact rule titles and describes random same-column Survival stones', () => {
    expect((['marathon', 'race', 'sprint', 'endgame'] as const).map((mode) => modeRulesTitle('zh-CN', mode))).toEqual([
      '经典规则',
      '生存规则',
      '异变规则',
      '残局规则',
    ]);
    expect((['marathon', 'race', 'sprint', 'endgame'] as const).map((mode) => modeRulesTitle('en', mode))).toEqual([
      'Classic Rules',
      'Survival Rules',
      'Mutation Rules',
      'Endgame Rules',
    ]);
    const chineseStonefall = modeRules('zh-CN', 'race').find((fact) => fact.id === 'stonefall')?.value ?? '';
    const englishStonefall = modeRules('en', 'race').find((fact) => fact.id === 'stonefall')?.value ?? '';
    expect(chineseStonefall).toContain('同列的 1–2 块');
    expect(chineseStonefall).toContain('每使用 8 个方块');
    expect(chineseStonefall).toContain('7 倍速度');
    expect(chineseStonefall).toContain('最低为 4 个');
    expect(englishStonefall).toContain('1–2 joined rocks');
    expect(englishStonefall).toContain('every 8 used pieces');
    expect(englishStonefall).toContain('7× piece speed');
    expect(modeRules('zh-CN', 'race').find((fact) => fact.id === 'start')?.value).toContain('每第 4 次自然上升触发余震');
    expect(modeRules('en', 'race').find((fact) => fact.id === 'start')?.value).toContain('Every fourth natural rise is an Aftershock');
  });

  it('uses stable typed rule facts in both languages without delimiter parsing or placeholder entries', () => {
    const expected: Readonly<Record<GameMode, readonly string[]>> = {
      marathon: ['goal', 'pace', 'end'],
      race: ['start', 'pressure', 'stonefall', 'end'],
      sprint: ['goal', 'materials', 'items', 'end'],
      endgame: ['goal', 'queue', 'undo', 'record'],
    };

    for (const language of ['zh-CN', 'en'] as const) {
      for (const mode of ['marathon', 'race', 'sprint', 'endgame'] as const) {
        const facts = modeRules(language, mode);
        expect(facts.map((fact) => fact.id)).toEqual(expected[mode]);
        for (const fact of facts) {
          expect(Object.keys(fact).sort()).toEqual(['id', 'label', 'value']);
          expect(fact.label.trim()).not.toBe('');
          expect(fact.value.trim()).not.toBe('');
          expect(`${fact.label}${fact.value}`).not.toMatch(/[|｜]/);
        }
      }
    }
  });

  it('binds every statistic to an explicit role without positional CSS inference', () => {
    const classic = { ...createInitialState(0x51a1f00d, 'marathon'), combo: 3 };
    const survival = createInitialState(0x51a1f00d, 'race');
    const sprintBase = createInitialState(0x51a1f00d, 'sprint');
    const sprint = {
      ...sprintBase,
      lines: 9,
      pieceCount: 19,
      elapsedTicks: 540,
      mutationFreezeTicks: 10 * 60,
      mutationCarriers: [{ id: 1, item: 'freeze' as const, cells: [] }],
    };
    const cases = [
      { state: classic, roles: ['score', 'lines', 'classic-combo', 'fall-cadence'], label: '经典模式数据', copy: ['连消', '3', '下落速度', '秒/格', '0.6'] },
      {
        state: survival,
        roles: ['survival-time', 'lines', 'survival-bedrock', 'survival-stones'],
        label: '生存模式数据',
        copy: ['生存时间', '0:00', '上升', '13 秒', '距离落石', '8块'],
      },
      { state: sprint, roles: ['score', 'lines', 'classic-combo', 'fall-cadence'], label: '异变模式数据', copy: ['消行', '9', '连消', '下落速度', '秒/格', '0.8'] },
      {
        state: createInitialState(0x51a1f00d, 'endgame', 't3r-shaft-01'),
        roles: ['endgame-targets', 'endgame-placed'],
        label: '残局模式数据',
        copy: ['原有方块', '操作数'],
      },
    ];

    for (const { state, roles, label, copy } of cases) {
      const view = render(createElement(RunStats, { state }));
      const stats = view.container.querySelector<HTMLElement>('[data-testid="stats"]');
      const articles = [...(stats?.querySelectorAll<HTMLElement>('article') ?? [])];
      expect(articles.map((article) => article.dataset.statRole)).toEqual(roles);
      expect(new Set(articles.map((article) => article.dataset.statRole)).size).toBe(roles.length);
      expect(stats?.getAttribute('aria-label')).toBe(label);
      for (const fragment of copy) expect(stats?.textContent).toContain(fragment);
      expect(stats?.textContent).not.toMatch(/竞速|等级|速度档/);
      view.unmount();
    }

    const statisticSelectors = [...styles.matchAll(/([^{}]*\.run-stats[^{}]*)\{/g)]
      .map((match) => match[1]!.trim())
      .join('\n');
    expect(statisticSelectors).not.toMatch(/nth-child|nth-of-type|\bodd\b|\beven\b/);
  });

  it('marks both imminent Survival clocks without hiding their distinct meanings', () => {
    const state = {
      ...createInitialState(0x51a1f00d, 'race'),
      survivalRisePending: true,
      survivalDebrisPiecesRemaining: 1,
      survivalDebrisWarningColumns: [2],
    };
    const view = render(createElement(RunStats, { state }));
    const bedrock = view.container.querySelector<HTMLElement>('[data-stat-role="survival-bedrock"]');
    const stones = view.container.querySelector<HTMLElement>('[data-stat-role="survival-stones"]');

    expect(bedrock?.dataset.urgent).toBe('true');
    expect(bedrock?.textContent).toBe('上升待上升');
    expect(stones?.dataset.warning).toBe('true');
    expect(stones?.dataset.urgent).toBe('true');
    expect(stones?.textContent).toBe('距离落石1块');
    view.unmount();
  });

  it('breathes the full urgent Survival card without a left-side pulse rail', () => {
    const urgentStart = sourceHudStyles.indexOf('.run-stats--survival [data-urgent="true"] strong {');
    const urgentEnd = sourceHudStyles.indexOf('\n}', urgentStart);
    const keyframesStart = sourceHudStyles.indexOf('@keyframes survival-urgent-value');
    const keyframesEnd = sourceHudStyles.indexOf('\n}', keyframesStart);
    const urgentBlock = sourceHudStyles.slice(urgentStart, urgentEnd);
    const keyframesBlock = sourceHudStyles.slice(keyframesStart, keyframesEnd);

    expect(urgentBlock).toContain('animation: survival-urgent-value');
    expect(keyframesBlock).toContain('opacity:');
    expect(sourceHudStyles).not.toContain('survival-countdown-urgent');
  });

  it('shows Endgame target progress and a non-limiting placed-piece count', () => {
    const state = createInitialState(0x51a1f00d, 'endgame', 't5r-lattice-09');
    const view = render(createElement(RunStats, { state }));
    const targets = view.container.querySelector<HTMLElement>('[data-stat-role="endgame-targets"]');
    const placed = view.container.querySelector<HTMLElement>('[data-stat-role="endgame-placed"]');
    expect(targets?.textContent).toContain(`${state.endgameTargetCells.length}/${state.endgameInitialTargetCount}`);
    expect(placed?.textContent).toBe('操作数0');
    expect(view.container.querySelector('[data-stat-role="objective"]')).toBeNull();
    expect(view.container.textContent).not.toMatch(/剩余可用|已用方块|上限|限时|落定后/);
    view.unmount();
  });

  it('keeps one S-accessible settings control and reveals one compact settings concern at a time', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const leaderboard = {
      version: 10 as const,
      marathon: [{
        version: 10 as const,
        mode: 'marathon' as const,
        outcome: 'top-out' as const,
        score: 3_210,
        lines: 12,
        pieces: 44,
        elapsedTicks: 3_600,
        chain: 0,
        completedAt: '2026-07-24T00:00:00.000Z',
        classicStartingGravityTicks: 36,
        classicGravityFloorTicks: 4.8,
        classicGrade: 'standard' as const,
      }],
      race: [],
      sprint: [],
    };
    const onLanguageChange = vi.fn();
    const onReducedMotionChange = vi.fn();
    const view = render(createElement(GameSession, {
      mode: 'marathon',
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
      leaderboard,
      onLanguageChange,
      reducedMotion: true,
      onReducedMotionChange,
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const header = view.container.querySelector<HTMLElement>('[data-testid="cluster-header"]')!;
    const settings = view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')!;
    expect(settings.textContent).toBe('设置');
    expect(settings.getAttribute('aria-keyshortcuts')).toBe('S');
    expect(header.querySelectorAll('button')).toHaveLength(2);
    expect(header.querySelector('[data-testid="restart-game"], [data-testid="pause-game"], [data-testid="audio-toggle"]')).toBeNull();

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })));
    const sheet = view.container.querySelector<HTMLElement>('[data-testid="settings-sheet"]')!;
    const dialog = sheet.closest<HTMLElement>('[role="dialog"]')!;
    const dialogTitle = dialog.querySelector<HTMLHeadingElement>('h2')!;
    expect(sheet).not.toBeNull();
    expect(dialog.classList.contains('action-sheet--settings')).toBe(true);
    expect(dialogTitle.textContent).toBe('设置');
    expect(dialogTitle.classList.contains('sr-only')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe(dialogTitle.id);
    expect(sheet.className).toBe('settings-console');
    expect(view.container.querySelector('.settings-sheet')).toBeNull();
    expect(runtimeHarness.instances.at(-1)?.togglePause).toHaveBeenCalled();
    expect(runtimeHarness.instances.at(-1)?.setInputEnabled).toHaveBeenLastCalledWith(false);
    const settingsTab = view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-settings"]')!;
    const controlsTab = view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-controls"]')!;
    const rulesTab = view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-rules"]')!;
    let toggle = view.container.querySelector<HTMLButtonElement>('[data-testid="audio-toggle"]')!;
    let volume = view.container.querySelector<HTMLInputElement>('[data-testid="audio-volume"]')!;
    let motion = view.container.querySelector<HTMLButtonElement>('[data-testid="reduced-motion-toggle"]')!;
    const controls = view.container.querySelector<HTMLElement>('[data-testid="settings-controls"]')!;
    expect(settingsTab.getAttribute('aria-selected')).toBe('true');
    expect(controlsTab.getAttribute('aria-selected')).toBe('false');
    expect(rulesTab.getAttribute('aria-selected')).toBe('false');
    expect(document.activeElement).toBe(settingsTab);
    expect(view.container.querySelector('[data-testid="settings-shortcuts"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="settings-rules"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="settings-leaderboard"]')).toBeNull();
    expect(toggle.textContent).toBe('音效开');
    expect(motion.textContent).toBe('减少动效');
    expect(motion.getAttribute('aria-pressed')).toBe('true');
    expect(view.container.querySelector('[data-testid="music-toggle"]')).toBeNull();
    expect(volume.value).toBe('100');
    expect([...sheet.children].map((child) => child.getAttribute('data-testid') ?? child.className)).toEqual([
      'settings-console__tabs',
      'settings-console__panel settings-console__panel--settings',
    ]);
    expect(controls.textContent).toContain('语言');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(controlsTab);
    expect(controlsTab.getAttribute('aria-selected')).toBe('true');
    expect(view.container.querySelector('[data-testid="settings-controls"]')).toBeNull();
    const shortcuts = view.container.querySelector<HTMLElement>('[data-testid="settings-shortcuts"]')!;
    const gameplay = view.container.querySelector<HTMLElement>('[data-testid="keyboard-gameplay"]')!;
    const shortcutKeys = view.container.querySelector<HTMLElement>('[data-testid="keyboard-shortcuts"]')!;
    expect(shortcuts.textContent).toContain('键盘玩法操作← → 移动↑ 旋转↓ 快速下落Space 直接落底快捷键S 设置P 暂停R 重开确认Esc 返回← → 选择↑ ↓ 切换Enter 执行触控操作触控：轻点旋转；左右滑动移动；向下短滑加速，长滑直接落底。');
    expect(gameplay.textContent).toBe('玩法操作← → 移动↑ 旋转↓ 快速下落Space 直接落底');
    expect(shortcutKeys.textContent).toBe('快捷键S 设置P 暂停R 重开确认Esc 返回← → 选择↑ ↓ 切换Enter 执行');
    expect(gameplay.classList.contains('settings-console__key-group--gameplay')).toBe(true);
    expect(shortcutKeys.classList.contains('settings-console__key-group--shortcuts')).toBe(true);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(rulesTab);
    expect(rulesTab.getAttribute('aria-selected')).toBe('true');
    expect(view.container.querySelector('[data-testid="settings-shortcuts"]')).toBeNull();
    const settingsLeaderboard = view.container.querySelector<HTMLElement>('[data-testid="settings-leaderboard"]')!;
    const rules = view.container.querySelector<HTMLElement>('[data-testid="settings-rules"]')!;
    expect(settingsLeaderboard.querySelector('header')?.textContent).toBe('本模式排行前 5');
    expect(settingsLeaderboard.querySelector('li')?.textContent).toContain('0112 行44 方块2026.07.24');
    expect(rules.textContent).toContain('填满一整行即可消除并得分。');
    expect([...rules.querySelectorAll<HTMLElement>('[data-rule-id]')].map((fact) => fact.dataset.ruleId)).toEqual(['goal', 'pace', 'end']);

    act(() => settingsTab.click());
    expect(settingsTab.getAttribute('aria-selected')).toBe('true');
    toggle = view.container.querySelector<HTMLButtonElement>('[data-testid="audio-toggle"]')!;
    volume = view.container.querySelector<HTMLInputElement>('[data-testid="audio-volume"]')!;
    motion = view.container.querySelector<HTMLButtonElement>('[data-testid="reduced-motion-toggle"]')!;
    const chinese = view.container.querySelector<HTMLButtonElement>('[data-testid="language-zh"]')!;
    const english = view.container.querySelector<HTMLButtonElement>('[data-testid="language-en"]')!;
    expect(chinese.getAttribute('aria-pressed')).toBe('true');
    expect(english.getAttribute('aria-pressed')).toBe('false');
    act(() => english.click());
    expect(onLanguageChange).toHaveBeenCalledExactlyOnceWith('en');
    const restart = view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')!;
    const resume = [...sheet.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === '继续游戏')!;
    const calmPace = view.container.querySelector<HTMLButtonElement>('[data-testid="classic-pace-calm"]')!;
    const relaxedPace = view.container.querySelector<HTMLButtonElement>('[data-testid="classic-pace-relaxed"]')!;
    const standardPace = view.container.querySelector<HTMLButtonElement>('[data-testid="classic-pace-standard"]')!;
    const mineralMist = view.container.querySelector<HTMLButtonElement>('[data-testid="theme-mineral-mist"]')!;
    const deepTide = view.container.querySelector<HTMLButtonElement>('[data-testid="theme-deep-tide"]')!;
    const sunstone = view.container.querySelector<HTMLButtonElement>('[data-testid="theme-sunstone"]')!;

    const assertArrowRoute = (from: HTMLElement, key: string, to: HTMLElement) => {
      act(() => from.focus());
      act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
      expect(document.activeElement).toBe(to);
      expect(to.dataset.arrowSelected).toBe('true');
    };
    const routes: readonly [HTMLElement, string, HTMLElement][] = [
      [settingsTab, 'ArrowDown', chinese],
      [chinese, 'ArrowRight', english],
      [english, 'ArrowRight', motion],
      [motion, 'ArrowLeft', english],
      [chinese, 'ArrowUp', settingsTab],
      [english, 'ArrowDown', deepTide],
      [motion, 'ArrowDown', sunstone],
      [toggle, 'ArrowUp', chinese],
      [toggle, 'ArrowDown', calmPace],
      [mineralMist, 'ArrowRight', deepTide],
      [deepTide, 'ArrowRight', sunstone],
      [deepTide, 'ArrowDown', relaxedPace],
      [sunstone, 'ArrowDown', standardPace],
      [restart, 'ArrowRight', resume],
      [resume, 'ArrowLeft', restart],
      [resume, 'ArrowUp', relaxedPace],
    ];
    for (const [from, key, to] of routes) assertArrowRoute(from, key, to);

    act(() => motion.click());
    expect(onReducedMotionChange).toHaveBeenCalledExactlyOnceWith(false);

    act(() => volume.focus());
    const nativeRangeArrow = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    act(() => volume.dispatchEvent(nativeRangeArrow));
    expect(nativeRangeArrow.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(volume);

    act(() => toggle.focus());
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(toggle.textContent).toBe('音效关');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(volume, '56');
    act(() => volume.dispatchEvent(new Event('input', { bubbles: true })));
    expect(view.container.textContent).toContain('56%');
    expect(runtimeHarness.instances.at(-1)?.setAudioEnabled).toHaveBeenCalledWith(false);
    expect(resume).not.toBeNull();
    act(() => view.container.querySelector<HTMLElement>('[data-testid="action-sheet-backdrop"]')?.click());
    expectRetiredSheet(view.container, 'settings-sheet');
    expect(runtimeHarness.instances.at(-1)?.setInputEnabled).toHaveBeenLastCalledWith(true);
    view.unmount();
  });

  it('limits the Endgame Settings record to the selected level minimum piece count', () => {
    const level = CAMPAIGN_LEVELS[0]!;
    const completed = {
      ...defaultEndgameProgress(),
      completedLevelIds: [level.id],
      bestLockedPieceCounts: { [level.id]: 7 },
    };
    const completedView = render(createElement(SettingsRecord, {
      mode: 'endgame', endgameId: level.id, leaderboard: { version: 10, marathon: [], race: [], sprint: [] }, progress: completed,
    }));
    expect(completedView.container.textContent).toBe('当前关纪录最少 7 步');
    expect(completedView.container.textContent).not.toMatch(/消行|分|连锁|最长/);
    completedView.unmount();

    const freshView = render(createElement(SettingsRecord, {
      mode: 'endgame', endgameId: level.id, leaderboard: { version: 10, marathon: [], race: [], sprint: [] }, progress: defaultEndgameProgress(),
    }));
    expect(freshView.container.textContent).toBe('当前关纪录尚未通关');
    freshView.unmount();
  });

  it('keeps live Endgame information practical instead of exposing authored level metadata', () => {
    const state = createInitialState(0x51a1f00d, 'endgame', 't3r-shaft-01');
    const view = render(createElement(RunStats, { state }));
    expect(view.container.textContent).toContain('原有方块');
    expect(view.container.textContent).toContain('操作数');
    expect(view.container.textContent).not.toContain('通关目标');
    expect(view.container.textContent).not.toContain('起步');
    expect(view.container.textContent).not.toMatch(/\d+\/20/);
    view.unmount();
  });

  it('labels Endgame Next as two ordered canonical inputs while live modes retain one', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const endgame = render(createElement(GameSession, {
      mode: 'endgame', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    const endgameSlot = endgame.container.querySelector<HTMLElement>('[data-testid="next-slot"]')!;
    const segments = endgame.container.querySelectorAll<HTMLElement>('[data-testid="endgame-next-segment"]');
    const endgamePreview = runtimeHarness.instances.at(-1)!.getState().queue.slice(0, 2);
    expect(endgame.container.querySelector('.preview-sequence')).toBeNull();
    expect(endgameSlot.dataset.previewCount).toBe('2');
    expect(segments).toHaveLength(2);
    expect(segments[0]?.dataset.previewSegment).toBe('1');
    expect(segments[0]?.getAttribute('aria-label')).toBe(`1 下一个方块: ${endgamePreview[0]}`);
    expect(segments[0]?.textContent).toBe('1');
    expect(segments[1]?.dataset.previewSegment).toBe('2');
    expect(segments[1]?.getAttribute('aria-label')).toBe(`2 后一个方块: ${endgamePreview[1]}`);
    expect(segments[1]?.textContent).toBe('2');
    expect(endgameSlot.getAttribute('aria-label')).toContain(endgamePreview.join(', '));
    endgame.unmount();

    const classic = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    const classicSlot = classic.container.querySelector<HTMLElement>('[data-testid="next-slot"]')!;
    expect(classic.container.querySelector('.preview-rail')?.textContent).toContain('Next');
    expect(classic.container.querySelector('.preview-rail')?.textContent).not.toContain('Next · 2');
    expect(classicSlot.dataset.previewCount).toBe('1');
    expect(classicSlot.getAttribute('role')).toBe('img');
    expect(classicSlot.getAttribute('aria-label')).toBe('下一个方块');
    classic.unmount();

    const mutation = render(createElement(GameSession, {
      mode: 'sprint', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    const mutationSlot = mutation.container.querySelector<HTMLElement>('[data-testid="next-slot"]')!;
    expect(mutationSlot.getAttribute('aria-label')).toBe('下一个方块');
    await advanceEntryCountdown();
    const mutationRuntime = runtimeHarness.instances.at(-1)!;
    let carrierPreviewState: GameState | null = null;
    for (let seed = 1; seed <= 512 && carrierPreviewState === null; seed += 1) {
      let candidate = dispatch(createInitialState(seed, 'sprint'), { type: 'start' }).state;
      candidate = dispatch(candidate, { type: 'hard-drop' }).state;
      for (let tick = 0; tick < 120 && candidate.active === null; tick += 1) {
        candidate = dispatch(candidate, { type: 'tick' }).state;
      }
      candidate = dispatch(candidate, { type: 'hard-drop' }).state;
      if (nextMutationPreviewItem(candidate) !== null) carrierPreviewState = candidate;
    }
    if (carrierPreviewState === null) throw new Error('Expected a deterministic Mutation carrier preview seed');
    const mutationState = carrierPreviewState;
    expect(mutationState.active).toBeNull();
    act(() => mutationRuntime.setState(mutationState));
    const mutationItem = nextMutationPreviewItem(mutationState);
    expect(mutationItem).not.toBeNull();
    const mutationCopy = appCopy('zh-CN');
    expect(mutationSlot.getAttribute('aria-label')).toBe(
      `下一个方块: ${mutationCopy.materials[mutationItem!]}材质的 ${mutationState.queue[0]} 方块，触发${itemLabel('zh-CN', mutationItem!)}`,
    );
    expect(mutationSlot.getAttribute('aria-label')).not.toMatch(/核心|携带/);
    mutation.unmount();
  });

  it('routes the transparent board interaction surface to the same canvas and touch controls', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();

    const board = view.container.querySelector<HTMLElement>('[data-testid="board-frame"]')!;
    const canvas = view.container.querySelector<HTMLCanvasElement>('canvas')!;
    const runtime = runtimeHarness.instances.at(-1)!;
    Object.assign(board, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    });
    const pointer = (type: 'pointerdown' | 'pointerup', x: number, y: number, at: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
      Object.defineProperties(event, {
        pointerId: { value: 7 },
        pointerType: { value: 'touch' },
        timeStamp: { value: at },
      });
      return event;
    };

    act(() => {
      board.dispatchEvent(pointer('pointerdown', 100, 100, 100));
      board.dispatchEvent(pointer('pointerup', 104, 104, 220));
    });
    expect(document.activeElement).toBe(canvas);
    expect(runtime.press).toHaveBeenCalledWith('rotate-cw');

    act(() => {
      board.dispatchEvent(pointer('pointerdown', 100, 100, 300));
      board.dispatchEvent(pointer('pointerup', 140, 101, 390));
    });
    expect(runtime.press).toHaveBeenCalledWith('right');
    expect(runtime.release).toHaveBeenCalledWith('right');
    view.unmount();
  });

  it('directly restores the prior Endgame piece from its top spawn after a lock', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const endgame = render(createElement(GameSession, {
      mode: 'endgame', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());

    expect(endgame.container.querySelector('[data-testid="touch-rail"]')).toBeNull();
    expect(endgame.container.querySelector('[data-testid="board-frame"]')?.hasAttribute('aria-label')).toBe(false);
    expect(endgame.container.querySelector('canvas')?.getAttribute('aria-description')).toContain('触控');
    expect(endgame.container.querySelector('.keyboard-map')).toBeNull();

    const instance = runtimeHarness.instances.at(-1)!;
    const current = instance.getState();
    const locked = dispatch(current, { type: 'hard-drop' }).state;
    act(() => instance.setState(locked));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z', bubbles: true })));
    expect(instance.undoEndgame).toHaveBeenCalledTimes(1);
    expect(instance.getState().active).toEqual(current.active);
    expect(instance.getState().endgameUndoHistory).toEqual([]);
    expect(endgame.container.querySelector('[data-testid="confirm-endgame-undo"]')).toBeNull();

    act(() => instance.setState(locked));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z', bubbles: true })));
    expect(instance.undoEndgame).toHaveBeenCalledTimes(2);
    expect(instance.getState().active).toEqual(current.active);
    endgame.unmount();

    const classic = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    expect(classic.container.querySelector('[data-testid="touch-undo"]')).toBeNull();
    expect(classic.container.querySelector('.keyboard-map')).toBeNull();
    classic.unmount();
  });

  it('restarts directly from Settings while retaining the R-key confirmation curtain', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    runtimeHarness.instances.at(-1)?.restart.mockClear();
    runtimeHarness.instances.at(-1)?.start.mockClear();
    runtimeHarness.instances.at(-1)?.togglePause.mockClear();
    runtimeHarness.instances.at(-1)?.playEntryCountdown.mockClear();
    runtimeHarness.instances.at(-1)?.playEntryCountdownResolve.mockClear();
    const settings = view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')!;
    const topbar = view.container.querySelector<HTMLElement>('[data-testid="cluster-header"]')!;
    expect(settings.disabled).toBe(false);
    expect(topbar.textContent).toContain('设置');
    expect(topbar.textContent).not.toContain('重新开始暂停声音');

    act(() => settings.click());
    expect(view.container.querySelector('[data-testid="settings-sheet"]')?.textContent).toContain('继续游戏');
    expect(runtimeHarness.instances.at(-1)?.togglePause).toHaveBeenCalledTimes(1);
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.click());
    expectRetiredSheet(view.container, 'settings-sheet');
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(runtimeHarness.instances.at(-1)?.restart).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown')).toBe('3');
    expect(runtimeHarness.instances.at(-1)?.setInputEnabled).toHaveBeenLastCalledWith(false);
    await advanceEntryCountdown();
    expect(runtimeHarness.instances.at(-1)?.start).toHaveBeenCalledTimes(1);
    expect(runtimeHarness.instances.at(-1)?.playEntryCountdown.mock.calls.map(([digit]) => digit)).toEqual([3, 2, 1]);
    expect(runtimeHarness.instances.at(-1)?.playEntryCountdownResolve).toHaveBeenCalledTimes(1);

    runtimeHarness.instances.at(-1)?.playEntryCountdown.mockClear();
    runtimeHarness.instances.at(-1)?.playEntryCountdownResolve.mockClear();

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.textContent).toContain('重新开始');
    expect(runtimeHarness.instances.at(-1)?.restart).toHaveBeenCalledTimes(1);
    expect(runtimeHarness.instances.at(-1)?.togglePause).toHaveBeenCalledTimes(2);
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).not.toBeNull();
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    expect(runtimeHarness.instances.at(-1)?.restart).toHaveBeenCalledTimes(2);
    expect(runtimeHarness.instances.at(-1)?.start).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown')).toBe('3');
    expect(runtimeHarness.instances.at(-1)?.setInputEnabled).toHaveBeenLastCalledWith(false);
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    await advanceEntryCountdown();
    expect(runtimeHarness.instances.at(-1)?.start).toHaveBeenCalledTimes(2);
    expect(runtimeHarness.instances.at(-1)?.playEntryCountdown.mock.calls.map(([digit]) => digit)).toEqual([3, 2, 1]);
    expect(runtimeHarness.instances.at(-1)?.playEntryCountdownResolve).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[data-testid="entry-countdown"]')).toBeNull();
    view.unmount();
  });

  it('announces the predictable two-row Survival aftershock before it resolves', () => {
    const state = {
      ...createInitialState(0x51a1f00d, 'race'),
      survivalRiseCount: 3,
    };
    const view = render(createElement(RunStats, { state }));
    const bedrock = view.container.querySelector<HTMLElement>('[data-stat-role="survival-bedrock"]');

    expect(bedrock?.dataset.aftershock).toBe('true');
    expect(bedrock?.textContent).toBe('余震13 秒');
    view.unmount();
  });

  it('removes live Endgame analysis and presents one authored pre-play lesson instead', () => {
    const view = render(createElement(EndgameLibrary, {
      progress: defaultEndgameProgress(),
      selectedId: 't3r-shaft-01',
      onSelect: vi.fn(),
      onStart: vi.fn(),
      onBack: vi.fn(),
    }));
    expect(view.container.querySelector('[data-testid="endgame-guidance"]')).toBeNull();
    expect(view.container.querySelectorAll('[data-guidance-metric], [data-queue-role]')).toHaveLength(0);
    expect(view.container.querySelector('[data-testid="endgame-lesson"]')?.textContent).toContain('先完成一行');
    expect(view.container.textContent).not.toContain('局面分析');
    view.rerender(createElement(EndgameLibrary, {
      progress: defaultEndgameProgress(),
      selectedId: 't3r-shaft-01',
      onSelect: vi.fn(),
      onStart: vi.fn(),
      onBack: vi.fn(),
      language: 'en',
    }));
    expect(view.container.querySelector('[data-testid="endgame-lesson"]')?.textContent).toContain('Finish one row first');
    view.unmount();
  });

  it('treats Settings opened from an existing pause as an overlay and continues directly to play', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;
    runtime.togglePause.mockClear();
    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    expect(view.container.textContent).toContain('暂停');

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    expect(runtime.togglePause).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="settings-sheet"]')?.textContent).toContain('继续游戏');
    expect(view.container.querySelector('[data-testid="settings-sheet"]')?.textContent).not.toContain('返回暂停');

    act(() => [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="settings-sheet"] button')]
      .find((button) => button.textContent === '继续游戏')?.click());
    expectRetiredSheet(view.container, 'settings-sheet');
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    expect(runtime.togglePause).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('keeps one canvas while Settings supersedes pause and direct restart begins a fresh countdown', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));

    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const canvas = view.container.querySelector<HTMLCanvasElement>('canvas')!;
    const runtime = runtimeHarness.instances.at(-1)!;
    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.textContent).toContain('暂停');
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    expect(view.container.querySelector('canvas')).toBe(canvas);

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })));
    const settingsDialog = view.container.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')!;
    expect(view.container.querySelectorAll('[role="dialog"][aria-modal="true"]')).toHaveLength(1);
    expect(settingsDialog.querySelector('[data-testid="settings-sheet"]')).not.toBeNull();
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    expect(view.container.querySelector('canvas')).toBe(canvas);
    expect(runtimeHarness.instances.at(-1)?.setInputEnabled).toHaveBeenLastCalledWith(false);

    act(() => view.container.querySelector<HTMLElement>('[data-testid="action-sheet-backdrop"]')?.click());
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })));
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.click());
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expectRetiredSheet(view.container, 'settings-sheet');
    expect(view.container.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown')).toBe('3');
    expect(runtime.restart).toHaveBeenCalledTimes(1);
    await advanceEntryCountdown();
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')?.textContent).toContain('重新开始');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })));
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(view.container.textContent).toContain('离开本局？');
    act(() => [...view.container.querySelectorAll<HTMLButtonElement>('.action-sheet__actions > button')]
      .find((button) => button.textContent === '留在本局')?.click());
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    expect(view.container.querySelector('[data-sheet-phase="exit"]')?.textContent).toContain('离开本局？');
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    expect(view.container.querySelector('canvas')).toBe(canvas);

    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.textContent).toContain('暂停');
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true })));
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-restart"]')?.click());
    expect(view.container.querySelector('[data-testid="restart-curtain"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="pause-curtain"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown')).toBe('3');
    expect(runtime.restart).toHaveBeenCalledTimes(2);
    expect(view.container.querySelectorAll('canvas')).toHaveLength(1);
    expect(view.container.querySelector('canvas')).toBe(canvas);
    view.unmount();
  });

  it('routes Escape through the visible return confirmation with arrow and Enter selection', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const onExit = vi.fn();
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit, onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const back = view.container.querySelector<HTMLButtonElement>('.topbar-action')!;
    expect(back.getAttribute('aria-keyshortcuts')).toBe('Escape');

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })));
    expect(view.container.textContent).toContain('离开本局？');
    expect(runtimeHarness.instances.at(-1)?.setInputEnabled).toHaveBeenLastCalledWith(false);
    const actions = [...view.container.querySelectorAll<HTMLButtonElement>('.action-sheet__actions > button')];
    const leave = actions
      .find((button) => button.textContent === '返回首页')!;
    const stay = actions.find((button) => button.textContent === '留在本局')!;
    expect(actions.map((button) => button.textContent)).toEqual(['返回首页', '留在本局']);
    expect(leave.classList.contains('primary-action')).toBe(true);
    expect(stay.classList.contains('secondary-action')).toBe(true);
    expect(leave.dataset.actionSelected).toBe('true');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(stay.dataset.actionSelected).toBe('true');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    expect(leave.dataset.actionSelected).toBe('true');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onExit).toHaveBeenCalledExactlyOnceWith('home');
    view.unmount();
  });

  it('keeps the homepage navigational without visible rules or record copy', () => {
    const onEnter = vi.fn();
    const view = render(createElement(ModeHome, { onEnter, language: 'zh-CN' }));
    const classic = view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]');
    const survival = view.container.querySelector<HTMLButtonElement>('[data-testid="enter-race"]');
    const mutation = view.container.querySelector<HTMLButtonElement>('[data-testid="enter-sprint"]');
    const endgame = view.container.querySelector<HTMLButtonElement>('[data-testid="enter-endgame"]');

    expect(classic).not.toBeNull();
    expect([classic, survival, mutation, endgame].map((button) => button?.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(view.container.querySelectorAll('.mode-gate--active')).toHaveLength(0);
    expect(view.container.querySelector('[data-testid="mode-list"]')?.hasAttribute('data-selection')).toBe(false);
    expect([classic, survival, mutation, endgame].every((button) => (
      !button?.hasAttribute('data-selected') && !button?.hasAttribute('aria-pressed')
    ))).toBe(true);
    expect([classic, survival, mutation, endgame].map((button) => button?.querySelector('strong')?.textContent)).toEqual([
      '经典',
      '生存',
      '异变',
      '残局',
    ]);
    expect(view.container.textContent).not.toMatch(/马拉松|竞速|等级|速度档/);
    expect(view.container.textContent).not.toContain('选择模式');
    expect(view.container.textContent).not.toContain('补满任意横行即可消除并得分。');
    expect(view.container.querySelector('[data-testid="brand"]')).toBeNull();
    expect(view.container.querySelector('h1.mode-home-wordmark')?.tagName).toBe('H1');
    expect(view.container.querySelector('h1.mode-home-wordmark')?.textContent).toBe('TetraMorph');
    expect(view.container.querySelector('.mode-home-tagline')).toBeNull();
    expect(view.container.querySelector('.language-control')).toBeNull();
    const actionArrows = [...view.container.querySelectorAll<SVGElement>('.mode-gate__action > svg')];
    expect(actionArrows).toHaveLength(4);
    expect(actionArrows.every((arrow) => arrow.getAttribute('viewBox') === '0 0 28 24')).toBe(true);
    expect(actionArrows.every((arrow) => arrow.querySelector('path')?.getAttribute('d') === 'M3 12h22m-6-6 6 6-6 6')).toBe(true);
    expect(view.container.textContent).not.toMatch(/开始|选关/);
    expect(classic?.getAttribute('aria-label')).toBe('开始 经典');
    expect(endgame?.getAttribute('aria-label')).toBe('选关 残局');
    expect(view.container.textContent).not.toContain('基岩会持续向上推进。');
    expect(view.container.textContent).not.toContain('带核心标记的方块携带道具。');
    expect(view.container.textContent).not.toContain('使用固定出现顺序的方块。');
    expect(view.container.textContent).not.toMatch(/按(?:消行|时长)排行|记录最少落子/);
    expect(view.container.textContent).not.toContain('目标：清空棋盘');
    expect(view.container.querySelector('.mode-preview')).toBeNull();
    expect(view.container.querySelector('.phase-seam')).toBeNull();
    expect(view.container.querySelector('.landing-shell--workbench .mode-chooser--workbench')).not.toBeNull();
    expect(view.container.querySelectorAll('.mode-gate__index, .mode-gate__motif')).toHaveLength(0);
    expect(view.container.querySelector('.landing-header__signal, .landing-intro__eyebrow, .landing-intro__mark')).toBeNull();
    for (const selector of ['enter-marathon', 'enter-race', 'enter-sprint', 'enter-endgame']) {
      expect(view.container.querySelectorAll(`[data-testid="${selector}"] .mode-gate__glyph rect`)).toHaveLength(4);
    }
    expect(styles).not.toContain('.phase-seam');
    expect(styles).not.toContain('.action-sheet::before');
    expect(styles).not.toContain('rotate(3deg)');

    expect(sourceStyles).toContain('grid-template-columns: 56px minmax(0, 1fr) 42px');
    expect(sourceStyles).toMatch(/\.mode-gates--workbench \.mode-gate__action \{[^}]*display: flex;[^}]*align-items: center;[^}]*justify-content: center;/s);
    expect(sourceStyles).not.toMatch(/\.mode-gates--workbench \.mode-gate__action svg \{[^}]*transform:/s);
    expect(sourceStyles).toContain('transform: translateX(-.38em)');
    expect(sourceStyles).toContain('stroke: #ffffff');
    expect(endgameLibraryStyles).toMatch(/data-endgame-category="easy"[^}]*repeat\(5,/s);
    expect(endgameLibraryStyles).toMatch(/\[lang="en"\] \.endgame-gallery__page\s*\{[^}]*font-family:\s*var\(--font-ui\)/s);
    const iconDocument = new DOMParser().parseFromString(sourceIndex, 'text/html');
    expect(iconDocument.querySelector('link[rel="icon"][type="image/svg+xml"][sizes="any"][href="/favicon.svg"]')).not.toBeNull();
    for (const size of [16, 32, 64]) {
      expect(iconDocument.querySelector(`link[rel="icon"][type="image/png"][sizes="${size}x${size}"][href="/favicon-${size}x${size}.png"]`)).not.toBeNull();
    }
    expect(iconDocument.querySelector('link[rel="apple-touch-icon"][type="image/png"][sizes="180x180"][href="/apple-touch-icon.png"]')).not.toBeNull();
    expect(sourceIndex).not.toContain('data:image');
    expect(view.container.textContent).not.toMatch(/GRAVITY FIELD|选择一条重力轨迹/);

    for (const banned of ['当前选择', '三种玩法', '随时开始，也可随时退出。', '键盘与触控均可操作']) {
      expect(view.container.textContent).not.toContain(banned);
    }

    act(() => classic?.focus());
    act(() => classic?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(survival);
    expect([classic, survival, mutation, endgame].map((button) => button?.tabIndex)).toEqual([-1, 0, -1, -1]);
    act(() => survival?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(endgame);
    act(() => endgame?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(mutation);
    act(() => mutation?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(classic);
    expect(view.container.querySelectorAll('.mode-gate--active')).toHaveLength(0);

    act(() => survival?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true })));
    act(() => survival?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true })));
    expect(view.container.querySelectorAll('.mode-gate--active, [data-selected="true"]')).toHaveLength(0);

    const modeList = view.container.querySelector<HTMLElement>('[data-testid="mode-list"]')!;
    act(() => modeList.dispatchEvent(new PointerEvent('pointermove', { bubbles: true })));
    expect(modeList.dataset.inputModality).toBe('pointer');
    act(() => classic?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    expect(modeList.dataset.inputModality).toBe('keyboard');

    act(() => survival?.click());
    expect(onEnter).toHaveBeenCalledWith('race');
    view.unmount();
    const english = render(createElement(ModeHome, { onEnter, language: 'en' }));
    expect(english.container.querySelector('.mode-home-tagline')).toBeNull();
    expect(english.container.textContent).not.toContain('Transform the way blocks fall.');
    expect([...english.container.querySelectorAll('[data-testid^="enter-"] strong')].map((label) => label.textContent)).toEqual([
      'Classic', 'Survival', 'Mutation', 'Endgame',
    ]);
    english.unmount();
  });

  it('keeps pause as a board curtain while Back, Settings, Enter, and Escape remain routed', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    const runtime = runtimeHarness.instances.at(-1)!;

    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    const backButton = view.container.querySelector<HTMLButtonElement>('[data-testid="exit-game"]')!;
    const settingsButton = view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')!;
    expect(view.container.querySelector('[data-testid="pause-curtain"]')?.textContent).toContain('回车继续');
    expect(view.container.querySelector('[role="dialog"]')).toBeNull();
    expect(backButton.disabled).toBe(false);
    expect(settingsButton.disabled).toBe(false);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })));
    expect(runtime.getState().status).toBe('playing');
    act(() => runtime.setState({ ...runtime.getState(), status: 'paused' }));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })));
    expect(view.container.querySelector('[role="dialog"]')?.textContent).toContain('离开本局？');
    view.unmount();
  });

  it('persists an English settings choice across the active game surface without Chinese fallback copy', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon']));
    const view = render(createElement(App));

    expect(parseReducedMotionOverride(null)).toBeNull();
    expect(parseReducedMotionOverride('on')).toBe(true);
    expect(parseReducedMotionOverride('off')).toBe(false);
    expect(view.container.querySelector('.app')?.getAttribute('data-reduced-motion')).toBe('true');
    expect(view.container.querySelector('[data-testid="language-en"]')).toBeNull();
    expect(view.container.querySelector('[data-testid="enter-marathon"] strong')?.textContent).toBe('经典');
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());

    const motion = view.container.querySelector<HTMLButtonElement>('[data-testid="reduced-motion-toggle"]')!;
    expect(motion.textContent).toBe('减少动效');
    expect(motion.dataset.motionMode).toBe('reduced');
    act(() => motion.click());
    expect(localStorage.getItem(REDUCED_MOTION_STORAGE_KEY)).toBe('off');
    expect(view.container.querySelector('.app')?.getAttribute('data-reduced-motion')).toBe('false');
    expect(motion.dataset.motionMode).toBe('full');
    expect(runtimeHarness.instances.at(-1)?.setReducedMotion).toHaveBeenLastCalledWith(false);

    const english = view.container.querySelector<HTMLButtonElement>('[data-testid="language-en"]')!;
    expect(english).not.toBeNull();
    act(() => english.click());

    const sheet = view.container.querySelector<HTMLElement>('[data-testid="settings-sheet"]')!;
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('tetramorph:language:v1')).toBe('en');
    expect(sheet.textContent).toContain('Settings');
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="reduced-motion-toggle"]')?.textContent).toBe('Full motion');
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-controls"]')?.click());
    expect(sheet.textContent).toMatch(/Keyboard.*Move.*Hard drop/s);
    expect(sheet.textContent).not.toMatch(/[\u4E00-\u9FFF]/);
    expect(view.container.querySelector('.sr-only[aria-live="polite"]')?.textContent).not.toMatch(/[\u4E00-\u9FFF]/);
    expect(view.container.querySelector('.keyboard-map')).toBeNull();
    expect(view.container.querySelector('canvas')?.getAttribute('aria-label')).toBe('TetraMorph 10 by 20 game board');
    view.unmount();

    const resumed = render(createElement(App));
    expect(resumed.container.querySelector('.app')?.getAttribute('data-reduced-motion')).toBe('false');
    resumed.unmount();
  });

  it('animates only real Settings tab swaps and does not replay them when motion returns to full', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(), reducedMotion: true,
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    expect(view.container.querySelector('.settings-console__panel')?.hasAttribute('data-settings-tab-epoch')).toBe(false);
    expect(view.container.querySelector<HTMLElement>('.action-sheet')?.dataset.sheetMotion).toBe('reduced');

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-controls"]')?.click());
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-epoch')).toBe('1');
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-motion')).toBe('reduced');
    view.rerender(createElement(GameSession, {
      mode: 'marathon', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(), reducedMotion: false,
    }));
    expect(view.container.querySelector<HTMLElement>('.action-sheet')?.dataset.sheetMotion).toBe('reduced');
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-epoch')).toBe('1');
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-motion')).toBe('reduced');

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-controls"]')?.click());
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-epoch')).toBe('1');
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="settings-tab-rules"]')?.click());
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-epoch')).toBe('2');
    expect(view.container.querySelector('.settings-console__panel')?.getAttribute('data-settings-tab-motion')).toBe('full');

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="action-sheet-backdrop"]')?.click());
    await act(async () => vi.advanceTimersByTimeAsync(32));
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    expect(view.container.querySelector('.settings-console__panel')?.hasAttribute('data-settings-tab-epoch')).toBe(false);
    view.unmount();
  });

  it('migrates arbitrary Classic ranges into five fixed presets and applies them to the next runtime only', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:mode-rule-intros:v2', JSON.stringify(['marathon']));

    expect(parseClassicGravityRange(null)).toEqual({ startingTicks: 36, floorTicks: 4.8 });
    expect(parseClassicGravityRange('31')).toEqual({ startingTicks: 36, floorTicks: 4.8 });
    expect(parseClassicGravityRange('{"startingTicks":31,"floorTicks":17}')).toEqual({
      startingTicks: 48,
      floorTicks: 12,
    });
    expect(parseClassicGravityRange('{"version":2,"paceId":"expert"}')).toEqual({ startingTicks: 12, floorTicks: 4.8 });
    localStorage.setItem(CLASSIC_GRAVITY_RANGE_STORAGE_KEY, '{"startingTicks":31,"floorTicks":17}');

    const view = render(createElement(App));
    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    await act(async () => Promise.resolve());
    const runtime = runtimeHarness.instances.at(-1)!;
    expect(runtime.options.classicStartingGravityTicks).toBe(48);
    expect(runtime.options.classicGravityFloorTicks).toBe(12);
    expect(runtime.getState().classicStartingGravityTicks).toBe(48);
    expect(runtime.getState().classicGravityFloorTicks).toBe(12);

    act(() => view.container.querySelector<HTMLButtonElement>('[data-testid="open-settings"]')?.click());
    const presetButtons = [...view.container.querySelectorAll<HTMLButtonElement>('button[data-testid^="classic-pace-"]')];
    expect(presetButtons).toHaveLength(5);
    expect(presetButtons.map((button) => button.dataset.classicPace)).toEqual(['calm', 'relaxed', 'standard', 'swift', 'expert']);
    expect(view.container.querySelector('[data-testid="classic-pace-relaxed"]')?.getAttribute('aria-checked')).toBe('true');
    const standardPace = view.container.querySelector<HTMLButtonElement>('[data-testid="classic-pace-standard"]')!;
    act(() => standardPace.click());
    expect(localStorage.getItem(CLASSIC_PACE_STORAGE_KEY)).toBe('{"version":2,"paceId":"standard"}');
    expect(runtime.setClassicGravityRange).toHaveBeenLastCalledWith(36, 4.8);
    expect(view.container.querySelector('[data-testid="classic-pace-summary"]')?.textContent).toBe('开局速度 0.6 → 最快速度 0.08 秒/格');
    const activeStandardPace = view.container.querySelector<HTMLButtonElement>('[data-testid="classic-pace-standard"]')!;
    act(() => {
      activeStandardPace.focus();
      activeStandardPace.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    });
    expect(localStorage.getItem(CLASSIC_PACE_STORAGE_KEY)).toBe('{"version":2,"paceId":"swift"}');
    expect(runtime.setClassicGravityRange).toHaveBeenLastCalledWith(24, 4.8);
    expect(view.container.querySelector('[data-testid="classic-pace-swift"]')?.getAttribute('aria-checked')).toBe('true');
    expect(runtime.getState().classicStartingGravityTicks).toBe(48);
    expect(runtime.getState().classicGravityFloorTicks).toBe(12);
    expect(view.container.querySelector('.classic-speed-control__heading em')?.textContent).toBe('秒/格');
    expect(view.container.querySelector('[data-testid="classic-difficulty-grade"]')?.textContent).toBe('节奏预设 · 迅捷');
    expect(sourceSettingsStyles).toMatch(/\.classic-speed-control__presets\s*\{[^}]*repeat\(5,\s*minmax\(44px,\s*1fr\)\)/s);
    expect(sourceSettingsStyles).toMatch(/\.classic-speed-control__preset\s*\{[^}]*min-height:\s*52px/s);
    expect(sourceSettingsStyles).toMatch(/\.classic-speed-control__preset\[aria-checked="true"\]\s*\{[^}]*background:/s);
    expect(sourceSettingsStyles).not.toContain('.classic-speed-control__input');
    view.unmount();

    const resumed = render(createElement(App));
    act(() => resumed.container.querySelector<HTMLButtonElement>('[data-testid="enter-marathon"]')?.click());
    await act(async () => Promise.resolve());
    expect(runtimeHarness.instances.at(-1)?.options.classicStartingGravityTicks).toBe(24);
    expect(runtimeHarness.instances.at(-1)?.options.classicGravityFloorTicks).toBe(4.8);
    resumed.unmount();
  });

  it('keeps the active English language in the terminal leaderboard call site', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'marathon',
      endgameId: CAMPAIGN_LEVELS[0]!.id,
      onExit: vi.fn(),
      onCanonicalCompletion: vi.fn(),
      language: 'en',
    }));
    await act(async () => Promise.resolve());
    await advanceEntryCountdown();

    const runtime = runtimeHarness.instances.at(-1)!;
    act(() => runtime.setState({
      ...runtime.getState(),
      status: 'game-over',
      score: 4321,
      lines: 12,
      pieceCount: 44,
      elapsedTicks: 3600,
    }));

    const leaderboard = view.container.querySelector<HTMLElement>('.result-leaderboard');
    expect(leaderboard?.getAttribute('aria-label')).toBe('Leaderboard');
    expect(leaderboard?.querySelector('header')?.textContent).toBe('LeaderboardTop 5');
    expect(leaderboard?.textContent).toContain('12 lines');
    expect(leaderboard?.textContent).toContain('44 pieces');
    expect(leaderboard?.textContent).not.toContain('4,321 pts');
    expect(leaderboard?.textContent).not.toMatch(/[\u4E00-\u9FFF]/);
    view.unmount();
  });

  it('labels Classic by lines and pieces, Survival by time and lines, and 异变 by score and lines', () => {
    const base: ScoreRecord = {
      version: 10,
      score: 3200,
      lines: 18,
      pieces: 62,
      elapsedTicks: 4200,
      chain: 0,
      mode: 'marathon',
      outcome: 'top-out',
      completedAt: '2026-07-18T12:00:00.000Z',
      classicStartingGravityTicks: 36,
      classicGravityFloorTicks: 4.8,
      classicGrade: 'standard',
    };
    const classic = render(createElement(LeaderboardPanel, { mode: 'marathon', records: [base], highlightRecord: base }));
    expect(classic.container.querySelector('.result-leaderboard')?.getAttribute('aria-label')).toBe('排行榜');
    expect(classic.container.querySelector('.result-leaderboard header')?.textContent).toBe('排行榜前 5');
    expect(classic.container.querySelector('[data-record-field="lines"]')?.textContent).toBe('18 行');
    expect(classic.container.querySelector('[data-record-field="pieces"]')?.textContent).toBe('62 方块');
    expect(classic.container.querySelector('[data-record-field="score"]')).toBeNull();
    expect(classic.container.querySelector('.result-leaderboard__current')?.textContent).toBe('本局');
    expect(classic.container.querySelector('.result-leaderboard li time')?.textContent).toBe('2026.07.18');
    expect(classic.container.querySelector('.result-leaderboard li')?.textContent).not.toContain('·');
    expect(classic.container.querySelector('[data-current-record="true"]')).not.toBeNull();
    expect(classic.container.querySelector<HTMLElement>('.result-leaderboard')?.dataset.empty).toBeUndefined();
    expect(classic.container.querySelector<HTMLElement>('.result-leaderboard')?.dataset.classicGrade).toBe('standard');
    expect([...classic.container.querySelectorAll('[data-testid="classic-leaderboard-grades"] button')].map((button) => button.textContent))
      .toEqual(['平缓', '轻松', '标准', '迅捷', '专家']);
    expect(classic.container.querySelector('[data-grade="standard"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(scoreRecordRank([base], base)).toBe(1);
    expect(scoreRecordRank([base], { ...base, completedAt: '2026-07-19T12:00:00.000Z' })).toBeNull();
    classic.unmount();

    const calm: ScoreRecord = {
      ...base,
      lines: 22,
      completedAt: '2026-07-17T12:00:00.000Z',
      classicStartingGravityTicks: 60,
      classicGravityFloorTicks: 18,
      classicGrade: 'calm',
    };
    const expert: ScoreRecord = {
      ...base,
      lines: 26,
      completedAt: '2026-07-16T12:00:00.000Z',
      classicStartingGravityTicks: 12,
      classicGravityFloorTicks: 4.8,
      classicGrade: 'expert',
    };
    const filteredClassic = render(createElement(LeaderboardPanel, {
      mode: 'marathon',
      records: [calm, base, expert],
      initialClassicGrade: 'expert',
    }));
    expect(filteredClassic.container.querySelector('[data-record-field="lines"]')?.textContent).toBe('26 行');
    act(() => filteredClassic.container.querySelector<HTMLButtonElement>('[data-grade="calm"]')?.click());
    expect(filteredClassic.container.querySelector('[data-record-field="lines"]')?.textContent).toBe('22 行');
    expect(filteredClassic.container.querySelector<HTMLElement>('.result-leaderboard')?.dataset.classicGrade).toBe('calm');
    filteredClassic.unmount();

    const emptySettings = render(createElement(LeaderboardPanel, { mode: 'marathon', records: [], variant: 'settings' }));
    expect(emptySettings.container.querySelector<HTMLElement>('[data-testid="settings-leaderboard"]')?.dataset.empty).toBe('true');
    expect(emptySettings.container.querySelector('.result-leaderboard > p')?.textContent).toBe('暂无记录');
    emptySettings.unmount();

    const survivalRecord: ScoreRecord = {
      version: 10,
      mode: 'race',
      outcome: 'top-out',
      lines: 27,
      elapsedTicks: base.elapsedTicks,
      completedAt: base.completedAt,
    };
    const survival = render(createElement(LeaderboardPanel, { mode: 'race', records: [survivalRecord] }));
    expect(survival.container.querySelector('.result-leaderboard')?.getAttribute('aria-label')).toBe('排行榜');
    expect(survival.container.querySelector('.result-leaderboard header')?.textContent).toBe('排行榜前 5');
    expect(survival.container.querySelector('.result-leaderboard li .result-leaderboard__run')?.textContent).toBe('1 分 10 秒27 行');
    expect(survival.container.querySelector('.result-leaderboard li')?.textContent).not.toContain('方块');
    expect(survival.container.querySelector('.result-leaderboard li time')?.textContent).toBe('2026.07.18');
    survival.unmount();

    const sprintRecord = { ...base, mode: 'sprint' as const, score: 1800, lines: 40, pieces: 48, elapsedTicks: 5400, chain: 0 };
    const sprint = render(createElement(LeaderboardPanel, { mode: 'sprint', records: [sprintRecord] }));
    expect(sprint.container.querySelector('.result-leaderboard')?.getAttribute('aria-label')).toBe('排行榜');
    expect(sprint.container.querySelector('.result-leaderboard header')?.textContent).toBe('排行榜前 5');
    expect(sprint.container.querySelector('[data-record-field="score"]')?.textContent).toBe('1,800');
    expect(sprint.container.querySelector('[data-record-field="lines"]')?.textContent).toBe('40 行');
    expect(sprint.container.querySelector('[data-record-field="pieces"]')).toBeNull();
    expect(sprint.container.querySelector('.result-leaderboard li time')?.textContent).toBe('2026.07.18');
    sprint.unmount();

    expect(elapsedTimeLabel(65 * 60)).toBe('1 分 5 秒');
    expect(elapsedClockLabel(65 * 60)).toBe('1:05');
    expect(countdownTimeLabel(65 * 60)).toBe('1:05');

    const ended = { ...createInitialState(1, 'race'), status: 'game-over' as const, score: 900, lines: 27, pieceCount: 62, elapsedTicks: 4200 };
    expect(scoreRecordForState(ended, base.completedAt)).toEqual({
      version: 10,
      mode: 'race',
      outcome: 'top-out',
      lines: 27,
      elapsedTicks: 4200,
      completedAt: base.completedAt,
    });
    const endedSprint = { ...createInitialState(1, 'sprint'), status: 'game-over' as const, score: 1800, lines: 40, pieceCount: 48, elapsedTicks: 5400 };
    expect(scoreRecordForState(endedSprint, base.completedAt)).toMatchObject({ mode: 'sprint', score: 1800, lines: 40, chain: 0, outcome: 'top-out' });
    const endedClassic = { ...createInitialState(1, 'marathon'), status: 'game-over' as const };
    expect(scoreRecordForState(endedClassic, base.completedAt)).toMatchObject({
      mode: 'marathon',
      classicStartingGravityTicks: 36,
      classicGravityFloorTicks: 4.8,
      classicGrade: 'standard',
    });
    expect(scoreRecordForState(createInitialState(1, 'endgame', CAMPAIGN_LEVELS[0]!.id), base.completedAt)).toBeNull();
  });

  it('renders at most five real rows with the exact record field matrix for each scored mode', () => {
    const expectedFields: Readonly<Record<'marathon' | 'race' | 'sprint', readonly string[]>> = {
      marathon: ['rank', 'lines', 'pieces', 'date'],
      race: ['rank', 'time', 'lines', 'date'],
      sprint: ['rank', 'score', 'lines', 'date'],
    };

    for (const mode of ['marathon', 'race', 'sprint'] as const) {
      const records: ScoreRecord[] = Array.from({ length: 7 }, (_, index) => {
        const completedAt = `2026-07-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`;
        if (mode === 'race') return {
          version: 10 as const,
          mode: 'race' as const,
          outcome: 'top-out' as const,
          lines: 30 - index,
          elapsedTicks: 4200 - index * 30,
          completedAt,
        };
        const scoredRecord = {
          version: 10 as const,
          outcome: 'top-out' as const,
          score: 7000 - index * 100,
          lines: 30 - index,
          pieces: 50 + index,
          elapsedTicks: 4200 - index * 30,
          chain: 0,
          completedAt,
        };
        if (mode === 'marathon') return {
          ...scoredRecord,
          mode,
          ...{
            classicStartingGravityTicks: 36,
            classicGravityFloorTicks: 4.8,
            classicGrade: 'standard' as const,
          },
        };
        return { ...scoredRecord, mode: 'sprint' as const };
      });
      const view = render(createElement(LeaderboardPanel, { mode, records, variant: 'settings' }));
      const rows = [...view.container.querySelectorAll<HTMLLIElement>('ol > li')];
      expect(rows).toHaveLength(5);
      expect(rows.map((row) => row.querySelector('[data-record-field="rank"]')?.textContent)).toEqual(['01', '02', '03', '04', '05']);
      for (const row of rows) {
        expect([...row.querySelectorAll<HTMLElement>('[data-record-field]')].map((field) => field.dataset.recordField))
          .toEqual(expectedFields[mode]);
      }
      if (mode === 'race') {
        expect(view.container.querySelector('[data-record-field="score"], [data-record-field="pieces"]')).toBeNull();
      }
      view.unmount();

      const empty = render(createElement(LeaderboardPanel, { mode, records: [], variant: 'settings' }));
      expect(empty.container.querySelectorAll('li')).toHaveLength(0);
      expect(empty.container.querySelector('.result-leaderboard > p')?.textContent).toBe('暂无记录');
      empty.unmount();
    }
  });

  it('keeps the Mutation instrument mounted above the run data and labels active timed states', () => {
    const idle = render(createElement(MutationStatus, {
      state: createInitialState(0x51a1f00d, 'sprint'),
    }));
    const idlePanel = idle.container.querySelector<HTMLElement>('[data-testid="mutation-status"]');
    expect(idlePanel?.dataset.activeCount).toBe('0');
    expect(idle.container.querySelector('[data-testid="mutation-status-idle"]')).toBeNull();
    expect(idle.container.textContent).not.toContain('暂无持续状态');
    idle.unmount();

    const active = {
      ...createInitialState(0x51a1f00d, 'sprint'),
      mutationFreezeTicks: 300,
      mutationMultiplierTicks: 600,
      mutationMultiplierFactor: 4 as const,
    };
    const view = render(createElement(MutationStatus, { state: active }));
    const multiplier = view.container.querySelector<HTMLElement>('[data-mutation-state="multiplier"]');
    expect(view.container.querySelectorAll('.mutation-status__effect')).toHaveLength(2);
    expect(multiplier?.textContent).toBe('超级加倍 ×4');
    expect(multiplier?.dataset.mutationTier).toBe('4');
    expect(multiplier?.querySelector<HTMLElement>('.mutation-status__meter > i')?.style.width).toBe('100%');
    expect(multiplier?.getAttribute('aria-label')).toBe('超级加倍 ×4：10 秒');
    expect(view.container.textContent).not.toContain('生效中');
    expect(view.container.textContent).not.toContain('秒');
    expect(view.container.querySelector('.mutation-status__effect small, .mutation-status__effect em')).toBeNull();
    expect(view.container.textContent).not.toContain('倍增');
    const supergravity = render(createElement(MutationStatus, {
      state: {
        ...createInitialState(0x51a1f00d, 'sprint'),
        mutationCollapsePiecesRemaining: MUTATION_SUPERGRAVITY_PIECES,
      },
    }));
    const collapse = supergravity.container.querySelector<HTMLElement>('[data-mutation-state="collapse"]');
    expect(collapse?.textContent).toBe('超重 · 剩余 5 块');
    expect(collapse?.getAttribute('aria-label')).toBe('超重 · 剩余 5 块');
    expect(collapse?.querySelector<HTMLElement>('.mutation-status__meter > i')?.style.width).toBe('100%');
    const latchedSupergravity = render(createElement(MutationStatus, {
      state: {
        ...createInitialState(0x51a1f00d, 'sprint'),
        mutationCollapsePiecesRemaining: 0,
        mutationCollapseLandingLatched: true,
      },
    }));
    const latchedCollapse = latchedSupergravity.container.querySelector<HTMLElement>('[data-mutation-state="collapse"]');
    expect(latchedCollapse?.dataset.landingLatched).toBe('true');
    expect(latchedCollapse?.textContent).toBe('超重 · 剩余 1 块');
    expect(latchedCollapse?.getAttribute('aria-label')).toBe('超重 · 剩余 1 块');
    expect(latchedCollapse?.querySelector<HTMLElement>('.mutation-status__meter > i')?.style.width).toBe('20%');
    const firstCoveredPiece = {
      ...createInitialState(0x51a1f00d, 'sprint'),
      active: { type: 'O', rotation: 0, x: 4, y: 4 },
      mutationCollapsePiecesRemaining: 4,
      mutationCollapseLandingLatched: true,
    } as GameState;
    const derivedLatchedSupergravity = render(createElement(MutationStatus, { state: firstCoveredPiece }));
    const derivedLatchedCollapse = derivedLatchedSupergravity.container.querySelector<HTMLElement>('[data-mutation-state="collapse"]');
    expect(derivedLatchedCollapse?.dataset.landingLatched).toBe('true');
    expect(derivedLatchedCollapse?.textContent).toBe('超重 · 剩余 5 块');
    expect(derivedLatchedCollapse?.querySelector<HTMLElement>('.mutation-status__meter > i')?.style.width).toBe('100%');
    const bombState = { ...active, mutationLastItem: 'bomb' as const, mutationLastItemTicks: 120 };
    const bomb = render(createElement(MutationStatus, { state: bombState }));
    expect(bomb.container.textContent).not.toContain('炸弹已清除底部 3 行');
    const mutationRule = modeRules('zh-CN', 'sprint').find((fact) => fact.id === 'items')?.value ?? '';
    expect(mutationRule).toContain('冰冻令自动下落固定为 0.80 秒/格');
    expect(mutationRule).toContain('超重令后续 5 个方块的自身各列独立下沉，已落定方块不移动');
    expect(mutationRule).toContain('炸弹清除触发消行的该行及上下相邻行（在棋盘边缘截断）');
    expect(mutationRule).toContain('若爆破带引爆另一炸弹，则从首个炸弹向上下逐行清空棋盘，并触发所有已锁定材质方块一次');
    expect(mutationRule).not.toContain('冻结');
    expect(mutationRule).not.toContain('底部 3 行');
    const englishMutationRule = modeRules('en', 'sprint').find((fact) => fact.id === 'items')?.value ?? '';
    expect(englishMutationRule).toContain('Freeze fixes automatic gravity at 0.80 s/cell');
    expect(englishMutationRule).toContain('Bomb clears the triggering line and its adjacent lines above and below');
    expect(englishMutationRule).toContain('the board clears row by row in both directions from the first Bomb');
    expect(englishMutationRule).not.toContain('bottom 3 rows');
    supergravity.unmount();
    latchedSupergravity.unmount();
    derivedLatchedSupergravity.unmount();
    bomb.unmount();
    view.unmount();
  });

  it('announces every notable event from one transition in source order', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
    const view = render(createElement(GameSession, {
      mode: 'sprint', endgameId: CAMPAIGN_LEVELS[0]!.id, onExit: vi.fn(), onCanonicalCompletion: vi.fn(),
    }));
    await act(async () => Promise.resolve());
    const runtime = runtimeHarness.instances.at(-1)!;
    const events: GameEvent[] = [
      { type: 'lines-cleared', rows: [39], count: 1, score: 40 },
      { type: 'mutation-activated', item: 'freeze', durationTicks: MUTATION_EFFECT_TICKS, score: 0, rowsRemoved: 0 },
      { type: 'mutation-activated', item: 'collapse', durationTicks: 0, coveredPieces: MUTATION_SUPERGRAVITY_PIECES, score: 0, rowsRemoved: 0 },
    ];
    act(() => runtime.options.onState?.(runtime.getState(), events));
    expect(view.container.querySelector('.sr-only[aria-live="polite"]')?.textContent).toBe(
      '消除了 1 行。 冰冻 已触发，持续 10 秒。 超重已触发，覆盖后续 5 块。',
    );
    view.unmount();
  });

  it('reports Survival terminal data and bedrock rise announcements', () => {
    const terminalState: GameState = {
      ...createInitialState(0x51a1f00d, 'race'),
      status: 'game-over',
      lines: 24,
      pieceCount: 72,
      survivalBedrockRows: 4,
    };

    expect(terminalCopy(terminalState)).toEqual({
      title: '生存时间',
      detail: '',
      success: false,
    });
    expect(runResultMetrics({ ...terminalState, elapsedTicks: 125 * 60 })).toEqual([
      { id: 'survival-time', label: '生存时间', value: '2:05', primary: true },
      { id: 'lines', label: '消行', value: '24', primary: false },
    ]);
    expect(sourceResultStyles).toContain('width: min(31rem, calc(100vw - 24px))');
    expect(sourceResultStyles).toMatch(/\.run-result__hero strong\s*\{[^}]*font-size:\s*clamp\(48px, 13vw, 68px\)/s);
    expect(sourceResultStyles).toMatch(/\.run-result__support\s*\{[^}]*justify-content:\s*space-between/s);
    expect(sourceResultStyles).not.toContain('"summary leaderboard"');
    const resultSummary = render(createElement(RunResultSummary, {
      state: { ...terminalState, elapsedTicks: 125 * 60 },
      rank: 2,
      hasRecord: true,
    }));
    expect(resultSummary.container.querySelector('.run-result__hero strong')?.textContent).toBe('2:05');
    expect(resultSummary.container.querySelector('.run-result__hero span')).toBeNull();
    expect(resultSummary.container.querySelector('.run-result__support')?.textContent).toContain('24');
    expect(resultSummary.container.querySelector('.run-result__metric')).toBeNull();
    expect(resultSummary.container.querySelector('.run-result__rank')).toBeNull();
    expect(resultSummary.container.textContent).not.toContain('本局第');
    expect(resultSummary.container.textContent).not.toMatch(/方块|基岩/);
    resultSummary.unmount();
    const unrankedSummary = render(createElement(RunResultSummary, {
      state: { ...terminalState, elapsedTicks: 125 * 60 },
      rank: null,
      hasRecord: true,
    }));
    expect(unrankedSummary.container.querySelector('.run-result__rank')?.textContent).toBe('未进入前 5');
    unrankedSummary.unmount();
    expect(eventMessage({ type: 'bedrock-raised', count: 1, height: 4 })).toBe('基岩升至 4 层。');
    expect(eventMessage({ type: 'bedrock-lowered', count: 1, height: 3 })).toBe('基岩降至 3 层。');
    expect(eventMessage({ type: 'endgame-undone' })).toBe('已撤回上一次落子。');
    const mutationEvents: GameEvent[] = [
      { type: 'lines-cleared', rows: [39], count: 1, score: 40 },
      { type: 'mutation-activated', item: 'freeze', durationTicks: MUTATION_EFFECT_TICKS, score: 0, rowsRemoved: 0 },
      { type: 'mutation-activated', item: 'collapse', durationTicks: 0, coveredPieces: MUTATION_SUPERGRAVITY_PIECES, score: 0, rowsRemoved: 0 },
    ];
    expect(eventMessages(mutationEvents)).toBe(
      '消除了 1 行。 冰冻 已触发，持续 10 秒。 超重已触发，覆盖后续 5 块。',
    );
    expect(eventMessages(mutationEvents, 'en')).toBe(
      '1 lines cleared. Freeze activated for 10 seconds. Supergravity activated for the next 5 pieces.',
    );

    const completedEndgame: GameState = {
      ...createInitialState(0x51a1f00d, 'endgame', CAMPAIGN_LEVELS[0]!.id),
      status: 'finished',
      endgameCompletion: 'finished',
      pieceCount: 4,
      lines: 3,
    };
    expect(terminalCopy(completedEndgame)).toEqual({
      title: '原有方块已清除',
      detail: '4 方块 · 3 消行',
      success: true,
    });
    expect(endgameCelebrationOutcome(null, 9)).toBe('first');
    expect(endgameCelebrationOutcome(12, 9)).toBe('record');
    expect(endgameCelebrationOutcome(9, 9)).toBe('replay');
    expect(endgameCelebrationOutcome(8, 9)).toBe('replay');
    expect(endgameCelebrationCopy({ outcome: 'first', pieces: 9, lines: 5, previousBest: null })).toEqual({
      title: '恭喜你完成残局',
      detail: '',
      best: '当前最优步数：9步',
      bestLabel: '当前最优步数',
      bestValue: '9',
      bestUnit: '步',
    });
    expect(endgameCelebrationCopy({ outcome: 'record', pieces: 9, lines: 5, previousBest: 12 })).toMatchObject({
      title: '刷新个人纪录',
      detail: '',
      best: '当前最优步数：9步',
    });

    const endedSprint: GameState = {
      ...createInitialState(0x51a1f00d, 'sprint'),
      status: 'game-over',
      lines: 22,
      pieceCount: 47,
      score: 1800,
    };
    expect(terminalCopy(endedSprint)).toEqual({
      title: '得分',
      detail: '',
      success: false,
    });
    expect(runResultMetrics(endedSprint)).toEqual([
      { id: 'score', label: '分数', value: '1,800', primary: true },
      { id: 'lines', label: '消行', value: '22', primary: false },
    ]);
    const endedClassic: GameState = {
      ...createInitialState(0x51a1f00d, 'marathon'),
      status: 'game-over',
      lines: 18,
      pieceCount: 62,
      score: 3200,
    };
    expect(terminalCopy(endedClassic)).toEqual({
      title: '消行',
      detail: '',
      success: false,
    });
    expect(runResultMetrics(endedClassic)).toEqual([
      { id: 'lines', label: '消行', value: '18', primary: true },
      { id: 'pieces', label: '使用方块', value: '62', primary: false },
    ]);
  });

  it('shows direct progressive cadence and pending pressure instead of a level label', () => {
    const classic = { ...createInitialState(0x51a1f00d, 'marathon'), lines: 10 };
    const customClassic = { ...createInitialState(0x51a1f00d, 'marathon', undefined, 60), lines: 10 };
    const survival = { ...createInitialState(0x51a1f00d, 'race'), lines: 3 };
    const sprint = createInitialState(0x51a1f00d, 'sprint');
    const fastestSprint = { ...sprint, lines: 60 };
    const pending = {
      ...createInitialState(0x51a1f00d, 'race'),
      lines: 5,
      survivalRisePending: true,
    };
    expect(fallCadenceLabel(classic)).toBe('0.5 秒/格');
    expect(fallCadenceLabel(customClassic)).toBe('0.9 秒/格');
    expect(fallCadenceParts(classic, 'en')).toEqual({ value: '0.5', unit: 's/cell' });
    expect(fallCadenceLabel(survival)).toBe('0.6 秒/格');
    expect(fallCadenceLabel(sprint)).toBe('0.6 秒/格');
    expect(fallCadenceLabel(fastestSprint)).toBe('0.08 秒/格');
    expect(fallCadenceParts(fastestSprint, 'en')).toEqual({ value: '0.08', unit: 's/cell' });
    expect(survivalCountdownLabel(pending)).toBe('待上升');

    const english = render(createElement(RunStats, { state: classic, language: 'en' }));
    const cadence = english.container.querySelector('[data-stat-role="fall-cadence"] strong');
    const cadenceRow = english.container.querySelector('[data-stat-role="fall-cadence"] .run-stats__value-row');
    const cadenceUnit = english.container.querySelector('[data-stat-role="fall-cadence"] .run-stats__unit');
    expect(cadence?.textContent).toBe('0.5');
    expect(cadence?.getAttribute('aria-label')).toBe('0.5 s/cell');
    expect(cadenceUnit?.textContent).toBe('s/cell');
    english.unmount();

    const mutationHud = render(createElement(RunStats, { state: fastestSprint, language: 'en' }));
    const mutationCadence = mutationHud.container.querySelector('[data-stat-role="fall-cadence"] strong');
    expect(mutationCadence?.textContent).toBe('0.08');
    expect(mutationCadence?.getAttribute('aria-label')).toBe('0.08 s/cell');
    mutationHud.unmount();

    expect(sourceHudStyles).toMatch(/\[data-stat-role="fall-cadence"\] \.run-stats__value-row\s*\{[^}]*display:\s*flex[^}]*align-items:\s*baseline[^}]*white-space:\s*nowrap/s);
    expect(sourceHudStyles).toMatch(/\[data-stat-role="fall-cadence"\] \.run-stats__unit\s*\{[^}]*font-family:\s*var\(--font-ui\)[^}]*font-size:\s*14px[^}]*font-weight:\s*700/s);
    expect(sourceHudStyles).toMatch(/\.app:lang\(en\)[^{]*\[data-stat-role="fall-cadence"\] \.run-stats__unit\s*\{[^}]*font-weight:\s*400/s);
    expect(sourceHudStyles).toMatch(/\.run-stats\s*\[data-stat-role="fall-cadence"\]\s*strong\s*\{[^}]*font-size:\s*clamp\(34px, 3vw, 44px\)/s);
    expect(sourceHudStyles).toMatch(/\.run-stats\s+strong\s*\{[^}]*display:\s*inline-flex[^}]*min-height:\s*1\.08em[^}]*align-items:\s*baseline/s);
  });

  it('uses a 5/25/16 Endgame curriculum with lessons and mastery-gated Hard endgames', () => {
    expect(CAMPAIGN_LEVELS).toHaveLength(46);
    expect(ENDGAME_CATEGORIES.map(({ id, levels }) => [id, levels.length])).toEqual([
      ['intro', 5], ['easy', 25], ['hard', 16],
    ]);
    const onSelect = vi.fn();
    const onStart = vi.fn();
    const onBack = vi.fn();
    const props = (selectedId: EndgameId, progress = defaultEndgameProgress()) => ({
      progress,
      selectedId,
      onSelect,
      onStart,
      onBack,
    });
    const view = render(createElement(EndgameLibrary, props(CAMPAIGN_LEVELS[0]!.id)));

    let rows = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')];
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.dataset.levelId)).toEqual(CAMPAIGN_LEVELS.slice(0, 5).map((level) => level.id));
    expect(rows.every((row) => row.dataset.unlocked === 'true')).toBe(true);
    expect(view.container.querySelector('[data-testid="level-list"]')?.getAttribute('aria-label')).toBe('共 46 个残局');
    expect(view.container.querySelector('[data-testid="campaign-availability"], [data-testid="campaign-rules"]')).toBeNull();
    expect(view.container.querySelectorAll('.console-band, .console-bands, .console-nodes')).toHaveLength(0);
    expect(view.container.querySelector('[data-testid="endgame-lesson"]')?.textContent).toContain('先完成一行');
    expect(view.container.querySelector('[data-testid="endgame-guidance"]')).toBeNull();
    const pageTabs = [...view.container.querySelectorAll<HTMLButtonElement>('.endgame-gallery__pages [role="tab"]')];
    expect(pageTabs).toHaveLength(3);
    expect(pageTabs.map((tab) => tab.textContent)).toEqual(['入门', '简单', '困难']);
    expect(pageTabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(view.container.querySelector('.endgame-gallery__grid')?.getAttribute('aria-label')).toBe('入门，5 关');
    act(() => {
      pageTabs[0]!.focus();
      pageTabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(document.activeElement).toBe(pageTabs[1]);
    expect(pageTabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[5]!.id);
    view.rerender(createElement(EndgameLibrary, props(CAMPAIGN_LEVELS[5]!.id)));
    rows = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')];
    expect(rows).toHaveLength(25);
    expect(rows.map((row) => row.dataset.levelId)).toEqual(CAMPAIGN_LEVELS.slice(5, 30).map((level) => level.id));
    expect(rows.every((row) => row.dataset.unlocked === 'true')).toBe(true);
    expect(rows.every((row) => row.getAttribute('aria-disabled') === null)).toBe(true);
    expect(rows[0]?.getAttribute('aria-label')).toContain('可进入');
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]')?.disabled).toBe(false);
    act(() => {
      pageTabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(document.activeElement).toBe(pageTabs[0]);
    expect(pageTabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(view.container.querySelector('.endgame-gallery__grid')?.getAttribute('aria-label')).toBe('入门，5 关');
    rows = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')];
    expect(rows[0]?.textContent).toContain('01');
    expect(view.container.querySelectorAll('.endgame-gallery__catalog .endgame-silhouette')).toHaveLength(0);
    expect(view.container.querySelectorAll('.endgame-gallery__hero .endgame-silhouette')).toHaveLength(1);
    expect(view.container.querySelector('.endgame-gallery__hero .endgame-silhouette')?.getAttribute('viewBox')).not.toBe('0 0 40 48');
    expect(view.container.querySelector<HTMLButtonElement>('.library-back')?.textContent).toBe('←返回首页');
    for (const banned of ['目标：清空棋盘', '目标清空棋盘', '清空完整棋盘', '当前选择', '起始棋盘', '连续七袋方块', '不限定唯一解法']) {
      expect(view.container.textContent).not.toContain(banned);
    }

    act(() => view.container.querySelector<HTMLButtonElement>('.library-back')?.click());
    expect(onBack).toHaveBeenCalledTimes(1);

    const masteredBests = Object.fromEntries(ENDGAME_OPTIMAL_CERTIFICATES.map((certificate) => (
      [certificate.levelId, certificate.masteryOperations]
    ))) as Partial<Record<EndgameId, number>>;
    const mastered: EndgameProgress = {
      version: 7,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: CAMPAIGN_LEVELS.slice(0, 30).map((level) => level.id),
      bestLockedPieceCounts: masteredBests,
    };
    view.rerender(createElement(EndgameLibrary, props(CAMPAIGN_LEVELS[0]!.id, {
      ...mastered,
      bestLockedPieceCounts: { ...masteredBests, [CAMPAIGN_LEVELS[0]!.id]: 7 },
    })));
    const selectedBest = view.container.querySelector<HTMLElement>('[data-testid="selected-endgame-start-best"]');
    const startSelected = view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]');
    expect(selectedBest?.textContent).toBe('当前最优步数：7步');
    expect(selectedBest?.closest('.endgame-gallery__title-row')?.querySelector('.endgame-gallery__title')).not.toBeNull();
    expect(startSelected?.closest('.endgame-gallery__meta')?.contains(selectedBest ?? null)).toBe(true);
    expect(view.container.querySelector<HTMLButtonElement>('[data-level-id="t3r-shaft-01"]')?.dataset.bestPieces).toBe('7');
    expect(view.container.querySelectorAll('.endgame-gallery__completion-tick')).toHaveLength(5);
    expect(view.container.querySelectorAll('.endgame-gallery__node--complete .endgame-gallery__index')).toHaveLength(0);
    expect(view.container.querySelector<HTMLButtonElement>('[data-level-id="t3r-shaft-01"]')?.textContent).toBe('');
    expect(view.container.textContent).not.toContain('√');
    expect(view.container.querySelector('.endgame-gallery__title')?.classList.contains('endgame-gallery__title--complete')).toBe(true);

    act(() => pageTabs[2]!.click());
    rows = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')];
    expect(rows).toHaveLength(16);
    expect(rows.map((row) => row.dataset.levelId)).toEqual(CAMPAIGN_LEVELS.slice(30).map((level) => level.id));
    expect(rows.every((row) => row.dataset.unlocked === 'true')).toBe(true);
    expect(view.container.querySelector('.endgame-gallery__grid')?.getAttribute('aria-label')).toBe('困难，16 关');
    expect(view.container.querySelectorAll('.endgame-gallery__mastery span')).toHaveLength(3);
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[30]!.id);
    view.rerender(createElement(EndgameLibrary, props(CAMPAIGN_LEVELS[30]!.id, mastered)));
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]')?.disabled).toBe(false);

    for (const index of [0, 10, CAMPAIGN_LEVELS.length - 1]) {
      const level = CAMPAIGN_LEVELS[index]!;
      view.rerender(createElement(EndgameLibrary, props(level.id, mastered)));
      const pressed = view.container.querySelector<HTMLButtonElement>('[data-testid="level-row"][aria-pressed="true"]');
      const canonical = createInitialState(0x51a1f00d, 'endgame', level.id);
      const visibleMaterials = new Set(canonical.board.slice(-12).flat().filter((cell): cell is PieceType => PIECE_TYPES.includes(cell as PieceType)));
      const definition = getEndgameDefinition(level.id);

      expect(pressed?.dataset.levelId).toBe(level.id);
      expect(view.container.querySelector('.endgame-gallery__hero h2')?.textContent).toBe(level.name);
      expect(canonical.endgameId).toBe(level.id);
      expect(canonical.active?.type).toBeTruthy();
      expect(canonical.queue[0]).toBeTruthy();
      expect(visibleMaterials.size).toBeGreaterThan(0);
      expect(endgameSilhouettePaths(level.id).size).toBe(visibleMaterials.size);
      expect([...endgameSilhouettePaths(level.id).values()].every((path) => path.includes('h3.8v3.8'))).toBe(true);
      expect(Boolean(endgameAnchorSilhouettePath(level.id))).toBe(definition.anchorCells.length > 0);
      expect(view.container.querySelectorAll('.endgame-gallery__hero .endgame-silhouette [data-piece-type="anchor"]')).toHaveLength(
        definition.anchorCells.length > 0 ? 1 : 0,
      );
    }

    const gatedGroup = ENDGAME_HARD_MASTERY_GROUPS[0]!;
    const gatedThreshold = ENDGAME_OPTIMAL_CERTIFICATES.find(
      (certificate) => certificate.levelId === gatedGroup.prerequisiteId,
    )!.masteryOperations;
    const blocked: EndgameProgress = {
      ...mastered,
      bestLockedPieceCounts: { ...masteredBests, [gatedGroup.prerequisiteId]: gatedThreshold + 1 },
    };
    view.rerender(createElement(EndgameLibrary, props(gatedGroup.hardLevelIds[0]!, blocked)));
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]')?.disabled).toBe(true);
    expect(view.container.querySelector('[data-testid="endgame-mastery-requirement"]')?.textContent).toContain(`${gatedThreshold} 步内`);
    expect(view.container.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.getAttribute('aria-label')).toContain(`${gatedThreshold} 步内`);

    const historicHard: EndgameProgress = {
      version: 7,
      campaignRevision: ENDGAME_CAMPAIGN_REVISION,
      completedLevelIds: [gatedGroup.hardLevelIds[0]!],
      bestLockedPieceCounts: { [gatedGroup.hardLevelIds[0]!]: 12 },
    };
    view.rerender(createElement(EndgameLibrary, props(gatedGroup.hardLevelIds[0]!, historicHard)));
    expect(view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]')?.disabled).toBe(false);
    expect(view.container.querySelectorAll('.endgame-gallery__completion-tick')).toHaveLength(1);

    const start = view.container.querySelector<HTMLButtonElement>('[data-testid="start-selected-endgame"]');
    expect(start).not.toBeNull();
    expect(view.container.querySelectorAll('[data-testid^="start-selected-endgame"]')).toHaveLength(1);
    expect(start?.textContent).toBe('开始');
    act(() => start?.click());
    expect(onStart).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('keeps roving Endgame focus inside each category and moves category tabs separately', () => {
    const onSelect = vi.fn();
    const view = render(createElement(EndgameLibrary, {
      progress: defaultEndgameProgress(),
      selectedId: CAMPAIGN_LEVELS[0]!.id,
      onSelect,
      onStart: vi.fn(),
      onBack: vi.fn(),
    }));
    const press = (button: HTMLButtonElement, key: string) => {
      act(() => button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    };

    let levels = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')];
    expect(levels.filter((button) => button.tabIndex === 0)).toEqual([levels[0]]);
    act(() => levels[0]!.focus());
    press(levels[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(levels[4]);
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[4]!.id);

    const tabs = [...view.container.querySelectorAll<HTMLButtonElement>('.endgame-gallery__pages [role="tab"]')];
    act(() => tabs[1]!.click());
    levels = [...view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')];
    expect(levels).toHaveLength(25);
    act(() => levels[0]!.focus());
    press(levels[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(levels[5]);
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[10]!.id);
    press(levels[5]!, 'Home');
    expect(document.activeElement).toBe(levels[0]);
    press(levels[0]!, 'End');
    expect(document.activeElement).toBe(levels[24]);
    press(levels[24]!, 'ArrowRight');
    expect(document.activeElement).toBe(levels[24]);
    expect(view.container.querySelector('.endgame-gallery__grid')?.getAttribute('data-endgame-category')).toBe('easy');

    act(() => tabs[1]!.focus());
    press(tabs[1]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs[2]);
    expect(view.container.querySelector('.endgame-gallery__grid')?.getAttribute('data-endgame-category')).toBe('hard');
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[30]!.id);
    view.unmount();
  });

  it('marks D2B category and detail transitions without changing the roving grid contract', () => {
    const onSelect = vi.fn();
    const props = (selectedId: EndgameId, reducedMotion = false) => ({
      progress: defaultEndgameProgress(),
      selectedId,
      onSelect,
      onStart: vi.fn(),
      onBack: vi.fn(),
      reducedMotion,
    });
    const view = render(createElement(EndgameLibrary, props(CAMPAIGN_LEVELS[0]!.id)));

    let grid = view.container.querySelector<HTMLOListElement>('.endgame-gallery__grid')!;
    let hero = view.container.querySelector<HTMLElement>('.endgame-gallery__hero')!;
    expect(grid.dataset.endgameCategoryMotion).toBe('full');
    expect(grid.dataset.endgameCategoryEpoch).toBe('0');
    expect(hero.dataset.endgameDetailMotion).toBe('full');
    expect(hero.dataset.endgameDetailEpoch).toBe('0');

    act(() => view.container.querySelectorAll<HTMLButtonElement>('.endgame-gallery__pages [role="tab"]')[1]?.click());
    grid = view.container.querySelector<HTMLOListElement>('.endgame-gallery__grid')!;
    hero = view.container.querySelector<HTMLElement>('.endgame-gallery__hero')!;
    expect(grid.dataset.endgameCategory).toBe('easy');
    expect(grid.dataset.endgameCategoryEpoch).toBe('1');
    expect(grid.classList.contains('endgame-gallery__grid--motion')).toBe(true);
    expect(hero.dataset.endgameDetailEpoch).toBe('1');
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[5]!.id);

    view.rerender(createElement(EndgameLibrary, props(CAMPAIGN_LEVELS[5]!.id, true)));
    const nextLevel = view.container.querySelectorAll<HTMLButtonElement>('[data-testid="level-row"]')[1]!;
    act(() => nextLevel.click());
    hero = view.container.querySelector<HTMLElement>('.endgame-gallery__hero')!;
    expect(hero.dataset.endgameDetailMotion).toBe('reduced');
    expect(hero.dataset.endgameDetailEpoch).toBe('2');
    expect(hero.classList.contains('endgame-gallery__hero--motion')).toBe(true);
    expect(onSelect).toHaveBeenLastCalledWith(CAMPAIGN_LEVELS[6]!.id);
    view.unmount();
  });

});
