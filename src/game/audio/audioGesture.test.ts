import { describe, expect, it, vi } from 'vitest';
import {
  gestureDuration,
  renderProceduralSamples,
  scheduleGesture,
  type AudioGesture,
  type ProceduralInstrument,
} from './audioGesture';

class FakeParam {
  value = 1;
  readonly setValues: number[] = [];
  readonly ramps: number[] = [];
  setValueAtTime(value: number): void { this.setValues.push(value); }
  exponentialRampToValueAtTime(value: number): void { this.ramps.push(value); }
}

class FakeNode {
  readonly connections: unknown[] = [];
  disconnects = 0;
  connect(target: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnects += 1; }
}

class FakeSource extends FakeNode {
  onended: (() => void) | null = null;
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  start(time = 0): void { this.starts.push(time); }
  stop(time = 0): void { this.stops.push(time); }
}

class FakeOscillator extends FakeSource {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam();
}

class FakeBufferSource extends FakeSource {
  buffer: AudioBuffer | null = null;
}

class FakeGain extends FakeNode { readonly gain = new FakeParam(); }
class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}
class FakeBuffer {
  readonly samples: Float32Array;
  constructor(frames: number) { this.samples = new Float32Array(frames); }
  getChannelData(): Float32Array { return this.samples; }
}

function fakeContext() {
  const oscillators: FakeOscillator[] = [];
  const sources: FakeBufferSource[] = [];
  const filters: FakeFilter[] = [];
  const gains: FakeGain[] = [];
  const buffers: FakeBuffer[] = [];
  const context = {
    currentTime: 2,
    sampleRate: 1_000,
    createOscillator: () => { const value = new FakeOscillator(); oscillators.push(value); return value; },
    createBufferSource: () => { const value = new FakeBufferSource(); sources.push(value); return value; },
    createBiquadFilter: () => { const value = new FakeFilter(); filters.push(value); return value; },
    createGain: () => { const value = new FakeGain(); gains.push(value); return value; },
    createBuffer: (_channels: number, frames: number) => { const value = new FakeBuffer(frames); buffers.push(value); return value; },
  } as unknown as BaseAudioContext;
  return { context, oscillators, sources, filters, gains, buffers };
}

const gesture: AudioGesture = {
  bus: 'gameplay',
  layers: [
    { kind: 'resonator', frequency: 173, endFrequency: 151, duration: 0.08, gain: 0.04 },
    { kind: 'resonator', frequency: 477, duration: 0.045, gain: 0.018, delay: 0.004 },
    { kind: 'air', filter: 'bandpass', startFrequency: 920, endFrequency: 540, duration: 0.05, gain: 0.012, seed: 42 },
  ],
};

const proceduralGesture: AudioGesture = {
  bus: 'gameplay',
  layers: [
    {
      kind: 'procedural', instrument: 'felt', frequency: 164, endFrequency: 128,
      duration: 0.09, gain: 0.08, brightness: 0.38, spread: 0.42, seed: 36,
    },
  ],
};

describe('material audio gesture scheduler', () => {
  it('schedules resonators and deterministic filtered air without exposed zero-gain edges', () => {
    const first = fakeContext();
    const second = fakeContext();
    scheduleGesture(first.context, new FakeNode() as unknown as AudioNode, gesture);
    scheduleGesture(second.context, new FakeNode() as unknown as AudioNode, gesture);

    expect(first.oscillators).toHaveLength(2);
    expect(first.sources).toHaveLength(1);
    expect(first.filters[0]?.type).toBe('bandpass');
    expect(first.filters[0]?.frequency.setValues).toContain(920);
    expect(first.filters[0]?.frequency.ramps).toContain(540);
    expect(first.buffers[0]?.samples).toEqual(second.buffers[0]?.samples);
    expect(first.gains.every((gain) => gain.gain.value === 0.000001)).toBe(true);
    expect(first.gains.every((gain) => gain.gain.setValues[0] === 0.000001)).toBe(true);
    expect(first.gains.every((gain) => gain.gain.ramps.at(-1) === 0.000001)).toBe(true);
  });

  it('respects the caller voice budget and reports lifecycle once', () => {
    const { context } = fakeContext();
    const starts = vi.fn();
    const ends = vi.fn();
    const voices = scheduleGesture(context, new FakeNode() as unknown as AudioNode, gesture, {
      maxVoices: 2,
      onVoiceStart: starts,
      onVoiceEnd: ends,
    });
    expect(voices).toHaveLength(2);
    expect(starts).toHaveBeenCalledTimes(2);
    voices[0]?.source.onended?.(new Event('ended'));
    expect(ends).toHaveBeenCalledTimes(1);
    voices[0]?.disconnect();
  });

  it('computes the full delayed gesture duration', () => {
    expect(gestureDuration(gesture)).toBeCloseTo(0.08, 6);
  });

  it('renders legacy and T37 material instruments deterministically with finite zero endpoints', () => {
    const instruments: ProceduralInstrument[] = [
      'felt', 'impact', 'ribbon', 'glass', 'shimmer', 'pulse',
      'soft-contact', 'wood', 'ceramic', 'stone', 'crystal-grain', 'air-brush',
    ];
    const signatures = new Set<string>();
    for (const instrument of instruments) {
      const layer = {
        kind: 'procedural' as const,
        instrument,
        frequency: 173,
        endFrequency: 121,
        duration: 0.12,
        gain: 0.08,
        brightness: 0.57,
        spread: 0.44,
        seed: 42,
      };
      const first = renderProceduralSamples(layer, 8_000);
      const second = renderProceduralSamples(layer, 8_000);
      expect(first).toEqual(second);
      expect(first[0]).toBe(0);
      expect(first.at(-1)).toBe(0);
      expect([...first].every(Number.isFinite)).toBe(true);
      expect(Math.max(...first.map(Math.abs))).toBeLessThanOrEqual(1);
      signatures.add([...first.slice(0, 64)].map((value) => value.toFixed(5)).join(','));
    }
    expect(signatures.size).toBe(instruments.length);
  });

  it('schedules one cached AudioBuffer voice for a procedural layer', () => {
    const { context, sources, buffers, gains } = fakeContext();
    const destination = new FakeNode() as unknown as AudioNode;
    const first = scheduleGesture(context, destination, proceduralGesture);
    const second = scheduleGesture(context, destination, proceduralGesture);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(sources).toHaveLength(2);
    expect(buffers).toHaveLength(1);
    expect(sources[0]?.buffer).toBe(sources[1]?.buffer);
    expect(gains[0]?.gain.setValues).toContain(0.08);
    expect(gains[0]?.gain.setValues.at(-1)).toBe(0.000001);
  });
});
