import { describe, expect, it, vi } from 'vitest';
import {
  BOMB_BLOCK_PLAYBACK_CONTRACT,
  BOMB_BLOCK_SAMPLE_RATE,
  composeBombBlockEventSamples,
  scheduleBombBlockEventBuffer,
} from './bombBlockPlayback';

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

const peak = (samples: Float32Array): number => samples.reduce(
  (maximum, sample) => Math.max(maximum, Math.abs(sample)),
  0,
);

const energy = (samples: Float32Array): number => samples.reduce(
  (total, sample) => total + sample * sample,
  0,
);

describe('R5C Bomb block-break compositor', () => {
  it('uses one quiet hard-drop-adjacent grammar without an explosive low tail', () => {
    expect(BOMB_BLOCK_PLAYBACK_CONTRACT).toEqual({
      normalImpactMs: 220,
      fullTailMs: 132,
      reducedTailMs: 90,
      rawPeakCeiling: 0.18,
      bodyStartHz: 174.61,
      bodyEndHz: 138.59,
      contactStartHz: 349.23,
      contactEndHz: 293.66,
    });
  });

  it('keeps normal Bomb silent until the 220 ms visual impact and bounded afterward', () => {
    const samples = composeBombBlockEventSamples({
      beatStartsMs: [BOMB_BLOCK_PLAYBACK_CONTRACT.normalImpactMs],
      reducedMotion: false,
    });
    const impact = BOMB_BLOCK_PLAYBACK_CONTRACT.normalImpactMs * 48;

    expect(samples).toHaveLength((220 + 132) * 48);
    expect(energy(samples.slice(0, impact))).toBe(0);
    expect(energy(samples.slice(impact))).toBeGreaterThan(0);
    expect(peak(samples)).toBeGreaterThan(0.05);
    expect(peak(samples)).toBeLessThan(0.11);
    expect(peak(samples)).toBeLessThanOrEqual(BOMB_BLOCK_PLAYBACK_CONTRACT.rawPeakCeiling);
    expect(samples.every(Number.isFinite)).toBe(true);
  });

  it('merges full-motion chain beats into one source while keeping every causal impact audible', () => {
    const starts = [220, 276, 332];
    const samples = composeBombBlockEventSamples({ beatStartsMs: starts, reducedMotion: false });

    expect(samples).toHaveLength((332 + 132) * 48);
    for (const start of starts) {
      const frame = start * 48;
      expect(energy(samples.slice(frame, frame + 48_000 * 0.03))).toBeGreaterThan(0.00001);
    }
    expect(peak(samples)).toBeLessThanOrEqual(BOMB_BLOCK_PLAYBACK_CONTRACT.rawPeakCeiling);
  });

  it('uses the same beat grammar in reduced motion with its shorter causal tail', () => {
    const samples = composeBombBlockEventSamples({
      beatStartsMs: [50, 70, 90],
      reducedMotion: true,
    });
    expect(samples).toHaveLength((90 + 90) * 48);
    expect(energy(samples.slice(0, 50 * 48))).toBe(0);
    expect(energy(samples.slice(50 * 48))).toBeGreaterThan(0);
  });

  it('fails closed on malformed shared-plan beat input', () => {
    for (const beatStartsMs of [[], [-1], [220, 220], [220, Number.NaN], [0.001]]) {
      expect(() => composeBombBlockEventSamples({ beatStartsMs, reducedMotion: false })).toThrow();
    }
  });

  it('schedules one cancellable mono BufferSource for the already-composed event', () => {
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
      sampleRate: BOMB_BLOCK_SAMPLE_RATE,
      currentTime: 2,
      createBuffer,
      createBufferSource,
    } as unknown as AudioContext;
    const destination = new FakeNode() as unknown as AudioNode;
    const samples = new Float32Array(480).fill(0.05);
    const ended = vi.fn();

    const voice = scheduleBombBlockEventBuffer(context, destination, samples, {
      startAt: 2.5,
      onVoiceEnd: ended,
    });

    expect(createBuffer).toHaveBeenCalledOnce();
    expect(createBuffer).toHaveBeenCalledWith(1, 480, BOMB_BLOCK_SAMPLE_RATE);
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
