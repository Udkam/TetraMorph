import type {
  AudioBus,
  AudioGesture,
  ProceduralInstrument,
  ProceduralLayer,
} from './audioGesture';

export type AudioCueId =
  | 'move' | 'rotate' | 'soft-drop' | 'hard-drop' | 'lock' | 'puzzle-undo'
  | 'clear-1' | 'clear-2' | 'clear-3' | 'clear-4'
  | 'bedrock-rise' | 'bedrock-lower' | 'stone-warning' | 'stone-spawn' | 'stone-land'
  | 'level-up' | 'finished' | 'game-over' | 'pause' | 'resume'
  | 'countdown-tick' | 'countdown-resolve'
  | 'freeze' | 'supergravity' | 'bomb' | 'multiplier-2' | 'multiplier-4';

type LayerOptions = Partial<Pick<
  ProceduralLayer,
  'delay' | 'endFrequency' | 'brightness' | 'spread' | 'seed' | 'attack' | 'release'
>>;

const voice = (
  instrument: ProceduralInstrument,
  frequency: number,
  duration: number,
  gain: number,
  options: LayerOptions = {},
): ProceduralLayer => ({
  kind: 'procedural',
  instrument,
  frequency,
  duration,
  gain,
  ...options,
});

const gesture = (
  bus: AudioBus,
  layers: readonly ProceduralLayer[],
  mutationOwned = false,
): AudioGesture => ({ bus, layers, mutationOwned });

const CONTROL_CUES: Readonly<Record<'move' | 'rotate' | 'soft-drop', AudioGesture>> = {
  move: gesture('gameplay', [
    voice('soft-contact', 248, 0.038, 0.068, {
      endFrequency: 214, brightness: 0.2, spread: 0.18, seed: 0x3701, release: 0.24,
    }),
    voice('wood', 318, 0.034, 0.02, {
      endFrequency: 276, brightness: 0.14, spread: 0.16, seed: 0x3702, release: 0.2,
    }),
  ]),
  rotate: gesture('gameplay', [
    voice('wood', 286, 0.056, 0.065, {
      endFrequency: 232, brightness: 0.2, spread: 0.28, seed: 0x3711, release: 0.3,
    }),
    voice('air-brush', 720, 0.064, 0.018, {
      delay: 0.002, endFrequency: 1_080, brightness: 0.18, spread: 0.32,
      seed: 0x3712, attack: 0.009, release: 0.38,
    }),
  ]),
  'soft-drop': gesture('gameplay', [
    voice('ribbon', 1_180, 0.046, 0.025, {
      endFrequency: 410, brightness: 0.2, spread: 0.24, seed: 0x1301, release: 0.28,
    }),
    voice('felt', 118, 0.041, 0.034, {
      endFrequency: 93, brightness: 0.18, spread: 0.16, seed: 0x1302, release: 0.3,
    }),
  ]),
};

const CONTACT_CUES: Readonly<Record<'hard-drop' | 'lock', AudioGesture>> = {
  lock: gesture('gameplay', [
    voice('ceramic', 174, 0.092, 0.085, {
      endFrequency: 142, brightness: 0.2, spread: 0.26, seed: 0x3721, release: 0.38,
    }),
    voice('soft-contact', 206, 0.052, 0.042, {
      delay: 0.002, endFrequency: 164, brightness: 0.2, spread: 0.22,
      seed: 0x3722, release: 0.28,
    }),
  ]),
  'hard-drop': gesture('gameplay', [
    voice('stone', 76, 0.17, 0.096, {
      endFrequency: 48, brightness: 0.2, spread: 0.36, seed: 0x3731, release: 0.38,
    }),
    voice('wood', 188, 0.082, 0.043, {
      delay: 0.003, endFrequency: 138, brightness: 0.2, spread: 0.3,
      seed: 0x3732, release: 0.34,
    }),
  ]),
};

const CLEAR_CUES: Readonly<Record<'clear-1' | 'clear-2' | 'clear-3' | 'clear-4', AudioGesture>> = {
  'clear-1': gesture('reward', [
    voice('ceramic', 246, 0.18, 0.09, {
      endFrequency: 282, brightness: 0.28, spread: 0.28, seed: 0x3741, release: 0.54,
    }),
    voice('air-brush', 620, 0.14, 0.034, {
      endFrequency: 1_080, brightness: 0.22, spread: 0.3, seed: 0x3742,
      attack: 0.014, release: 0.48,
    }),
  ]),
  'clear-2': gesture('reward', [
    voice('ceramic', 226, 0.23, 0.1, {
      endFrequency: 284, brightness: 0.32, spread: 0.34, seed: 0x3751, release: 0.56,
    }),
    voice('wood', 156, 0.17, 0.05, {
      delay: 0.014, endFrequency: 128, brightness: 0.16, spread: 0.28,
      seed: 0x3752, release: 0.44,
    }),
    voice('air-brush', 570, 0.19, 0.04, {
      endFrequency: 1_260, brightness: 0.24, spread: 0.4, seed: 0x3753,
      attack: 0.018, release: 0.52,
    }),
  ]),
  'clear-3': gesture('reward', [
    voice('ceramic', 206, 0.3, 0.115, {
      endFrequency: 292, brightness: 0.38, spread: 0.46, seed: 0x3761, release: 0.6,
    }),
    voice('stone', 112, 0.24, 0.065, {
      endFrequency: 76, brightness: 0.16, spread: 0.36, seed: 0x3762, release: 0.48,
    }),
    voice('air-brush', 500, 0.27, 0.052, {
      endFrequency: 1_480, brightness: 0.28, spread: 0.52, seed: 0x3763,
      attack: 0.024, release: 0.58,
    }),
  ]),
  'clear-4': gesture('reward', [
    voice('stone', 68, 0.52, 0.145, {
      endFrequency: 42, brightness: 0.18, spread: 0.56, seed: 0x3771,
      attack: 0.008, release: 0.54,
    }),
    voice('ceramic', 188, 0.46, 0.13, {
      delay: 0.026, endFrequency: 306, brightness: 0.44, spread: 0.62,
      seed: 0x3772, attack: 0.02, release: 0.66,
    }),
    voice('crystal-grain', 392, 0.36, 0.075, {
      delay: 0.075, endFrequency: 468, brightness: 0.48, spread: 0.58,
      seed: 0x3773, release: 0.68,
    }),
    voice('air-brush', 360, 0.43, 0.06, {
      delay: 0.018, endFrequency: 1_760, brightness: 0.32, spread: 0.66,
      seed: 0x3774, attack: 0.05, release: 0.64,
    }),
  ]),
};

const MUTATION_CUES: Readonly<Record<'freeze' | 'supergravity' | 'bomb' | 'multiplier-2' | 'multiplier-4', AudioGesture>> = {
  freeze: gesture('mutation', [
    voice('air-brush', 1_420, 0.34, 0.06, {
      endFrequency: 520, brightness: 0.34, spread: 0.54, seed: 0x3781,
      attack: 0.028, release: 0.64,
    }),
    voice('crystal-grain', 618, 0.4, 0.115, {
      delay: 0.025, endFrequency: 552, brightness: 0.62, spread: 0.58,
      seed: 0x3782, release: 0.72,
    }),
    voice('crystal-grain', 814, 0.24, 0.052, {
      delay: 0.08, endFrequency: 742, brightness: 0.56, spread: 0.46,
      seed: 0x3783, release: 0.68,
    }),
  ], true),
  supergravity: gesture('mutation', [
    voice('impact', 126, 0.48, 0.18, {
      endFrequency: 31, brightness: 0.15, spread: 0.72, seed: 0x4201,
      attack: 0.014, release: 0.48,
    }),
    voice('ribbon', 430, 0.36, 0.075, {
      delay: 0.018, endFrequency: 68, brightness: 0.18, spread: 0.55,
      seed: 0x4202, attack: 0.028, release: 0.55,
    }),
  ], true),
  bomb: gesture('mutation', [
    voice('ribbon', 116, 0.38, 0.1, {
      endFrequency: 840, brightness: 0.46, spread: 0.76, seed: 0x4301,
      attack: 0.06, release: 0.58,
    }),
    voice('impact', 74, 0.34, 0.2, {
      delay: 0.09, endFrequency: 39, brightness: 0.28, spread: 0.68,
      seed: 0x4302, release: 0.5,
    }),
    voice('glass', 284, 0.28, 0.07, {
      delay: 0.115, endFrequency: 226, brightness: 0.38, spread: 0.66,
      seed: 0x4303, release: 0.62,
    }),
  ], true),
  'multiplier-2': gesture('mutation', [
    voice('shimmer', 242, 0.42, 0.12, {
      endFrequency: 318, brightness: 0.58, spread: 0.54, seed: 0x4401, release: 0.62,
    }),
    voice('glass', 486, 0.32, 0.09, {
      delay: 0.03, endFrequency: 544, brightness: 0.52, spread: 0.5,
      seed: 0x4402, release: 0.66,
    }),
    voice('ribbon', 760, 0.32, 0.06, {
      endFrequency: 1_520, brightness: 0.38, spread: 0.5, seed: 0x4403,
      attack: 0.025, release: 0.58,
    }),
  ], true),
  'multiplier-4': gesture('mutation', [
    voice('shimmer', 218, 0.55, 0.14, {
      endFrequency: 362, brightness: 0.68, spread: 0.72, seed: 0x4501, release: 0.66,
    }),
    voice('glass', 438, 0.42, 0.105, {
      delay: 0.035, endFrequency: 552, brightness: 0.63, spread: 0.67,
      seed: 0x4502, release: 0.7,
    }),
    voice('ribbon', 620, 0.42, 0.075, {
      endFrequency: 1_980, brightness: 0.46, spread: 0.7, seed: 0x4503,
      attack: 0.035, release: 0.64,
    }),
    voice('impact', 116, 0.3, 0.05, {
      delay: 0.11, endFrequency: 72, brightness: 0.18, spread: 0.36,
      seed: 0x4504, release: 0.5,
    }),
  ], true),
};

const SECONDARY_CUES: Readonly<Record<Exclude<AudioCueId,
  keyof typeof CONTROL_CUES | keyof typeof CONTACT_CUES | keyof typeof CLEAR_CUES | keyof typeof MUTATION_CUES
>, AudioGesture>> = {
  'puzzle-undo': gesture('ui', [
    voice('ribbon', 980, 0.13, 0.035, {
      endFrequency: 310, brightness: 0.26, spread: 0.4, seed: 0x5101, release: 0.5,
    }),
    voice('felt', 226, 0.11, 0.048, {
      delay: 0.012, endFrequency: 177, brightness: 0.24, spread: 0.3,
      seed: 0x5102, release: 0.42,
    }),
  ]),
  'bedrock-rise': gesture('gameplay', [
    voice('impact', 58, 0.66, 0.105, {
      endFrequency: 79, brightness: 0.14, spread: 0.58, seed: 0x5201,
      attack: 0.08, release: 0.56,
    }),
    voice('ribbon', 128, 0.58, 0.04, {
      endFrequency: 330, brightness: 0.16, spread: 0.54, seed: 0x5202,
      attack: 0.12, release: 0.58,
    }),
  ]),
  'bedrock-lower': gesture('gameplay', [
    voice('impact', 82, 0.52, 0.092, {
      endFrequency: 48, brightness: 0.12, spread: 0.48, seed: 0x5301,
      attack: 0.04, release: 0.55,
    }),
    voice('ribbon', 290, 0.44, 0.035, {
      endFrequency: 92, brightness: 0.15, spread: 0.42, seed: 0x5302,
      attack: 0.06, release: 0.56,
    }),
  ]),
  'stone-warning': gesture('ui', [
    voice('pulse', 132, 0.1, 0.065, {
      endFrequency: 118, brightness: 0.22, spread: 0.26, seed: 0x5401, release: 0.44,
    }),
    voice('pulse', 132, 0.1, 0.058, {
      delay: 0.145, endFrequency: 118, brightness: 0.22, spread: 0.26,
      seed: 0x5402, release: 0.44,
    }),
  ]),
  'stone-spawn': gesture('gameplay', [
    voice('ribbon', 1_180, 0.15, 0.05, {
      endFrequency: 270, brightness: 0.24, spread: 0.36, seed: 0x5501, release: 0.52,
    }),
    voice('felt', 173, 0.12, 0.052, {
      delay: 0.01, endFrequency: 112, brightness: 0.22, spread: 0.32,
      seed: 0x5502, release: 0.45,
    }),
  ]),
  'stone-land': gesture('gameplay', [
    voice('impact', 61, 0.23, 0.14, {
      endFrequency: 39, brightness: 0.2, spread: 0.46, seed: 0x5601, release: 0.4,
    }),
    voice('felt', 151, 0.12, 0.06, {
      delay: 0.003, endFrequency: 101, brightness: 0.3, spread: 0.42,
      seed: 0x5602, release: 0.42,
    }),
  ]),
  'level-up': gesture('reward', [
    voice('shimmer', 196, 0.44, 0.12, {
      endFrequency: 302, brightness: 0.58, spread: 0.62, seed: 0x5701, release: 0.64,
    }),
    voice('glass', 402, 0.34, 0.085, {
      delay: 0.035, endFrequency: 478, brightness: 0.52, spread: 0.56,
      seed: 0x5702, release: 0.68,
    }),
    voice('ribbon', 420, 0.38, 0.052, {
      endFrequency: 1_820, brightness: 0.4, spread: 0.6, seed: 0x5703,
      attack: 0.04, release: 0.62,
    }),
  ]),
  finished: gesture('reward', [
    voice('impact', 76, 0.68, 0.12, {
      endFrequency: 48, brightness: 0.2, spread: 0.58, seed: 0x5801, release: 0.58,
    }),
    voice('shimmer', 176, 0.7, 0.135, {
      delay: 0.035, endFrequency: 324, brightness: 0.68, spread: 0.76,
      seed: 0x5802, release: 0.68,
    }),
    voice('glass', 352, 0.52, 0.09, {
      delay: 0.08, endFrequency: 496, brightness: 0.64, spread: 0.72,
      seed: 0x5803, release: 0.72,
    }),
  ]),
  'game-over': gesture('reward', [
    voice('impact', 112, 0.42, 0.1, {
      endFrequency: 54, brightness: 0.14, spread: 0.52, seed: 0x5901, release: 0.52,
    }),
    voice('ribbon', 620, 0.4, 0.052, {
      endFrequency: 140, brightness: 0.18, spread: 0.48, seed: 0x5902,
      attack: 0.04, release: 0.6,
    }),
  ]),
  pause: gesture('ui', [
    voice('felt', 178, 0.105, 0.052, {
      endFrequency: 142, brightness: 0.2, spread: 0.26, seed: 0x5a01, release: 0.46,
    }),
    voice('ribbon', 520, 0.11, 0.024, {
      endFrequency: 240, brightness: 0.18, spread: 0.3, seed: 0x5a02, release: 0.52,
    }),
  ]),
  resume: gesture('ui', [
    voice('felt', 162, 0.11, 0.054, {
      endFrequency: 194, brightness: 0.22, spread: 0.28, seed: 0x5b01, release: 0.48,
    }),
    voice('ribbon', 270, 0.12, 0.026, {
      endFrequency: 740, brightness: 0.22, spread: 0.34, seed: 0x5b02, release: 0.52,
    }),
  ]),
  'countdown-tick': gesture('ui', [
    voice('wood', 224, 0.14, 0.092, {
      endFrequency: 192, brightness: 0.2, spread: 0.24, seed: 0x3791, release: 0.48,
    }),
    voice('soft-contact', 318, 0.07, 0.034, {
      endFrequency: 264, brightness: 0.16, spread: 0.18, seed: 0x3792, release: 0.32,
    }),
  ]),
  'countdown-resolve': gesture('ui', [
    voice('wood', 196, 0.25, 0.118, {
      endFrequency: 158, brightness: 0.22, spread: 0.32, seed: 0x37a1, release: 0.62,
    }),
    voice('ceramic', 342, 0.22, 0.05, {
      delay: 0.018, endFrequency: 296, brightness: 0.26, spread: 0.34,
      seed: 0x37a2, release: 0.64,
    }),
  ]),
};

const PALETTE: Readonly<Record<AudioCueId, AudioGesture>> = {
  ...CONTROL_CUES,
  ...CONTACT_CUES,
  ...CLEAR_CUES,
  ...MUTATION_CUES,
  ...SECONDARY_CUES,
};

export const AUDIO_CUE_IDS = Object.freeze(Object.keys(PALETTE) as AudioCueId[]);

export function audioCue(id: AudioCueId): AudioGesture {
  return PALETTE[id];
}

export function cueEnergy(id: AudioCueId): number {
  return audioCue(id).layers.reduce((total, layer) => total + layer.gain * layer.duration, 0);
}
