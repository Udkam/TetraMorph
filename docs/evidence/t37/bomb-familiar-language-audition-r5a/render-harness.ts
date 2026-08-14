import { T37_AUDIO_ASSETS } from '../../../../src/game/audio/audioAssetCatalog';
import {
  ANALYSIS_FRAMES,
  CANDIDATE_IDS,
  CANDIDATE_SOURCE_RESERVATIONS,
  OFFLINE_RENDER_FRAMES,
  PRE_ROLL_FRAMES,
  SAMPLE_RATE,
  STUDIO_EXCERPT,
  assertFrozenCandidateContract,
  type CandidateId,
} from './candidateContract';
import { scheduleCandidateGraph } from './candidateGraph';

interface RenderPass {
  wavBase64: string;
  wavSha256: string;
  byteLength: number;
  leftRightIdentical: boolean;
  reservedSources: number;
  scheduledSources: number;
  firstNonZeroFrame: number;
  lastNonZeroFrame: number;
}

interface CandidateRenderResult {
  id: CandidateId;
  deterministic: boolean;
  runHashes: readonly [string, string];
  runByteLengths: readonly [number, number];
  leftRightIdentical: boolean;
  reservedSources: number;
  scheduledSources: number;
  wavBase64: string;
  wavSha256: string;
  firstNonZeroFrame: number;
  lastNonZeroFrame: number;
}

declare global {
  interface Window {
    __R5A_RENDER_READY__: boolean;
    __R5A_RENDER_ERROR__: string | null;
    __R5A_RENDER__: {
      renderCandidate(id: CandidateId): Promise<CandidateRenderResult>;
      renderAll(): Promise<{
        sampleRate: number;
        preRollFrames: number;
        analysisFrames: number;
        studioSourceSha256: string;
        candidates: Record<CandidateId, CandidateRenderResult>;
      }>;
    };
  }
}

const status = document.querySelector<HTMLOutputElement>('#status');
if (!status) throw new Error('R5A render harness status is missing.');

const hex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)]
  .map((value) => value.toString(16).padStart(2, '0')).join('');

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return hex(await crypto.subtle.digest('SHA-256', copy.buffer));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x4000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
  }
  return btoa(binary);
}

function encodeMonoPcm16Wav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(44 + index * 2, Math.round(sample * (sample < 0 ? 32_768 : 32_767)), true);
  }
  return bytes;
}

let studioBytesPromise: Promise<ArrayBuffer> | null = null;
async function studioBytes(): Promise<ArrayBuffer> {
  if (!studioBytesPromise) {
    studioBytesPromise = fetch(T37_AUDIO_ASSETS.studioProgress.url, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Studio source fetch failed: ${response.status}`);
        const bytes = await response.arrayBuffer();
        const actual = hex(await crypto.subtle.digest('SHA-256', bytes));
        if (actual !== STUDIO_EXCERPT.sourceSha256) throw new Error(`Studio source SHA drifted: ${actual}`);
        return bytes;
      });
  }
  return studioBytesPromise;
}

async function renderOnce(id: CandidateId): Promise<RenderPass> {
  const context = new OfflineAudioContext(2, OFFLINE_RENDER_FRAMES, SAMPLE_RATE);
  const studioBuffer = id === 'B' ? await context.decodeAudioData((await studioBytes()).slice(0)) : undefined;
  const scheduled = scheduleCandidateGraph(context, context.destination, id, {
    startAt: PRE_ROLL_FRAMES / SAMPLE_RATE,
    studioBuffer,
    availableSources: CANDIDATE_SOURCE_RESERVATIONS[id],
  });
  const rendered = await context.startRendering();
  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  let leftRightIdentical = left.length === right.length;
  for (let index = 0; leftRightIdentical && index < left.length; index += 1) {
    if (left[index] !== right[index]) leftRightIdentical = false;
  }
  const onset = new Float32Array(ANALYSIS_FRAMES);
  onset.set(left.subarray(PRE_ROLL_FRAMES, PRE_ROLL_FRAMES + ANALYSIS_FRAMES));
  const wav = encodeMonoPcm16Wav(onset);
  const pcm = new DataView(wav.buffer, wav.byteOffset + 44, wav.byteLength - 44);
  let firstNonZeroFrame = -1;
  let lastNonZeroFrame = -1;
  for (let frame = 0; frame < ANALYSIS_FRAMES; frame += 1) {
    if (pcm.getInt16(frame * 2, true) === 0) continue;
    if (firstNonZeroFrame < 0) firstNonZeroFrame = frame;
    lastNonZeroFrame = frame;
  }
  return {
    wavBase64: bytesToBase64(wav),
    wavSha256: await sha256(wav),
    byteLength: wav.byteLength,
    leftRightIdentical,
    reservedSources: scheduled.reservedSources,
    scheduledSources: scheduled.voices.length,
    firstNonZeroFrame,
    lastNonZeroFrame,
  };
}

async function renderCandidate(id: CandidateId): Promise<CandidateRenderResult> {
  if (!CANDIDATE_IDS.includes(id)) throw new Error(`Unknown R5A candidate ${String(id)}`);
  const [first, second] = await Promise.all([renderOnce(id), renderOnce(id)]);
  return {
    id,
    deterministic: first.wavBase64 === second.wavBase64,
    runHashes: [first.wavSha256, second.wavSha256],
    runByteLengths: [first.byteLength, second.byteLength],
    leftRightIdentical: first.leftRightIdentical && second.leftRightIdentical,
    reservedSources: first.reservedSources,
    scheduledSources: first.scheduledSources,
    wavBase64: first.wavBase64,
    wavSha256: first.wavSha256,
    firstNonZeroFrame: first.firstNonZeroFrame,
    lastNonZeroFrame: first.lastNonZeroFrame,
  };
}

async function renderAll() {
  const [A, B, C] = await Promise.all(CANDIDATE_IDS.map(renderCandidate));
  return {
    sampleRate: SAMPLE_RATE,
    preRollFrames: PRE_ROLL_FRAMES,
    analysisFrames: ANALYSIS_FRAMES,
    studioSourceSha256: STUDIO_EXCERPT.sourceSha256,
    candidates: { A, B, C },
  };
}

try {
  assertFrozenCandidateContract();
  window.__R5A_RENDER__ = Object.freeze({ renderCandidate, renderAll });
  window.__R5A_RENDER_ERROR__ = null;
  window.__R5A_RENDER_READY__ = true;
  status.value = 'ready';
} catch (error) {
  window.__R5A_RENDER_READY__ = false;
  window.__R5A_RENDER_ERROR__ = error instanceof Error ? error.message : String(error);
  status.value = window.__R5A_RENDER_ERROR__;
  throw error;
}
