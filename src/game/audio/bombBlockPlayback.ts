import type { GestureVoice } from './audioGesture';
import type { AcceptedVoiceHooks } from './acceptedPlayback';

export const BOMB_BLOCK_SAMPLE_RATE = 48_000;

export const BOMB_BLOCK_PLAYBACK_CONTRACT = Object.freeze({
  normalImpactMs: 220,
  fullTailMs: 132,
  reducedTailMs: 90,
  rawPeakCeiling: 0.18,
  bodyStartHz: 174.61,
  bodyEndHz: 138.59,
  contactStartHz: 349.23,
  contactEndHz: 293.66,
} as const);

export interface ComposeBombBlockEventOptions {
  readonly beatStartsMs: readonly number[];
  readonly reducedMotion: boolean;
}

function frameStarts(beatStartsMs: readonly number[]): number[] {
  if (beatStartsMs.length === 0) throw new Error('Bomb block-break event requires one impact beat.');
  const starts: number[] = [];
  for (const beatMs of beatStartsMs) {
    const frame = beatMs * (BOMB_BLOCK_SAMPLE_RATE / 1_000);
    if (!Number.isFinite(beatMs) || beatMs < 0 || !Number.isInteger(frame)) {
      throw new Error('Bomb block-break beat must be a finite non-negative frame time.');
    }
    if (starts.length > 0 && frame <= starts[starts.length - 1]!) {
      throw new Error('Bomb block-break beats must be strictly increasing.');
    }
    starts.push(frame);
  }
  return starts;
}

function maximumOverlaps(starts: readonly number[], tailFrames: number): number {
  let maximum = 1;
  for (let index = 0; index < starts.length; index += 1) {
    const end = starts[index]! + tailFrames;
    let count = 0;
    for (const candidate of starts) {
      if (candidate >= starts[index]! && candidate < end) count += 1;
    }
    maximum = Math.max(maximum, count);
  }
  return maximum;
}

function logarithmicPhase(startHz: number, endHz: number, progress: number, durationSeconds: number): number {
  const ratio = endHz / startHz;
  if (Math.abs(ratio - 1) < 0.000_001) return startHz * progress * durationSeconds;
  return startHz * ((ratio ** progress) - 1) / Math.log(ratio) * durationSeconds;
}

/**
 * Creates a dry, game-like block break rather than reproducing an external explosive sample.
 * Each presentation beat is merged into one bounded mono event so a long chain never gains a
 * second sonic identity or unbounded voice count.
 */
export function composeBombBlockEventSamples(
  options: ComposeBombBlockEventOptions,
): Float32Array {
  const starts = frameStarts(options.beatStartsMs);
  const tailMs = options.reducedMotion
    ? BOMB_BLOCK_PLAYBACK_CONTRACT.reducedTailMs
    : BOMB_BLOCK_PLAYBACK_CONTRACT.fullTailMs;
  const tailFrames = tailMs * (BOMB_BLOCK_SAMPLE_RATE / 1_000);
  const contactFrames = Math.round(0.052 * BOMB_BLOCK_SAMPLE_RATE);
  const attackFrames = Math.round(0.006 * BOMB_BLOCK_SAMPLE_RATE);
  const contactAttackFrames = Math.round(0.004 * BOMB_BLOCK_SAMPLE_RATE);
  const output = new Float32Array(starts.at(-1)! + tailFrames);
  const overlapScale = 1 / maximumOverlaps(starts, tailFrames);
  const bodyPeak = 0.078 * overlapScale;
  const contactPeak = 0.024 * overlapScale;
  const tailSeconds = tailFrames / BOMB_BLOCK_SAMPLE_RATE;
  const contactSeconds = contactFrames / BOMB_BLOCK_SAMPLE_RATE;

  for (const start of starts) {
    for (let offset = 0; offset < tailFrames; offset += 1) {
      const progress = offset / Math.max(1, tailFrames - 1);
      const attack = Math.sin(Math.min(1, offset / attackFrames) * Math.PI * 0.5) ** 2;
      const bodyEnvelope = attack * ((1 - progress) ** 2.35);
      const bodyPhase = logarithmicPhase(
        BOMB_BLOCK_PLAYBACK_CONTRACT.bodyStartHz,
        BOMB_BLOCK_PLAYBACK_CONTRACT.bodyEndHz,
        progress,
        tailSeconds,
      );
      let sample = Math.sin(Math.PI * 2 * bodyPhase) * bodyPeak * bodyEnvelope;

      if (offset < contactFrames) {
        const contactProgress = offset / Math.max(1, contactFrames - 1);
        const contactAttack = Math.sin(Math.min(1, offset / contactAttackFrames) * Math.PI * 0.5) ** 2;
        const contactEnvelope = contactAttack * ((1 - contactProgress) ** 3.1);
        const contactPhase = logarithmicPhase(
          BOMB_BLOCK_PLAYBACK_CONTRACT.contactStartHz,
          BOMB_BLOCK_PLAYBACK_CONTRACT.contactEndHz,
          contactProgress,
          contactSeconds,
        );
        sample += Math.sin(Math.PI * 2 * contactPhase) * contactPeak * contactEnvelope;
      }
      output[start + offset]! += sample;
    }
  }

  for (const sample of output) {
    if (!Number.isFinite(sample) || Math.abs(sample) > BOMB_BLOCK_PLAYBACK_CONTRACT.rawPeakCeiling) {
      throw new Error('Bomb block-break mix exceeded its finite quiet range.');
    }
  }
  return output;
}

export interface ScheduleBombBlockEventOptions extends AcceptedVoiceHooks {
  readonly startAt?: number;
}

/** Schedules the complete normal or chain event as one cancellable mono BufferSource. */
export function scheduleBombBlockEventBuffer(
  context: AudioContext,
  destination: AudioNode,
  samples: Float32Array,
  options: ScheduleBombBlockEventOptions = {},
): GestureVoice {
  if (context.sampleRate !== BOMB_BLOCK_SAMPLE_RATE || samples.length === 0) {
    throw new Error('Bomb block-break scheduling requires a non-empty 48 kHz buffer.');
  }
  const startAt = options.startAt ?? context.currentTime;
  const buffer = context.createBuffer(1, samples.length, BOMB_BLOCK_SAMPLE_RATE);
  buffer.getChannelData(0).set(samples);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);
  let disconnected = false;
  const voice: GestureVoice = {
    source,
    gain: destination as GainNode,
    stop(at = 0): void { try { source.stop(at); } catch { /* The one-shot may already have ended. */ } },
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
  source.stop(startAt + samples.length / BOMB_BLOCK_SAMPLE_RATE);
  return voice;
}
