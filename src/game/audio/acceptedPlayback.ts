import type { GestureVoice } from './audioGesture';

const ACCEPTED_SILENCE = 0.0001;

export const ACCEPTED_OUTPUT_GAIN = 0.78;

export type AcceptedActionCueId = 'move' | 'rotate' | 'lock' | 'hard-drop';

export interface AcceptedActionTone {
  readonly frequency: number;
  readonly duration: number;
  readonly gain: number;
  readonly attack: number;
  readonly delay?: number;
  readonly waveform: OscillatorType;
}

export const ACTION_A_CONTRACT = Object.freeze({
  sourceCommit: '35509a7',
  sourceBlob: 'c43a68701fc1a7d39e31094422617214b359a001',
  masterGain: 1.85,
  voiceGainBoost: 1.45,
  voiceGainCeiling: 0.5,
  compressor: Object.freeze({
    threshold: -4,
    knee: 6,
    ratio: 3,
    attack: 0.003,
    release: 0.12,
  }),
  recipes: Object.freeze<Record<AcceptedActionCueId, readonly AcceptedActionTone[]>>({
    move: Object.freeze([
      Object.freeze({ frequency: 220, duration: 0.044, gain: 0.062, attack: 0.006, waveform: 'sine' }),
    ]),
    rotate: Object.freeze([
      Object.freeze({ frequency: 293.66, duration: 0.065, gain: 0.09, attack: 0.006, waveform: 'sine' }),
      Object.freeze({ frequency: 440, duration: 0.038, gain: 0.024, delay: 0.004, attack: 0.004, waveform: 'sine' }),
    ]),
    lock: Object.freeze([
      Object.freeze({ frequency: 246.94, duration: 0.048, gain: 0.06, attack: 0.007, waveform: 'sine' }),
    ]),
    'hard-drop': Object.freeze([
      Object.freeze({ frequency: 174.61, duration: 0.072, gain: 0.1, attack: 0.006, waveform: 'sine' }),
      Object.freeze({ frequency: 349.23, duration: 0.038, gain: 0.03, delay: 0.004, attack: 0.004, waveform: 'sine' }),
    ]),
  }),
});

export const STUDIO_COMPRESSOR_CONTRACT = Object.freeze({
  threshold: -10,
  knee: 10,
  ratio: 4,
  attack: 0.003,
  release: 0.12,
});

export const STUDIO_CLEAR_CONTRACT = Object.freeze({
  rate: 1.18,
  maxDuration: 0.2,
  delaysMs: Object.freeze({
    1: Object.freeze([0]),
    2: Object.freeze([0, 180]),
    3: Object.freeze([0, 90, 180]),
    4: Object.freeze([0, 60, 120, 180]),
  }),
  targetPeak: Object.freeze({ 1: 0.5, 2: 0.5, 3: 0.54, 4: 0.54 }),
});

export const STUDIO_COUNTDOWN_CONTRACT = Object.freeze({
  steps: Object.freeze({
    3: Object.freeze({ targetPeak: 0.56, rate: 1.04 }),
    2: Object.freeze({ targetPeak: 0.595, rate: 1.08 }),
    1: Object.freeze({ targetPeak: 0.63, rate: 1.12 }),
  }),
  stepMaxDuration: 0.22,
  resolve: Object.freeze({ targetPeak: 0.72, rate: 1.08, maxDuration: 0.42 }),
});

export interface AcceptedVoiceHooks {
  readonly onVoiceStart?: (voice: GestureVoice) => void;
  readonly onVoiceEnd?: (voice: GestureVoice) => void;
}

function makeVoice(
  source: AudioScheduledSourceNode,
  gain: GainNode,
  nodes: readonly AudioNode[],
  onEnd?: (voice: GestureVoice) => void,
): GestureVoice {
  let disconnected = false;
  const voice: GestureVoice = {
    source,
    gain,
    stop(at = 0): void {
      try { source.stop(at); } catch { /* A short accepted voice may already have ended. */ }
    },
    disconnect(): void {
      if (disconnected) return;
      disconnected = true;
      source.disconnect();
      for (const node of nodes) node.disconnect();
    },
  };
  source.onended = () => {
    voice.disconnect();
    onEnd?.(voice);
  };
  return voice;
}

export function scheduleAcceptedAction(
  context: AudioContext,
  destination: AudioNode,
  cue: AcceptedActionCueId,
  options: AcceptedVoiceHooks & {
    readonly startAt?: number;
    readonly pan?: number;
    readonly maxVoices?: number;
  } = {},
): GestureVoice[] {
  const startAt = options.startAt ?? context.currentTime;
  const pan = options.pan ?? 0;
  const maxVoices = Math.max(0, options.maxVoices ?? ACTION_A_CONTRACT.recipes[cue].length);
  const voices: GestureVoice[] = [];
  for (const tone of ACTION_A_CONTRACT.recipes[cue].slice(0, maxVoices)) {
    const start = startAt + (tone.delay ?? 0);
    const end = start + tone.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = pan !== 0 && typeof context.createStereoPanner === 'function'
      ? context.createStereoPanner()
      : null;
    const peak = Math.max(
      ACCEPTED_SILENCE,
      Math.min(ACTION_A_CONTRACT.voiceGainCeiling, tone.gain * ACTION_A_CONTRACT.voiceGainBoost),
    );
    oscillator.type = tone.waveform;
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    gain.gain.setValueAtTime(ACCEPTED_SILENCE, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(tone.attack, tone.duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(ACCEPTED_SILENCE, end);
    oscillator.connect(gain);
    const nodes: AudioNode[] = [gain];
    if (panner) {
      panner.pan.setValueAtTime(pan, start);
      gain.connect(panner);
      panner.connect(destination);
      nodes.push(panner);
    } else {
      gain.connect(destination);
    }
    const voice = makeVoice(oscillator, gain, nodes, options.onVoiceEnd);
    voices.push(voice);
    options.onVoiceStart?.(voice);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }
  return voices;
}

export function measureAudioBufferPeak(buffer: AudioBuffer): number {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index] ?? 0));
    }
  }
  return peak;
}

export function scheduleStudioSample(
  context: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  options: AcceptedVoiceHooks & {
    readonly startAt?: number;
    readonly targetPeak: number;
    readonly rate: number;
    readonly pan: number;
    readonly maxDuration: number;
  },
): GestureVoice {
  const source = context.createBufferSource();
  const panner = context.createStereoPanner();
  const gain = context.createGain();
  const start = options.startAt ?? context.currentTime;
  const rate = Math.max(0.01, options.rate);
  const duration = Math.min(buffer.duration / rate, Math.max(0.001, options.maxDuration));
  const end = start + duration;
  const fade = Math.min(0.024, duration * 0.18);
  const sourcePeak = measureAudioBufferPeak(buffer);
  const normalizedGain = sourcePeak > 0 ? Math.min(2.4, options.targetPeak / sourcePeak) : 1;
  source.buffer = buffer;
  source.playbackRate.value = rate;
  panner.pan.value = options.pan;
  gain.gain.setValueAtTime(ACCEPTED_SILENCE, start);
  gain.gain.linearRampToValueAtTime(normalizedGain, start + Math.min(0.004, duration * 0.1));
  gain.gain.setValueAtTime(normalizedGain, Math.max(start, end - fade));
  gain.gain.linearRampToValueAtTime(ACCEPTED_SILENCE, end);
  source.connect(panner);
  panner.connect(gain);
  gain.connect(destination);
  const voice = makeVoice(source, gain, [panner, gain], options.onVoiceEnd);
  options.onVoiceStart?.(voice);
  source.start(start);
  source.stop(end + 0.006);
  return voice;
}

export function scheduleIceSample(
  context: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  options: AcceptedVoiceHooks & {
    readonly startAt?: number;
    readonly offset: number;
    readonly duration: number;
    readonly gain: number;
    readonly attack: number;
    readonly release: number;
  },
): GestureVoice {
  const source = context.createBufferSource();
  const gain = context.createGain();
  const start = options.startAt ?? context.currentTime;
  const duration = Math.max(0.001, Math.min(options.duration, buffer.duration - options.offset));
  const end = start + duration;
  source.buffer = buffer;
  gain.gain.setValueAtTime(ACCEPTED_SILENCE, start);
  gain.gain.exponentialRampToValueAtTime(options.gain, start + options.attack);
  gain.gain.setValueAtTime(options.gain, Math.max(start + options.attack + 0.001, end - options.release));
  gain.gain.exponentialRampToValueAtTime(ACCEPTED_SILENCE, end);
  source.connect(gain);
  gain.connect(destination);
  const voice = makeVoice(source, gain, [gain], options.onVoiceEnd);
  options.onVoiceStart?.(voice);
  source.start(start, options.offset, duration);
  source.stop(end + 0.01);
  return voice;
}

export async function fetchAcceptedAudioAsset(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Unable to load accepted audio asset (${response.status}).`);
  return response.arrayBuffer();
}

