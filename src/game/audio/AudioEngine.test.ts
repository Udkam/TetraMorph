import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserPlatform } from '../../platform/browserPlatform';
import type { GameEvent } from '../core';
import { AudioEngine, type AcceptedAudioAssetLoader } from './AudioEngine';
import { audioCue } from './audioPalette';

class FakeAudioParam {
  value = 0;
  readonly setValues: Array<{ value: number; time: number }> = [];
  readonly exponential: Array<{ value: number; time: number }> = [];
  readonly linear: Array<{ value: number; time: number }> = [];
  readonly targets: Array<{ value: number; time: number; constant: number }> = [];

  setValueAtTime(value: number, time = 0): void {
    this.value = value;
    this.setValues.push({ value, time });
  }
  exponentialRampToValueAtTime(value: number, time = 0): void {
    this.value = value;
    this.exponential.push({ value, time });
  }
  linearRampToValueAtTime(value: number, time = 0): void {
    this.value = value;
    this.linear.push({ value, time });
  }
  setTargetAtTime(value: number, time: number, constant: number): void {
    this.value = value;
    this.targets.push({ value, time, constant });
  }
  cancelScheduledValues(): void {}
}

class FakeNode {
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

class FakeGain extends FakeNode { readonly gain = new FakeAudioParam(); }
class FakeStereoPanner extends FakeNode { readonly pan = new FakeAudioParam(); }
class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeAudioParam();
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  start(time = 0): void { this.starts.push(time); }
  stop(time = 0): void { this.stops.push(time); }
  finish(): void { this.onended?.(); }
}

class FakeAudioBuffer {
  readonly duration: number;
  readonly length: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;
  private readonly channels: Float32Array[];

  constructor(frames: number, sampleRate = 48_000, channels = 1, peak = 0) {
    this.length = frames;
    this.sampleRate = sampleRate;
    this.numberOfChannels = channels;
    this.duration = frames / sampleRate;
    this.channels = Array.from({ length: channels }, () => new Float32Array(frames));
    if (frames > 0 && peak > 0) this.channels[0]![Math.min(10, frames - 1)] = peak;
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? new Float32Array();
  }
}

class FakeBufferSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  readonly playbackRate = new FakeAudioParam();
  readonly starts: Array<{ time: number; offset?: number; duration?: number }> = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  start(time = 0, offset?: number, duration?: number): void {
    this.starts.push({ time, offset, duration });
  }
  stop(time = 0): void { this.stops.push(time); }
  finish(): void { this.onended?.(); }
}

class FakeBiquadFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
}

class FakeCompressor extends FakeNode {
  readonly threshold = new FakeAudioParam();
  readonly knee = new FakeAudioParam();
  readonly ratio = new FakeAudioParam();
  readonly attack = new FakeAudioParam();
  readonly release = new FakeAudioParam();
}

const oscillators: FakeOscillator[] = [];
const gains: FakeGain[] = [];
const bufferSources: FakeBufferSource[] = [];
const filters: FakeBiquadFilter[] = [];
const compressors: FakeCompressor[] = [];
const panners: FakeStereoPanner[] = [];
let closeCalls = 0;
let suspendCalls = 0;
let decodeCalls = 0;

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
  createStereoPanner(): StereoPannerNode {
    const node = new FakeStereoPanner();
    panners.push(node);
    return node as unknown as StereoPannerNode;
  }
  createBuffer(_channels: number, frames: number, sampleRate = this.sampleRate): AudioBuffer {
    return new FakeAudioBuffer(frames, sampleRate) as unknown as AudioBuffer;
  }
  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeBufferSource();
    bufferSources.push(node);
    return node as unknown as AudioBufferSourceNode;
  }
  createBiquadFilter(): BiquadFilterNode {
    const node = new FakeBiquadFilter();
    filters.push(node);
    return node as unknown as BiquadFilterNode;
  }
  async decodeAudioData(): Promise<AudioBuffer> {
    decodeCalls += 1;
    return new FakeAudioBuffer(96_000, 48_000, 2, 0.5) as unknown as AudioBuffer;
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

let loadAsset: ReturnType<typeof vi.fn<AcceptedAudioAssetLoader>>;

const audioFor = (context = new FakeAudioContext(), now = () => 0): AudioEngine => (
  new AudioEngine(platformFor(context, now), loadAsset)
);
const sourceCount = (): number => oscillators.length + bufferSources.length;
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
  bufferSources.length = 0;
  filters.length = 0;
  compressors.length = 0;
  panners.length = 0;
  closeCalls = 0;
  suspendCalls = 0;
  decodeCalls = 0;
  loadAsset = vi.fn(async () => new ArrayBuffer(16));
});

describe('AudioEngine accepted production contract', () => {
  it('builds isolated Action A, Studio, Ice, and recovered-candidate routes', async () => {
    const audio = audioFor();
    await audio.prime();

    expect(loadAsset).toHaveBeenCalledTimes(3);
    expect(decodeCalls).toBe(3);
    expect(compressors).toHaveLength(3);
    expect(compressors.map((node) => ({
      threshold: node.threshold.value,
      knee: node.knee.value,
      ratio: node.ratio.value,
      attack: node.attack.value,
      release: node.release.value,
    }))).toEqual([
      { threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 },
      { threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 },
      { threshold: -10, knee: 10, ratio: 4, attack: 0.003, release: 0.12 },
    ]);
    expect(gains[0]?.gain.value).toBeCloseTo(0.78);
    expect(gains[2]?.gain.value).toBe(1);
    expect(gains[3]?.gain.value).toBe(1.85);
    expect(gains[4]?.gain.value).toBe(1.85);
    expect(gains.slice(5, 10).map((node) => node.gain.value)).toEqual([0.9, 1, 0.96, 0.14, 0.7]);
  });

  it('reproduces Action A routing, frequencies, envelopes, and 60 ms move throttle', async () => {
    let now = 1_000;
    const audio = audioFor(new FakeAudioContext(), () => now);
    await audio.prime();
    const move: GameEvent = { type: 'piece-moved', piece: 'T', dx: -1, dy: 0, cause: 'move' };

    audio.play([move]);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]?.frequency.setValues[0]?.value).toBe(220);
    expect(gains.at(-1)?.gain.exponential[0]?.value).toBeCloseTo(0.062 * 1.45);
    expect(panners).toHaveLength(1);
    expect(panners[0]?.pan.setValues[0]?.value).toBe(-0.28);
    now += 59;
    audio.play([move]);
    expect(oscillators).toHaveLength(1);
    now += 1;
    audio.play([{ ...move, dx: 1 }]);
    expect(oscillators).toHaveLength(2);
    expect(panners[1]?.pan.setValues[0]?.value).toBe(0.28);

    audio.play([{ type: 'piece-rotated', piece: 'T', direction: 1 }]);
    expect(oscillators.slice(2).map((node) => node.frequency.setValues[0]?.value)).toEqual([293.66, 440]);
    expect(oscillators.slice(2).map((node) => node.starts[0])).toEqual([0, 0.004]);
    expect(panners).toHaveLength(2);
  });

  it('aligns hard-drop contact to the 50 ms trail and suppresses natural-lock doubling', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.play([
      { type: 'hard-dropped', piece: 'I', distance: 14 },
      { type: 'piece-locked', piece: 'I', cells: [] },
    ]);
    expect(oscillators.map((node) => node.frequency.setValues[0]?.value)).toEqual([174.61, 349.23]);
    expect(oscillators[0]?.starts[0]).toBeCloseTo(0.05, 9);
    expect(oscillators[1]?.starts[0]).toBeCloseTo(0.054, 9);

    const before = oscillators.length;
    audio.play([{ type: 'hard-dropped', piece: 'I', distance: 0 }]);
    expect(oscillators.slice(before).map((node) => node.starts[0])).toEqual([0, 0.004]);
  });

  it('restores the soft T28 drop contour with its greater-than-52 ms throttle', async () => {
    let now = 1_000;
    const audio = audioFor(new FakeAudioContext(), () => now);
    await audio.prime();
    const softDrop: GameEvent = {
      type: 'piece-moved', piece: 'I', dx: 0, dy: 1, cause: 'soft-drop',
    };

    audio.play([softDrop]);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]?.frequency.setValues[0]?.value).toBe(196);
    expect(oscillators[0]?.frequency.exponential[0]).toEqual({ value: 185, time: 0.036 });
    now += 52;
    audio.play([softDrop]);
    expect(oscillators).toHaveLength(1);
    now += 1;
    audio.play([softDrop]);
    expect(oscillators).toHaveLength(2);
  });

  it('plays three Studio progress steps and one separate start resolve', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.playEntryCountdown(3);
    audio.playEntryCountdown(2);
    audio.playEntryCountdown(1);
    audio.playEntryCountdownResolve();

    expect(bufferSources).toHaveLength(4);
    expect(panners).toHaveLength(4);
    expect(bufferSources.map((node) => node.playbackRate.value)).toEqual([1.04, 1.08, 1.12, 1.08]);
    expect(gains.slice(-4).map((node) => node.gain.linear[0]?.value)).toEqual([1.12, 1.19, 1.26, 1.44]);
  });

  it('starts Studio row pulses at clear-started and never replays them at commit', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.play([
      { type: 'hard-dropped', piece: 'I', distance: 14 },
      { type: 'piece-locked', piece: 'I', cells: [] },
      { type: 'clear-started', rows: [38, 39] },
    ]);

    expect(bufferSources).toHaveLength(2);
    expect(bufferSources.map((node) => node.starts[0]?.time)).toEqual([0, 0.18]);
    expect(panners.map((node) => node.pan.value)).toEqual([-0.35, 0.35]);
    const afterStart = bufferSources.length;
    audio.play([{ type: 'lines-cleared', rows: [38, 39], count: 2, score: 300 }]);
    expect(bufferSources).toHaveLength(afterStart);
    audio.play([{ type: 'lines-cleared', rows: [39], count: 1, score: 100 }]);
    expect(bufferSources).toHaveLength(afterStart + 1);
  });

  it('uses exactly four no-tail Studio pulses for a four-line clear', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.play([{ type: 'clear-started', rows: [36, 37, 38, 39] }]);
    expect(bufferSources).toHaveLength(4);
    expect(bufferSources.map((node) => node.starts[0]?.time)).toEqual([0, 0.06, 0.12, 0.18]);
    expect(panners.map((node) => Number(node.pan.value.toFixed(6)))).toEqual([
      -0.35, -0.116667, 0.116667, 0.35,
    ]);
  });

  it('deduplicates Mutation awards and delays each cue to its serialized visual start', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.play([
      mutation('freeze'), mutation('freeze'), mutation('collapse'), mutation('bomb'),
      mutation('multiplier', 2), mutation('multiplier', 4),
    ]);

    expect(sourceCount()).toBeLessThanOrEqual(16);
    const ice = bufferSources.find((source) => source.starts[0]?.offset === 0.19375);
    expect(ice?.starts[0]).toEqual({ time: 0.62, offset: 0.19375, duration: 0.44 });
    const starts = [
      ...oscillators.flatMap((source) => source.starts),
      ...bufferSources.flatMap((source) => source.starts.map((entry) => entry.time)),
    ];
    expect(starts.some((start) => Math.abs(start - 0) < 0.000001)).toBe(true);
    expect(starts.some((start) => Math.abs(start - 0.94) < 0.000001)).toBe(true);
    expect(starts.some((start) => Math.abs(start - 1.16) < 0.000001)).toBe(true);
  });

  it('continues the Mutation serial tail across separate Core transitions', async () => {
    const context = new FakeAudioContext();
    const audio = audioFor(context);
    await audio.prime();

    context.currentTime = 4;
    audio.play([mutation('bomb')]);
    context.currentTime = 4.1;
    audio.play([mutation('freeze')]);

    const ice = bufferSources.find((source) => source.starts[0]?.offset === 0.19375);
    expect(ice?.starts[0]).toEqual({ time: 4.62, offset: 0.19375, duration: 0.44 });
  });

  it('restart cancels current and queued Mutation voices and resets the serial tail', async () => {
    const context = new FakeAudioContext();
    const audio = audioFor(context);
    await audio.prime();

    context.currentTime = 8;
    audio.play([mutation('bomb')]);
    context.currentTime = 8.1;
    audio.play([mutation('freeze')]);
    const scheduledOscillators = [...oscillators];
    const scheduledBuffers = [...bufferSources];

    context.currentTime = 8.2;
    audio.play([{ type: 'restarted' }]);

    expect(scheduledOscillators.every((source) => source.stops.at(-1) === 8.2)).toBe(true);
    expect(scheduledBuffers.every((source) => source.stops.at(-1) === 8.2)).toBe(true);
    expect(scheduledOscillators.every((source) => source.disconnected)).toBe(true);
    expect(scheduledBuffers.every((source) => source.disconnected)).toBe(true);

    context.currentTime = 9;
    audio.play([mutation('freeze')]);
    expect(bufferSources.at(-1)?.starts[0]).toEqual({
      time: 9,
      offset: 0.19375,
      duration: 0.44,
    });
  });

  it('routes the complete deterministic Bomb body and pressure contract through production', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.play([mutation('bomb')]);

    expect(oscillators).toHaveLength(3);
    expect(oscillators.map((node) => node.frequency.setValues[0])).toEqual([
      { value: 74, time: 0 },
      { value: 111, time: 0.22 },
      { value: 55, time: 0.235 },
    ]);
    expect(oscillators[1]?.frequency.exponential[0]).toEqual({ value: 48, time: 0.44 });
    expect(oscillators[2]?.frequency.exponential[0]).toEqual({ value: 42, time: 0.49 });
    expect(oscillators.map((node) => node.starts[0])).toEqual([0, 0.22, 0.235]);
    expect(oscillators.map((node) => Number(node.stops[0]?.toFixed(3)))).toEqual([0.23, 0.45, 0.5]);
    expect(bufferSources).toHaveLength(1);
    expect(bufferSources[0]?.starts[0]).toEqual({ time: 0.22, offset: undefined, duration: undefined });
    expect(bufferSources[0]?.stops[0]).toBeCloseTo(0.35);
    expect(filters).toHaveLength(1);
    expect(filters[0]?.type).toBe('lowpass');
    expect(filters[0]?.frequency.setValues[0]).toEqual({ value: 880, time: 0.22 });
    expect(filters[0]?.Q.setValues[0]).toEqual({ value: 0.55, time: 0.22 });
    expect(gains.at(-1)?.gain.exponential[0]).toEqual({ value: 0.17 * 1.45, time: 0.224 });
  });

  it('pins every layer of one clear or Bomb event to one moving AudioContext clock read', async () => {
    const context = new FakeAudioContext();
    let clock = 0;
    let readStep = 0;
    Object.defineProperty(context, 'currentTime', {
      configurable: true,
      get: () => {
        const value = clock;
        clock += readStep;
        return value;
      },
      set: (value: number) => { clock = value; },
    });
    const audio = audioFor(context);
    await audio.prime();
    clock = 4;
    readStep = 0.011;

    audio.play([{ type: 'clear-started', rows: [36, 37, 38, 39] }]);
    expect(bufferSources.map((node) => node.starts[0]?.time)).toEqual([4, 4.06, 4.12, 4.18]);

    audio.play([mutation('bomb')]);
    const bombStarts = oscillators.slice(-3).map((node) => node.starts[0] ?? 0);
    const bombOrigin = bombStarts[0]!;
    expect(bombStarts.map((start) => Number((start - bombOrigin).toFixed(3)))).toEqual([0, 0.22, 0.235]);
    expect(bufferSources.at(-1)?.starts[0]?.time).toBeCloseTo(bombOrigin + 0.22);
    expect(filters.at(-1)?.frequency.setValues[0]?.time).toBeCloseTo(bombOrigin + 0.22);
  });

  it('lets Ice own a resolution frame without stacking hard-drop, lock, or clear sounds', async () => {
    const audio = audioFor();
    await audio.prime();
    audio.play([
      { type: 'hard-dropped', piece: 'I', distance: 14 },
      { type: 'piece-locked', piece: 'I', cells: [] },
      { type: 'lines-cleared', rows: [39], count: 1, score: 100 },
      mutation('freeze'),
    ]);

    expect(oscillators).toHaveLength(0);
    expect(bufferSources).toHaveLength(1);
    expect(bufferSources[0]?.starts[0]).toEqual({ time: 0, offset: 0.19375, duration: 0.44 });
  });

  it('maps every remaining extension event to a bounded gesture', async () => {
    const audio = audioFor();
    await audio.prime();
    const batches: readonly GameEvent[][] = [
      [{ type: 'piece-moved', piece: 'I', dx: 0, dy: 1, cause: 'soft-drop' }],
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
      for (const node of [...oscillators, ...bufferSources]) node.finish();
    }
  });

  it('deduplicates concurrent local asset loading and leaves theme selection silent', async () => {
    const audio = audioFor();
    audio.setAmbientTheme('deep-tide');
    await Promise.all([audio.prime(), audio.prime(), audio.prime()]);
    expect(loadAsset).toHaveBeenCalledTimes(3);
    expect(decodeCalls).toBe(3);
    expect(sourceCount()).toBe(0);
    audio.setAmbientTheme('mineral-mist');
    expect(sourceCount()).toBe(0);
  });

  it('clamps output volume, gates disable, suspends, and tears down once', async () => {
    const context = new FakeAudioContext();
    const audio = audioFor(context);
    audio.setVolume(2);
    await audio.prime();
    expect(audio.getVolume()).toBe(1);
    expect(gains[0]?.gain.value).toBeCloseTo(0.78);
    audio.setVolume(0.5);
    expect(gains[0]?.gain.value).toBeCloseTo(0.39);
    audio.setEnabled(false);
    expect(gains[1]?.gain.value).toBe(0);
    audio.suspend();
    expect(suspendCalls).toBe(1);

    audio.destroy();
    audio.destroy();
    expect(closeCalls).toBe(1);
    expect(gains.slice(0, 10).every((node) => node.disconnected)).toBe(true);
  });

  it('does not resurrect decoded assets after destroy during an in-flight load', async () => {
    const resolvers: Array<(bytes: ArrayBuffer) => void> = [];
    const delayedLoader = vi.fn<AcceptedAudioAssetLoader>(() => new Promise<ArrayBuffer>((resolve) => {
      resolvers.push(resolve);
    }));
    const audio = new AudioEngine(platformFor(), delayedLoader);
    const priming = audio.prime();
    await Promise.resolve();
    audio.destroy();
    for (const resolve of resolvers) resolve(new ArrayBuffer(8));
    await priming;
    audio.playEntryCountdown(3);
    audio.playEntryCountdownResolve();
    expect(sourceCount()).toBe(0);
  });

  it('stays safe when the host exposes no AudioContext', async () => {
    const audio = new AudioEngine(createBrowserPlatform({
      window: null,
      document: null,
      audioContextFactory: null,
    }), loadAsset);
    await expect(audio.prime()).resolves.toBeUndefined();
    expect(() => audio.play([{ type: 'paused' }])).not.toThrow();
    expect(() => audio.playEntryCountdownResolve()).not.toThrow();
    expect(() => audio.destroy()).not.toThrow();
  });

  it('keeps recovered-candidate voice accounting consistent with the engine', () => {
    expect(audioCue('bomb').tones.length + (audioCue('bomb').air?.length ?? 0)).toBe(4);
    expect(audioCue('supergravity').tones).toHaveLength(2);
    expect(audioCue('multiplier-4').tones).toHaveLength(6);
  });
});
