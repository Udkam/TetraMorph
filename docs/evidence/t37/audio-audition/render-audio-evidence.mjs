import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { transformWithOxc } from 'vite';

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceDir, '..', '..', '..', '..');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
}).trim();
const sampleRate = 48_000;
const masterGain = 1.42;
const busLevels = { gameplay: 0.9, reward: 1, mutation: 0.96, ambient: 0.14, ui: 0.7 };
const auditionCueIds = new Set([
  'move', 'rotate', 'lock', 'hard-drop',
  'clear-1', 'clear-2', 'clear-3', 'clear-4',
  'countdown-tick', 'countdown-resolve', 'freeze',
]);

const suites = [
  {
    file: '01-controls-repeat.wav',
    description: 'Fast move and rotate repetition. Judge tactility, separation, and fatigue at realistic input density.',
    cues: [
      ['move', 0.16], ['move', 0.24], ['move', 0.32], ['move', 0.40],
      ['move', 0.48], ['move', 0.56], ['rotate', 0.78], ['rotate', 0.90],
      ['move', 1.14], ['rotate', 1.28],
    ],
  },
  {
    file: '02-contact-reward-ladder.wav',
    description: 'Lock, hard drop, then one- through four-line clears. Judge physical weight and positive hierarchy without sharpness.',
    cues: [
      ['lock', 0.16], ['hard-drop', 0.58], ['clear-1', 1.06],
      ['clear-2', 1.72], ['clear-3', 2.48], ['clear-4', 3.34],
    ],
    tailSeconds: 0.52,
  },
  {
    file: '03-countdown.wav',
    description: 'Two related ticks and one longer resolving strike. Judge calm readiness rather than notification or melody.',
    cues: [
      ['countdown-tick', 0.20], ['countdown-tick', 1.20], ['countdown-resolve', 2.20],
    ],
    tailSeconds: 0.72,
  },
  {
    file: '04-ice-material.wav',
    description: 'Two isolated Ice activations. Judge restrained crystal identity, grain, and repeat comfort.',
    cues: [['freeze', 0.18], ['freeze', 1.24]],
    tailSeconds: 0.52,
  },
  {
    file: '05-play-cadence.wav',
    description: 'Representative play cadence for masking, contact-to-reward hierarchy, and Ice identity in context.',
    cues: [
      ['move', 0.16], ['move', 0.25], ['rotate', 0.39], ['hard-drop', 0.64],
      ['clear-1', 1.02], ['move', 1.56], ['rotate', 1.70], ['hard-drop', 1.94],
      ['clear-2', 2.32], ['freeze', 2.94], ['move', 3.54], ['hard-drop', 3.80],
      ['clear-4', 4.20],
    ],
    tailSeconds: 0.52,
  },
];

async function importTypeScript(relativePath) {
  const source = await readFile(path.join(repositoryRoot, relativePath), 'utf8');
  const { code: output } = await transformWithOxc(source, relativePath);
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

function encodeWav(samples, targetRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(44 + index * 2, Math.round(value < 0 ? value * 32768 : value * 32767), true);
  }
  return Buffer.from(buffer);
}

function compressSample(sample) {
  const threshold = 10 ** (-3 / 20);
  const magnitude = Math.abs(sample);
  if (magnitude <= threshold) return sample;
  const compressed = threshold + (magnitude - threshold) / 2.2;
  return Math.sign(sample) * compressed;
}

function analyze(samples) {
  let peak = 0;
  let squareSum = 0;
  let sum = 0;
  let clippedSamples = 0;
  let finiteSamples = true;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) finiteSamples = false;
    const magnitude = Math.abs(sample);
    peak = Math.max(peak, magnitude);
    squareSum += sample * sample;
    sum += sample;
    if (magnitude >= 0.999) clippedSamples += 1;
  }
  return {
    peak,
    rms: Math.sqrt(squareSum / Math.max(1, samples.length)),
    dcOffset: sum / Math.max(1, samples.length),
    clippedSamples,
    finiteSamples,
  };
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function asMarkdown(manifest) {
  const rows = manifest.files.map((item) => (
    `| [${item.file}](./${item.file}) | ${item.durationSeconds.toFixed(2)} s | ${item.peak.toFixed(4)} | ${item.rms.toFixed(4)} | ${item.clippedSamples} | ${item.repetitionDensity.toFixed(2)} cues/s | ${item.description} |`
  ));
  return [
    '# T37 Tactile Material Audio Audition',
    '',
    'These mono 48 kHz WAV files are rendered directly from the production `audioPalette` and `renderProceduralSamples` implementation at the source SHA below.',
    'The one-shot renderer applies the production bus/master gains and compressor transfer. It starts no server, browser, watcher, or audio device.',
    `Source SHA: \`${manifest.sourceSha}\``,
    '',
    'Automated integrity checks passed: all samples are finite, every procedural layer has zero-valued endpoints, two independent renders produce byte-identical WAV output, peaks are bounded, and no sample clips.',
    '',
    '| File | Duration | Peak | RMS | Clipped samples | Density | Listen for |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ...rows,
    '',
    '## Cue boundaries',
    '',
    ...manifest.files.map((item) => (
      `- **${item.file}:** ${item.cueBoundaries.map((cue) => `${cue.id} ${cue.startSeconds.toFixed(2)}-${cue.endSeconds.toFixed(2)} s`).join('; ')}`
    )),
    '',
    'Human listening remains the acceptance boundary. These measurements reject broken renders; they cannot approve timbre, balance, fatigue, material identity, or device loudness.',
    '',
  ].join('\n');
}

const gestureModule = await importTypeScript('src/game/audio/audioGesture.ts');
const paletteModule = await importTypeScript('src/game/audio/audioPalette.ts');
const { gestureDuration, renderProceduralSamples } = gestureModule;
const { audioCue } = paletteModule;

function renderSuite(suite) {
  const longest = suite.cues.reduce((end, [id, at]) => (
    Math.max(end, at + gestureDuration(audioCue(id)))
  ), 0);
  const durationSeconds = longest + (suite.tailSeconds ?? 0.36);
  const mixed = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  const cueBoundaries = [];
  let zeroLayerEndpoints = true;

  for (const [id, at] of suite.cues) {
    if (!auditionCueIds.has(id)) {
      throw new Error(`T37 audition suite includes out-of-scope cue ${id}`);
    }
    const cue = audioCue(id);
    const cueEnd = at + gestureDuration(cue);
    cueBoundaries.push({ id, startSeconds: at, endSeconds: cueEnd });
    for (const layer of cue.layers) {
      if (layer.kind !== 'procedural') {
        throw new Error(`T37 audition encountered non-procedural layer in ${id}`);
      }
      const voice = renderProceduralSamples(layer, sampleRate);
      zeroLayerEndpoints &&= voice[0] === 0 && voice[voice.length - 1] === 0;
      const offset = Math.round((at + (layer.delay ?? 0)) * sampleRate);
      const level = layer.gain * busLevels[cue.bus] * masterGain;
      for (let index = 0; index < voice.length && offset + index < mixed.length; index += 1) {
        mixed[offset + index] += (voice[index] ?? 0) * level;
      }
    }
  }

  for (let index = 0; index < mixed.length; index += 1) {
    mixed[index] = compressSample(mixed[index] ?? 0);
  }
  const metrics = analyze(mixed);
  const wav = encodeWav(mixed, sampleRate);
  return {
    wav,
    metadata: {
      file: suite.file,
      description: suite.description,
      sequence: suite.cues.map(([id]) => id),
      cueBoundaries,
      durationSeconds,
      repetitionDensity: suite.cues.length / durationSeconds,
      zeroLayerEndpoints,
      ...metrics,
    },
  };
}

await mkdir(evidenceDir, { recursive: true });
const rendered = [];
for (const suite of suites) {
  const first = renderSuite(suite);
  const second = renderSuite(suite);
  const deterministicWavBytes = first.wav.equals(second.wav);
  const metadata = {
    ...first.metadata,
    sha256: sha256(first.wav),
    deterministicWavBytes,
  };
  if (!metadata.finiteSamples
      || !metadata.zeroLayerEndpoints
      || !metadata.deterministicWavBytes
      || metadata.clippedSamples !== 0
      || metadata.peak >= 0.999) {
    throw new Error(`T37 audition integrity check failed for ${suite.file}`);
  }
  await writeFile(path.join(evidenceDir, suite.file), first.wav);
  rendered.push(metadata);
}

const manifest = {
  sourceSha,
  generatedAt: new Date().toISOString(),
  renderer: 'one-shot Node renderer using production audioPalette + renderProceduralSamples, production bus/master gains, and static production compressor transfer',
  sampleRate,
  checks: {
    finiteSamples: rendered.every((item) => item.finiteSamples),
    zeroLayerEndpoints: rendered.every((item) => item.zeroLayerEndpoints),
    deterministicWavBytes: rendered.every((item) => item.deterministicWavBytes),
    boundedPeaks: rendered.every((item) => item.peak < 0.999),
    clippedSamples: rendered.reduce((total, item) => total + item.clippedSamples, 0),
  },
  files: rendered,
};
await writeFile(path.join(evidenceDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(path.join(evidenceDir, 'README.md'), asMarkdown(manifest), 'utf8');
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
