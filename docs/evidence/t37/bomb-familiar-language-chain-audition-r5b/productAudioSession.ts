import type { GameEvent } from '../../../../src/game/core';
import { mutationChainPresentationPlan } from '../../../../src/animation/mutationChainTimeline';
import { createBrowserPlatform } from '../../../../src/platform/browserPlatform';
import { AudioEngine, type BombStemVariant } from '../../../../src/game/audio/AudioEngine';
import { T37_AUDIO_ASSETS, type T37AudioAssetId } from '../../../../src/game/audio/audioAssetCatalog';
import { BOMB_GRAIN_PROFILES, BOMB_STEM_FRAMES, BOMB_STEM_SAMPLE_RATE } from '../../../../src/game/audio/bombStemPlayback';
import { fetchAcceptedAudioAsset } from '../../../../src/game/audio/acceptedPlayback';
import { NORMAL_IMPACT_MS, type Scene, type Variant } from './fixture';

type SourceAudit = { id: number; started: boolean; startAt: number | null; stopCalls: number; disconnected: boolean; connections: number };
type BufferAudit = { id: number; channels: number; frames: number; sampleRate: number; buffer: AudioBuffer };
type ContextAudit = { id: number; ownerId: number; context: AudioContext; closed: boolean; closePromise: Promise<void> | null; buffers: BufferAudit[]; sources: SourceAudit[] };
type StemAssetId = 'bombFamiliarA' | 'bombFamiliarB' | 'bombFamiliarC';
type EngineSelection = { engine: AudioEngine; ownerId: number; variant: Variant };
type AssetAudit = { ownerId: number; assetId: T37AudioAssetId; url: string; expectedUrl: string; expectedSha256: string; observedSha256: string; expectedBytes: number | null; observedBytes: number; sameOrigin: boolean; exactHash: boolean; bytes: Uint8Array };
type WavProof = { encoding: number; channels: number; sampleRate: number; bitsPerSample: number; frames: number; dataBytes: number; samples: Float32Array; pcm16Sha256: string; sampleCheckpoints: Array<{ frame: number; pcm16: number; float: number }> };

export type EventAudit = {
  scene: Scene;
  variant: Variant;
  reducedMotion: boolean;
  beatStartsMs: number[];
  contextId: number;
  engineOwnerId: number;
  bufferId: number;
  sourceId: number;
  selectedAssetId: StemAssetId;
  selectedAssetSha256: string;
  selectedAssetBytes: number;
  pcm16Sha256: string;
  pcm16Checkpoints: WavProof['sampleCheckpoints'];
  expectedFrames: number;
  residualMaxAbs: number;
  exactWithinTolerance: boolean;
  expectedFloat32Sha256: string;
  observedFloat32Sha256: string;
  beatProof: Array<{ index: number; startMs: number; startFrame: number; kind: 'full-stem' | 'onset-grain'; grainFrames: number; fadeFrames: number; gain: number; terminalWeight: number }>;
};

const STEM_ASSET: Readonly<Record<Variant, StemAssetId>> = Object.freeze({ A: 'bombFamiliarA', B: 'bombFamiliarB', C: 'bombFamiliarC' });
const EXPECTED_WAV_BYTES = 17_324;
const TOLERANCE = 1e-7;
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function sha256(bytes: BufferSource): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((value) => value.toString(16).padStart(2, '0')).join('');
}
function readTag(view: DataView, offset: number): string { return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)); }
async function decodePcm16Wav(bytes: Uint8Array): Promise<WavProof> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  ok(bytes.byteLength >= 44 && readTag(view, 0) === 'RIFF' && readTag(view, 8) === 'WAVE', 'Selected stem is not a RIFF/WAVE file.');
  let cursor = 12;
  let encoding = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataBytes = 0;
  while (cursor + 8 <= bytes.byteLength) {
    const tag = readTag(view, cursor);
    const size = view.getUint32(cursor + 4, true);
    const body = cursor + 8;
    ok(body + size <= bytes.byteLength, `Invalid ${tag} WAV chunk size.`);
    if (tag === 'fmt ') {
      encoding = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (tag === 'data') {
      dataOffset = body;
      dataBytes = size;
      break;
    }
    cursor = body + size + (size % 2);
  }
  ok(encoding === 1 && channels === 1 && sampleRate === BOMB_STEM_SAMPLE_RATE && bitsPerSample === 16 && dataOffset >= 0, 'Selected stem PCM16 contract drifted.');
  ok(dataBytes === BOMB_STEM_FRAMES * 2, 'Selected stem frame count drifted.');
  const samples = new Float32Array(BOMB_STEM_FRAMES);
  for (let frame = 0; frame < samples.length; frame += 1) samples[frame] = view.getInt16(dataOffset + frame * 2, true) / 32_768;
  const checkpointFrames = [0, 1, 47, 511, 2_047, 4_319, 8_638, 8_639];
  const sampleCheckpoints = checkpointFrames.map((frame) => ({ frame, pcm16: view.getInt16(dataOffset + frame * 2, true), float: samples[frame]! }));
  return { encoding, channels, sampleRate, bitsPerSample, frames: samples.length, dataBytes, samples, pcm16Sha256: await sha256(bytes.slice(dataOffset, dataOffset + dataBytes)), sampleCheckpoints };
}
function eventBeats(event: GameEvent, reducedMotion: boolean): number[] {
  ok(event.type === 'mutation-activated' && event.item === 'bomb', 'Audition audio requires a real Bomb mutation event.');
  return event.bombOutcome === 'chain-clear' ? [...mutationChainPresentationPlan(event.chainTriggerRows, reducedMotion).beatStartsMs] : [NORMAL_IMPACT_MS];
}
function expectedEvent(stem: Float32Array, beats: readonly number[], reducedMotion: boolean) {
  ok(beats.length > 0, 'Bomb event requires at least one beat.');
  const starts = beats.map((startMs) => {
    const frame = startMs * (BOMB_STEM_SAMPLE_RATE / 1_000);
    ok(Number.isInteger(frame) && frame >= 0, 'Bomb beat is not on an integer PCM frame.');
    return frame;
  });
  const profile = reducedMotion ? BOMB_GRAIN_PROFILES.reduced : BOMB_GRAIN_PROFILES.full;
  const output = new Float32Array(Math.max(starts[0]! + BOMB_STEM_FRAMES, starts.at(-1)! + profile.grainFrames));
  output.set(stem, starts[0]);
  const beatProof: EventAudit['beatProof'] = [{ index: 0, startMs: beats[0]!, startFrame: starts[0]!, kind: 'full-stem', grainFrames: BOMB_STEM_FRAMES, fadeFrames: 0, gain: 1, terminalWeight: 1 }];
  for (let beat = 1; beat < starts.length; beat += 1) {
    const start = starts[beat]!;
    for (let index = 0; index < profile.grainFrames; index += 1) {
      const fadeStart = profile.grainFrames - profile.fadeFrames;
      const weight = index < fadeStart ? 1 : 0.5 * (1 + Math.cos(Math.PI * ((index - fadeStart) / (profile.fadeFrames - 1))));
      output[start + index] += stem[index]! * profile.gain * weight;
    }
    beatProof.push({ index: beat, startMs: beats[beat]!, startFrame: start, kind: 'onset-grain', grainFrames: profile.grainFrames, fadeFrames: profile.fadeFrames, gain: profile.gain, terminalWeight: 0 });
  }
  return { samples: output, beatProof };
}
function signalProof(samples: Float32Array, expected: Float32Array) {
  let finite = true;
  let maxAbs = 0;
  let residualMaxAbs = samples.length === expected.length ? 0 : Infinity;
  let firstNonZeroFrame = -1;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index]!;
    if (!Number.isFinite(value)) finite = false;
    const absolute = Math.abs(value);
    maxAbs = Math.max(maxAbs, absolute);
    if (firstNonZeroFrame < 0 && absolute > 0) firstNonZeroFrame = index;
    if (index < expected.length) residualMaxAbs = Math.max(residualMaxAbs, Math.abs(value - expected[index]!));
  }
  return { finite, maxAbs, firstNonZeroFrame, residualMaxAbs, exactWithinTolerance: residualMaxAbs <= TOLERANCE };
}

export class ProductAudioSession {
  private engine: AudioEngine | null = null;
  private variant: Variant | null = null;
  private enabled = true;
  private disposed = false;
  private generation = 0;
  private nextEngineOwnerId = 0;
  private activeEngineOwnerId = 0;
  private transitionTail: Promise<void> = Promise.resolve();
  private pendingTransitions = 0;
  private completedTransitions = 0;
  private maxLiveContextsObserved = 0;
  private staleAssetCallbacksDropped = 0;
  private contexts: ContextAudit[] = [];
  private events: EventAudit[] = [];
  private assets: AssetAudit[] = [];
  constructor(private changed: () => void = () => {}) {}

  private current(generation: number): boolean { return generation === this.generation && !this.disposed && this.enabled; }
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    this.pendingTransitions += 1;
    const result = this.transitionTail.then(operation, operation);
    this.transitionTail = result.then(() => undefined, () => undefined);
    return result.finally(() => {
      this.pendingTransitions -= 1;
      this.completedTransitions += 1;
      if (!this.disposed) this.changed();
    });
  }
  private liveContextCount(): number { return this.contexts.filter((context) => !context.closed).length; }
  private makeContext(ownerId: number) {
    ok(ownerId === this.activeEngineOwnerId && !this.disposed, 'Stale AudioEngine attempted to create a context.');
    const context = new AudioContext({ sampleRate: BOMB_STEM_SAMPLE_RATE });
    const audit: ContextAudit = { id: this.contexts.length + 1, ownerId, context, closed: false, closePromise: null, buffers: [], sources: [] };
    this.contexts.push(audit);
    const liveContexts = this.liveContextCount();
    this.maxLiveContextsObserved = Math.max(this.maxLiveContextsObserved, liveContexts);
    ok(liveContexts <= 1, 'Audio variant transition admitted overlapping live contexts.');
    const makeBuffer = context.createBuffer.bind(context);
    const makeSource = context.createBufferSource.bind(context);
    const close = context.close.bind(context);
    context.createBuffer = ((channels: number, frames: number, rate: number) => {
      const buffer = makeBuffer(channels, frames, rate);
      audit.buffers.push({ id: audit.buffers.length + 1, channels, frames, sampleRate: rate, buffer });
      return buffer;
    }) as typeof context.createBuffer;
    context.createBufferSource = (() => {
      const source = makeSource();
      const record: SourceAudit = { id: audit.sources.length + 1, started: false, startAt: null, stopCalls: 0, disconnected: false, connections: 0 };
      audit.sources.push(record);
      const start = source.start.bind(source);
      const stop = source.stop.bind(source);
      const connect = source.connect.bind(source);
      const disconnect = source.disconnect.bind(source);
      source.start = ((when = 0, offset?: number, duration?: number) => {
        record.started = true;
        record.startAt = when;
        if (duration !== undefined) return start(when, offset ?? 0, duration);
        if (offset !== undefined) return start(when, offset);
        return start(when);
      }) as typeof source.start;
      source.stop = ((when = 0) => { record.stopCalls += 1; return stop(when); }) as typeof source.stop;
      source.connect = ((target: AudioNode) => { record.connections += 1; return connect(target); }) as typeof source.connect;
      source.disconnect = (() => { record.disconnected = true; return disconnect(); }) as typeof source.disconnect;
      return source;
    }) as typeof context.createBufferSource;
    context.close = (() => {
      const pending = close().then(() => {
        audit.closed = true;
        if (!this.disposed && ownerId === this.activeEngineOwnerId) this.changed();
      });
      audit.closePromise = pending;
      return pending;
    }) as typeof context.close;
    this.changed();
    return context;
  }

  private async loadAsset(url: string, ownerId: number): Promise<ArrayBuffer> {
    const assetEntry = (Object.entries(T37_AUDIO_ASSETS) as Array<[T37AudioAssetId, (typeof T37_AUDIO_ASSETS)[T37AudioAssetId]]>).find(([, asset]) => asset.url === url);
    ok(assetEntry, `AudioEngine requested an unknown asset URL: ${url}`);
    const [assetId, asset] = assetEntry;
    const raw = await fetchAcceptedAudioAsset(url);
    const bytes = new Uint8Array(raw.slice(0));
    const observedSha256 = await sha256(bytes);
    const isBombStem = assetId.startsWith('bombFamiliar');
    const expectedBytes = isBombStem ? EXPECTED_WAV_BYTES : null;
    const resolved = new URL(url, location.href);
    const audit: AssetAudit = { ownerId, assetId, url: resolved.href, expectedUrl: new URL(asset.url, location.href).href, expectedSha256: asset.sha256, observedSha256, expectedBytes, observedBytes: bytes.byteLength, sameOrigin: resolved.origin === location.origin, exactHash: observedSha256 === asset.sha256, bytes };
    ok(audit.url === audit.expectedUrl && audit.exactHash && (!isBombStem || (audit.sameOrigin && expectedBytes === bytes.byteLength)), `Fetched ${assetId} failed URL/origin/byte/hash audit.`);
    if (!this.disposed && ownerId === this.activeEngineOwnerId) {
      this.assets.push(audit);
      this.changed();
    } else {
      this.staleAssetCallbacksDropped += 1;
    }
    return raw;
  }

  private async select(variant: Variant, generation: number): Promise<EngineSelection | null> {
    return this.exclusive(async () => {
      if (!this.current(generation)) return null;
      if (this.engine && this.variant === variant) return { engine: this.engine, ownerId: this.activeEngineOwnerId, variant };
      const previous = this.engine;
      this.engine = null;
      this.variant = null;
      this.activeEngineOwnerId = 0;
      previous?.destroy();
      await Promise.all(this.contexts.map((context) => context.closePromise).filter((promise): promise is Promise<void> => !!promise));
      ok(this.liveContextCount() === 0, 'Previous variant context did not close before replacement.');
      if (!this.current(generation)) return null;
      const ownerId = ++this.nextEngineOwnerId;
      this.activeEngineOwnerId = ownerId;
      const platform = createBrowserPlatform({ window, document, audioContextFactory: () => this.makeContext(ownerId) });
      const engine = new AudioEngine(platform, (url) => this.loadAsset(url, ownerId), { forceBombStemVariantForTest: variant as BombStemVariant });
      this.engine = engine;
      this.variant = variant;
      engine.setEnabled(true);
      engine.setVolume(1);
      return { engine, ownerId, variant };
    });
  }

  private async prepare(variant: Variant, generation: number): Promise<EngineSelection | null> {
    const selected = await this.select(variant, generation);
    if (!selected || !this.current(generation) || this.engine !== selected.engine) return null;
    await selected.engine.prime();
    return this.current(generation) && this.engine === selected.engine && this.activeEngineOwnerId === selected.ownerId && this.variant === variant ? selected : null;
  }
  async prime(variant: Variant): Promise<boolean> {
    const generation = ++this.generation;
    const selected = await this.prepare(variant, generation);
    if (selected) this.changed();
    return !!selected;
  }
  async play(scene: Scene, variant: Variant, reducedMotion: boolean, event: GameEvent, beforeDispatch: () => void = () => {}): Promise<{ started: boolean; generation: number }> {
    const generation = ++this.generation;
    const selected = await this.prepare(variant, generation);
    if (!selected || !this.current(generation) || this.engine !== selected.engine) return { started: false, generation };
    const engine = selected.engine;
    const engineOwnerId = selected.ownerId;
    const context = [...this.contexts].reverse().find((entry) => entry.ownerId === engineOwnerId);
    ok(context, 'Active AudioEngine has no audited context.');
    const bufferCount = context.buffers.length;
    const sourceCount = context.sources.length;
    engine.play([{ type: 'restarted' }]);
    if (!this.current(generation) || this.engine !== engine) return { started: false, generation };
    engine.setReducedMotion(reducedMotion);
    beforeDispatch();
    if (!this.current(generation) || this.engine !== engine) return { started: false, generation };
    engine.play([event]);
    ok(context.buffers.length === bufferCount + 1 && context.sources.length === sourceCount + 1, 'Bomb event did not create exactly one buffer/source.');
    const buffer = context.buffers.at(-1)!;
    const source = context.sources.at(-1)!;
    const assetId = STEM_ASSET[variant];
    const asset = [...this.assets].reverse().find((entry) => entry.ownerId === engineOwnerId && entry.assetId === assetId);
    ok(asset, `Selected ${variant} stem was not fetched and audited.`);
    const wav = await decodePcm16Wav(asset.bytes);
    if (!this.current(generation) || this.engine !== engine) return { started: false, generation };
    const beats = eventBeats(event, reducedMotion);
    const expected = expectedEvent(wav.samples, beats, reducedMotion);
    const observed = buffer.buffer.getChannelData(0);
    const residual = signalProof(observed, expected.samples);
    const [expectedFloat32Sha256, observedFloat32Sha256] = await Promise.all([sha256(expected.samples), sha256(observed)]);
    if (!this.current(generation) || this.engine !== engine) return { started: false, generation };
    this.events.push({ scene, variant, reducedMotion, beatStartsMs: beats, contextId: context.id, engineOwnerId, bufferId: buffer.id, sourceId: source.id, selectedAssetId: assetId, selectedAssetSha256: asset.observedSha256, selectedAssetBytes: asset.observedBytes, pcm16Sha256: wav.pcm16Sha256, pcm16Checkpoints: wav.sampleCheckpoints, expectedFrames: expected.samples.length, residualMaxAbs: residual.residualMaxAbs, exactWithinTolerance: residual.exactWithinTolerance, expectedFloat32Sha256, observedFloat32Sha256, beatProof: expected.beatProof });
    this.changed();
    return { started: true, generation };
  }

  stopReusable(_reason = 'stop') {
    ++this.generation;
    this.engine?.play([{ type: 'restarted' }]);
    this.changed();
  }
  disable() {
    ++this.generation;
    this.enabled = false;
    this.engine?.setEnabled(false);
    this.changed();
  }
  enable() {
    ++this.generation;
    this.enabled = true;
    this.engine?.setEnabled(true);
    this.changed();
  }
  state() {
    const live = this.contexts.filter((context) => !context.closed);
    const current = [...this.contexts].reverse().find((context) => context.ownerId === this.activeEngineOwnerId) ?? this.contexts.at(-1);
    const eventDetails = this.events.map((event) => {
      const context = this.contexts.find((entry) => entry.id === event.contextId);
      const buffer = context?.buffers.find((entry) => entry.id === event.bufferId);
      const source = context?.sources.find((entry) => entry.id === event.sourceId);
      const samples = buffer?.buffer.getChannelData(0) ?? new Float32Array();
      const signal = signalProof(samples, samples);
      const firstBeatFrame = (event.beatStartsMs[0] ?? 0) * 48;
      let preBeatMaxAbs = 0;
      for (let index = 0; index < Math.min(firstBeatFrame, samples.length); index += 1) preBeatMaxAbs = Math.max(preBeatMaxAbs, Math.abs(samples[index]!));
      return { ...event, channels: buffer?.channels ?? 0, frames: buffer?.frames ?? 0, sampleRate: buffer?.sampleRate ?? 0, finite: signal.finite, maxAbs: signal.maxAbs, preBeatMaxAbs, firstNonZeroFrame: signal.firstNonZeroFrame, sourceStarted: source?.started ?? false, sourceDisconnected: source?.disconnected ?? false, sourceConnections: source?.connections ?? 0 };
    });
    const assets = this.assets.map(({ bytes: _bytes, ...asset }) => asset);
    return { disposed: this.disposed, generation: this.generation, variant: this.variant, enabled: this.enabled, activeEngineOwnerId: this.activeEngineOwnerId, pendingTransitions: this.pendingTransitions, completedTransitions: this.completedTransitions, staleAssetCallbacksDropped: this.staleAssetCallbacksDropped, contextsCreated: this.contexts.length, liveContexts: live.length, maxLiveContextsObserved: this.maxLiveContextsObserved, contextState: current?.context.state ?? 'none', eventSources: this.contexts.flatMap((context) => context.sources).filter((source) => !source.disconnected).length, eventBuffers: this.contexts.reduce((count, context) => count + context.buffers.length, 0), assets, events: eventDetails };
  }
  async dispose() {
    if (this.disposed) return;
    ++this.generation;
    this.disposed = true;
    this.enabled = false;
    await this.exclusive(async () => {
      const engine = this.engine;
      this.engine = null;
      this.variant = null;
      this.activeEngineOwnerId = 0;
      engine?.destroy();
      await Promise.all(this.contexts.map((context) => context.closePromise).filter((promise): promise is Promise<void> => !!promise));
      ok(this.liveContextCount() === 0, 'Disposed audio owner retained a live context.');
    });
  }
}
