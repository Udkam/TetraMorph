import type { GestureVoice } from './audioGesture';
import type { AcceptedVoiceHooks } from './acceptedPlayback';

const SILENCE = 0.0001;

export interface RecoveredNoisePuffOptions extends AcceptedVoiceHooks {
  readonly startAt?: number;
  readonly duration: number;
  readonly gain: number;
  readonly cutoff: number;
  readonly q: number;
  readonly attack: number;
  readonly gainBoost: number;
  readonly gainCeiling: number;
}

/** Deterministic low-passed pressure texture for bounded material transients. */
export function scheduleRecoveredNoisePuff(
  context: AudioContext,
  destination: AudioNode,
  options: RecoveredNoisePuffOptions,
): GestureVoice {
  const start = options.startAt ?? context.currentTime;
  const end = start + options.duration;
  const frames = Math.max(1, Math.round(context.sampleRate * options.duration));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    const seeded = Math.sin((index + 1) * 12.9898) * 43_758.5453;
    samples[index] = (seeded - Math.floor(seeded)) * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const peak = Math.max(
    SILENCE,
    Math.min(options.gainCeiling, options.gain * options.gainBoost),
  );
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(options.cutoff, start);
  filter.Q.setValueAtTime(options.q, start);
  gain.gain.setValueAtTime(SILENCE, start);
  gain.gain.exponentialRampToValueAtTime(
    peak,
    start + Math.min(options.attack, options.duration * 0.22),
  );
  gain.gain.exponentialRampToValueAtTime(SILENCE, end);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  let disconnected = false;
  const voice: GestureVoice = {
    source,
    gain,
    stop(at = 0): void {
      try { source.stop(at); } catch { /* The bounded pressure voice may already be done. */ }
    },
    disconnect(): void {
      if (disconnected) return;
      disconnected = true;
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
  source.onended = () => {
    voice.disconnect();
    options.onVoiceEnd?.(voice);
  };
  options.onVoiceStart?.(voice);
  source.start(start);
  source.stop(end + 0.01);
  return voice;
}
