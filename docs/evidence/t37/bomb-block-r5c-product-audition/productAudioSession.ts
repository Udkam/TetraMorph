import type { GameEvent } from '../../../../src/game/core';
import { mutationChainPresentationPlan } from '../../../../src/animation/mutationChainTimeline';
import { createBrowserPlatform } from '../../../../src/platform/browserPlatform';
import { AudioEngine } from '../../../../src/game/audio/AudioEngine';
import {
  BOMB_BLOCK_PLAYBACK_CONTRACT,
  BOMB_BLOCK_SAMPLE_RATE,
  composeBombBlockEventSamples,
} from '../../../../src/game/audio/bombBlockPlayback';
import { T37_AUDIO_ASSETS, type T37AudioAssetId } from '../../../../src/game/audio/audioAssetCatalog';
import { fetchAcceptedAudioAsset } from '../../../../src/game/audio/acceptedPlayback';
import { NORMAL_IMPACT_MS, type Scene } from './fixture';

type SourceAudit = {
  id: number;
  started: boolean;
  startAt: number | null;
  stopCalls: number;
  disconnected: boolean;
  connections: number;
};

type BufferAudit = {
  id: number;
  channels: number;
  frames: number;
  sampleRate: number;
  buffer: AudioBuffer;
};

type ContextAudit = {
  id: number;
  context: AudioContext;
  closed: boolean;
  closePromise: Promise<void> | null;
  buffers: BufferAudit[];
  sources: SourceAudit[];
};

type AssetAudit = {
  id: T37AudioAssetId;
  url: string;
  expectedUrl: string;
  expectedSha256: string;
  observedSha256: string;
  observedBytes: number;
  sameOrigin: boolean;
  exactHash: boolean;
};

export type EventAudit = {
  scene: Scene;
  reducedMotion: boolean;
  beatStartsMs: number[];
  contextId: number;
  bufferId: number;
  sourceId: number;
  sourceStartAt: number | null;
  expectedFrames: number;
  firstNonZeroFrame: number;
  preBeatMaxAbs: number;
  maxAbs: number;
  finite: boolean;
  residualMaxAbs: number;
  exactWithinTolerance: boolean;
  expectedFloat32Sha256: string;
  observedFloat32Sha256: string;
  sourceStarted: boolean;
  sourceConnections: number;
};

const TOLERANCE = 1e-7;

function ok(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function sha256(bytes: BufferSource): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function eventBeats(event: GameEvent, reducedMotion: boolean): number[] {
  ok(event.type === 'mutation-activated' && event.item === 'bomb',
    'R5C audition requires a real Bomb mutation event.');
  if (event.bombOutcome !== 'chain-clear') return [NORMAL_IMPACT_MS];
  return [...mutationChainPresentationPlan(event.chainTriggerRows, reducedMotion).beatStartsMs];
}

function signalProof(samples: Float32Array, expected: Float32Array, firstBeatFrame: number) {
  let finite = true;
  let maxAbs = 0;
  let preBeatMaxAbs = 0;
  let firstNonZeroFrame = -1;
  let residualMaxAbs = samples.length === expected.length ? 0 : Infinity;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index]!;
    const absolute = Math.abs(value);
    if (!Number.isFinite(value)) finite = false;
    maxAbs = Math.max(maxAbs, absolute);
    if (index < firstBeatFrame) preBeatMaxAbs = Math.max(preBeatMaxAbs, absolute);
    if (firstNonZeroFrame < 0 && absolute > 0) firstNonZeroFrame = index;
    if (index < expected.length) {
      residualMaxAbs = Math.max(residualMaxAbs, Math.abs(value - expected[index]!));
    }
  }
  return Object.freeze({
    finite,
    maxAbs,
    preBeatMaxAbs,
    firstNonZeroFrame,
    residualMaxAbs,
    exactWithinTolerance: residualMaxAbs <= TOLERANCE,
  });
}

/**
 * Wraps the production engine only to observe its real AudioContext operations. It never
 * supplies a Bomb sample or synthesizes an alternate result: samples are compared with the
 * current product's exported block-break compositor after dispatch.
 */
export class ProductAudioSession {
  private engine: AudioEngine | null = null;
  private enabled = true;
  private disposed = false;
  private generation = 0;
  private context: ContextAudit | null = null;
  private readonly contexts: ContextAudit[] = [];
  private readonly assets: AssetAudit[] = [];
  private readonly events: EventAudit[] = [];

  constructor(private readonly changed: () => void = () => {}) {}

  async play(
    scene: Scene,
    reducedMotion: boolean,
    event: GameEvent,
    beforeDispatch: () => void = () => {},
  ): Promise<boolean> {
    const generation = ++this.generation;
    const engine = await this.ready(generation);
    if (!engine || !this.current(generation)) return false;
    const context = this.context;
    ok(context, 'Production AudioEngine created no auditable AudioContext.');
    const beforeBuffers = context.buffers.length;
    const beforeSources = context.sources.length;
    engine.play([{ type: 'restarted' }]);
    engine.setReducedMotion(reducedMotion);
    beforeDispatch();
    if (!this.current(generation)) return false;
    engine.play([event]);
    if (!this.current(generation)) return false;
    ok(context.buffers.length === beforeBuffers + 1 && context.sources.length === beforeSources + 1,
      'Current Bomb dispatch did not produce exactly one BufferSource and mono buffer.');
    const buffer = context.buffers.at(-1)!;
    const source = context.sources.at(-1)!;
    const beatStartsMs = eventBeats(event, reducedMotion);
    const expected = composeBombBlockEventSamples({ beatStartsMs, reducedMotion });
    const observed = buffer.buffer.getChannelData(0);
    const firstBeatFrame = beatStartsMs[0]! * (BOMB_BLOCK_SAMPLE_RATE / 1_000);
    const proof = signalProof(observed, expected, firstBeatFrame);
    const [expectedFloat32Sha256, observedFloat32Sha256] = await Promise.all([
      sha256(expected),
      sha256(observed),
    ]);
    if (!this.current(generation)) return false;
    ok(buffer.channels === 1 && buffer.sampleRate === BOMB_BLOCK_SAMPLE_RATE,
      'Current Bomb event did not create one 48 kHz mono buffer.');
    ok(proof.finite && proof.maxAbs <= BOMB_BLOCK_PLAYBACK_CONTRACT.rawPeakCeiling,
      'Current Bomb buffer violated the finite quiet block-break cap.');
    this.events.push(Object.freeze({
      scene,
      reducedMotion,
      beatStartsMs,
      contextId: context.id,
      bufferId: buffer.id,
      sourceId: source.id,
      sourceStartAt: source.startAt,
      expectedFrames: expected.length,
      firstNonZeroFrame: proof.firstNonZeroFrame,
      preBeatMaxAbs: proof.preBeatMaxAbs,
      maxAbs: proof.maxAbs,
      finite: proof.finite,
      residualMaxAbs: proof.residualMaxAbs,
      exactWithinTolerance: proof.exactWithinTolerance,
      expectedFloat32Sha256,
      observedFloat32Sha256,
      sourceStarted: source.started,
      sourceConnections: source.connections,
    }));
    this.changed();
    return true;
  }

  stopReusable(): void {
    this.generation += 1;
    this.engine?.play([{ type: 'restarted' }]);
    this.changed();
  }

  disable(): void {
    this.generation += 1;
    this.enabled = false;
    this.engine?.setEnabled(false);
    this.changed();
  }

  enable(): void {
    if (this.disposed) return;
    this.generation += 1;
    this.enabled = true;
    this.engine?.setEnabled(true);
    this.changed();
  }

  state() {
    const context = this.context;
    const sourceAudits = context?.sources ?? [];
    return Object.freeze({
      disposed: this.disposed,
      enabled: this.enabled,
      contextsCreated: this.contexts.length,
      liveContexts: this.contexts.filter((entry) => !entry.closed).length,
      contextState: context?.context.state ?? 'none',
      activeEventSources: sourceAudits.filter((source) => source.started && !source.disconnected).length,
      assets: this.assets.map((asset) => ({ ...asset })),
      events: this.events.map((event) => ({ ...event, beatStartsMs: [...event.beatStartsMs] })),
    });
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.enabled = false;
    this.generation += 1;
    this.engine?.destroy();
    this.engine = null;
    await Promise.all(this.contexts.map((context) => context.closePromise).filter(
      (promise): promise is Promise<void> => promise !== null,
    ));
    ok(this.contexts.every((context) => context.closed),
      'AudioEngine disposal retained an AudioContext.');
    this.changed();
  }

  private current(generation: number): boolean {
    return generation === this.generation && this.enabled && !this.disposed;
  }

  private async ready(generation: number): Promise<AudioEngine | null> {
    if (!this.current(generation)) return null;
    if (!this.engine) {
      const platform = createBrowserPlatform({
        window,
        document,
        audioContextFactory: () => this.makeContext(),
      });
      this.engine = new AudioEngine(platform, (url) => this.loadActiveAsset(url));
      this.engine.setEnabled(true);
      this.engine.setVolume(1);
    }
    const engine = this.engine;
    await engine.prime();
    return this.current(generation) && this.engine === engine ? engine : null;
  }

  private makeContext(): AudioContext {
    ok(!this.disposed && this.context === null, 'R5C audition attempted to duplicate its AudioContext.');
    const context = new AudioContext({ sampleRate: BOMB_BLOCK_SAMPLE_RATE });
    const audit: ContextAudit = {
      id: this.contexts.length + 1,
      context,
      closed: false,
      closePromise: null,
      buffers: [],
      sources: [],
    };
    const createBuffer = context.createBuffer.bind(context);
    const createBufferSource = context.createBufferSource.bind(context);
    const close = context.close.bind(context);
    context.createBuffer = ((channels: number, frames: number, sampleRate: number) => {
      const buffer = createBuffer(channels, frames, sampleRate);
      audit.buffers.push({
        id: audit.buffers.length + 1,
        channels,
        frames,
        sampleRate,
        buffer,
      });
      return buffer;
    }) as typeof context.createBuffer;
    context.createBufferSource = (() => {
      const source = createBufferSource();
      const record: SourceAudit = {
        id: audit.sources.length + 1,
        started: false,
        startAt: null,
        stopCalls: 0,
        disconnected: false,
        connections: 0,
      };
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
      source.stop = ((when = 0) => {
        record.stopCalls += 1;
        return stop(when);
      }) as typeof source.stop;
      source.connect = ((target: AudioNode) => {
        record.connections += 1;
        return connect(target);
      }) as typeof source.connect;
      source.disconnect = (() => {
        record.disconnected = true;
        return disconnect();
      }) as typeof source.disconnect;
      return source;
    }) as typeof context.createBufferSource;
    context.close = (() => {
      const pending = close().then(() => {
        audit.closed = true;
        this.changed();
      });
      audit.closePromise = pending;
      return pending;
    }) as typeof context.close;
    this.context = audit;
    this.contexts.push(audit);
    this.changed();
    return context;
  }

  private async loadActiveAsset(url: string): Promise<ArrayBuffer> {
    const entry = (Object.entries(T37_AUDIO_ASSETS) as Array<[
      T37AudioAssetId,
      (typeof T37_AUDIO_ASSETS)[T37AudioAssetId],
    ]>).find(([, asset]) => asset.url === url);
    ok(entry, `AudioEngine requested an asset outside the active catalog: ${url}`);
    const [id, asset] = entry;
    const raw = await fetchAcceptedAudioAsset(url);
    const bytes = new Uint8Array(raw.slice(0));
    const observedSha256 = await sha256(bytes);
    const resolvedUrl = new URL(url, location.href).href;
    const audit: AssetAudit = {
      id,
      url: resolvedUrl,
      expectedUrl: new URL(asset.url, location.href).href,
      expectedSha256: asset.sha256,
      observedSha256,
      observedBytes: bytes.byteLength,
      sameOrigin: new URL(resolvedUrl).origin === location.origin,
      exactHash: observedSha256 === asset.sha256,
    };
    ok(audit.url === audit.expectedUrl && audit.sameOrigin && audit.exactHash,
      `Active asset ${id} failed URL/origin/hash audit.`);
    if (!this.disposed) {
      this.assets.push(Object.freeze(audit));
      this.changed();
    }
    return raw;
  }
}
