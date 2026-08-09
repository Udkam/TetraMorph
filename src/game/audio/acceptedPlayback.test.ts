import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACCEPTED_OUTPUT_GAIN,
  ACTION_A_CONTRACT,
  STUDIO_CLEAR_CONTRACT,
  STUDIO_COMPRESSOR_CONTRACT,
  STUDIO_COUNTDOWN_CONTRACT,
  measureAudioBufferPeak,
  scheduleAcceptedAction,
  scheduleIceSample,
  scheduleStudioSample,
} from './acceptedPlayback';

class FakeParam {
  value = 0;
  readonly setValues: Array<{ value: number; time: number }> = [];
  readonly exponential: Array<{ value: number; time: number }> = [];
  readonly linear: Array<{ value: number; time: number }> = [];
  setValueAtTime(value: number, time: number): void { this.value = value; this.setValues.push({ value, time }); }
  exponentialRampToValueAtTime(value: number, time: number): void { this.value = value; this.exponential.push({ value, time }); }
  linearRampToValueAtTime(value: number, time: number): void { this.value = value; this.linear.push({ value, time }); }
}

class FakeNode {
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

class FakeGain extends FakeNode { readonly gain = new FakeParam(); }
class FakePanner extends FakeNode { readonly pan = new FakeParam(); }
class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam();
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  start(time = 0): void { this.starts.push(time); }
  stop(time = 0): void { this.stops.push(time); }
}
class FakeBufferSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  readonly playbackRate = new FakeParam();
  readonly starts: Array<{ time: number; offset?: number; duration?: number }> = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  start(time = 0, offset?: number, duration?: number): void { this.starts.push({ time, offset, duration }); }
  stop(time = 0): void { this.stops.push(time); }
}
class FakeBuffer {
  readonly duration: number;
  readonly numberOfChannels: number;
  readonly sampleRate = 48_000;
  readonly length: number;
  constructor(private readonly channels: readonly Float32Array[]) {
    this.numberOfChannels = channels.length;
    this.length = channels[0]?.length ?? 0;
    this.duration = this.length / this.sampleRate;
  }
  getChannelData(channel: number): Float32Array { return this.channels[channel] ?? new Float32Array(); }
}

const oscillators: FakeOscillator[] = [];
const sources: FakeBufferSource[] = [];
const gains: FakeGain[] = [];
const panners: FakePanner[] = [];
const destination = new FakeNode() as unknown as AudioNode;

const context = {
  currentTime: 2,
  createOscillator: () => { const value = new FakeOscillator(); oscillators.push(value); return value; },
  createGain: () => { const value = new FakeGain(); gains.push(value); return value; },
  createStereoPanner: () => { const value = new FakePanner(); panners.push(value); return value; },
  createBufferSource: () => { const value = new FakeBufferSource(); sources.push(value); return value; },
} as unknown as AudioContext;

beforeEach(() => {
  oscillators.length = 0;
  sources.length = 0;
  gains.length = 0;
  panners.length = 0;
});

describe('accepted audio playback contracts', () => {
  it('freezes Action A recipes, mixer, and the accepted output reference', () => {
    expect(ACCEPTED_OUTPUT_GAIN).toBe(0.78);
    expect(ACTION_A_CONTRACT).toMatchObject({
      sourceCommit: '35509a7',
      masterGain: 1.85,
      voiceGainBoost: 1.45,
      voiceGainCeiling: 0.5,
      compressor: { threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 },
    });
    expect(ACTION_A_CONTRACT.recipes.move).toEqual([
      { frequency: 220, duration: 0.044, gain: 0.062, attack: 0.006, waveform: 'sine' },
    ]);
    expect(ACTION_A_CONTRACT.recipes.rotate).toHaveLength(2);
    expect(ACTION_A_CONTRACT.recipes.lock[0]).toMatchObject({ frequency: 246.94, duration: 0.048, gain: 0.06 });
    expect(ACTION_A_CONTRACT.recipes['hard-drop']).toHaveLength(2);
  });

  it('uses directional panning only for movement and preserves direct centred routes', () => {
    scheduleAcceptedAction(context, destination, 'move', { pan: -0.28 });
    expect(panners).toHaveLength(1);
    expect(panners[0]?.pan.setValues).toContainEqual({ value: -0.28, time: 2 });
    expect(gains[0]?.gain.exponential[0]?.value).toBeCloseTo(0.062 * 1.45);

    scheduleAcceptedAction(context, destination, 'rotate');
    expect(panners).toHaveLength(1);
    expect(oscillators.slice(1).map((node) => node.frequency.setValues[0]?.value)).toEqual([293.66, 440]);
    expect(oscillators.slice(1).map((node) => node.starts[0])).toEqual([2, 2.004]);
  });

  it('freezes Studio clear/countdown cadence and always schedules through a panner', () => {
    expect(STUDIO_COMPRESSOR_CONTRACT).toEqual({ threshold: -10, knee: 10, ratio: 4, attack: 0.003, release: 0.12 });
    expect(STUDIO_CLEAR_CONTRACT.delaysMs).toEqual({
      1: [0], 2: [0, 180], 3: [0, 90, 180], 4: [0, 60, 120, 180],
    });
    expect(STUDIO_COUNTDOWN_CONTRACT.steps).toEqual({
      3: { targetPeak: 0.56, rate: 1.04 },
      2: { targetPeak: 0.595, rate: 1.08 },
      1: { targetPeak: 0.63, rate: 1.12 },
    });

    const channel = new Float32Array(48_000);
    channel[10] = 0.5;
    const buffer = new FakeBuffer([channel]) as unknown as AudioBuffer;
    scheduleStudioSample(context, destination, buffer, {
      targetPeak: 0.5, rate: 1.18, pan: 0, maxDuration: 0.2,
    });
    expect(panners).toHaveLength(1);
    expect(sources[0]?.playbackRate.value).toBe(1.18);
    expect(gains[0]?.gain.linear[0]?.value).toBe(1);
    expect(sources[0]?.stops[0]).toBeCloseTo(2.206);
  });

  it('plays Ice 2 at original rate from the frozen window and direct envelope', () => {
    const buffer = new FakeBuffer([new Float32Array(96_000)]) as unknown as AudioBuffer;
    scheduleIceSample(context, destination, buffer, {
      offset: 0.19375,
      duration: 0.44,
      gain: 0.78,
      attack: 0.003,
      release: 0.012,
    });
    expect(panners).toHaveLength(0);
    expect(sources[0]?.starts[0]).toEqual({ time: 2, offset: 0.19375, duration: 0.44 });
    expect(gains[0]?.gain.exponential).toEqual([
      { value: 0.78, time: 2.003 },
      { value: 0.0001, time: 2.44 },
    ]);
  });

  it('measures the largest finite absolute decoded sample across channels', () => {
    const buffer = new FakeBuffer([
      Float32Array.from([0, -0.25, 0.1]),
      Float32Array.from([0.7, -0.4, 0]),
    ]) as unknown as AudioBuffer;
    expect(measureAudioBufferPeak(buffer)).toBeCloseTo(0.7);
  });
});
