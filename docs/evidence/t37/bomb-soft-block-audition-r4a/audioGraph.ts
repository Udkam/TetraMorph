import {
  ACCEPTED_OUTPUT_GAIN,
  ACTION_A_CONTRACT,
  STUDIO_CLEAR_CONTRACT,
  STUDIO_COMPRESSOR_CONTRACT,
  scheduleAcceptedAction,
  scheduleStudioSample,
} from '../../../../src/game/audio/acceptedPlayback';
import type { GestureVoice } from '../../../../src/game/audio/audioGesture';
import { T37_AUDIO_ASSETS } from '../../../../src/game/audio/audioAssetCatalog';

export type CandidateId = 'X' | 'Y' | 'Z';

const SAMPLE_RATE = 48_000;
const IMPACT_SECONDS = 0.05;
const ANALYSIS_SECONDS = 0.18;
const CANDIDATE_URLS: Readonly<Record<CandidateId, string>> = Object.freeze({
  X: new URL('./assets/X.wav', import.meta.url).href,
  Y: new URL('./assets/Y.wav', import.meta.url).href,
  Z: new URL('./assets/Z.wav', import.meta.url).href,
});

interface AuditionGraph {
  output: GainNode;
  enabledGate: GainNode;
  mutationBus: GainNode;
  candidateEffects: GainNode;
  candidateMaster: GainNode;
  candidateCompressor: DynamicsCompressorNode;
  actionMaster: GainNode;
  actionCompressor: DynamicsCompressorNode;
  studioCompressor: DynamicsCompressorNode;
}

export interface SignalMetrics {
  peak: number;
  rms: number;
  maxRms10Ms: number;
  maxRms50Ms: number;
  energy: number;
  crestDb: number;
  peakTimeMs: number;
  attackMs: number;
  energyEnd95Ms: number;
  energyEnd99Ms: number;
  spectralCentroidHz: number;
  bandsPercent: {
    below70: number;
    from70To120: number;
    from250To1000: number;
    from1000To2000: number;
    from2000To4000: number;
    above4000: number;
  };
}

export interface MeasurementReport {
  candidates: Record<CandidateId, SignalMetrics & { energyVsHardDropDb: number }>;
  references: { hardDrop: SignalMetrics; studioOneLine: SignalMetrics };
  peakSpreadDb: number;
  graph: {
    mutationBus: number;
    candidateEffects: number;
    candidateMaster: number;
    compressor: typeof ACTION_A_CONTRACT.compressor;
    enabledGate: number;
    volume: number;
    output: number;
  };
}

function configureCompressor(node: DynamicsCompressorNode, contract: Readonly<{
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
}>): void {
  node.threshold.value = contract.threshold;
  node.knee.value = contract.knee;
  node.ratio.value = contract.ratio;
  node.attack.value = contract.attack;
  node.release.value = contract.release;
}

function buildGraph(context: BaseAudioContext): AuditionGraph {
  const output = context.createGain();
  const enabledGate = context.createGain();
  const mutationBus = context.createGain();
  const candidateEffects = context.createGain();
  const candidateMaster = context.createGain();
  const candidateCompressor = context.createDynamicsCompressor();
  const actionMaster = context.createGain();
  const actionCompressor = context.createDynamicsCompressor();
  const studioCompressor = context.createDynamicsCompressor();

  output.gain.value = ACCEPTED_OUTPUT_GAIN;
  enabledGate.gain.value = 1;
  mutationBus.gain.value = 0.96;
  candidateEffects.gain.value = 1;
  candidateMaster.gain.value = ACTION_A_CONTRACT.masterGain;
  actionMaster.gain.value = ACTION_A_CONTRACT.masterGain;
  configureCompressor(candidateCompressor, ACTION_A_CONTRACT.compressor);
  configureCompressor(actionCompressor, ACTION_A_CONTRACT.compressor);
  configureCompressor(studioCompressor, STUDIO_COMPRESSOR_CONTRACT);

  mutationBus.connect(candidateEffects);
  candidateEffects.connect(candidateMaster);
  candidateMaster.connect(candidateCompressor);
  candidateCompressor.connect(enabledGate);
  actionMaster.connect(actionCompressor);
  actionCompressor.connect(enabledGate);
  studioCompressor.connect(enabledGate);
  enabledGate.connect(output);
  output.connect(context.destination);

  return {
    output,
    enabledGate,
    mutationBus,
    candidateEffects,
    candidateMaster,
    candidateCompressor,
    actionMaster,
    actionCompressor,
    studioCompressor,
  };
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Audio fetch failed: ${response.status} ${url}`);
  return response.arrayBuffer();
}

function sliceSignal(buffer: AudioBuffer, startSeconds: number, durationSeconds: number): Float32Array {
  const start = Math.round(startSeconds * buffer.sampleRate);
  const length = Math.round(durationSeconds * buffer.sampleRate);
  const source = buffer.getChannelData(0);
  const result = new Float32Array(length);
  result.set(source.subarray(start, Math.min(source.length, start + length)));
  return result;
}

function maxWindowRms(samples: Float32Array, frames: number): number {
  let energy = 0;
  let maximum = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    energy += sample * sample;
    if (index >= frames) {
      const expired = samples[index - frames] ?? 0;
      energy -= expired * expired;
    }
    if (index >= frames - 1) maximum = Math.max(maximum, Math.sqrt(Math.max(0, energy) / frames));
  }
  return maximum;
}

function fftRealPower(samples: Float32Array): { power: Float64Array; size: number } {
  let size = 1;
  while (size < samples.length) size *= 2;
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  for (let index = 0; index < samples.length; index += 1) {
    const window = samples.length > 1
      ? 0.5 - 0.5 * Math.cos(2 * Math.PI * index / (samples.length - 1))
      : 1;
    real[index] = (samples[index] ?? 0) * window;
  }
  for (let index = 1, reverse = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; reverse & bit; bit >>= 1) reverse ^= bit;
    reverse ^= bit;
    if (index < reverse) {
      [real[index], real[reverse]] = [real[reverse] ?? 0, real[index] ?? 0];
      [imag[index], imag[reverse]] = [imag[reverse] ?? 0, imag[index] ?? 0];
    }
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = -2 * Math.PI / length;
    const stepReal = Math.cos(angle);
    const stepImag = Math.sin(angle);
    for (let offset = 0; offset < size; offset += length) {
      let wr = 1;
      let wi = 0;
      for (let index = 0; index < length / 2; index += 1) {
        const even = offset + index;
        const odd = even + length / 2;
        const oddReal = (real[odd] ?? 0) * wr - (imag[odd] ?? 0) * wi;
        const oddImag = (real[odd] ?? 0) * wi + (imag[odd] ?? 0) * wr;
        const evenReal = real[even] ?? 0;
        const evenImag = imag[even] ?? 0;
        real[even] = evenReal + oddReal;
        imag[even] = evenImag + oddImag;
        real[odd] = evenReal - oddReal;
        imag[odd] = evenImag - oddImag;
        const nextWr = wr * stepReal - wi * stepImag;
        wi = wr * stepImag + wi * stepReal;
        wr = nextWr;
      }
    }
  }
  const power = new Float64Array(size / 2 + 1);
  for (let index = 0; index < power.length; index += 1) {
    power[index] = (real[index] ?? 0) ** 2 + (imag[index] ?? 0) ** 2;
  }
  return { power, size };
}

function metrics(samples: Float32Array): SignalMetrics {
  let peak = 0;
  let peakIndex = 0;
  let energy = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index] ?? 0;
    const absolute = Math.abs(value);
    energy += value * value;
    if (absolute > peak) { peak = absolute; peakIndex = index; }
  }
  const threshold = peak * 0.1;
  let attackStart = 0;
  while (attackStart < peakIndex && Math.abs(samples[attackStart] ?? 0) < threshold) attackStart += 1;
  const cumulativeTargets = [energy * 0.95, energy * 0.99];
  const energyEnds = [0, 0];
  let cumulative = 0;
  let targetIndex = 0;
  for (let index = 0; index < samples.length && targetIndex < cumulativeTargets.length; index += 1) {
    const value = samples[index] ?? 0;
    cumulative += value * value;
    while (targetIndex < cumulativeTargets.length && cumulative >= (cumulativeTargets[targetIndex] ?? Infinity)) {
      energyEnds[targetIndex] = (index + 1) / SAMPLE_RATE * 1_000;
      targetIndex += 1;
    }
  }
  const { power, size } = fftRealPower(samples);
  let spectralTotal = 0;
  let weighted = 0;
  const bandEnergy = { below70: 0, from70To120: 0, from250To1000: 0, from1000To2000: 0, from2000To4000: 0, above4000: 0 };
  for (let index = 1; index < power.length; index += 1) {
    const frequency = index * SAMPLE_RATE / size;
    const value = power[index] ?? 0;
    spectralTotal += value;
    weighted += frequency * value;
    if (frequency < 70) bandEnergy.below70 += value;
    else if (frequency < 120) bandEnergy.from70To120 += value;
    if (frequency >= 250 && frequency < 1_000) bandEnergy.from250To1000 += value;
    else if (frequency >= 1_000 && frequency < 2_000) bandEnergy.from1000To2000 += value;
    else if (frequency >= 2_000 && frequency < 4_000) bandEnergy.from2000To4000 += value;
    else if (frequency >= 4_000) bandEnergy.above4000 += value;
  }
  const percentage = (value: number) => spectralTotal > 0 ? value / spectralTotal * 100 : 0;
  const rms = Math.sqrt(energy / samples.length);
  return {
    peak,
    rms,
    maxRms10Ms: maxWindowRms(samples, Math.round(SAMPLE_RATE * 0.01)),
    maxRms50Ms: maxWindowRms(samples, Math.round(SAMPLE_RATE * 0.05)),
    energy,
    crestDb: rms > 0 ? 20 * Math.log10(peak / rms) : 0,
    peakTimeMs: peakIndex / SAMPLE_RATE * 1_000,
    attackMs: (peakIndex - attackStart) / SAMPLE_RATE * 1_000,
    energyEnd95Ms: energyEnds[0] ?? 0,
    energyEnd99Ms: energyEnds[1] ?? 0,
    spectralCentroidHz: spectralTotal > 0 ? weighted / spectralTotal : 0,
    bandsPercent: {
      below70: percentage(bandEnergy.below70),
      from70To120: percentage(bandEnergy.from70To120),
      from250To1000: percentage(bandEnergy.from250To1000),
      from1000To2000: percentage(bandEnergy.from1000To2000),
      from2000To4000: percentage(bandEnergy.from2000To4000),
      above4000: percentage(bandEnergy.above4000),
    },
  };
}

async function renderOffline(kind: CandidateId | 'hard-drop' | 'studio'): Promise<SignalMetrics> {
  const context = new OfflineAudioContext(2, Math.round(SAMPLE_RATE * 0.32), SAMPLE_RATE);
  const graph = buildGraph(context);
  const startAt = kind === 'studio' ? 0 : IMPACT_SECONDS;
  if (kind === 'hard-drop') {
    scheduleAcceptedAction(context as unknown as AudioContext, graph.actionMaster, 'hard-drop', { startAt });
  } else if (kind === 'studio') {
    const source = await fetchArrayBuffer(T37_AUDIO_ASSETS.studioProgress.url);
    const buffer = await context.decodeAudioData(source.slice(0));
    scheduleStudioSample(context as unknown as AudioContext, graph.studioCompressor, buffer, {
      startAt,
      targetPeak: STUDIO_CLEAR_CONTRACT.targetPeak[1],
      rate: STUDIO_CLEAR_CONTRACT.rate,
      pan: 0,
      maxDuration: STUDIO_CLEAR_CONTRACT.maxDuration,
    });
  } else {
    const source = await fetchArrayBuffer(CANDIDATE_URLS[kind]);
    const buffer = await context.decodeAudioData(source.slice(0));
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(graph.mutationBus);
    node.start(startAt);
  }
  const rendered = await context.startRendering();
  return metrics(sliceSignal(rendered, startAt, ANALYSIS_SECONDS));
}

export async function measureCompleteGraphs(): Promise<MeasurementReport> {
  const [hardDrop, studioOneLine, X, Y, Z] = await Promise.all([
    renderOffline('hard-drop'), renderOffline('studio'), renderOffline('X'), renderOffline('Y'), renderOffline('Z'),
  ]);
  const enriched = { X, Y, Z } as Record<CandidateId, SignalMetrics & { energyVsHardDropDb: number }>;
  for (const id of Object.keys(enriched) as CandidateId[]) {
    enriched[id].energyVsHardDropDb = 10 * Math.log10(enriched[id].energy / hardDrop.energy);
  }
  const peaks = Object.values(enriched).map((entry) => entry.peak);
  return {
    candidates: enriched,
    references: { hardDrop, studioOneLine },
    peakSpreadDb: 20 * Math.log10(Math.max(...peaks) / Math.min(...peaks)),
    graph: {
      mutationBus: 0.96,
      candidateEffects: 1,
      candidateMaster: ACTION_A_CONTRACT.masterGain,
      compressor: ACTION_A_CONTRACT.compressor,
      enabledGate: 1,
      volume: 1,
      output: ACCEPTED_OUTPUT_GAIN,
    },
  };
}

export class R4AAudioSession {
  private context: AudioContext | null = null;
  private graph: AuditionGraph | null = null;
  private buffers: Partial<Record<CandidateId | 'studio', AudioBuffer>> = {};
  private readonly voices = new Set<GestureVoice>();
  private readonly candidateSources = new Set<AudioBufferSourceNode>();
  private closed = false;

  async prime(): Promise<void> {
    if (this.closed) throw new Error('Audio session is disposed.');
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.graph = buildGraph(this.context);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.buffers.X) {
      const [X, Y, Z, studio] = await Promise.all([
        fetchArrayBuffer(CANDIDATE_URLS.X), fetchArrayBuffer(CANDIDATE_URLS.Y),
        fetchArrayBuffer(CANDIDATE_URLS.Z), fetchArrayBuffer(T37_AUDIO_ASSETS.studioProgress.url),
      ]);
      const decode = (data: ArrayBuffer) => this.context!.decodeAudioData(data.slice(0));
      [this.buffers.X, this.buffers.Y, this.buffers.Z, this.buffers.studio] = await Promise.all([
        decode(X), decode(Y), decode(Z), decode(studio),
      ]);
    }
  }

  private hooks() {
    return {
      onVoiceStart: (voice: GestureVoice) => this.voices.add(voice),
      onVoiceEnd: (voice: GestureVoice) => this.voices.delete(voice),
    };
  }

  stopAll(): void {
    for (const source of this.candidateSources) {
      try { source.stop(); } catch { /* already ended */ }
      source.disconnect();
    }
    this.candidateSources.clear();
    for (const voice of this.voices) { voice.stop(); voice.disconnect(); }
    this.voices.clear();
  }

  async playCandidate(id: CandidateId, delayMs = 220): Promise<number> {
    await this.prime();
    this.stopAll();
    const buffer = this.buffers[id];
    if (!this.context || !this.graph || !buffer) throw new Error(`Candidate ${id} is unavailable.`);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.graph.mutationBus);
    source.onended = () => { source.disconnect(); this.candidateSources.delete(source); };
    this.candidateSources.add(source);
    const startAt = this.context.currentTime + delayMs / 1_000;
    source.start(startAt);
    return startAt;
  }

  async playHardDrop(): Promise<void> {
    await this.prime();
    this.stopAll();
    if (!this.context || !this.graph) return;
    scheduleAcceptedAction(this.context, this.graph.actionMaster, 'hard-drop', {
      startAt: this.context.currentTime + 0.05,
      ...this.hooks(),
    });
  }

  async playStudioOneLine(): Promise<void> {
    await this.prime();
    this.stopAll();
    const buffer = this.buffers.studio;
    if (!this.context || !this.graph || !buffer) return;
    scheduleStudioSample(this.context, this.graph.studioCompressor, buffer, {
      startAt: this.context.currentTime + 0.02,
      targetPeak: STUDIO_CLEAR_CONTRACT.targetPeak[1],
      rate: STUDIO_CLEAR_CONTRACT.rate,
      pan: 0,
      maxDuration: STUDIO_CLEAR_CONTRACT.maxDuration,
      ...this.hooks(),
    });
  }

  state() {
    return {
      primed: this.context !== null,
      contextState: this.context?.state ?? 'none',
      activeSources: this.candidateSources.size + this.voices.size,
      closed: this.closed,
    };
  }

  async dispose(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.stopAll();
    const context = this.context;
    this.context = null;
    this.graph = null;
    this.buffers = {};
    if (context && context.state !== 'closed') await context.close();
  }
}
