import type { AudioBus } from './audioGesture';
import type { AcceptedActionTone } from './acceptedPlayback';

/**
 * Stage-C production candidates recovered from the intact pre-T29 T28 snapshot.
 * Accepted Action A, Studio clear/countdown, and Ice 2 remain intentionally absent.
 */
export type CandidateAudioCueId =
  | 'soft-drop' | 'endgame-undo'
  | 'bedrock-rise' | 'bedrock-lower' | 'stone-warning' | 'stone-spawn' | 'stone-land'
  | 'level-up' | 'finished' | 'game-over' | 'pause' | 'resume'
  | 'supergravity' | 'multiplier-2' | 'multiplier-4';

export interface CandidateAirLayer {
  readonly duration: number;
  readonly gain: number;
  readonly delay?: number;
  readonly cutoff: number;
  readonly q?: number;
  readonly attack?: number;
}

export interface CandidateAudioCue {
  readonly bus: AudioBus;
  readonly tones: readonly AcceptedActionTone[];
  readonly air?: readonly CandidateAirLayer[];
  readonly mutationOwned?: boolean;
}

type ToneOptions = Partial<Pick<AcceptedActionTone, 'endFrequency' | 'delay' | 'attack' | 'waveform'>>;

const tone = (
  frequency: number,
  duration: number,
  gain: number,
  options: ToneOptions = {},
): AcceptedActionTone => ({
  frequency,
  duration,
  gain,
  attack: options.attack ?? 0.012,
  waveform: options.waveform ?? 'sine',
  ...(options.endFrequency === undefined ? {} : { endFrequency: options.endFrequency }),
  ...(options.delay === undefined ? {} : { delay: options.delay }),
});

const gesture = (
  bus: AudioBus,
  tones: readonly AcceptedActionTone[],
  options: Pick<CandidateAudioCue, 'air' | 'mutationOwned'> = {},
): CandidateAudioCue => ({ bus, tones, ...options });

const BRIGHT_PARTIAL_RATIO = 2.01;

const marimbaStrike = (frequency: number, gain: number, delay: number): readonly AcceptedActionTone[] => [
  tone(frequency, 0.145, gain, { delay, waveform: 'triangle' }),
  tone(frequency * BRIGHT_PARTIAL_RATIO, 0.096, gain * 0.22, { delay }),
];

const PALETTE: Readonly<Record<CandidateAudioCueId, CandidateAudioCue>> = {
  'soft-drop': gesture('gameplay', [
    tone(196, 0.036, 0.078, { endFrequency: 185, attack: 0.007 }),
  ]),
  'endgame-undo': gesture('ui', [
    tone(392, 0.09, 0.095, { endFrequency: 293.66, attack: 0.006 }),
  ]),
  'bedrock-rise': gesture('gameplay', [
    tone(98, 0.17, 0.2, { endFrequency: 123.47, attack: 0.008 }),
    tone(196, 0.09, 0.055, { delay: 0.025, endFrequency: 246.94, attack: 0.006 }),
  ]),
  'bedrock-lower': gesture('gameplay', [
    tone(164.81, 0.14, 0.18, { endFrequency: 110, attack: 0.008 }),
  ]),
  'stone-warning': gesture('ui', [
    tone(392, 0.075, 0.14, { endFrequency: 523.25, attack: 0.006 }),
    tone(523.25, 0.07, 0.105, { delay: 0.085, endFrequency: 659.25, attack: 0.006 }),
  ]),
  'stone-spawn': gesture('gameplay', [
    tone(329.63, 0.12, 0.13, { endFrequency: 220, attack: 0.006 }),
  ]),
  'stone-land': gesture('gameplay', [
    tone(130.81, 0.085, 0.18, { attack: 0.006 }),
    tone(196, 0.055, 0.045, { delay: 0.006, attack: 0.004 }),
  ]),
  'level-up': gesture('reward', [
    tone(392, 0.16, 0.14, { endFrequency: 440, attack: 0.008 }),
    tone(587.33, 0.13, 0.075, { delay: 0.018, attack: 0.007 }),
  ]),
  finished: gesture('reward', [
    tone(440, 0.22, 0.18, { attack: 0.009 }),
    tone(554.37, 0.2, 0.13, { delay: 0.012, attack: 0.009 }),
    tone(659.25, 0.18, 0.09, { delay: 0.024, attack: 0.008 }),
  ]),
  'game-over': gesture('reward', [
    tone(196, 0.28, 0.17, { endFrequency: 130.81, attack: 0.012 }),
    tone(98, 0.22, 0.08, { delay: 0.018, endFrequency: 65.41, attack: 0.014 }),
  ]),
  pause: gesture('ui', [
    tone(293.66, 0.085, 0.09, { attack: 0.007 }),
    tone(220, 0.07, 0.045, { delay: 0.018, attack: 0.006 }),
  ]),
  resume: gesture('ui', [
    tone(349.23, 0.09, 0.1, { attack: 0.007 }),
    tone(523.25, 0.06, 0.035, { delay: 0.018, attack: 0.005 }),
  ]),
  supergravity: gesture('mutation', [
    tone(148, 0.09, 0.25, { attack: 0.008 }),
    tone(93, 0.12, 0.17, { delay: 0.018, attack: 0.009 }),
  ], { mutationOwned: true }),
  'multiplier-2': gesture('mutation', [
    ...marimbaStrike(523.25, 0.165, 0),
    ...marimbaStrike(659.25, 0.145, 0.052),
  ], { mutationOwned: true }),
  'multiplier-4': gesture('mutation', [
    ...marimbaStrike(523.25, 0.165, 0),
    ...marimbaStrike(659.25, 0.145, 0.052),
    ...marimbaStrike(1_046.5, 0.12, 0.104),
  ], { mutationOwned: true }),
};

export const AUDIO_CUE_IDS = Object.freeze(Object.keys(PALETTE) as CandidateAudioCueId[]);

export function audioCue(id: CandidateAudioCueId): CandidateAudioCue {
  return PALETTE[id];
}

export function cueDuration(cue: CandidateAudioCue): number {
  const toneDuration = cue.tones.reduce((longest, layer) => (
    Math.max(longest, (layer.delay ?? 0) + layer.duration)
  ), 0);
  const airDuration = (cue.air ?? []).reduce((longest, layer) => (
    Math.max(longest, (layer.delay ?? 0) + layer.duration)
  ), 0);
  return Math.max(toneDuration, airDuration);
}

export function cueEnergy(id: CandidateAudioCueId): number {
  const cue = audioCue(id);
  return cue.tones.reduce((total, layer) => total + layer.gain * layer.duration, 0)
    + (cue.air ?? []).reduce((total, layer) => total + layer.gain * layer.duration, 0);
}
