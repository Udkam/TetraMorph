import { ANALYSIS_FRAMES, SAMPLE_RATE, type CandidateId } from './candidateContract';

export interface Pcm16Activity {
  firstNonZeroFrame: number;
  lastNonZeroFrame: number;
  activityMs: number;
  lastNonZeroMs: number;
}

export interface SignalMetrics {
  peak: number;
  peakFrame: number;
  peakTimeMs: number;
  attackMs: number;
  energy: number;
  rms: number;
  maxRms10Ms: number;
  maxRms50Ms: number;
  energyEnd99Ms: number;
  below120Percent: number;
  atOrAbove2000Percent: number;
}

export interface CandidateMeasurement extends SignalMetrics, Pcm16Activity {
  id: CandidateId;
  stemSha256: string;
  stemFrames: number;
  leftRightIdentical: boolean;
}

export interface CompleteMeasurementReport {
  candidates: Record<CandidateId, CandidateMeasurement>;
  references: {
    hardDrop: SignalMetrics & { leftRightIdentical: boolean };
    studioOneLine: SignalMetrics & { leftRightIdentical: boolean };
  };
  peakSpreadDb: number;
  energyCeiling: number;
  failures: string[];
}

export function decodeMonoPcm16Wav(bytes: ArrayBuffer): { codes: Int16Array; samples: Float32Array } {
  const view = new DataView(bytes);
  const ascii = (offset: number, length: number): string => String.fromCharCode(
    ...new Uint8Array(bytes, offset, length),
  );
  if (bytes.byteLength !== 17_324 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') {
    throw new Error(`R5A stem is not the exact 17,324-byte RIFF/WAVE shape (${bytes.byteLength}).`);
  }
  if (view.getUint16(20, true) !== 1 || view.getUint16(22, true) !== 1
    || view.getUint32(24, true) !== SAMPLE_RATE || view.getUint16(34, true) !== 16
    || ascii(36, 4) !== 'data' || view.getUint32(40, true) !== ANALYSIS_FRAMES * 2) {
    throw new Error('R5A stem PCM header drifted.');
  }
  const codes = new Int16Array(ANALYSIS_FRAMES);
  const samples = new Float32Array(ANALYSIS_FRAMES);
  for (let frame = 0; frame < ANALYSIS_FRAMES; frame += 1) {
    const code = view.getInt16(44 + frame * 2, true);
    codes[frame] = code;
    samples[frame] = code < 0 ? code / 32_768 : code / 32_767;
  }
  return { codes, samples };
}

export function measurePcm16Activity(codes: Int16Array): Pcm16Activity {
  let firstNonZeroFrame = -1;
  let lastNonZeroFrame = -1;
  for (let frame = 0; frame < codes.length; frame += 1) {
    if (codes[frame] === 0) continue;
    if (firstNonZeroFrame < 0) firstNonZeroFrame = frame;
    lastNonZeroFrame = frame;
  }
  return {
    firstNonZeroFrame,
    lastNonZeroFrame,
    activityMs: firstNonZeroFrame < 0 ? 0 : (lastNonZeroFrame - firstNonZeroFrame) / 48,
    lastNonZeroMs: lastNonZeroFrame < 0 ? 0 : lastNonZeroFrame / 48,
  };
}

function maximumWindowRms(samples: Float32Array, windowFrames: number): number {
  let energy = 0;
  let maximum = 0;
  for (let frame = 0; frame < samples.length; frame += 1) {
    const sample = samples[frame] ?? 0;
    energy += sample * sample;
    if (frame >= windowFrames) {
      const expired = samples[frame - windowFrames] ?? 0;
      energy -= expired * expired;
    }
    if (frame >= windowFrames - 1) maximum = Math.max(maximum, Math.sqrt(Math.max(0, energy) / windowFrames));
  }
  return maximum;
}

function fftPower(samples: Float32Array): Float64Array {
  const size = 16_384;
  if (samples.length !== ANALYSIS_FRAMES) throw new Error(`R5A metrics require ${ANALYSIS_FRAMES} frames.`);
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  for (let frame = 0; frame < samples.length; frame += 1) {
    const hann = 0.5 - 0.5 * Math.cos(2 * Math.PI * frame / (ANALYSIS_FRAMES - 1));
    real[frame] = (samples[frame] ?? 0) * hann;
  }
  for (let index = 1, reverse = 0; index < size; index += 1) {
    let bit = size >> 1;
    for (; reverse & bit; bit >>= 1) reverse ^= bit;
    reverse ^= bit;
    if (index < reverse) {
      [real[index], real[reverse]] = [real[reverse] ?? 0, real[index] ?? 0];
      [imaginary[index], imaginary[reverse]] = [imaginary[reverse] ?? 0, imaginary[index] ?? 0];
    }
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = -2 * Math.PI / length;
    const stepReal = Math.cos(angle);
    const stepImaginary = Math.sin(angle);
    for (let offset = 0; offset < size; offset += length) {
      let wr = 1;
      let wi = 0;
      for (let index = 0; index < length / 2; index += 1) {
        const even = offset + index;
        const odd = even + length / 2;
        const oddReal = (real[odd] ?? 0) * wr - (imaginary[odd] ?? 0) * wi;
        const oddImaginary = (real[odd] ?? 0) * wi + (imaginary[odd] ?? 0) * wr;
        const evenReal = real[even] ?? 0;
        const evenImaginary = imaginary[even] ?? 0;
        real[even] = evenReal + oddReal;
        imaginary[even] = evenImaginary + oddImaginary;
        real[odd] = evenReal - oddReal;
        imaginary[odd] = evenImaginary - oddImaginary;
        const nextWr = wr * stepReal - wi * stepImaginary;
        wi = wr * stepImaginary + wi * stepReal;
        wr = nextWr;
      }
    }
  }
  const power = new Float64Array(size / 2 + 1);
  for (let bin = 0; bin < power.length; bin += 1) {
    power[bin] = (real[bin] ?? 0) ** 2 + (imaginary[bin] ?? 0) ** 2;
  }
  return power;
}

export function measureSignal(samples: Float32Array): SignalMetrics {
  if (samples.length !== ANALYSIS_FRAMES) throw new Error(`R5A metrics require ${ANALYSIS_FRAMES} frames.`);
  let peak = 0;
  let peakFrame = 0;
  let energy = 0;
  for (let frame = 0; frame < samples.length; frame += 1) {
    const sample = samples[frame] ?? 0;
    const absolute = Math.abs(sample);
    energy += sample * sample;
    if (absolute > peak) { peak = absolute; peakFrame = frame; }
  }
  const attackThreshold = peak * 0.1;
  let attackStart = 0;
  while (attackStart < peakFrame && Math.abs(samples[attackStart] ?? 0) < attackThreshold) attackStart += 1;
  let cumulative = 0;
  let energyEnd99Ms = 0;
  for (let frame = 0; frame < samples.length; frame += 1) {
    const sample = samples[frame] ?? 0;
    cumulative += sample * sample;
    if (cumulative >= energy * 0.99) { energyEnd99Ms = (frame + 1) / 48; break; }
  }
  const power = fftPower(samples);
  let spectralTotal = 0;
  let low = 0;
  let high = 0;
  for (let bin = 1; bin < power.length; bin += 1) {
    const frequency = bin * SAMPLE_RATE / 16_384;
    const value = power[bin] ?? 0;
    spectralTotal += value;
    if (frequency < 120) low += value;
    if (frequency >= 2_000) high += value;
  }
  return {
    peak,
    peakFrame,
    peakTimeMs: peakFrame / 48,
    attackMs: (peakFrame - attackStart) / 48,
    energy,
    rms: Math.sqrt(energy / samples.length),
    maxRms10Ms: maximumWindowRms(samples, 480),
    maxRms50Ms: maximumWindowRms(samples, 2_400),
    energyEnd99Ms,
    below120Percent: spectralTotal > 0 ? low / spectralTotal * 100 : 0,
    atOrAbove2000Percent: spectralTotal > 0 ? high / spectralTotal * 100 : 0,
  };
}

export function metricFailures(report: Omit<CompleteMeasurementReport, 'failures'>): string[] {
  const failures: string[] = [];
  const between = (value: number, minimum: number, maximum: number, label: string): void => {
    if (value < minimum || value > maximum) failures.push(`${label}: ${value}`);
  };
  for (const [id, candidate] of Object.entries(report.candidates) as [CandidateId, CandidateMeasurement][]) {
    between(candidate.peak, 0.165, 0.196, `${id} peak`);
    if (candidate.peak > 0.2) failures.push(`${id} absolute peak: ${candidate.peak}`);
    between(candidate.maxRms10Ms, 0.075, 0.105, `${id} 10ms RMS`);
    between(candidate.maxRms50Ms, 0.042, 0.060, `${id} 50ms RMS`);
    if (candidate.energy < report.references.hardDrop.energy || candidate.energy > report.energyCeiling) failures.push(`${id} energy: ${candidate.energy}`);
    if (candidate.attackMs < 4) failures.push(`${id} attack: ${candidate.attackMs}`);
    between(candidate.activityMs, 60, 135, `${id} PCM16 activity`);
    if (candidate.lastNonZeroMs > 135) failures.push(`${id} last nonzero: ${candidate.lastNonZeroMs}`);
    if (candidate.energyEnd99Ms > 135) failures.push(`${id} t99: ${candidate.energyEnd99Ms}`);
    if (candidate.below120Percent > 3) failures.push(`${id} below 120Hz: ${candidate.below120Percent}`);
    if (candidate.atOrAbove2000Percent > 1) failures.push(`${id} at/above 2kHz: ${candidate.atOrAbove2000Percent}`);
    if (!candidate.leftRightIdentical) failures.push(`${id} output channels differ`);
  }
  if (report.peakSpreadDb > 0.5) failures.push(`peak spread: ${report.peakSpreadDb}`);
  return failures;
}
