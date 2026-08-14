import { ACCEPTED_OUTPUT_GAIN } from '../../../../src/game/audio/acceptedPlayback';
import { T37_AUDIO_ASSETS } from '../../../../src/game/audio/audioAssetCatalog';
import {
  ANALYSIS_FRAMES,
  CANDIDATE_IDS,
  OFFLINE_RENDER_FRAMES,
  PRE_ROLL_FRAMES,
  R5A_GRAPH_CONTRACT,
  SAMPLE_RATE,
  STUDIO_EXCERPT,
  type CandidateId,
} from './candidateContract';
import { scheduleHardDropReference, scheduleStudioOneLineReference } from './candidateGraph';
import {
  decodeMonoPcm16Wav,
  measurePcm16Activity,
  measureSignal,
  metricFailures,
  type CompleteMeasurementReport,
  type SignalMetrics,
} from './signalMetrics';

declare global {
  interface Window {
    __R5A_METRIC_READY__: boolean;
    __R5A_METRIC_ERROR__: string | null;
    __R5A_METRIC__: { measure(): Promise<CompleteMeasurementReport & { graph: typeof R5A_GRAPH_CONTRACT }> };
  }
}

const status = document.querySelector<HTMLOutputElement>('#status');
if (!status) throw new Error('R5A metric harness status is missing.');

const candidateUrls: Record<CandidateId, string> = {
  A: new URL('./assets/A.wav', import.meta.url).href,
  B: new URL('./assets/B.wav', import.meta.url).href,
  C: new URL('./assets/C.wav', import.meta.url).href,
};

const toHex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)]
  .map((value) => value.toString(16).padStart(2, '0')).join('');

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`R5A metric fetch failed: ${response.status} ${url}`);
  return response.arrayBuffer();
}

function channelsIdentical(buffer: AudioBuffer): boolean {
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  if (left.length !== right.length) return false;
  for (let frame = 0; frame < left.length; frame += 1) if (left[frame] !== right[frame]) return false;
  return true;
}

async function candidateMeasurement(id: CandidateId) {
  const bytes = await fetchBytes(candidateUrls[id]);
  const { codes } = decodeMonoPcm16Wav(bytes.slice(0));
  const context = new OfflineAudioContext(2, ANALYSIS_FRAMES, SAMPLE_RATE);
  const decoded = await context.decodeAudioData(bytes.slice(0));
  if (decoded.sampleRate !== SAMPLE_RATE || decoded.numberOfChannels !== 1 || decoded.length !== ANALYSIS_FRAMES) {
    throw new Error(`${id} decoded stem shape drifted.`);
  }
  const source = context.createBufferSource();
  const gate = context.createGain();
  const output = context.createGain();
  source.buffer = decoded;
  gate.gain.value = 1;
  output.gain.value = ACCEPTED_OUTPUT_GAIN;
  source.connect(gate);
  gate.connect(output);
  output.connect(context.destination);
  source.start(0);
  const rendered = await context.startRendering();
  const stemHash = toHex(await crypto.subtle.digest('SHA-256', bytes.slice(0)));
  return {
    id,
    stemSha256: stemHash,
    stemFrames: decoded.length,
    leftRightIdentical: channelsIdentical(rendered),
    ...measurePcm16Activity(codes),
    ...measureSignal(new Float32Array(rendered.getChannelData(0))),
  };
}

async function referenceMeasurement(kind: 'hard-drop' | 'studio'): Promise<SignalMetrics & { leftRightIdentical: boolean }> {
  const context = new OfflineAudioContext(2, OFFLINE_RENDER_FRAMES, SAMPLE_RATE);
  const gate = context.createGain();
  const output = context.createGain();
  gate.gain.value = 1;
  output.gain.value = ACCEPTED_OUTPUT_GAIN;
  gate.connect(output);
  output.connect(context.destination);
  const startAt = PRE_ROLL_FRAMES / SAMPLE_RATE;
  if (kind === 'hard-drop') {
    scheduleHardDropReference(context, gate, startAt);
  } else {
    const bytes = await fetchBytes(T37_AUDIO_ASSETS.studioProgress.url);
    const hash = toHex(await crypto.subtle.digest('SHA-256', bytes.slice(0)));
    if (hash !== STUDIO_EXCERPT.sourceSha256) throw new Error(`Studio source SHA drifted: ${hash}`);
    const buffer = await context.decodeAudioData(bytes.slice(0));
    scheduleStudioOneLineReference(context, gate, buffer, startAt);
  }
  const rendered = await context.startRendering();
  const onset = new Float32Array(ANALYSIS_FRAMES);
  onset.set(rendered.getChannelData(0).subarray(PRE_ROLL_FRAMES, PRE_ROLL_FRAMES + ANALYSIS_FRAMES));
  return { ...measureSignal(onset), leftRightIdentical: channelsIdentical(rendered) };
}

async function measure(): Promise<CompleteMeasurementReport & { graph: typeof R5A_GRAPH_CONTRACT }> {
  const [A, B, C, hardDrop, studioOneLine] = await Promise.all([
    candidateMeasurement('A'), candidateMeasurement('B'), candidateMeasurement('C'),
    referenceMeasurement('hard-drop'), referenceMeasurement('studio'),
  ]);
  const candidates = { A, B, C };
  const peaks = CANDIDATE_IDS.map((id) => candidates[id].peak);
  const energyCeiling = Math.min(hardDrop.energy * 10 ** (3.1 / 10), studioOneLine.energy);
  const base = {
    candidates,
    references: { hardDrop, studioOneLine },
    peakSpreadDb: 20 * Math.log10(Math.max(...peaks) / Math.min(...peaks)),
    energyCeiling,
  };
  return { ...base, failures: metricFailures(base), graph: R5A_GRAPH_CONTRACT };
}

try {
  window.__R5A_METRIC__ = Object.freeze({ measure });
  window.__R5A_METRIC_ERROR__ = null;
  window.__R5A_METRIC_READY__ = true;
  status.value = 'ready';
} catch (error) {
  window.__R5A_METRIC_READY__ = false;
  window.__R5A_METRIC_ERROR__ = error instanceof Error ? error.message : String(error);
  status.value = window.__R5A_METRIC_ERROR__;
  throw error;
}
