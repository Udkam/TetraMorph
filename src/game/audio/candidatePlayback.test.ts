import { describe, expect, it, vi } from 'vitest';
import { scheduleChainPropagationPulses, scheduleRecoveredNoisePuff } from './candidatePlayback';

class FakeParam {
  value = 0;
  readonly set: Array<{ value: number; time: number }> = [];
  readonly ramps: Array<{ value: number; time: number }> = [];
  setValueAtTime(value: number, time: number): void { this.value = value; this.set.push({ value, time }); }
  exponentialRampToValueAtTime(value: number, time: number): void {
    this.value = value;
    this.ramps.push({ value, time });
  }
}

class FakeNode {
  readonly connections: unknown[] = [];
  disconnected = false;
  connect(target?: unknown): void { this.connections.push(target); }
  disconnect(): void { this.disconnected = true; }
}

class FakeGain extends FakeNode { readonly gain = new FakeParam(); }
class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'highpass';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}
class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  start(at: number): void { this.starts.push(at); }
  stop(at: number): void { this.stops.push(at); }
}
class FakeOscillator extends FakeSource {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam();
}

describe('recovered candidate playback', () => {
  it('reproduces a deterministic low-passed pressure puff and cleans it up', () => {
    const samples = new Float32Array(480);
    const source = new FakeSource();
    const filter = new FakeFilter();
    const gain = new FakeGain();
    const ended = vi.fn();
    const context = {
      currentTime: 1,
      sampleRate: 48_000,
      createBuffer: () => ({ getChannelData: () => samples }) as unknown as AudioBuffer,
      createBufferSource: () => source as unknown as AudioBufferSourceNode,
      createBiquadFilter: () => filter as unknown as BiquadFilterNode,
      createGain: () => gain as unknown as GainNode,
    } as unknown as AudioContext;

    const voice = scheduleRecoveredNoisePuff(context, new FakeNode() as unknown as AudioNode, {
      startAt: 1.25,
      duration: 0.01,
      gain: 0.12,
      cutoff: 640,
      q: 0.7,
      attack: 0.006,
      gainBoost: 1.45,
      gainCeiling: 0.5,
      onVoiceEnd: ended,
    });

    expect(filter.type).toBe('lowpass');
    expect(filter.frequency.set).toEqual([{ value: 640, time: 1.25 }]);
    expect(filter.Q.set).toEqual([{ value: 0.7, time: 1.25 }]);
    expect(gain.gain.ramps[0]?.value).toBeCloseTo(0.12 * 1.45);
    expect(source.starts).toEqual([1.25]);
    expect(source.stops[0]).toBeCloseTo(1.27);
    expect(Array.from(samples.slice(0, 4))).toEqual([
      0.8433808088302612,
      -0.8855636715888977,
      0.11644517630338669,
      -0.25253257155418396,
    ]);

    source.onended?.();
    expect(source.disconnected).toBe(true);
    expect(filter.disconnected).toBe(true);
    expect(gain.disconnected).toBe(true);
    expect(ended).toHaveBeenCalledWith(voice);
  });

  it('schedules every chain distance beat on one cancellable voice', () => {
    const oscillator = new FakeOscillator();
    const gain = new FakeGain();
    const context = {
      currentTime: 2,
      createOscillator: () => oscillator as unknown as OscillatorNode,
      createGain: () => gain as unknown as GainNode,
    } as unknown as AudioContext;
    const offsets = Array.from({ length: 20 }, (_, index) => .14 + index * .034);

    const voice = scheduleChainPropagationPulses(context, new FakeNode() as unknown as AudioNode, {
      startAt: 2,
      beatOffsetsSeconds: offsets,
      gain: .036,
      gainBoost: 1.45,
      gainCeiling: .5,
    });

    expect(oscillator.starts).toEqual([2]);
    expect(oscillator.frequency.set).toHaveLength(20);
    expect(oscillator.frequency.set.at(-1)?.time).toBeCloseTo(2 + offsets.at(-1)!);
    expect(gain.gain.ramps).toHaveLength(40);
    voice?.stop(2.2);
    expect(oscillator.stops).toContain(2.2);
  });
});
