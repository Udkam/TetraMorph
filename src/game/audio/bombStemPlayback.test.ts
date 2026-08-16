import { describe, expect, it, vi } from 'vitest';
import {
  BOMB_GRAIN_PROFILES,
  BOMB_STEM_FRAMES,
  BOMB_STEM_SAMPLE_RATE,
  composeBombEventSamples,
  scheduleBombEventBuffer,
  type BombStemData,
} from './bombStemPlayback';

const stemWith = (value = 0.25): BombStemData => ({
  samples: new Float32Array(BOMB_STEM_FRAMES).fill(value),
  sampleRate: BOMB_STEM_SAMPLE_RATE,
  channels: 1,
});

class FakeNode {
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  start(at = 0): void { this.starts.push(at); }
  stop(at = 0): void { this.stops.push(at); }
}

describe('R5B Bomb stem event compositor', () => {
  it('freezes the exact full and reduced onset profiles', () => {
    expect(BOMB_GRAIN_PROFILES).toEqual({
      full: { grainFrames: 4_032, fadeFrames: 1_344, gain: 0.11 },
      reduced: { grainFrames: 1_728, fadeFrames: 768, gain: 0.055 },
    });
  });

  it('keeps d0 complete and applies one full-motion onset grain per later distinct beat', () => {
    const stem = stemWith();
    const startsMs = [0, 200];
    const output = composeBombEventSamples(stem, {
      beatStartsMs: startsMs,
      reducedMotion: false,
    });
    const grainStart = startsMs[1]! * 48;
    const profile = BOMB_GRAIN_PROFILES.full;
    const fadeStart = profile.grainFrames - profile.fadeFrames;

    expect(output.length).toBe(grainStart + profile.grainFrames);
    expect(Array.from(output.slice(0, stem.samples.length))).toEqual(Array.from(stem.samples));
    expect(output[grainStart]).toBeCloseTo(0.25 * profile.gain);
    expect(output[grainStart + fadeStart]).toBeCloseTo(0.25 * profile.gain);
    expect(output.at(-1)).toBe(0);
  });

  it('uses the shorter reduced profile without a fade-in', () => {
    const output = composeBombEventSamples(stemWith(0.4), {
      beatStartsMs: [0, 200],
      reducedMotion: true,
    });
    const start = 200 * 48;
    const profile = BOMB_GRAIN_PROFILES.reduced;
    expect(output.length).toBe(start + profile.grainFrames);
    expect(output[start]).toBeCloseTo(0.4 * profile.gain);
    expect(output[start + 1]).toBeCloseTo(0.4 * profile.gain);
    expect(output.at(-1)).toBe(0);
  });

  it('uses the longer of the complete d0 stem and final onset grain', () => {
    const d0Dominates = composeBombEventSamples(stemWith(), {
      beatStartsMs: [220, 221], reducedMotion: false,
    });
    const grainDominates = composeBombEventSamples(stemWith(), {
      beatStartsMs: [0, 200], reducedMotion: false,
    });
    expect(d0Dominates.length).toBe(220 * 48 + BOMB_STEM_FRAMES);
    expect(grainDominates.length).toBe(200 * 48 + BOMB_GRAIN_PROFILES.full.grainFrames);
  });

  it('fails closed on stem shape, sample, beat, and unclipped-range drift', () => {
    expect(() => composeBombEventSamples({ ...stemWith(), sampleRate: 44_100 }, {
      beatStartsMs: [0], reducedMotion: false,
    })).toThrow(/sample rate/);
    expect(() => composeBombEventSamples({ ...stemWith(), channels: 2 }, {
      beatStartsMs: [0], reducedMotion: false,
    })).toThrow(/mono/);
    expect(() => composeBombEventSamples({ ...stemWith(), samples: new Float32Array(10) }, {
      beatStartsMs: [0], reducedMotion: false,
    })).toThrow(/8640/);
    const nonFinite = stemWith();
    nonFinite.samples[4] = Number.NaN;
    expect(() => composeBombEventSamples(nonFinite, {
      beatStartsMs: [0], reducedMotion: false,
    })).toThrow(/non-finite/);
    for (const beats of [[], [-1], [0, 0], [1 / 100], [0, Number.NaN]]) {
      expect(() => composeBombEventSamples(stemWith(), {
        beatStartsMs: beats, reducedMotion: false,
      })).toThrow();
    }
    expect(() => composeBombEventSamples(stemWith(1), {
      beatStartsMs: [0, 1 / 48], reducedMotion: false,
    })).toThrow(/unclipped/);
  });

  it('schedules the composed mono event as one cancellable BufferSource', () => {
    const source = new FakeSource();
    const channel = new Float32Array(480);
    const createBuffer = vi.fn(() => ({
      getChannelData: (index: number) => {
        expect(index).toBe(0);
        return channel;
      },
    } as unknown as AudioBuffer));
    const createBufferSource = vi.fn(() => source as unknown as AudioBufferSourceNode);
    const context = {
      sampleRate: 48_000,
      currentTime: 2,
      createBuffer,
      createBufferSource,
    } as unknown as AudioContext;
    const destination = new FakeNode() as unknown as AudioNode;
    const samples = new Float32Array(480).fill(0.2);
    const ended = vi.fn();

    const voice = scheduleBombEventBuffer(context, destination, samples, {
      startAt: 2.5,
      onVoiceEnd: ended,
    });

    expect(createBuffer).toHaveBeenCalledOnce();
    expect(createBuffer).toHaveBeenCalledWith(1, 480, 48_000);
    expect(createBufferSource).toHaveBeenCalledOnce();
    expect(source.buffer).not.toBeNull();
    expect(source.starts).toEqual([2.5]);
    expect(source.stops).toEqual([2.51]);
    expect(Array.from(channel)).toEqual(Array.from(samples));
    voice.stop(2.6);
    expect(source.stops).toContain(2.6);
    source.onended?.();
    expect(source.disconnected).toBe(true);
    expect(ended).toHaveBeenCalledWith(voice);
  });
});
