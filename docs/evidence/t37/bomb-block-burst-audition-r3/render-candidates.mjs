import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CANDIDATES,
  ACCEPTED_OUTPUT_GAIN,
  CHAIN_BEAT_SECONDS,
  HARD_DROP_REFERENCE,
  RECIPE_VERSION,
  SAMPLE_RATE,
  analyzeSamples,
  encodePcm16Wav,
  renderHardDropReference,
  renderCandidates,
  rmsForSeconds,
} from './recipes.mjs'

const sourceRoot = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(sourceRoot, '..', '..', '..', '..')
const outputArgument = process.argv.indexOf('--out')
const outputRoot = outputArgument >= 0 ? resolve(process.argv[outputArgument + 1]) : sourceRoot
const assetsRoot = join(outputRoot, 'assets')
const contractBase = '10dad00a67fc26ba8aeb0bde1edd3e54f02d4c7b'
const initialEvidenceCommit = '65cb18c'
const rendererHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
execFileSync('git', ['merge-base', '--is-ancestor', contractBase, rendererHead], { cwd: repositoryRoot, stdio: 'ignore' })
const studioAssetPath = join(repositoryRoot, 'src', 'assets', 'audio', 't37', 'studio-progress-step.ogg')
const recipeSourcePath = join(sourceRoot, 'recipes.mjs')
const rendererSourcePath = fileURLToPath(import.meta.url)
const auditionSourcePath = join(sourceRoot, 'audition.js')
const verifierSourcePath = join(sourceRoot, 'verify.mjs')
const browserSmokeSourcePath = join(sourceRoot, 'browser-smoke.mjs')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const firstBeatFrames = Math.round(CHAIN_BEAT_SECONDS[0] * SAMPLE_RATE)
const hardDropSamples = renderHardDropReference()
const hardDropMetrics = analyzeSamples(hardDropSamples)
const compressorKneeStart = 10 ** ((HARD_DROP_REFERENCE.compressor.thresholdDb - (HARD_DROP_REFERENCE.compressor.kneeDb / 2)) / 20)
const hardDropCompressorInactive = hardDropMetrics.peak < compressorKneeStart

await mkdir(assetsRoot, { recursive: true })
const firstRender = renderCandidates()
const secondRender = renderCandidates()
const files = []
const embedded = {}

for (let index = 0; index < firstRender.length; index += 1) {
  const rendered = firstRender[index]
  const repeated = secondRender[index]
  const file = `${rendered.candidate.id}-${rendered.kind}.wav`
  const bytes = encodePcm16Wav(rendered.samples)
  const repeatedBytes = encodePcm16Wav(repeated.samples)
  const pairNormal = rendered.kind === 'chain'
    ? firstRender.find((item) => item.candidate.id === rendered.candidate.id && item.kind === 'normal')
    : null
  const onsetMatchesNormal = pairNormal
    ? Buffer.from(rendered.samples.buffer, rendered.samples.byteOffset, firstBeatFrames * 8)
      .equals(Buffer.from(pairNormal.samples.buffer, pairNormal.samples.byteOffset, firstBeatFrames * 8))
    : null
  await writeFile(join(assetsRoot, file), bytes)
  const record = {
    id: rendered.candidate.id,
    label: rendered.candidate.label,
    summary: rendered.candidate.summary,
    kind: rendered.kind,
    file: `assets/${file}`,
    bytes: bytes.length,
    sha256: sha256(bytes),
    deterministicWavBytes: bytes.equals(repeatedBytes),
    onsetMatchesNormal,
    onsetRms250: rmsForSeconds(rendered.samples, 0.25),
    peakVsHardDropDb: 20 * Math.log10(rendered.metrics.peak / hardDropMetrics.peak),
    peakVsStudioOneDb: 20 * Math.log10(rendered.metrics.peak / 0.5),
    ...rendered.metrics,
  }
  files.push(record)
  embedded[`${rendered.candidate.id}-${rendered.kind}`] = {
    mime: 'audio/wav',
    file: record.file,
    bytes: record.bytes,
    sha256: record.sha256,
    dataUri: `data:audio/wav;base64,${bytes.toString('base64')}`,
  }
}


for (const item of files) {
  if (item.kind !== 'chain') continue
  const normal = files.find((entry) => entry.id === item.id && entry.kind === 'normal')
  item.onsetRmsDeltaDb = 20 * Math.log10(item.onsetRms250 / normal.onsetRms250)
}

const studioBytes = await readFile(studioAssetPath)
embedded['reference-studio-clear'] = {
  mime: 'audio/ogg',
  file: 'src/assets/audio/t37/studio-progress-step.ogg',
  bytes: studioBytes.length,
  sha256: sha256(studioBytes),
  dataUri: `data:audio/ogg;base64,${studioBytes.toString('base64')}`,
}

const manifest = {
  sourceCommit: contractBase,
  provenance: {
    contractBase,
    initialEvidenceCommit,
    generatorCommit: rendererHead,
    recipesSha256: sha256(await readFile(recipeSourcePath)),
    rendererSha256: sha256(await readFile(rendererSourcePath)),
    auditionSha256: sha256(await readFile(auditionSourcePath)),
    verifierSha256: sha256(await readFile(verifierSourcePath)),
    browserSmokeSha256: sha256(await readFile(browserSmokeSourcePath)),
  },
  recipeVersion: RECIPE_VERSION,
  generatedAt: new Date().toISOString(),
  boundary: 'isolated audition only; no product audio integration and no recorded explosion sources',
  sampleRate: SAMPLE_RATE,
  format: 'mono PCM16 WAV',
  chainBeatSeconds: CHAIN_BEAT_SECONDS,
  acceptedReferences: {
    outputGain: ACCEPTED_OUTPUT_GAIN,
    hardDrop: {
      contract: HARD_DROP_REFERENCE,
      peakPreOutput: hardDropMetrics.peak,
      rmsPreOutput: hardDropMetrics.rms,
      peakPostOutput: hardDropMetrics.peak * ACCEPTED_OUTPUT_GAIN,
      rmsPostOutput: hardDropMetrics.rms * ACCEPTED_OUTPUT_GAIN,
      compressorKneeStart,
      compressorInactiveByPeak: hardDropCompressorInactive,
    },
    studioClear: {
      asset: 'src/assets/audio/t37/studio-progress-step.ogg',
      sha256: embedded['reference-studio-clear'].sha256,
      rate: 1.18,
      maxDuration: 0.2,
      targetPeaks: { one: 0.5, four: 0.54 },
      fourLineOffsetsMs: [0, 60, 120, 180],
      pan: { one: [0], four: [-0.35, -0.116667, 0.116667, 0.35] },
      attackMaxSeconds: 0.004,
      releaseMaxSeconds: 0.024,
      outputGain: ACCEPTED_OUTPUT_GAIN,
      postCompressorMeasurement: 'current Chromium OfflineAudioContext; see browser-report-file.json and browser-report-live.json',
    },
  },
  candidates: CANDIDATES.map(({ id, label, summary, normalDuration, chainDuration, targetPeak, chainBand }) => ({
    id, label, summary, normalDuration, chainDuration, targetPeak, chainBand,
  })),
  checks: {
    deterministicWavBytes: files.every((item) => item.deterministicWavBytes),
    finiteSamples: files.every((item) => item.finiteSamples),
    zeroEndpoints: files.every((item) => item.zeroEndpoints),
    clippedSamples: files.reduce((total, item) => total + item.clippedSamples, 0),
    boundedPeak: files.every((item) => item.peak <= 0.56),
    boundedRms: files.every((item) => item.kind === 'normal'
      ? item.rms >= 0.09 && item.rms <= 0.14
      : item.rms >= 0.045 && item.rms <= 0.09),
    boundedReferenceLevel: hardDropCompressorInactive && files.every((item) => (
      item.peakVsHardDropDb >= 5 && item.peakVsHardDropDb <= 7
      && Math.abs(item.peakVsStudioOneDb) <= 0.5
      && item.peak <= 0.54
    )),
    boundedPresenceEnergy: files.every((item) => item.spectralEnergy.presence < 0.08),
    chainOnsetMatchesNormal: files.filter((item) => item.kind === 'chain').every((item) => item.onsetMatchesNormal),
    chainOnsetRmsMatchesNormal: files.filter((item) => item.kind === 'chain').every((item) => Math.abs(item.onsetRmsDeltaDb) <= 0.5),
    noRealExplosionMedia: true,
    humanListeningRequired: true,
  },
  files,
}

const embeddedSource = [
  `window.BOMB_R3_MANIFEST = Object.freeze(${JSON.stringify(manifest)});`,
  `window.BOMB_R3_EMBEDDED = Object.freeze(${JSON.stringify(embedded)});`,
  '',
].join('\n')

const rows = files.map((item) => (
  `| ${item.id} ${item.kind} | ${item.durationSeconds.toFixed(2)} s | ${item.peak.toFixed(4)} | ${item.rms.toFixed(4)} | ${(item.spectralEnergy.presence * 100).toFixed(2)}% | ${item.sha256} |`
))
const readme = [
  '# T37 Bomb R3 — Stylized Block-Burst Audition',
  '',
  `Contract base: \`${contractBase}\` · generator commit: \`${rendererHead}\``,
  '',
  'This directory is an isolated human-listening surface. The six candidate WAVs are deterministic original synthesis; they do not reuse recorded explosion media and are not integrated into product audio.',
  '',
  '| Cue | Duration | Peak | RMS | 2–6 kHz energy | SHA-256 |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
  ...rows,
  '',
  `Generator SHA-256: recipes \`${manifest.provenance.recipesSha256}\`; renderer \`${manifest.provenance.rendererSha256}\`; audition \`${manifest.provenance.auditionSha256}\`; verifier \`${manifest.provenance.verifierSha256}\`; browser smoke \`${manifest.provenance.browserSmokeSha256}\`.`,
  '',
  `Accepted reference calibration: output gain ${ACCEPTED_OUTPUT_GAIN}; hard-drop peak ${hardDropMetrics.peak.toFixed(4)} before output; Studio one/four-line target peaks 0.50/0.54 before output.`,
  '',
  'Automated checks reject broken bytes, clipping, excessive high-frequency energy, timing drift, unbounded RMS/reference levels, and a mismatched chain onset. They cannot decide whether a cue sounds gentle, block-like, or appropriate. Human listening remains mandatory.',
  '',
  'Run `node render-candidates.mjs`, `node verify.mjs`, and `node browser-smoke.mjs <url> <label>` from this directory. The current release gate uses both `file://` and a task-owned static HTTP URL; Vite is not required by this self-contained page.',
  '',
].join('\n')

await writeFile(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
await writeFile(join(outputRoot, 'embedded-audio.js'), embeddedSource, 'utf8')
await writeFile(join(outputRoot, 'README.md'), readme, 'utf8')
process.stdout.write(`${JSON.stringify({ outputRoot, contractBase, generatorCommit: rendererHead, checks: manifest.checks, files: files.map(({ file, peak, rms, onsetRms250, peakVsHardDropDb, spectralEnergy }) => ({ file, peak, rms, onsetRms250, peakVsHardDropDb, presence: spectralEnergy.presence })) }, null, 2)}\n`)
