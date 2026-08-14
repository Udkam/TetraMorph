import {
  ACCEPTED_OUTPUT_GAIN,
  ACTION_A_CONTRACT,
  STUDIO_CLEAR_CONTRACT,
  STUDIO_COMPRESSOR_CONTRACT,
} from '../../../../src/game/audio/acceptedPlayback';
import type { AudioGesture, ProceduralLayer } from '../../../../src/game/audio/audioGesture';
import { T37_AUDIO_ASSETS } from '../../../../src/game/audio/audioAssetCatalog';

export type CandidateId = 'A' | 'B' | 'C';

export const R5A_PROVENANCE = Object.freeze({
  reviewRangeBaseSha: 'b11b7b552f1504094a94ccc5e21410a694bf2881',
  contractAcceptedSha: '8f29bb82f40fac00764d1be822875368f426145c',
  authorizationSha: '265b697a1707b89a128fdfe9f15b22076b02d587',
  currentProductSourceSha: 'b11b7b552f1504094a94ccc5e21410a694bf2881',
});

export const R5A_SOURCE_ALLOWLIST = Object.freeze([
  '.gitattributes',
  'README.md',
  'candidateContract.ts',
  'candidateGraph.ts',
  'render-harness.html',
  'render-harness.ts',
  'render-candidates.mjs',
  'audioSession.ts',
  'signalMetrics.ts',
  'metric-harness.html',
  'metric-harness.ts',
  'fixture.ts',
  'fixture-harness.html',
  'fixture-harness.ts',
  'audition.ts',
  'index.html',
  'styles.css',
  'browser-smoke.mjs',
  'client-actions.json',
  'write-manifest.mjs',
  'verify.mjs',
] as const);

export const R5A_GENERATED_ALLOWLIST = Object.freeze([
  'assets/A.wav',
  'assets/B.wav',
  'assets/C.wav',
  'manifest.json',
  'verification-report.json',
  'browser-report.json',
  'client-smoke/shot-0.png',
  'client-smoke/shot-1.png',
  'client-smoke/shot-2.png',
  'client-smoke/state-0.json',
  'client-smoke/state-1.json',
  'client-smoke/state-2.json',
  'r5a-desktop-impact.png',
  'r5a-mobile.png',
  'r5a-reduced-technical.png',
] as const);

export const SAMPLE_RATE = 48_000;
export const PRE_ROLL_SECONDS = 0.5;
export const ANALYSIS_SECONDS = 0.18;
export const ANALYSIS_FRAMES = 8_640;
export const PRE_ROLL_FRAMES = 24_000;
export const OFFLINE_RENDER_FRAMES = PRE_ROLL_FRAMES + ANALYSIS_FRAMES;
export const PINNED_PLAYWRIGHT_VERSION = '1.61.1';
export const PINNED_CHROMIUM_VERSION = '149.0.7827.55';

export const CANDIDATE_IDS = Object.freeze(['A', 'B', 'C'] as const);
export const CANDIDATE_TRIMS: Readonly<Record<CandidateId, number>> = Object.freeze({
  A: 0.9793104026564039,
  B: 0.4452,
  C: 0.8625147192924494,
});
export const CANDIDATE_SOURCE_RESERVATIONS: Readonly<Record<CandidateId, number>> = Object.freeze({
  A: 4,
  B: 3,
  C: 1,
});

export const ACTION_STACK = Object.freeze({
  atoms: Object.freeze([
    Object.freeze({ cue: 'hard-drop' as const, delaySeconds: 0, pan: 0 }),
    Object.freeze({ cue: 'lock' as const, delaySeconds: 0.009, pan: 0 }),
    Object.freeze({ cue: 'move' as const, delaySeconds: 0.018, pan: 0 }),
  ]),
});

export const STUDIO_EXCERPT = Object.freeze({
  delaySeconds: 0.012,
  rate: STUDIO_CLEAR_CONTRACT.rate,
  targetPeak: STUDIO_CLEAR_CONTRACT.targetPeak[1],
  pan: 0,
  maxDuration: 0.117,
  fadeSeconds: 0.02106,
  stopAfterEndSeconds: 0.006,
  sourceAssetId: 'studioProgress' as const,
  sourceSha256: T37_AUDIO_ASSETS.studioProgress.sha256,
});

export const COMPACT_KNOCK_LAYER: Readonly<ProceduralLayer> = Object.freeze({
  kind: 'procedural',
  instrument: 'countdown-knock',
  duration: 0.070,
  gain: 0.250,
  attack: 0.006,
  release: 0.240,
  frequency: 440,
  brightness: 0.20,
  spread: 1,
  seed: 0x544d3336,
});

export const COMPACT_KNOCK_GESTURE: Readonly<AudioGesture> = Object.freeze({
  bus: 'mutation',
  mutationOwned: true,
  layers: Object.freeze([COMPACT_KNOCK_LAYER]),
});

export const R5A_GRAPH_CONTRACT = Object.freeze({
  actionMaster: ACTION_A_CONTRACT.masterGain,
  actionCompressor: ACTION_A_CONTRACT.compressor,
  studioCompressor: STUDIO_COMPRESSOR_CONTRACT,
  mutationBus: 0.96,
  candidateEffects: 1,
  candidateMaster: ACTION_A_CONTRACT.masterGain,
  candidateTrim: CANDIDATE_TRIMS,
  enabledGate: 1,
  outputVolume: 1,
  output: ACCEPTED_OUTPUT_GAIN,
});

export function assertFrozenCandidateContract(): void {
  const fail = (message: string): never => { throw new Error(`R5A contract drift: ${message}`); };
  if (SAMPLE_RATE !== 48_000 || PRE_ROLL_FRAMES !== 24_000 || ANALYSIS_FRAMES !== 8_640) fail('sample window');
  if (ACTION_A_CONTRACT.masterGain !== 1.85) fail('Action master');
  if (JSON.stringify(ACTION_A_CONTRACT.compressor) !== JSON.stringify({
    threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12,
  })) fail('Action compressor');
  if (JSON.stringify(STUDIO_COMPRESSOR_CONTRACT) !== JSON.stringify({
    threshold: -10, knee: 10, ratio: 4, attack: 0.003, release: 0.12,
  })) fail('Studio compressor');
  if (STUDIO_EXCERPT.rate !== 1.18 || STUDIO_EXCERPT.targetPeak !== 0.5 || STUDIO_EXCERPT.maxDuration !== 0.117) fail('Studio excerpt');
  if ('endFrequency' in COMPACT_KNOCK_LAYER) fail('compact knock glide');
  if (ACCEPTED_OUTPUT_GAIN !== 0.78) fail('global output');
}
