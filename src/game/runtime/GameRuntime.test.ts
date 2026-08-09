// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createBrowserPlatform } from '../../platform/browserPlatform';
import {
  LINE_CLEAR_DELAY_TICKS,
  createBoard,
  setCell,
  type GameCommand,
  type GameEvent,
  type GameState,
} from '../core';

const rendererSetOptions = vi.hoisted(() => vi.fn());
const rendererRender = vi.hoisted(() => vi.fn());
const rendererCaptureBoardPng = vi.hoisted(() => vi.fn(() => ({
  dataUrl: 'data:image/png;base64,cGl4aS1leHRyYWN0',
  frame: { x: 17, y: 23, width: 250, height: 500 },
  resolution: 2,
  outputPixels: { width: 500, height: 1000 },
  pixelProbe: { samples: 32, nonTransparentSamples: 32, distinctBuckets: 4 },
})));
const inputClearHeld = vi.hoisted(() => vi.fn());
const inputDestroy = vi.hoisted(() => vi.fn());
const inputHarness = vi.hoisted(() => ({ emit: null as ((action: string) => void) | null }));
const audioPrime = vi.hoisted(() => vi.fn());
const audioPlayEntryCountdown = vi.hoisted(() => vi.fn());
const audioPlayEntryCountdownResolve = vi.hoisted(() => vi.fn());
const audioSetVolume = vi.hoisted(() => vi.fn());
const audioSetAmbientTheme = vi.hoisted(() => vi.fn());
const audioDestroy = vi.hoisted(() => vi.fn());
const rendererDestroy = vi.hoisted(() => vi.fn());

vi.mock('../audio/AudioEngine', () => ({
  AudioEngine: class {
    setEnabled(): void {}
    setVolume(volume: number): void { audioSetVolume(volume); }
    setAmbientTheme(theme: string): void { audioSetAmbientTheme(theme); }
    prime(): Promise<void> { return Promise.resolve(audioPrime()); }
    playEntryCountdown(digit: 3 | 2 | 1): void { audioPlayEntryCountdown(digit); }
    playEntryCountdownResolve(): void { audioPlayEntryCountdownResolve(); }
    play(): void {}
    syncMutationState(): void {}
    suspend(): void {}
    destroy(): void { audioDestroy(); }
  },
}));

vi.mock('../input/InputController', () => ({
  InputController: class {
    constructor(emit: (action: string) => void) { inputHarness.emit = emit; }
    press(action: string): void { inputHarness.emit?.(action); }
    release(): void {}
    step(): void {}
    clearHeld(): void { inputClearHeld(); }
    destroy(): void { inputDestroy(); }
  },
}));

vi.mock('../render/TetrisRenderer', () => ({
  TetrisRenderer: class {
    async init(): Promise<void> {}
    setOptions(options: unknown): void { rendererSetOptions(options); }
    setFrameCallback(): void {}
    render(state: unknown, events: unknown, deltaMs: number): void { rendererRender(state, events, deltaMs); }
    destroy(): void { rendererDestroy(); }
    getSnapshot(): Record<string, never> { return {}; }
    captureBoardPng(): ReturnType<typeof rendererCaptureBoardPng> {
      return rendererCaptureBoardPng();
    }
    benchmark(): { meanMs: number; p95Ms: number; maxMs: number } {
      return { meanMs: 0, p95Ms: 0, maxMs: 0 };
    }
  },
}));

describe('GameRuntime public state boundary', () => {
  it('keeps the quiet ambient layer aligned with the selected visual theme', () => {
    audioSetAmbientTheme.mockClear();
    rendererSetOptions.mockClear();
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false, visualTheme: 'sunstone' });

    expect(audioSetAmbientTheme).toHaveBeenLastCalledWith('sunstone');
    runtime.setVisualTheme('mineral-mist');
    expect(audioSetAmbientTheme).toHaveBeenLastCalledWith('mineral-mist');
    expect(rendererSetOptions).toHaveBeenLastCalledWith({ visualTheme: 'mineral-mist' });
    runtime.destroy();
  });

  it('starts from a deterministic ready state without browser mounting', () => {
    const onState = vi.fn();
    const runtime = new GameRuntime({ seed: 123, onState });
    expect(runtime.getState().status).toBe('ready');
    expect(runtime.getState().queue).toHaveLength(5);
    expect(runtime.getState().active).not.toBeNull();
    expect(onState).not.toHaveBeenCalled();
  });

  it('mounts and tears down when an eventual package host exposes no window or document', async () => {
    const platform = createBrowserPlatform({ window: null, document: null, audioContextFactory: null });
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false, platform });

    await runtime.mount(document.createElement('div'));
    runtime.start();

    expect(runtime.getState().status).toBe('playing');
    expect(() => runtime.destroy()).not.toThrow();
  });

  it('releases the visibility listener, input, renderer, audio, and QA bridge exactly once', async () => {
    inputDestroy.mockClear();
    rendererDestroy.mockClear();
    audioDestroy.mockClear();
    const removeVisibility = vi.fn();
    const platform = createBrowserPlatform();
    vi.spyOn(platform, 'listenVisibility').mockReturnValue(removeVisibility);
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false, platform });

    await runtime.mount(document.createElement('div'));
    expect(window.__TETRAMORPH_QA__).toBeDefined();

    runtime.destroy();
    runtime.destroy();

    expect(removeVisibility).toHaveBeenCalledTimes(1);
    expect(inputDestroy).toHaveBeenCalledTimes(1);
    expect(rendererDestroy).toHaveBeenCalledTimes(1);
    expect(audioDestroy).toHaveBeenCalledTimes(1);
    expect(window.__TETRAMORPH_QA__).toBeUndefined();
  });

  it('forwards Survival entry bedrock staging without changing canonical Core state', async () => {
    rendererSetOptions.mockClear();
    rendererRender.mockClear();
    const runtime = new GameRuntime({
      seed: 123,
      mode: 'race',
      audioEnabled: false,
      survivalEntryBedrockRows: 1,
    });
    const canonicalBoard = runtime.getState().board;

    runtime.setSurvivalEntryBedrockRows(2);
    await runtime.mount(document.createElement('div'));
    expect(rendererSetOptions).toHaveBeenCalledWith({
      reducedMotion: false,
      visualTheme: 'deep-tide',
      survivalEntryBedrockRows: 2,
    });

    runtime.setSurvivalEntryBedrockRows(3);
    runtime.setSurvivalEntryBedrockRows(null);

    expect(rendererSetOptions.mock.calls.slice(-2).map(([options]) => options)).toEqual([
      { survivalEntryBedrockRows: 3 },
      { survivalEntryBedrockRows: null },
    ]);
    expect(runtime.getState().board).toBe(canonicalBoard);
    expect(rendererRender).toHaveBeenCalled();
    runtime.destroy();
  });

  it('refreshes renderer-owned presentation without mutating canonical state', async () => {
    rendererRender.mockClear();
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    await runtime.mount(document.createElement('div'));
    rendererRender.mockClear();
    const canonicalState = runtime.getState();

    runtime.refreshPresentation();

    expect(rendererRender).toHaveBeenCalledWith(canonicalState, [], 0);
    expect(runtime.getState()).toBe(canonicalState);
    runtime.destroy();
  });

  it('gates every public and QA gameplay entry until input is enabled', async () => {
    const onState = vi.fn();
    const runtime = new GameRuntime({ seed: 123, onState, audioEnabled: false, inputEnabled: false });
    await runtime.mount(document.createElement('div'));
    onState.mockClear();
    inputClearHeld.mockClear();
    audioPrime.mockClear();
    const readyState = runtime.getState();
    const readySnapshot = structuredClone(readyState);
    const readyActive = readyState.active;
    const readyQueue = readyState.queue;
    const readyBoard = readyState.board;

    runtime.start();
    runtime.press('left');
    runtime.togglePause();
    window.__TETRAMORPH_QA__?.action('hard-drop');
    window.__TETRAMORPH_QA__?.advanceTicks(180);

    const qaSurface = window.__TETRAMORPH_QA__!;
    const gatedEntries = [
      { name: 'direct restart', run: () => runtime.restart(456, 'race') },
      { name: 'direct mode selection', run: () => runtime.selectMode('race') },
      { name: 'direct Puzzle selection', run: () => runtime.selectPuzzle('t3r-cascade-06') },
      { name: 'QA restart', run: () => qaSurface.restart() },
      { name: 'QA mode selection', run: () => qaSurface.selectMode('race') },
      { name: 'QA Puzzle selection', run: () => qaSurface.selectPuzzle('t3r-cascade-06') },
    ];

    for (const entry of gatedEntries) {
      entry.run();
      const current = runtime.getState();
      expect(current, entry.name).toBe(readyState);
      expect(current, entry.name).toEqual(readySnapshot);
      expect(current.seed, entry.name).toBe(123);
      expect(current.status, entry.name).toBe('ready');
      expect(current.mode, entry.name).toBe('marathon');
      expect(current.puzzleId, entry.name).toBeNull();
      expect(current.active, entry.name).toBe(readyActive);
      expect(current.queue, entry.name).toBe(readyQueue);
      expect(current.board, entry.name).toBe(readyBoard);
      expect(onState, entry.name).not.toHaveBeenCalled();
      expect(audioPrime, entry.name).not.toHaveBeenCalled();
      expect(inputClearHeld, entry.name).not.toHaveBeenCalled();
    }

    runtime.setInputEnabled(true);
    expect(inputClearHeld).toHaveBeenCalledTimes(1);
    runtime.setInputEnabled(true);
    expect(inputClearHeld).toHaveBeenCalledTimes(1);
    runtime.start();

    expect(runtime.getState().status).toBe('playing');
    expect(audioPrime).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState.mock.calls[0]?.[1]).toEqual([{ type: 'started' }]);

    runtime.setInputEnabled(false);
    expect(inputClearHeld).toHaveBeenCalledTimes(2);
    runtime.destroy();
  });

  it('coalesces ordinary simulation ticks before publishing React-facing state', () => {
    const onState = vi.fn();
    const runtime = new GameRuntime({ seed: 123, onState, audioEnabled: false });
    runtime.start();
    expect(onState).toHaveBeenCalledTimes(1);
    onState.mockClear();

    const internals = runtime as unknown as {
      fixedStep: () => void;
      frame: (deltaMs: number) => void;
    };
    for (let tick = 0; tick < 5; tick += 1) internals.fixedStep();
    expect(onState).not.toHaveBeenCalled();

    internals.frame(99);
    expect(onState).not.toHaveBeenCalled();
    internals.frame(1);
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onState.mock.calls[0]?.[0].elapsedTicks).toBeGreaterThanOrEqual(5);
  });

  it('selects a real authored Puzzle level only through the restart boundary', () => {
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    runtime.selectPuzzle('t3r-cascade-06');

    const state = runtime.getState();
    expect(state.status).toBe('ready');
    expect(state.mode).toBe('puzzle');
    expect(state.puzzleId).toBe('t3r-cascade-06');
    expect(state.puzzleQueue).toEqual(state.queue);
    expect(state.queue).toHaveLength(5);
    expect(state.puzzleUndoHistory).toEqual([]);
    expect(state.puzzleCompletion).toBe('active');
  });

  it('refreshes ordinary run seeds while retaining a selected Puzzle sequence', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint32Array) => {
        values[0] = 0x7a11beef;
        return values;
      },
    });
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    runtime.restart();
    expect(runtime.getState().mode).toBe('marathon');
    expect(runtime.getState().seed).toBe(0x7a11beef);

    runtime.selectPuzzle('t3r-cascade-06');
    const puzzleSeed = runtime.getState().seed;
    runtime.restart();
    expect(runtime.getState().mode).toBe('puzzle');
    expect(runtime.getState().seed).toBe(puzzleSeed);

    runtime.selectMode('sprint');
    expect(runtime.getState().mode).toBe('sprint');
    expect(runtime.getState().mutationActiveCarrier).toBeNull();
    expect(runtime.getState().mutationCarriers).toEqual([]);
    expect(runtime.getState().mutationFreezeTicks).toBe(0);
    expect(runtime.getState().seed).toBe(0x7a11beef);
    vi.unstubAllGlobals();
  });

  it('applies a changed Classic pace interval only when the next run is created', () => {
    const runtime = new GameRuntime({
      seed: 123,
      mode: 'marathon',
      audioEnabled: false,
      classicStartingGravityTicks: 60,
      classicGravityFloorTicks: 30,
    });

    expect(runtime.getState().classicStartingGravityTicks).toBe(60);
    expect(runtime.getState().classicGravityFloorTicks).toBe(30);
    runtime.setClassicGravityRange(24, 12);
    expect(runtime.getState().classicStartingGravityTicks).toBe(60);
    expect(runtime.getState().classicGravityFloorTicks).toBe(30);

    runtime.restart(456);
    expect(runtime.getState().classicStartingGravityTicks).toBe(24);
    expect(runtime.getState().classicGravityFloorTicks).toBe(12);
    expect(runtime.getState().seed).toBe(456);
  });

  it('updates reduced motion in place without rebuilding runtime state', () => {
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    const before = runtime.getState();
    rendererSetOptions.mockClear();

    runtime.setReducedMotion(true);

    expect(rendererSetOptions).toHaveBeenCalledWith({ reducedMotion: true });
    expect(runtime.getState()).toBe(before);
  });

  it('routes a bounded user volume through audio without touching game state', () => {
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    const before = runtime.getState();
    audioSetVolume.mockClear();

    runtime.setAudioVolume(2);
    runtime.setAudioVolume(-1);

    expect(audioSetVolume).toHaveBeenNthCalledWith(1, 2);
    expect(audioSetVolume).toHaveBeenNthCalledWith(2, -1);
    expect(runtime.getState()).toBe(before);
  });

  it('primes and forwards countdown cues while gameplay input is gated', async () => {
    const runtime = new GameRuntime({ seed: 123, inputEnabled: false });
    audioPrime.mockClear();
    audioPlayEntryCountdown.mockClear();

    runtime.playEntryCountdown(3);
    await Promise.resolve();

    expect(audioPrime).toHaveBeenCalledTimes(1);
    expect(audioPlayEntryCountdown).toHaveBeenCalledExactlyOnceWith(3);
    expect(runtime.getState().status).toBe('ready');

    audioPrime.mockClear();
    audioPlayEntryCountdownResolve.mockClear();
    runtime.playEntryCountdownResolve();
    await Promise.resolve();

    expect(audioPrime).toHaveBeenCalledTimes(1);
    expect(audioPlayEntryCountdownResolve).toHaveBeenCalledTimes(1);
    expect(runtime.getState().status).toBe('ready');
    runtime.destroy();
  });

  it('does not forward a pending countdown resolution after destroy', async () => {
    let releasePrime!: () => void;
    audioPrime.mockImplementationOnce(() => new Promise<void>((resolve) => {
      releasePrime = resolve;
    }));
    audioPlayEntryCountdownResolve.mockClear();
    const runtime = new GameRuntime({ seed: 123, inputEnabled: false });

    runtime.playEntryCountdownResolve();
    runtime.destroy();
    releasePrime();
    await Promise.resolve();
    await Promise.resolve();

    expect(audioPlayEntryCountdownResolve).not.toHaveBeenCalled();
  });

  it('restarts immediately from active play when the public R action is received', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint32Array) => {
        values[0] = 0x7a11beef;
        return values;
      },
    });
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    await runtime.mount(document.createElement('div'));
    runtime.start();
    runtime.press('left');
    const before = runtime.getState();
    expect(before.status).toBe('playing');

    inputHarness.emit?.('restart');

    expect(runtime.getState().status).toBe('playing');
    expect(runtime.getState().elapsedTicks).toBe(0);
    expect(runtime.getState().seed).toBe(0x7a11beef);
    runtime.destroy();
    vi.unstubAllGlobals();
  });

  it('mounts a read-only QA state view without replay or state-replacement hooks', async () => {
    const runtime = new GameRuntime({ seed: 123, audioEnabled: false });
    await runtime.mount(document.createElement('div'));

    const qaSurface = window.__TETRAMORPH_QA__;
    expect(qaSurface).toBeDefined();
    expect(qaSurface).not.toHaveProperty('replayScenario');
    expect(qaSurface).not.toHaveProperty('setState');
    expect(qaSurface).not.toHaveProperty('replaceState');

    const exposedState = qaSurface!.getState();
    exposedState.status = 'finished';
    expect(runtime.getState().status).toBe('ready');
    expect(qaSurface!.captureBoardPng()).toEqual({
      dataUrl: 'data:image/png;base64,cGl4aS1leHRyYWN0',
      frame: { x: 17, y: 23, width: 250, height: 500 },
      resolution: 2,
      outputPixels: { width: 500, height: 1000 },
      pixelProbe: { samples: 32, nonTransparentSamples: 32, distinctBuckets: 4 },
    });
    expect(rendererCaptureBoardPng).toHaveBeenCalledTimes(1);

    runtime.destroy();
    expect(window.__TETRAMORPH_QA__).toBeUndefined();
  });

  it('hands every same-transition Mutation activation to the renderer in FIFO order', () => {
    const runtime = new GameRuntime({ seed: 0x7115, mode: 'sprint', audioEnabled: false });
    let board = createBoard();
    for (const y of [38, 39]) {
      for (let x = 0; x < 8; x += 1) board = setCell(board, x, y, 'J');
    }
    board = setCell(board, 0, 37, 'L');
    board = setCell(board, 1, 37, 'L');

    const internals = runtime as unknown as {
      state: GameState;
      apply: (command: GameCommand) => void;
      flushRender: (deltaMs: number) => void;
    };
    internals.state = {
      ...runtime.getState(),
      board,
      status: 'playing',
      active: { type: 'O', rotation: 0, x: 8, y: 38 },
      mutationActiveCarrier: { id: 9, item: 'bomb' },
      mutationNextCarrierId: 10,
      mutationCarriers: [{
        id: 4,
        item: 'freeze',
        cells: [{ x: 0, y: 37 }, { x: 1, y: 37 }],
      }],
    };
    rendererRender.mockClear();

    internals.apply({ type: 'hard-drop' });
    for (let tick = 0; tick < LINE_CLEAR_DELAY_TICKS; tick += 1) {
      internals.apply({ type: 'tick' });
    }
    expect(rendererRender).not.toHaveBeenCalled();
    internals.flushRender(16);

    expect(rendererRender).toHaveBeenCalledTimes(1);
    const renderedEvents = rendererRender.mock.calls.at(-1)?.[1] as readonly GameEvent[];
    expect(renderedEvents
      .filter((event) => event.type === 'mutation-activated')
      .map((event) => event.item)).toEqual(['bomb', 'freeze']);

    internals.flushRender(16);
    expect(rendererRender).toHaveBeenCalledTimes(2);
    expect(rendererRender.mock.calls.at(-1)?.[1]).toEqual([]);
    const deliveriesWithMutationEvents = rendererRender.mock.calls.filter((call) => (
      (call[1] as readonly GameEvent[])
        .some((event) => event.type === 'mutation-activated')
    ));
    expect(deliveriesWithMutationEvents).toHaveLength(1);
  });
});
