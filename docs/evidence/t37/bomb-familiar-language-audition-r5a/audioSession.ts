import { ACCEPTED_OUTPUT_GAIN } from '../../../../src/game/audio/acceptedPlayback';
import type { GestureVoice } from '../../../../src/game/audio/audioGesture';
import { T37_AUDIO_ASSETS } from '../../../../src/game/audio/audioAssetCatalog';
import { CANDIDATE_IDS, SAMPLE_RATE, STUDIO_EXCERPT, type CandidateId } from './candidateContract';
import { scheduleHardDropReference, scheduleStudioOneLineReference } from './candidateGraph';

export type AudioSessionPhase =
  | 'cold'
  | 'priming'
  | 'ready'
  | 'pending'
  | 'playing'
  | 'stopping'
  | 'disposed'
  | 'error';

export type AuditionCue = CandidateId | 'hard-drop' | 'studio';

export interface CandidateSchedule {
  id: CandidateId;
  scheduledFrom: number;
  startAt: number;
  offsetMs: number;
}

interface TrackedSource {
  cue: AuditionCue;
  startAt: number;
  pending: boolean;
  playbackEpoch: number;
}

const candidateUrls: Record<CandidateId, string> = {
  A: new URL('./assets/A.wav', import.meta.url).href,
  B: new URL('./assets/B.wav', import.meta.url).href,
  C: new URL('./assets/C.wav', import.meta.url).href,
};

const transitionLimit = 80;

export class R5AAudioSession {
  private context: AudioContext | null = null;
  private gate: GainNode | null = null;
  private output: GainNode | null = null;
  private buffers: Partial<Record<CandidateId | 'studio', AudioBuffer>> = {};
  private phase: AudioSessionPhase = 'cold';
  private primePromise: Promise<void> | null = null;
  private terminalEpoch = 0;
  private playbackEpoch = 0;
  private readonly sources = new Map<AudioBufferSourceNode, TrackedSource>();
  private readonly voices = new Set<GestureVoice>();
  private readonly timers = new Set<number>();
  private readonly transitions: Array<{ from: AudioSessionPhase; to: AudioSessionPhase; reason: string; atMs: number }> = [];
  private currentCue: AuditionCue | null = null;
  private canceledBeforeStart = 0;
  private completedCues = 0;
  private latePrimeIgnored = 0;
  private disposedReason: string | null = null;
  private lastError: string | null = null;

  constructor(private readonly onState: () => void = () => {}) {}

  private transition(to: AudioSessionPhase, reason: string): void {
    const from = this.phase;
    this.phase = to;
    this.transitions.push({ from, to, reason, atMs: performance.now() });
    if (this.transitions.length > transitionLimit) this.transitions.splice(0, this.transitions.length - transitionLimit);
    this.onState();
  }

  private ensureContext(): AudioContext {
    if (this.phase === 'disposed') throw new Error('R5A audio session is disposed.');
    if (this.context) return this.context;
    const context = new AudioContext({ sampleRate: SAMPLE_RATE });
    const gate = context.createGain();
    const output = context.createGain();
    gate.gain.value = 1;
    output.gain.value = ACCEPTED_OUTPUT_GAIN;
    gate.connect(output);
    output.connect(context.destination);
    this.context = context;
    this.gate = gate;
    this.output = output;
    return context;
  }

  private buffersReady(): boolean {
    return CANDIDATE_IDS.every((id) => Boolean(this.buffers[id])) && Boolean(this.buffers.studio);
  }

  private async fetchBytes(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`R5A audio fetch failed: ${response.status} ${url}`);
    return response.arrayBuffer();
  }

  private async studioHash(bytes: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes.slice(0));
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  async prime(): Promise<void> {
    if (this.phase === 'disposed') throw new Error('R5A audio session is disposed.');
    if (this.buffersReady() && this.context) {
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.phase === 'cold' || this.phase === 'priming') this.transition('ready', 'already-primed');
      return;
    }
    if (this.primePromise) return this.primePromise;
    const context = this.ensureContext();
    const epoch = this.terminalEpoch;
    this.transition('priming', 'prime-start');
    const operation = (async () => {
      if (context.state === 'suspended') await context.resume();
      const [A, B, C, studio] = await Promise.all([
        this.fetchBytes(candidateUrls.A),
        this.fetchBytes(candidateUrls.B),
        this.fetchBytes(candidateUrls.C),
        this.fetchBytes(T37_AUDIO_ASSETS.studioProgress.url),
      ]);
      if (epoch !== this.terminalEpoch) { this.latePrimeIgnored += 1; return; }
      const studioSha = await this.studioHash(studio);
      if (studioSha !== STUDIO_EXCERPT.sourceSha256) throw new Error(`Studio source SHA drifted: ${studioSha}`);
      const [decodedA, decodedB, decodedC, decodedStudio] = await Promise.all([
        context.decodeAudioData(A.slice(0)),
        context.decodeAudioData(B.slice(0)),
        context.decodeAudioData(C.slice(0)),
        context.decodeAudioData(studio.slice(0)),
      ]);
      if (epoch !== this.terminalEpoch) { this.latePrimeIgnored += 1; return; }
      for (const [id, buffer] of [['A', decodedA], ['B', decodedB], ['C', decodedC]] as const) {
        if (buffer.sampleRate !== SAMPLE_RATE || buffer.numberOfChannels !== 1 || buffer.length !== 8_640) {
          throw new Error(`R5A ${id} stem decode shape drifted.`);
        }
        this.buffers[id] = buffer;
      }
      this.buffers.studio = decodedStudio;
      this.transition('ready', 'prime-complete');
    })().catch((error) => {
      if (epoch !== this.terminalEpoch) {
        this.latePrimeIgnored += 1;
        return;
      }
      this.lastError = error instanceof Error ? error.message : String(error);
      this.transition('error', 'prime-error');
      throw error;
    }).finally(() => {
      if (this.primePromise === operation) this.primePromise = null;
      this.onState();
    });
    this.primePromise = operation;
    return operation;
  }

  currentTime(): number {
    if (!this.context) throw new Error('R5A audio must be primed before reading its clock.');
    return this.context.currentTime;
  }

  private setTimer(callback: () => void, delayMs: number): number {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
      this.onState();
    }, Math.max(0, delayMs));
    this.timers.add(timer);
    return timer;
  }

  private completeIfIdle(epoch: number, reason: string): void {
    if (epoch !== this.playbackEpoch || this.phase === 'disposed') return;
    if (this.sources.size || this.voices.size) return;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.currentCue = null;
    this.completedCues += 1;
    this.transition('ready', reason);
  }

  private voiceHooks(epoch: number) {
    return {
      onVoiceStart: (voice: GestureVoice): void => { this.voices.add(voice); },
      onVoiceEnd: (voice: GestureVoice): void => {
        this.voices.delete(voice);
        this.completeIfIdle(epoch, 'reference-complete');
      },
    };
  }

  stopReusable(reason = 'stop'): void {
    if (this.phase === 'disposed') return;
    const wasPriming = this.phase === 'priming' || this.primePromise !== null;
    this.transition('stopping', reason);
    this.playbackEpoch += 1;
    const now = this.context?.currentTime ?? 0;
    for (const [source, tracked] of this.sources) {
      if (tracked.pending && now < tracked.startAt) this.canceledBeforeStart += 1;
      source.onended = null;
      try { source.stop(); } catch { /* Source may already have ended. */ }
      source.disconnect();
    }
    this.sources.clear();
    for (const voice of this.voices) {
      voice.stop();
      voice.disconnect();
    }
    this.voices.clear();
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.currentCue = null;
    this.transition(wasPriming ? 'priming' : this.buffersReady() ? 'ready' : 'cold', `${reason}-complete`);
  }

  scheduleCandidateAt(id: CandidateId, scheduledFrom: number, startAt: number): CandidateSchedule {
    if (!this.context || !this.gate || !this.buffers[id] || !this.buffersReady()) {
      throw new Error('R5A audio must be ready before scheduling a candidate.');
    }
    if (startAt < this.context.currentTime) throw new Error('R5A candidate start is already in the past.');
    this.stopReusable('candidate-switch');
    const epoch = ++this.playbackEpoch;
    const source = this.context.createBufferSource();
    source.buffer = this.buffers[id] ?? null;
    source.connect(this.gate);
    const tracked: TrackedSource = { cue: id, startAt, pending: true, playbackEpoch: epoch };
    this.sources.set(source, tracked);
    this.currentCue = id;
    source.onended = () => {
      source.disconnect();
      this.sources.delete(source);
      this.completeIfIdle(epoch, 'candidate-complete');
    };
    source.start(startAt);
    this.setTimer(() => {
      const current = this.sources.get(source);
      if (!current || current.playbackEpoch !== epoch || this.phase === 'disposed') return;
      current.pending = false;
      this.transition('playing', 'candidate-impact');
    }, Math.max(0, (startAt - this.context.currentTime) * 1_000));
    this.transition('pending', 'candidate-scheduled');
    return { id, scheduledFrom, startAt, offsetMs: (startAt - scheduledFrom) * 1_000 };
  }

  async playReference(kind: 'hard-drop' | 'studio'): Promise<void> {
    await this.prime();
    if (!this.context || !this.gate || !this.buffers.studio || this.phase === 'disposed') return;
    this.stopReusable('reference-switch');
    const epoch = ++this.playbackEpoch;
    const startAt = this.context.currentTime + 0.03;
    this.currentCue = kind;
    const hooks = this.voiceHooks(epoch);
    if (kind === 'hard-drop') scheduleHardDropReference(this.context, this.gate, startAt, hooks);
    else scheduleStudioOneLineReference(this.context, this.gate, this.buffers.studio, startAt, hooks);
    this.setTimer(() => {
      if (epoch === this.playbackEpoch && this.phase !== 'disposed') this.transition('playing', 'reference-start');
    }, 30);
    this.transition('pending', 'reference-scheduled');
  }

  state() {
    const pending = [...this.sources.values()].filter((source) => source.pending);
    return {
      phase: this.phase,
      ready: this.phase === 'ready' || this.phase === 'pending' || this.phase === 'playing',
      primed: this.context !== null && this.buffersReady(),
      contextState: this.context?.state ?? 'none',
      currentCue: this.currentCue,
      activeSources: this.sources.size + this.voices.size,
      pendingSources: pending.length,
      pendingCandidates: pending.map(({ cue, startAt }) => ({ cue, startAt })),
      timers: this.timers.size,
      canceledBeforeStart: this.canceledBeforeStart,
      completedCues: this.completedCues,
      latePrimeIgnored: this.latePrimeIgnored,
      terminalEpoch: this.terminalEpoch,
      playbackEpoch: this.playbackEpoch,
      disposedReason: this.disposedReason,
      closed: this.phase === 'disposed' && (!this.context || this.context.state === 'closed'),
      error: this.lastError,
      transitions: this.transitions.map((entry) => ({ ...entry })),
    };
  }

  async dispose(reason = 'dispose'): Promise<void> {
    if (this.phase === 'disposed') return;
    this.disposedReason = reason;
    this.terminalEpoch += 1;
    this.stopReusable(`${reason}-terminal`);
    const context = this.context;
    this.context = null;
    this.gate = null;
    this.output = null;
    this.buffers = {};
    if (context && context.state !== 'closed') await context.close();
    this.transition('disposed', `${reason}-complete`);
  }
}
