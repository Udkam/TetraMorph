import {
  ACTION_A_CONTRACT,
  STUDIO_CLEAR_CONTRACT,
  STUDIO_COMPRESSOR_CONTRACT,
  scheduleAcceptedAction,
  scheduleStudioSample,
  type AcceptedVoiceHooks,
} from '../../../../src/game/audio/acceptedPlayback';
import { scheduleGesture, type GestureVoice } from '../../../../src/game/audio/audioGesture';
import {
  ACTION_STACK,
  CANDIDATE_SOURCE_RESERVATIONS,
  CANDIDATE_TRIMS,
  COMPACT_KNOCK_GESTURE,
  R5A_GRAPH_CONTRACT,
  STUDIO_EXCERPT,
  assertFrozenCandidateContract,
  type CandidateId,
} from './candidateContract';

interface CompressorContract {
  readonly threshold: number;
  readonly knee: number;
  readonly ratio: number;
  readonly attack: number;
  readonly release: number;
}

export interface ScheduledCandidateGraph {
  readonly id: CandidateId;
  readonly voices: readonly GestureVoice[];
  readonly reservedSources: number;
  readonly trim: number;
  readonly branch: 'action' | 'action+studio' | 'mutation-procedural';
}

export function configureCompressor(node: DynamicsCompressorNode, contract: CompressorContract): void {
  node.threshold.value = contract.threshold;
  node.knee.value = contract.knee;
  node.ratio.value = contract.ratio;
  node.attack.value = contract.attack;
  node.release.value = contract.release;
}

function reserveSourcesAtomically(id: CandidateId, availableSources: number): number {
  const required = CANDIDATE_SOURCE_RESERVATIONS[id];
  if (!Number.isInteger(availableSources) || availableSources < required) {
    throw new Error(`R5A ${id} requires an atomic ${required}-source reservation; received ${availableSources}.`);
  }
  return required;
}

function actionBranch(context: BaseAudioContext, destination: AudioNode): GainNode {
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = ACTION_A_CONTRACT.masterGain;
  configureCompressor(compressor, ACTION_A_CONTRACT.compressor);
  master.connect(compressor);
  compressor.connect(destination);
  return master;
}

function studioBranch(context: BaseAudioContext, destination: AudioNode): DynamicsCompressorNode {
  const compressor = context.createDynamicsCompressor();
  configureCompressor(compressor, STUDIO_COMPRESSOR_CONTRACT);
  compressor.connect(destination);
  return compressor;
}

function mutationBranch(context: BaseAudioContext, destination: AudioNode): GainNode {
  const mutation = context.createGain();
  const effects = context.createGain();
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  mutation.gain.value = R5A_GRAPH_CONTRACT.mutationBus;
  effects.gain.value = R5A_GRAPH_CONTRACT.candidateEffects;
  master.gain.value = R5A_GRAPH_CONTRACT.candidateMaster;
  configureCompressor(compressor, ACTION_A_CONTRACT.compressor);
  mutation.connect(effects);
  effects.connect(master);
  master.connect(compressor);
  compressor.connect(destination);
  return mutation;
}

function stopVoices(voices: readonly GestureVoice[]): void {
  for (const voice of voices) {
    voice.stop();
    voice.disconnect();
  }
}

export function scheduleCandidateGraph(
  context: BaseAudioContext,
  destination: AudioNode,
  id: CandidateId,
  options: {
    readonly startAt: number;
    readonly studioBuffer?: AudioBuffer;
    readonly availableSources?: number;
    readonly hooks?: AcceptedVoiceHooks;
  },
): ScheduledCandidateGraph {
  assertFrozenCandidateContract();
  const reservedSources = reserveSourcesAtomically(
    id,
    options.availableSources ?? CANDIDATE_SOURCE_RESERVATIONS[id],
  );
  const sum = context.createGain();
  const trim = context.createGain();
  sum.gain.value = 1;
  trim.gain.value = CANDIDATE_TRIMS[id];
  sum.connect(trim);
  trim.connect(destination);
  const voices: GestureVoice[] = [];
  let branch: ScheduledCandidateGraph['branch'];
  try {
    if (id === 'A') {
      branch = 'action';
      const action = actionBranch(context, sum);
      for (const atom of ACTION_STACK.atoms) {
        voices.push(...scheduleAcceptedAction(context as AudioContext, action, atom.cue, {
          startAt: options.startAt + atom.delaySeconds,
          pan: atom.pan,
          ...options.hooks,
        }));
      }
    } else if (id === 'B') {
      branch = 'action+studio';
      if (!options.studioBuffer) throw new Error('R5A B requires the frozen Studio progress buffer.');
      const action = actionBranch(context, sum);
      const studio = studioBranch(context, sum);
      voices.push(...scheduleAcceptedAction(context as AudioContext, action, 'hard-drop', {
        startAt: options.startAt,
        pan: 0,
        ...options.hooks,
      }));
      voices.push(scheduleStudioSample(context as AudioContext, studio, options.studioBuffer, {
        startAt: options.startAt + STUDIO_EXCERPT.delaySeconds,
        rate: STUDIO_EXCERPT.rate,
        targetPeak: STUDIO_EXCERPT.targetPeak,
        pan: STUDIO_EXCERPT.pan,
        maxDuration: STUDIO_EXCERPT.maxDuration,
        ...options.hooks,
      }));
    } else {
      branch = 'mutation-procedural';
      const mutation = mutationBranch(context, sum);
      voices.push(...scheduleGesture(context, mutation, COMPACT_KNOCK_GESTURE, {
        startAt: options.startAt,
        maxVoices: 1,
        ...options.hooks,
      }));
    }
    if (voices.length !== reservedSources) {
      throw new Error(`R5A ${id} scheduled ${voices.length} sources after reserving ${reservedSources}.`);
    }
    return { id, voices, reservedSources, trim: CANDIDATE_TRIMS[id], branch };
  } catch (error) {
    stopVoices(voices);
    throw error;
  }
}

export function scheduleHardDropReference(
  context: BaseAudioContext,
  destination: AudioNode,
  startAt: number,
  hooks: AcceptedVoiceHooks = {},
): GestureVoice[] {
  const action = actionBranch(context, destination);
  return scheduleAcceptedAction(context as AudioContext, action, 'hard-drop', { startAt, pan: 0, ...hooks });
}

export function scheduleStudioOneLineReference(
  context: BaseAudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
  startAt: number,
  hooks: AcceptedVoiceHooks = {},
): GestureVoice {
  const studio = studioBranch(context, destination);
  return scheduleStudioSample(context as AudioContext, studio, buffer, {
    startAt,
    targetPeak: STUDIO_CLEAR_CONTRACT.targetPeak[1],
    rate: STUDIO_CLEAR_CONTRACT.rate,
    pan: 0,
    maxDuration: STUDIO_CLEAR_CONTRACT.maxDuration,
    ...hooks,
  });
}
