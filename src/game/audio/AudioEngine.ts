import { BOARD_HEIGHT, VISIBLE_START_ROW, type GameEvent, type GameState, type MutationItem } from '../core';
import { browserPlatform, type BrowserPlatform } from '../../platform/browserPlatform';
import type { VisualThemeId } from '../../design/visualThemes';
import { MUTATION_VFX_TOKENS } from '../../design/mutationTokens';
import {
  type AudioBus,
  type GestureVoice,
} from './audioGesture';
import { audioCue, type CandidateAudioCueId } from './audioPalette';
import { scheduleRecoveredNoisePuff } from './candidatePlayback';
import { T37_AUDIO_ASSETS, type T37AudioAssetId } from './audioAssetCatalog';
import {
  ACCEPTED_OUTPUT_GAIN,
  ACTION_A_CONTRACT,
  STUDIO_CLEAR_CONTRACT,
  STUDIO_COMPRESSOR_CONTRACT,
  STUDIO_COUNTDOWN_CONTRACT,
  fetchAcceptedAudioAsset,
  scheduleAcceptedAction,
  scheduleIceSample,
  scheduleStudioSample,
  scheduleToneRecipe,
  type AcceptedActionCueId,
  type AcceptedVoiceHooks,
} from './acceptedPlayback';

type MutationActivation = Extract<GameEvent, { type: 'mutation-activated' }>;
export type AcceptedAudioAssetLoader = (url: string) => Promise<ArrayBuffer>;

const MOVE_CUE_MIN_INTERVAL_MS = 60;
const SOFT_DROP_CUE_MIN_INTERVAL_MS = 52;
const MAX_EFFECT_VOICES = 16;
const HARD_DROP_TRAIL_SECONDS = 0.05;
const AUDIO_BUSES: readonly AudioBus[] = Object.freeze([
  'gameplay',
  'reward',
  'mutation',
  'ambient',
  'ui',
]);
const AUDIO_BUS_GAINS: Readonly<Record<AudioBus, number>> = Object.freeze({
  gameplay: 0.9,
  reward: 1,
  mutation: 0.96,
  ambient: 0.14,
  ui: 0.7,
});

function configureCompressor(
  compressor: DynamicsCompressorNode,
  contract: Readonly<{
    threshold: number;
    knee: number;
    ratio: number;
    attack: number;
    release: number;
  }>,
): void {
  compressor.threshold.value = contract.threshold;
  compressor.knee.value = contract.knee;
  compressor.ratio.value = contract.ratio;
  compressor.attack.value = contract.attack;
  compressor.release.value = contract.release;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private enabledGate: GainNode | null = null;
  private candidateEffects: GainNode | null = null;
  private candidateMaster: GainNode | null = null;
  private candidateCompressor: DynamicsCompressorNode | null = null;
  private actionMaster: GainNode | null = null;
  private actionCompressor: DynamicsCompressorNode | null = null;
  private studioCompressor: DynamicsCompressorNode | null = null;
  private buses: Partial<Record<AudioBus, GainNode>> = {};
  private enabled = true;
  private volume = 1;
  private destroyed = false;
  private lastMoveAt = Number.NEGATIVE_INFINITY;
  private lastSoftDropAt = Number.NEGATIVE_INFINITY;
  private pendingClearCount: 1 | 2 | 3 | 4 | null = null;
  private mutationTimelineTailAt = 0;
  private readonly activeVoices = new Set<GestureVoice>();
  private readonly mutationVoices = new Set<GestureVoice>();
  private readonly acceptedBuffers = new Map<T37AudioAssetId, AudioBuffer>();
  private assetLoadPromise: Promise<void> | null = null;

  constructor(
    private readonly platform: BrowserPlatform = browserPlatform,
    private readonly assetLoader: AcceptedAudioAssetLoader = fetchAcceptedAudioAsset,
  ) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMutationCue();
      this.pendingClearCount = null;
    }
    this.applyEnabledGain();
  }

  /** Retained for runtime compatibility; T37 intentionally has no default ambient bed. */
  setAmbientTheme(_theme: VisualThemeId): void {}

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 1));
    this.applyOutputGain();
  }

  getVolume(): number { return this.volume; }
  isEnabled(): boolean { return this.enabled; }

  async prime(): Promise<void> {
    if (!this.enabled || this.destroyed) return;
    if (!this.context) this.initializeGraph();
    const context = this.context;
    if (!context) return;
    if (context.state === 'suspended') await context.resume();
    await this.ensureAcceptedAssets(context);
  }

  suspend(): void { void this.context?.suspend(); }

  play(events: readonly GameEvent[]): void {
    if (events.some((event) => event.type === 'restarted')) {
      this.pendingClearCount = null;
      this.stopMutationCue();
    }
    if (!this.context || !this.enabledGate || !this.enabled || this.destroyed) return;
    const includesHardDrop = events.some((event) => event.type === 'hard-dropped');
    const includesClearStart = events.some((event) => event.type === 'clear-started');
    const includesLineClear = events.some((event) => event.type === 'lines-cleared');
    const startsBombClear = events.some((event) => (
      event.type === 'clear-started' && event.mutationBombOutcome !== undefined
    ));
    const includesCompletion = events.some((event) => event.type === 'finished');
    const includesGameOver = events.some((event) => event.type === 'game-over');
    const includesLevelUp = events.some((event) => event.type === 'level-up');
    const mutationActivations = this.uniqueMutationActivations(events);
    const hasMutationActivation = mutationActivations.length > 0;
    const hasHigherResolution = hasMutationActivation || includesCompletion || includesGameOver || includesLevelUp;
    const hasResolution = includesClearStart || includesLineClear || hasHigherResolution;

    for (const event of events) {
      if (event.type === 'piece-moved' && event.cause === 'move') {
        const now = this.platform.now();
        if (now - this.lastMoveAt >= MOVE_CUE_MIN_INTERVAL_MS) {
          this.playAcceptedAction('move', 0, event.dx < 0 ? -0.28 : 0.28);
          this.lastMoveAt = now;
        }
      } else if (event.type === 'piece-moved' && event.cause === 'soft-drop') {
        const now = this.platform.now();
        if (now - this.lastSoftDropAt > SOFT_DROP_CUE_MIN_INTERVAL_MS) {
          this.playCandidateCue('soft-drop');
          this.lastSoftDropAt = now;
        }
      } else if (event.type === 'piece-rotated') {
        this.playAcceptedAction('rotate');
      } else if (event.type === 'hard-dropped') {
        if (!hasResolution) {
          this.playAcceptedAction('hard-drop', event.distance > 0 ? HARD_DROP_TRAIL_SECONDS : 0);
        }
      } else if (event.type === 'piece-locked' && !includesHardDrop && !hasResolution) {
        this.playAcceptedAction('lock');
      } else if (event.type === 'endgame-undone') {
        this.pendingClearCount = null;
        this.playCandidateCue('endgame-undo');
      } else if (event.type === 'clear-started') {
        const count = event.rows.length;
        this.pendingClearCount = Number.isInteger(count) && count >= 1 && count <= 4
          ? count as 1 | 2 | 3 | 4
          : null;
        if (!hasHigherResolution && !startsBombClear) this.playClear(count);
      } else if (event.type === 'lines-cleared') {
        const tier = Number.isInteger(event.count) && event.count >= 1
          ? Math.min(4, event.count) as 1 | 2 | 3 | 4
          : null;
        const alreadyStarted = tier !== null && this.pendingClearCount === tier;
        this.pendingClearCount = null;
        if (!hasHigherResolution && !alreadyStarted) this.playClear(event.count);
      } else if (event.type === 'bedrock-raised') {
        this.playCandidateCue('bedrock-rise');
      } else if (event.type === 'bedrock-lowered') {
        this.playCandidateCue('bedrock-lower');
      } else if (event.type === 'survival-stones-warned') {
        this.playCandidateCue('stone-warning');
      } else if (event.type === 'survival-stones-spawned') {
        this.playCandidateCue('stone-spawn');
      } else if (event.type === 'survival-stones-landed') {
        this.playCandidateCue('stone-land');
      } else if (event.type === 'level-up' && !hasMutationActivation) {
        this.playCandidateCue('level-up');
      } else if (event.type === 'finished' && !hasMutationActivation) {
        this.playCandidateCue('finished');
      } else if (event.type === 'game-over' && !hasMutationActivation) {
        this.playCandidateCue('game-over');
      } else if (event.type === 'paused') {
        this.playCandidateCue('pause');
      } else if (event.type === 'resumed') {
        this.playCandidateCue('resume');
      }
      // started and restarted stay silent: the entry countdown owns those frames.
    }
    this.playMutationActivations(mutationActivations);
  }

  playEntryCountdown(digit: 3 | 2 | 1): void {
    const contract = STUDIO_COUNTDOWN_CONTRACT.steps[digit];
    this.playStudio('studioProgress', {
      targetPeak: contract.targetPeak,
      rate: contract.rate,
      pan: 0,
      maxDuration: STUDIO_COUNTDOWN_CONTRACT.stepMaxDuration,
    });
  }

  playEntryCountdownResolve(): void {
    this.playStudio('studioStart', {
      targetPeak: STUDIO_COUNTDOWN_CONTRACT.resolve.targetPeak,
      rate: STUDIO_COUNTDOWN_CONTRACT.resolve.rate,
      pan: 0,
      maxDuration: STUDIO_COUNTDOWN_CONTRACT.resolve.maxDuration,
    });
  }

  /** Timed states never own a sustained foreground voice. */
  syncMutationState(_state: GameState): void {}

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopMutationCue();
    this.pendingClearCount = null;
    for (const voice of [...this.activeVoices]) {
      voice.stop(this.context?.currentTime);
      voice.disconnect();
    }
    this.activeVoices.clear();
    for (const name of AUDIO_BUSES) this.buses[name]?.disconnect();
    this.buses = {};
    this.candidateEffects?.disconnect();
    this.candidateMaster?.disconnect();
    this.candidateCompressor?.disconnect();
    this.actionMaster?.disconnect();
    this.actionCompressor?.disconnect();
    this.studioCompressor?.disconnect();
    this.enabledGate?.disconnect();
    this.output?.disconnect();
    this.candidateEffects = null;
    this.candidateMaster = null;
    this.candidateCompressor = null;
    this.actionMaster = null;
    this.actionCompressor = null;
    this.studioCompressor = null;
    this.enabledGate = null;
    this.output = null;
    this.acceptedBuffers.clear();
    this.assetLoadPromise = null;
    const context = this.context;
    this.context = null;
    if (context) void context.close();
  }

  private initializeGraph(): void {
    const context = this.platform.createAudioContext();
    if (!context) return;
    this.context = context;
    this.output = context.createGain();
    this.enabledGate = context.createGain();
    this.candidateEffects = context.createGain();
    this.candidateMaster = context.createGain();
    this.candidateCompressor = context.createDynamicsCompressor();
    this.actionMaster = context.createGain();
    this.actionCompressor = context.createDynamicsCompressor();
    this.studioCompressor = context.createDynamicsCompressor();

    for (const name of AUDIO_BUSES) {
      const bus = context.createGain();
      bus.gain.value = AUDIO_BUS_GAINS[name];
      bus.connect(this.candidateEffects);
      this.buses[name] = bus;
    }

    this.candidateEffects.gain.value = 1;
    this.candidateMaster.gain.value = ACTION_A_CONTRACT.masterGain;
    configureCompressor(this.candidateCompressor, ACTION_A_CONTRACT.compressor);
    this.actionMaster.gain.value = ACTION_A_CONTRACT.masterGain;
    configureCompressor(this.actionCompressor, ACTION_A_CONTRACT.compressor);
    configureCompressor(this.studioCompressor, STUDIO_COMPRESSOR_CONTRACT);
    this.applyOutputGain();
    this.applyEnabledGain();

    this.candidateEffects.connect(this.candidateMaster);
    this.candidateMaster.connect(this.candidateCompressor);
    this.candidateCompressor.connect(this.enabledGate);
    this.actionMaster.connect(this.actionCompressor);
    this.actionCompressor.connect(this.enabledGate);
    this.studioCompressor.connect(this.enabledGate);
    this.enabledGate.connect(this.output);
    this.output.connect(context.destination);
  }

  private async ensureAcceptedAssets(context: AudioContext): Promise<void> {
    if (!this.assetLoadPromise) {
      const entries = Object.entries(T37_AUDIO_ASSETS) as Array<[
        T37AudioAssetId,
        (typeof T37_AUDIO_ASSETS)[T37AudioAssetId],
      ]>;
      this.assetLoadPromise = Promise.all(entries.map(async ([id, asset]) => {
        try {
          const bytes = await this.assetLoader(asset.url);
          const buffer = await context.decodeAudioData(bytes.slice(0));
          if (!this.destroyed && this.context === context) this.acceptedBuffers.set(id, buffer);
        } catch {
          // A host may deny or fail local media decoding. Gameplay remains functional,
          // and this engine does not retry into a request storm during the same run.
        }
      })).then(() => undefined);
    }
    await this.assetLoadPromise;
  }

  private voiceHooks(mutationOwned = false): AcceptedVoiceHooks {
    return {
      onVoiceStart: (voice) => {
        this.activeVoices.add(voice);
        if (mutationOwned) this.mutationVoices.add(voice);
      },
      onVoiceEnd: (voice) => {
        this.activeVoices.delete(voice);
        this.mutationVoices.delete(voice);
      },
    };
  }

  private playAcceptedAction(cue: AcceptedActionCueId, delay = 0, pan = 0): void {
    const context = this.context;
    const destination = this.actionMaster;
    const available = MAX_EFFECT_VOICES - this.activeVoices.size;
    if (!context || !destination || available <= 0 || !this.enabled || this.destroyed) return;
    scheduleAcceptedAction(context, destination, cue, {
      startAt: context.currentTime + delay,
      pan,
      maxVoices: available,
      ...this.voiceHooks(),
    });
  }

  private playStudio(
    assetId: 'studioProgress' | 'studioStart',
    options: {
      readonly delay?: number;
      readonly startAt?: number;
      readonly targetPeak: number;
      readonly rate: number;
      readonly pan: number;
      readonly maxDuration: number;
    },
  ): void {
    const context = this.context;
    const destination = this.studioCompressor;
    const buffer = this.acceptedBuffers.get(assetId);
    if (
      !context || !destination || !buffer || !this.enabled || this.destroyed
      || this.activeVoices.size >= MAX_EFFECT_VOICES
    ) return;
    scheduleStudioSample(context, destination, buffer, {
      startAt: options.startAt ?? context.currentTime + (options.delay ?? 0),
      targetPeak: options.targetPeak,
      rate: options.rate,
      pan: options.pan,
      maxDuration: options.maxDuration,
      ...this.voiceHooks(),
    });
  }

  private playIce(delay = 0, absoluteStartAt?: number): void {
    const context = this.context;
    const destination = this.enabledGate;
    const buffer = this.acceptedBuffers.get('freezeIce');
    const contract = T37_AUDIO_ASSETS.freezeIce;
    if (
      !context || !destination || !buffer || !this.enabled || this.destroyed
      || this.activeVoices.size >= MAX_EFFECT_VOICES
    ) return;
    scheduleIceSample(context, destination, buffer, {
      startAt: absoluteStartAt ?? context.currentTime + delay,
      offset: contract.windowStartSeconds,
      duration: contract.windowDurationSeconds,
      gain: contract.gain,
      attack: contract.attack,
      release: contract.release,
      ...this.voiceHooks(true),
    });
  }

  private playClear(count: number): void {
    if (!Number.isInteger(count) || count < 1) return;
    const tier = Math.min(4, count) as 1 | 2 | 3 | 4;
    const delays = STUDIO_CLEAR_CONTRACT.delaysMs[tier];
    const context = this.context;
    if (!context) return;
    const eventStart = context.currentTime;
    for (let index = 0; index < delays.length; index += 1) {
      const pan = tier === 1 ? 0 : -0.35 + (0.7 * index) / (tier - 1);
      this.playStudio('studioProgress', {
        startAt: eventStart + (delays[index] ?? 0) / 1_000,
        targetPeak: STUDIO_CLEAR_CONTRACT.targetPeak[tier],
        rate: STUDIO_CLEAR_CONTRACT.rate,
        pan,
        maxDuration: STUDIO_CLEAR_CONTRACT.maxDuration,
      });
    }
  }

  private playCandidateCue(id: CandidateAudioCueId, delay = 0, absoluteStartAt?: number): void {
    const context = this.context;
    const cue = audioCue(id);
    const destination = this.buses[cue.bus];
    const available = MAX_EFFECT_VOICES - this.activeVoices.size;
    if (!context || !destination || available <= 0 || !this.enabled || this.destroyed) return;
    const hooks = this.voiceHooks(Boolean(cue.mutationOwned));
    const eventStart = absoluteStartAt ?? context.currentTime + delay;
    scheduleToneRecipe(context, destination, cue.tones, {
      startAt: eventStart,
      maxVoices: available,
      gainBoost: ACTION_A_CONTRACT.voiceGainBoost,
      gainCeiling: ACTION_A_CONTRACT.voiceGainCeiling,
      ...hooks,
    });
    const remaining = MAX_EFFECT_VOICES - this.activeVoices.size;
    if (remaining <= 0 || !cue.air?.length) return;
    for (const layer of cue.air.slice(0, remaining)) {
      scheduleRecoveredNoisePuff(context, destination, {
        startAt: eventStart + (layer.delay ?? 0),
        duration: layer.duration,
        gain: layer.gain,
        cutoff: layer.cutoff,
        q: layer.q ?? 0.7,
        attack: layer.attack ?? 0.009,
        gainBoost: ACTION_A_CONTRACT.voiceGainBoost,
        gainCeiling: ACTION_A_CONTRACT.voiceGainCeiling,
        ...hooks,
      });
    }
  }

  private uniqueMutationActivations(events: readonly GameEvent[]): MutationActivation[] {
    const unique = new Map<MutationItem, MutationActivation>();
    for (const event of events) {
      if (event.type !== 'mutation-activated' || unique.has(event.item)) continue;
      unique.set(event.item, event);
    }
    return [...unique.values()].sort((left, right) => (
      Number(right.item === 'bomb') - Number(left.item === 'bomb')
    ));
  }

  private playMutationActivations(activations: readonly MutationActivation[]): void {
    const context = this.context;
    if (!context || activations.length === 0) return;
    let startAt = Math.max(context.currentTime, this.mutationTimelineTailAt);
    for (const event of activations) {
      if (event.item === 'freeze') {
        this.playIce(0, startAt);
      } else {
        const id: CandidateAudioCueId = event.item === 'collapse'
          ? 'supergravity'
          : event.item === 'bomb'
            ? event.bombOutcome === 'chain-clear' ? 'bomb-chain' : 'bomb'
            : event.multiplierFactor === 4 ? 'multiplier-4' : 'multiplier-2';
        this.playCandidateCue(id, 0, startAt);
        if (event.item === 'bomb' && event.bombOutcome === 'chain-clear') {
          this.playChainPropagation(event, startAt);
        }
      }
      startAt += MUTATION_VFX_TOKENS[event.item].animation.activationMs / 1_000;
    }
    this.mutationTimelineTailAt = startAt;
  }

  private playChainPropagation(
    event: Extract<MutationActivation, { item: 'bomb'; bombOutcome: 'chain-clear' }>,
    startAt: number,
  ): void {
    const context = this.context;
    const destination = this.buses.mutation;
    if (!context || !destination) return;
    const visibleOrigins = [...new Set(event.chainOriginCells
      .map((cell) => cell.y)
      .filter((row) => row >= VISIBLE_START_ROW && row < BOARD_HEIGHT))];
    const distanceFor = visibleOrigins.length > 0
      ? (row: number) => Math.min(...visibleOrigins.map((origin) => Math.abs(row - origin)))
      : (row: number) => row - VISIBLE_START_ROW;
    const distances = [...new Set(Array.from(
      { length: BOARD_HEIGHT - VISIBLE_START_ROW },
      (_, index) => distanceFor(VISIBLE_START_ROW + index),
    ))].sort((left, right) => left - right);
    const hooks = this.voiceHooks(true);
    const available = Math.max(0, MAX_EFFECT_VOICES - this.activeVoices.size);
    scheduleToneRecipe(
      context,
      destination,
      distances.slice(0, available).map((distance) => ({
        frequency: Math.max(46, 96 - distance * 2.2),
        duration: .035,
        gain: .036,
        attack: .004,
        waveform: 'triangle' as const,
        delay: .14 + distance * .034,
        endFrequency: Math.max(38, 76 - distance * 1.8),
      })),
      {
        startAt,
        maxVoices: available,
        gainBoost: ACTION_A_CONTRACT.voiceGainBoost,
        gainCeiling: ACTION_A_CONTRACT.voiceGainCeiling,
        ...hooks,
      },
    );
  }

  private stopMutationCue(): void {
    for (const voice of [...this.mutationVoices]) {
      voice.stop(this.context?.currentTime);
      voice.disconnect();
      this.activeVoices.delete(voice);
    }
    this.mutationVoices.clear();
    this.mutationTimelineTailAt = 0;
  }

  private applyOutputGain(): void {
    if (!this.output) return;
    const value = this.volume * ACCEPTED_OUTPUT_GAIN;
    if (this.context) this.output.gain.setTargetAtTime(value, this.context.currentTime, 0.012);
    else this.output.gain.value = value;
  }

  private applyEnabledGain(): void {
    if (!this.enabledGate) return;
    const value = this.enabled ? 1 : 0;
    if (this.context) this.enabledGate.gain.setTargetAtTime(value, this.context.currentTime, 0.008);
    else this.enabledGate.gain.value = value;
  }
}
