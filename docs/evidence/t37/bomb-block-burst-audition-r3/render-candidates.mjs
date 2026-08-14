import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CANDIDATES,
  CHAIN_BEAT_SECONDS,
  RECIPE_VERSION,
  SAMPLE_RATE,
  encodePcm16Wav,
  renderCandidates,
} from './recipes.mjs'

const sourceRoot = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(sourceRoot, '..', '..', '..', '..')
const outputArgument = process.argv.indexOf('--out')
const outputRoot = outputArgument >= 0 ? resolve(process.argv[outputArgument + 1]) : sourceRoot
const assetsRoot = join(outputRoot, 'assets')
const sourceCommit = '10dad00a67fc26ba8aeb0bde1edd3e54f02d4c7b'
const rendererHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim()
execFileSync('git', ['merge-base', '--is-ancestor', sourceCommit, rendererHead], { cwd: repositoryRoot, stdio: 'ignore' })
const studioAssetPath = join(repositoryRoot, 'src', 'assets', 'audio', 't37', 'studio-progress-step.ogg')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const firstBeatFrames = Math.round(CHAIN_BEAT_SECONDS[0] * SAMPLE_RATE)

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

const studioBytes = await readFile(studioAssetPath)
embedded['reference-studio-clear'] = {
  mime: 'audio/ogg',
  file: 'src/assets/audio/t37/studio-progress-step.ogg',
  bytes: studioBytes.length,
  sha256: sha256(studioBytes),
  dataUri: `data:audio/ogg;base64,${studioBytes.toString('base64')}`,
}

const manifest = {
  sourceCommit,
  recipeVersion: RECIPE_VERSION,
  generatedAt: new Date().toISOString(),
  boundary: 'isolated audition only; no product audio integration and no recorded explosion sources',
  sampleRate: SAMPLE_RATE,
  format: 'mono PCM16 WAV',
  chainBeatSeconds: CHAIN_BEAT_SECONDS,
  acceptedReferences: {
    hardDrop: 'ACTION_A_CONTRACT hard-drop tones scheduled live with its accepted compressor',
    studioClear: {
      asset: 'src/assets/audio/t37/studio-progress-step.ogg',
      sha256: embedded['reference-studio-clear'].sha256,
      rate: 1.18,
      maxDuration: 0.2,
      targetPeaks: { one: 0.5, four: 0.54 },
      fourLineOffsetsMs: [0, 60, 120, 180],
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
    boundedPresenceEnergy: files.every((item) => item.spectralEnergy.presence < 0.08),
    chainOnsetMatchesNormal: files.filter((item) => item.kind === 'chain').every((item) => item.onsetMatchesNormal),
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
  `Source commit at render time: \`${sourceCommit}\``,
  '',
  'This directory is an isolated human-listening surface. The six candidate WAVs are deterministic original synthesis; they do not reuse recorded explosion media and are not integrated into product audio.',
  '',
  '| Cue | Duration | Peak | RMS | 2–6 kHz energy | SHA-256 |',
  '| --- | ---: | ---: | ---: | ---: | --- |',
  ...rows,
  '',
  'Automated checks reject broken bytes, clipping, excessive high-frequency energy, timing drift, and a mismatched chain onset. They cannot decide whether a cue sounds gentle, block-like, or appropriate. Human listening remains mandatory.',
  '',
  'Run `node render-candidates.mjs`, `node verify.mjs`, `node browser-smoke.mjs <url> <label>`, and `node vite-smoke.mjs` from this directory.',
  '',
].join('\n')

await writeFile(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
await writeFile(join(outputRoot, 'embedded-audio.js'), embeddedSource, 'utf8')
await writeFile(join(outputRoot, 'README.md'), readme, 'utf8')
process.stdout.write(`${JSON.stringify({ outputRoot, sourceCommit, checks: manifest.checks, files: files.map(({ file, peak, rms, spectralEnergy }) => ({ file, peak, rms, presence: spectralEnergy.presence })) }, null, 2)}\n`)
