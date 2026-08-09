export type AudioBus = 'gameplay' | 'reward' | 'mutation' | 'ambient' | 'ui';

interface GestureLayerBase {
  delay?: number;
  duration: number;
  gain: number;
  attack?: number;
}

export type ProceduralInstrument =
  | 'felt' | 'impact' | 'ribbon' | 'glass' | 'shimmer' | 'pulse'
  | 'soft-contact' | 'wood' | 'ceramic' | 'stone' | 'crystal-grain' | 'air-brush';

export interface ProceduralLayer extends GestureLayerBase {
  kind: 'procedural';
  instrument: ProceduralInstrument;
  frequency: number;
  endFrequency?: number;
  brightness?: number;
  spread?: number;
  seed?: number;
  /** Fraction of the layer reserved for a smooth zero-ending release. */
  release?: number;
}

export interface ResonatorLayer extends GestureLayerBase {
  kind: 'resonator';
  frequency: number;
  endFrequency?: number;
  waveform?: OscillatorType;
}

export interface AirLayer extends GestureLayerBase {
  kind: 'air';
  filter: BiquadFilterType;
  startFrequency: number;
  endFrequency?: number;
  q?: number;
  seed?: number;
  /** A long attack turns a noise impulse into a pressure build. */
  release?: number;
}

export type GestureLayer = ResonatorLayer | AirLayer | ProceduralLayer;

export interface AudioGesture {
  bus: AudioBus;
  layers: readonly GestureLayer[];
  mutationOwned?: boolean;
}

export interface GestureVoice {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  stop(at?: number): void;
  disconnect(): void;
}

export interface ScheduleGestureOptions {
  startAt?: number;
  maxVoices?: number;
  onVoiceStart?: (voice: GestureVoice) => void;
  onVoiceEnd?: (voice: GestureVoice) => void;
}

// Web Audio cannot ramp exponentially to literal zero. Keep the floor far below
// audibility so a freshly primed filter cannot turn its first sample into a click.
const SILENCE = 0.000001;
const proceduralBufferCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deterministicNoise(target: Float32Array, seed: number): void {
  let state = (seed >>> 0) || 0x6d2b79f5;
  for (let index = 0; index < target.length; index += 1) {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    target[index] = (((value ^ (value >>> 14)) >>> 0) / 2147483648) - 1;
  }
}

function proceduralEnvelope(
  index: number,
  frameCount: number,
  sampleRate: number,
  attackSeconds: number,
  releaseFraction: number,
  decayPower: number,
): number {
  if (index <= 0 || index >= frameCount - 1) return 0;
  const progress = index / (frameCount - 1);
  const attackFrames = Math.max(1, Math.round(sampleRate * attackSeconds));
  const attack = Math.sin(Math.min(1, index / attackFrames) * Math.PI * 0.5) ** 2;
  const releaseStart = clamp(1 - releaseFraction, 0.08, 0.96);
  const releaseProgress = clamp((1 - progress) / Math.max(0.001, 1 - releaseStart), 0, 1);
  const release = Math.sin(releaseProgress * Math.PI * 0.5) ** 2;
  return attack * release * Math.max(0, 1 - progress) ** decayPower;
}

function sampleFrequency(layer: ProceduralLayer, progress: number): number {
  const start = Math.max(18, layer.frequency);
  const end = Math.max(18, layer.endFrequency ?? start);
  return start * ((end / start) ** progress);
}

/**
 * Render one deterministic, bounded, mono procedural instrument voice. The generated
 * buffer owns its complete onset/body/release contour, so playback needs only one
 * AudioBufferSource and cannot multiply Web Audio nodes with internal partial count.
 */
export function renderProceduralSamples(layer: ProceduralLayer, sampleRate: number): Float32Array {
  const safeRate = Math.max(1_000, Math.round(sampleRate));
  const frameCount = Math.max(2, Math.round(safeRate * layer.duration));
  const samples = new Float32Array(frameCount);
  const noise = new Float32Array(frameCount);
  deterministicNoise(noise, layer.seed ?? 0x544d3336);
  const brightness = clamp(layer.brightness ?? 0.5, 0, 1);
  const spread = clamp(layer.spread ?? 0.35, 0, 1);
  const release = clamp(layer.release ?? 0.24, 0.04, 0.8);
  const defaultAttack = layer.instrument === 'ribbon'
    || layer.instrument === 'shimmer'
    || layer.instrument === 'air-brush'
    ? 0.012
    : 0.003;
  const attack = clamp(layer.attack ?? defaultAttack, 0.001, Math.max(0.001, layer.duration * 0.45));
  let phase = 0;
  let filteredNoise = 0;
  let previousNoise = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / (frameCount - 1);
    const frequency = sampleFrequency(layer, progress);
    phase += (Math.PI * 2 * frequency) / safeRate;
    const rawNoise = noise[index] ?? 0;
    const noiseFollow = 0.015 + brightness * 0.11 + progress * spread * 0.08;
    filteredNoise += (rawNoise - filteredNoise) * noiseFollow;
    const highNoise = rawNoise - previousNoise * 0.82;
    previousNoise = rawNoise;

    let sample = 0;
    let envelope = 0;
    switch (layer.instrument) {
      case 'felt': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 2.8);
        const contact = filteredNoise * (0.42 + brightness * 0.28) * Math.max(0, 1 - progress * 5);
        const body = Math.sin(phase) * 0.52
          + Math.sin(phase * (2.07 + spread * 0.18) + 0.4) * 0.16
          + Math.sin(phase * 3.41 + 1.1) * 0.055 * brightness;
        sample = (body + contact) * envelope;
        break;
      }
      case 'impact': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 1.65);
        const body = Math.sin(phase) * 0.72 + Math.sin(phase * 1.58 + 0.3) * 0.18;
        const contact = filteredNoise * (0.36 + brightness * 0.24) * Math.max(0, 1 - progress * 9);
        sample = Math.tanh((body + contact) * (1.15 + spread * 0.45)) * envelope;
        break;
      }
      case 'ribbon': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 0.45);
        const motion = filteredNoise * (0.7 + brightness * 0.2) + highNoise * brightness * 0.12;
        const contour = Math.sin(phase * (0.31 + spread * 0.08)) * 0.12;
        sample = (motion + contour) * envelope;
        break;
      }
      case 'glass': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 1.05);
        const decay2 = Math.max(0, 1 - progress) ** (1.8 + brightness);
        const decay3 = Math.max(0, 1 - progress) ** (2.7 + brightness * 1.4);
        sample = (
          Math.sin(phase) * 0.52
          + Math.sin(phase * (2.37 + spread * 0.23) + 0.7) * 0.25 * decay2
          + Math.sin(phase * (4.13 + spread * 0.41) + 1.6) * 0.13 * decay3
          + filteredNoise * 0.045 * brightness * Math.max(0, 1 - progress * 4)
        ) * envelope;
        break;
      }
      case 'shimmer': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 0.72);
        const opening = Math.sin(Math.min(1, progress * 4) * Math.PI * 0.5) ** 2;
        const partialA = Math.sin(phase * (1.61 + spread * 0.19) + 0.2) * 0.34;
        const partialB = Math.sin(phase * (2.73 + spread * 0.31) + 1.4) * 0.22 * opening;
        const partialC = Math.sin(phase * (4.49 + spread * 0.37) + 2.1) * 0.11 * opening * brightness;
        sample = (partialA + partialB + partialC + filteredNoise * 0.035) * envelope;
        break;
      }
      case 'pulse': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 1.35);
        const body = Math.sin(phase) * 0.65 + Math.sin(phase * (1.91 + spread * 0.12) + 0.5) * 0.17;
        const breath = filteredNoise * 0.08 * brightness * Math.max(0, 1 - progress * 3);
        sample = (body + breath) * envelope;
        break;
      }
      case 'soft-contact': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 4.2);
        const touch = filteredNoise * (0.55 + brightness * 0.18)
          + highNoise * 0.08 * brightness;
        const mutedBody = Math.sin(phase * 0.71) * 0.085 * Math.max(0, 1 - progress * 7);
        sample = (touch + mutedBody) * envelope;
        break;
      }
      case 'wood': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 3.3);
        const contact = filteredNoise * (0.32 + brightness * 0.16)
          * Math.max(0, 1 - progress * 10);
        const body = Math.sin(phase) * 0.43
          + Math.sin(phase * (1.47 + spread * 0.09) + 0.37) * 0.19
          + Math.sin(phase * (2.13 + spread * 0.14) + 1.12) * 0.075;
        sample = (body + contact) * envelope;
        break;
      }
      case 'ceramic': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 2.15);
        const body = Math.sin(phase) * 0.38
          + Math.sin(phase * (2.31 + spread * 0.11) + 0.61)
            * 0.2 * Math.max(0, 1 - progress) ** 0.55
          + Math.sin(phase * (4.07 + spread * 0.19) + 1.73)
            * 0.075 * Math.max(0, 1 - progress) ** 1.4;
        const touch = filteredNoise * 0.12 * Math.max(0, 1 - progress * 12);
        sample = (body + touch) * envelope;
        break;
      }
      case 'stone': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 2.45);
        const body = Math.sin(phase) * 0.42
          + Math.sin(phase * (1.29 + spread * 0.07) + 0.28) * 0.21;
        const grit = (filteredNoise * 0.42 + highNoise * 0.055)
          * Math.max(0, 1 - progress * (4.5 + brightness * 3));
        sample = Math.tanh((body + grit) * (1.08 + spread * 0.34)) * envelope;
        break;
      }
      case 'crystal-grain': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 1.8);
        const decay = Math.max(0, 1 - progress);
        const body = Math.sin(phase) * 0.32
          + Math.sin(phase * (2.68 + spread * 0.16) + 0.82) * 0.18 * decay ** 0.7
          + Math.sin(phase * (5.19 + spread * 0.24) + 2.04) * 0.07 * decay ** 1.6;
        const grain = Math.sign(highNoise) * Math.max(0, Math.abs(highNoise) - 0.72)
          * 0.14 * brightness * decay ** 2;
        sample = (body + grain) * envelope;
        break;
      }
      case 'air-brush': {
        envelope = proceduralEnvelope(index, frameCount, safeRate, attack, release, 0.75);
        const body = filteredNoise * (0.66 + brightness * 0.12)
          + highNoise * 0.055 * brightness;
        sample = body * envelope;
        break;
      }
    }
    samples[index] = Number.isFinite(sample) ? clamp(sample, -1, 1) : 0;
  }

  samples[0] = 0;
  samples[frameCount - 1] = 0;
  return samples;
}

function proceduralBufferKey(layer: ProceduralLayer, sampleRate: number): string {
  return [
    sampleRate, layer.instrument, layer.duration, layer.frequency, layer.endFrequency,
    layer.brightness, layer.spread, layer.seed, layer.attack, layer.release,
  ].join(':');
}

function getProceduralBuffer(context: BaseAudioContext, layer: ProceduralLayer): AudioBuffer {
  let contextCache = proceduralBufferCache.get(context);
  if (!contextCache) {
    contextCache = new Map<string, AudioBuffer>();
    proceduralBufferCache.set(context, contextCache);
  }
  const key = proceduralBufferKey(layer, context.sampleRate);
  const cached = contextCache.get(key);
  if (cached) return cached;
  const samples = renderProceduralSamples(layer, context.sampleRate);
  const buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.getChannelData(0).set(samples);
  contextCache.set(key, buffer);
  return buffer;
}

function scheduleEnvelope(
  gain: AudioParam,
  start: number,
  duration: number,
  peak: number,
  attack = 0.004,
  release = 1,
): void {
  const end = start + duration;
  const attackEnd = Math.min(end - 0.003, start + Math.max(0.002, Math.min(attack, duration * 0.82)));
  const releaseStart = Math.min(
    end - 0.002,
    Math.max(attackEnd + 0.001, start + duration * Math.max(0.12, Math.min(0.96, release))),
  );
  gain.setValueAtTime(SILENCE, start);
  gain.exponentialRampToValueAtTime(Math.max(SILENCE, peak), attackEnd);
  if (releaseStart > attackEnd + 0.0005) {
    gain.exponentialRampToValueAtTime(Math.max(SILENCE, peak * 0.72), releaseStart);
  }
  gain.exponentialRampToValueAtTime(SILENCE, end);
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
      try { source.stop(at); } catch { /* The short voice may already have ended. */ }
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

function scheduleResonator(
  context: BaseAudioContext,
  destination: AudioNode,
  layer: ResonatorLayer,
  baseStart: number,
  onEnd?: (voice: GestureVoice) => void,
): GestureVoice {
  const start = baseStart + (layer.delay ?? 0);
  const end = start + layer.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.value = SILENCE;
  oscillator.type = layer.waveform ?? 'sine';
  oscillator.frequency.setValueAtTime(Math.max(1, layer.frequency), start);
  if (layer.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, layer.endFrequency), end);
  }
  scheduleEnvelope(gain.gain, start, layer.duration, layer.gain, layer.attack, 0.18);
  oscillator.connect(gain);
  gain.connect(destination);
  const voice = makeVoice(oscillator, gain, [gain], onEnd);
  oscillator.start(start);
  oscillator.stop(end + 0.008);
  return voice;
}

function scheduleAir(
  context: BaseAudioContext,
  destination: AudioNode,
  layer: AirLayer,
  baseStart: number,
  onEnd?: (voice: GestureVoice) => void,
): GestureVoice {
  const start = baseStart + (layer.delay ?? 0);
  const end = start + layer.duration;
  const frameCount = Math.max(1, Math.round(context.sampleRate * layer.duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  deterministicNoise(buffer.getChannelData(0), layer.seed ?? 0x74657472);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  gain.gain.value = SILENCE;
  source.buffer = buffer;
  filter.type = layer.filter;
  filter.frequency.setValueAtTime(Math.max(1, layer.startFrequency), start);
  if (layer.endFrequency) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, layer.endFrequency), end);
  }
  filter.Q.setValueAtTime(layer.q ?? 0.78, start);
  scheduleEnvelope(gain.gain, start, layer.duration, layer.gain, layer.attack, layer.release ?? 0.3);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  const voice = makeVoice(source, gain, [filter, gain], onEnd);
  source.start(start);
  source.stop(end + 0.008);
  return voice;
}

function scheduleProcedural(
  context: BaseAudioContext,
  destination: AudioNode,
  layer: ProceduralLayer,
  baseStart: number,
  onEnd?: (voice: GestureVoice) => void,
): GestureVoice {
  const start = baseStart + (layer.delay ?? 0);
  const end = start + layer.duration;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = getProceduralBuffer(context, layer);
  gain.gain.value = SILENCE;
  gain.gain.setValueAtTime(Math.max(SILENCE, layer.gain), start);
  gain.gain.setValueAtTime(SILENCE, end + 0.002);
  source.connect(gain);
  gain.connect(destination);
  const voice = makeVoice(source, gain, [gain], onEnd);
  source.start(start);
  source.stop(end + 0.004);
  return voice;
}

export function scheduleGesture(
  context: BaseAudioContext,
  destination: AudioNode,
  gesture: AudioGesture,
  options: ScheduleGestureOptions = {},
): GestureVoice[] {
  const startAt = options.startAt ?? context.currentTime;
  const maxVoices = Math.max(0, options.maxVoices ?? gesture.layers.length);
  const voices: GestureVoice[] = [];
  for (const layer of gesture.layers.slice(0, maxVoices)) {
    const voice = layer.kind === 'resonator'
      ? scheduleResonator(context, destination, layer, startAt, options.onVoiceEnd)
      : layer.kind === 'air'
        ? scheduleAir(context, destination, layer, startAt, options.onVoiceEnd)
        : scheduleProcedural(context, destination, layer, startAt, options.onVoiceEnd);
    voices.push(voice);
    options.onVoiceStart?.(voice);
  }
  return voices;
}

export function gestureDuration(gesture: AudioGesture): number {
  return gesture.layers.reduce((longest, layer) => (
    Math.max(longest, (layer.delay ?? 0) + layer.duration)
  ), 0);
}
