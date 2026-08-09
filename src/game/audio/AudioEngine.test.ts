import { beforeEach, describe, expect, it } from 'vitest';
import { createBrowserPlatform } from '../../platform/browserPlatform';
import type { GameEvent } from '../core';
import { AudioEngine } from './AudioEngine';
import { audioCue } from './audioPalette';

class FakeAudioParam {
  value = 0;
  readonly setValues: number[] = [];
  readonly ramps: number[] = [];
  readonly rampTimes: number[] = [];
  readonly targets: Array<{ value: number; time: number; constant: number }> = [];

  setValueAtTime(value: number): void {
    this.value = value;
    this.setValues.push(value);
  }

  exponentialRampToValueAtTime(value: number, time = 0): void {
    this.value = value;
    this.ramps.push(value);
    this.rampTimes.push(time);
  }

  setTargetAtTime(value: number, time: number, constant: number): void {
    this.value = value;
    this.targets.push({ value, time, constant });
  }
}

class FakeGain {
  readonly gain = new FakeAudioParam();
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

class FakeOscillator {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeAudioParam();
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  disconnected = false;
  connect(): void {}
  disconnect(): void { this.disconnected = true; }
  start(time = 0): void { this.starts.push(time); }
  stop(time = 0): void { this.stops.push(time); }
  finish(): void { this.onended?.(); }
}

class FakeAudioBuffer {
  readonly channel: Float32Array;
  constructor(frames: number) { this.channel = new Float32Array(frames); }
  getChannelData(): Float32Array { return this.channel; }
}

class FakeBufferSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  disconnected = false;
  connect(): void {}
  disconnect(): void { this.disconnected = true; }
  start(time = 0): void { this.starts.push(time); }
  stop(time = 0): void { this.stops.push(time); }
  finish(): void { this.onended?.(); }
}

class FakeBiquadFilter {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

class FakeCompressor {
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

const oscillators: FakeOscillator[] = [];
const gains: FakeGain[] = [];
const buffers: FakeBufferSource[] = [];
const filters: FakeBiquadFilter[] = [];
const compressors: FakeCompressor[] = [];
let closeCalls = 0;
let suspendCalls = 0;

class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  readonly sampleRate = 48_000;
  readonly destination = {} as AudioDestinationNode;

  createGain(): GainNode {
    const node = new FakeGain();
    gains.push(node);
    return node as unknown as GainNode;
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    const node = new FakeCompressor();
    compressors.push(node);
    return node as unknown as DynamicsCompressorNode;
  }

  createOscillator(): OscillatorNode {
    const node = new FakeOscillator();
    oscillators.push(node);
    return node as unknown as OscillatorNode;
  }

  createBuffer(_channels: number, frames: number): AudioBuffer {
    return new FakeAudioBuffer(frames) as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSource();
    buffers.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    const node = new FakeBiquadFilter();
    filters.push(node);
    return node as unknown as BiquadFilterNode;
  }

  async resume(): Promise<void> { this.state = 'running'; }
  async suspend(): Promise<void> { suspendCalls += 1; this.state = 'suspended'; }
  async close(): Promise<void> { closeCalls += 1; this.state = 'closed'; }
}

const platformFor = (context = new FakeAudioContext(), now = () => 0) => createBrowserPlatform({
  window: null,
  document: null,
  now,
  audioContextFactory: () => context as unknown as AudioContext,
});

const sourceCount = (): number => oscillators.length + buffers.length;
const foregroundBufferCount = (): number => buffers.filter((source) => !source.loop).length;
const mutation = (
  item: 'freeze' | 'collapse' | 'bomb' | 'multiplier',
  multiplierFactor?: 2 | 4,
): GameEvent => ({
  type: 'mutation-activated',
  item,
  durationTicks: item === 'bomb' ? 0 : 600,
  score: item === 'bomb' ? 300 : 0,
  rowsRemoved: item === 'bomb' ? 3 : 0,
  multiplierFactor,
});

beforeEach(() => {
  oscillators.length = 0;
  gains.length = 0;
  buffers.length = 0;
  filters.length = 0;
  compressors.length = 0;
  closeCalls = 0;
  suspendCalls = 0;
});

describe('AudioEngine material feedback contract', () => {
  it('routes five named buses through one shared effects path', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();

    expect(gains).toHaveLength(7);
    expect(gains.slice(2, 7).map((node) => node.gain.value)).toEqual([0.9, 1, 0.96, 0.14, 0.7]);
    expect(gains.slice(2, 7).every((node) => node.connections[0] === gains[1])).toBe(true);
    expect(gains[1]?.connections[0]).toBe(gains[0]);
    expect(compressors).toHaveLength(1);

    audio.play([{ type: 'piece-moved', piece: 'I', dx: 1, dy: 0, cause: 'move' }]);
    const cueGains = gains.slice(7);
    expect(cueGains).toHaveLength(audioCue('move').layers.length);
    expect(cueGains.every((node) => node.connections[0] === gains[2])).toBe(true);
  });

  it('keeps theme selection compatible without starting a persistent ambient voice', async () => {
    const audio = new AudioEngine(platformFor());
    audio.setAmbientTheme('deep-tide');
    await audio.prime();

    expect(buffers).toHaveLength(0);
    expect(filters).toHaveLength(0);
    audio.setAmbientTheme('mineral-mist');
    audio.setEnabled(false);
    audio.setEnabled(true);
    expect(buffers).toHaveLength(0);
  });

  it('keeps entry ownership with two short ticks and one longer resolve', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();

    audio.playEntryCountdown(3);
    const tickEnd = Math.max(...oscillators.flatMap((node) => node.stops), ...buffers.flatMap((node) => node.stops));
    const afterTick = sourceCount();
    audio.playEntryCountdown(2);
    expect(sourceCount() - afterTick).toBe(afterTick);
    audio.playEntryCountdown(1);
    const resolveEnd = Math.max(...oscillators.flatMap((node) => node.stops), ...buffers.flatMap((node) => node.stops));

    expect(resolveEnd).toBeGreaterThan(tickEnd + 0.1);
    expect(sourceCount()).toBe(
      audioCue('countdown-tick').layers.length * 2
      + audioCue('countdown-resolve').layers.length,
    );
  });

  it('rate-limits rapid movement while preserving a later tactile response', async () => {
    let now = 1_000;
    const audio = new AudioEngine(platformFor(new FakeAudioContext(), () => now));
    await audio.prime();
    const move: GameEvent = { type: 'piece-moved', piece: 'T', dx: 1, dy: 0, cause: 'move' };

    audio.play([move]);
    const first = sourceCount();
    now += 20;
    audio.play([move]);
    expect(sourceCount()).toBe(first);
    now += 60;
    audio.play([move]);
    expect(sourceCount()).toBe(first * 2);
  });

  it('leaves started, restarted, and sustained mutation state silent', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();
    audio.play([{ type: 'started' }, { type: 'restarted' }]);
    audio.syncMutationState({} as never);
    expect(sourceCount()).toBe(0);
  });

  it('deduplicates mutation awards, orders bomb first, and respects the voice ceiling', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();
    audio.play([
      mutation('freeze'), mutation('freeze'), mutation('collapse'), mutation('bomb'),
      mutation('multiplier', 2), mutation('multiplier', 4),
    ]);

    expect(sourceCount()).toBeLessThanOrEqual(16);
    expect(foregroundBufferCount()).toBe(
      audioCue('bomb').layers.length
      + audioCue('freeze').layers.length
      + audioCue('supergravity').layers.length
      + audioCue('multiplier-4').layers.length,
    );
    const starts = buffers.map((node) => node.starts[0] ?? -1);
    for (const expected of [0, 0.035, 0.07, 0.105]) {
      expect(starts.some((start) => Math.abs(start - expected) < 0.000001)).toBe(true);
    }
  });

  it('lets higher resolution cues own a frame instead of stacking contacts or clears', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();
    audio.play([
      { type: 'hard-dropped', piece: 'I', distance: 14 },
      { type: 'piece-locked', piece: 'I', cells: [] },
      { type: 'lines-cleared', rows: [39], count: 1, score: 100 },
      mutation('freeze'),
    ]);

    expect(oscillators).toHaveLength(0);
    expect(buffers).toHaveLength(audioCue('freeze').layers.length);
    expect(buffers.map((node) => node.starts[0])).toEqual([0]);
  });

  it('starts a normal clear with the renderer sweep and does not replay it at commit', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();
    audio.play([
      { type: 'hard-dropped', piece: 'I', distance: 14 },
      { type: 'piece-locked', piece: 'I', cells: [] },
      { type: 'clear-started', rows: [38, 39] },
    ]);

    expect(buffers).toHaveLength(audioCue('clear-2').layers.length);
    const afterSweepStart = foregroundBufferCount();
    audio.play([{ type: 'lines-cleared', rows: [38, 39], count: 2, score: 300 }]);
    expect(foregroundBufferCount()).toBe(afterSweepStart);

    audio.play([{ type: 'lines-cleared', rows: [39], count: 1, score: 100 }]);
    expect(foregroundBufferCount()).toBe(afterSweepStart + audioCue('clear-1').layers.length);
  });

  it('maps clear tiers, survival pressure, UI, and puzzle events to bounded gestures', async () => {
    const audio = new AudioEngine(platformFor());
    await audio.prime();
    const batches: readonly GameEvent[][] = [
      [{ type: 'lines-cleared', rows: [39], count: 1, score: 100 }],
      [{ type: 'lines-cleared', rows: [38, 39], count: 2, score: 300 }],
      [{ type: 'lines-cleared', rows: [37, 38, 39], count: 3, score: 500 }],
      [{ type: 'lines-cleared', rows: [36, 37, 38, 39], count: 4, score: 800 }],
      [{ type: 'bedrock-raised', count: 1, height: 3 }],
      [{ type: 'bedrock-lowered', count: 1, height: 2 }],
      [{ type: 'survival-stones-warned', columns: [3], height: 2, leadPieces: 1 }],
      [{ type: 'survival-stones-spawned', cells: [{ x: 3, y: 0 }], intervalPieces: 8, nextIntervalPieces: 8 }],
      [{ type: 'survival-stones-landed', cells: [{ x: 3, y: 12 }] }],
      [{ type: 'puzzle-undone' }],
      [{ type: 'paused' }, { type: 'resumed' }],
    ];

    for (const batch of batches) {
      const before = sourceCount();
      audio.play(batch);
      expect(sourceCount()).toBeGreaterThan(before);
      for (const node of [...oscillators, ...buffers]) node.finish();
    }
    expect(sourceCount()).toBeGreaterThan(0);
  });

  it('clamps volume, suspends safely, and tears down its context once', async () => {
    const context = new FakeAudioContext();
    const audio = new AudioEngine(platformFor(context));
    audio.setVolume(2);
    await audio.prime();
    expect(audio.getVolume()).toBe(1);
    expect(gains[0]?.gain.value).toBeCloseTo(1.42);
    audio.setVolume(Number.NaN);
    expect(audio.getVolume()).toBe(1);
    audio.suspend();
    expect(suspendCalls).toBe(1);

    audio.destroy();
    audio.destroy();
    expect(closeCalls).toBe(1);
    expect(gains.slice(0, 7).every((node) => node.disconnected)).toBe(true);
  });

  it('stays safe when the host exposes no AudioContext', async () => {
    const audio = new AudioEngine(createBrowserPlatform({
      window: null,
      document: null,
      audioContextFactory: null,
    }));
    await expect(audio.prime()).resolves.toBeUndefined();
    expect(() => audio.play([{ type: 'paused' }])).not.toThrow();
    expect(() => audio.destroy()).not.toThrow();
  });
});
