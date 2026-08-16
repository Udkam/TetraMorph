import type { GestureVoice } from './audioGesture';
import type { AcceptedVoiceHooks } from './acceptedPlayback';

export const BOMB_STEM_SAMPLE_RATE = 48_000;
export const BOMB_STEM_FRAMES = 8_640;

export interface BombStemData {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  readonly channels: number;
}

export interface BombGrainProfile {
  readonly grainFrames: number;
  readonly fadeFrames: number;
  readonly gain: number;
}

export const BOMB_GRAIN_PROFILES = Object.freeze({
  full: Object.freeze({ grainFrames: 4_032, fadeFrames: 1_344, gain: 0.11 }),
  reduced: Object.freeze({ grainFrames: 1_728, fadeFrames: 768, gain: 0.055 }),
} satisfies Record<'full' | 'reduced', BombGrainProfile>);

export interface ComposeBombEventOptions {
  readonly beatStartsMs: readonly number[];
  readonly reducedMotion: boolean;
}

function assertStem(stem: BombStemData): void {
  if (stem.sampleRate !== BOMB_STEM_SAMPLE_RATE) {
    throw new Error(`Bomb stem sample rate must be ${BOMB_STEM_SAMPLE_RATE}.`);
  }
  if (stem.channels !== 1) throw new Error('Bomb stem must be mono.');
  if (stem.samples.length !== BOMB_STEM_FRAMES) {
    throw new Error(`Bomb stem must contain ${BOMB_STEM_FRAMES} frames.`);
  }
  for (const sample of stem.samples) {
    if (!Number.isFinite(sample)) throw new Error('Bomb stem contains a non-finite sample.');
  }
}

function beatStartFrames(beatStartsMs: readonly number[]): number[] {
  if (beatStartsMs.length === 0) throw new Error('Bomb event requires at least one beat start.');
  const frames: number[] = [];
  for (const startMs of beatStartsMs) {
    const frame = startMs * (BOMB_STEM_SAMPLE_RATE / 1_000);
    if (!Number.isFinite(startMs) || startMs < 0 || !Number.isInteger(frame)) {
      throw new Error('Bomb beat starts must be finite, non-negative integer-frame times.');
    }
    if (frames.length > 0 && frame <= frames[frames.length - 1]!) {
      throw new Error('Bomb beat starts must be strictly increasing.');
    }
    frames.push(frame);
  }
  return frames;
}

function onsetWeight(index: number, profile: BombGrainProfile): number {
  const fadeStart = profile.grainFrames - profile.fadeFrames;
  if (index < fadeStart) return 1;
  const progress = (index - fadeStart) / (profile.fadeFrames - 1);
  return 0.5 * (1 + Math.cos(Math.PI * progress));
}

/**
 * Builds one deterministic mono event buffer. Distance zero owns the complete stem;
 * every later distinct distance adds only the stem onset with a terminal half-cosine fade.
 */
export function composeBombEventSamples(
  stem: BombStemData,
  options: ComposeBombEventOptions,
): Float32Array {
  assertStem(stem);
  const starts = beatStartFrames(options.beatStartsMs);
  const profile = options.reducedMotion ? BOMB_GRAIN_PROFILES.reduced : BOMB_GRAIN_PROFILES.full;
  const outputFrames = Math.max(
    starts[0]! + BOMB_STEM_FRAMES,
    starts.at(-1)! + profile.grainFrames,
  );
  const output = new Float32Array(outputFrames);
  output.set(stem.samples, starts[0]);

  for (const start of starts.slice(1)) {
    for (let index = 0; index < profile.grainFrames; index += 1) {
      output[start + index] += stem.samples[index]! * profile.gain * onsetWeight(index, profile);
    }
  }

  for (const sample of output) {
    if (!Number.isFinite(sample) || Math.abs(sample) > 1) {
      throw new Error('Bomb event mix exceeded its finite unclipped range.');
    }
  }
  return output;
}

export interface ScheduleBombEventOptions extends AcceptedVoiceHooks {
  readonly startAt?: number;
}

/** Schedules an already-composed mono event as exactly one AudioBufferSource voice. */
export function scheduleBombEventBuffer(
  context: AudioContext,
  destination: AudioNode,
  samples: Float32Array,
  options: ScheduleBombEventOptions = {},
): GestureVoice {
  if (context.sampleRate !== BOMB_STEM_SAMPLE_RATE || samples.length === 0) {
    throw new Error('Bomb event scheduling requires a non-empty 48 kHz buffer.');
  }
  const startAt = options.startAt ?? context.currentTime;
  const buffer = context.createBuffer(1, samples.length, BOMB_STEM_SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);
  let disconnected = false;
  const voice: GestureVoice = {
    source,
    gain: destination as GainNode,
    stop(at = 0): void { try { source.stop(at); } catch { /* The one-shot may already be done. */ } },
    disconnect(): void {
      if (disconnected) return;
      disconnected = true;
      source.disconnect();
    },
  };
  source.onended = () => {
    voice.disconnect();
    options.onVoiceEnd?.(voice);
  };
  options.onVoiceStart?.(voice);
  source.start(startAt);
  source.stop(startAt + samples.length / BOMB_STEM_SAMPLE_RATE);
  return voice;
}
