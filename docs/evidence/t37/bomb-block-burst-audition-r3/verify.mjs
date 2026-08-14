import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const renderer = join(root, 'render-candidates.mjs')
const recipePath = join(root, 'recipes.mjs')
const auditionPath = join(root, 'audition.js')
const verifierPath = fileURLToPath(import.meta.url)
const browserSmokePath = join(root, 'browser-smoke.mjs')
const failures = []
const checks = []
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const check = (name, passed, details = '') => {
  checks.push({ name, passed: Boolean(passed), details })
  if (!passed) failures.push(`${name}${details ? `: ${details}` : ''}`)
}

function parseWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    riff: bytes.subarray(0, 4).toString('ascii'),
    wave: bytes.subarray(8, 12).toString('ascii'),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitsPerSample: view.getUint16(34, true),
    dataBytes: view.getUint32(40, true),
  }
}

const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
const html = await readFile(join(root, 'index.html'), 'utf8')
const audition = await readFile(join(root, 'audition.js'), 'utf8')
const recipes = await readFile(join(root, 'recipes.mjs'), 'utf8')
const embeddedSource = await readFile(join(root, 'embedded-audio.js'), 'utf8')

check('six candidate files declared', manifest.files.length === 6)
check('three candidate pairs declared', manifest.candidates.length === 3)
check('manifest automatic checks pass', (
  manifest.checks.deterministicWavBytes
  && manifest.checks.finiteSamples
  && manifest.checks.zeroEndpoints
  && manifest.checks.clippedSamples === 0
  && manifest.checks.boundedPeak
  && manifest.checks.boundedRms
  && manifest.checks.boundedReferenceLevel
  && manifest.checks.boundedPresenceEnergy
  && manifest.checks.chainOnsetMatchesNormal
  && manifest.checks.chainOnsetRmsMatchesNormal
  && manifest.checks.noRealExplosionMedia
), JSON.stringify(manifest.checks))
check('human listening remains required', manifest.checks.humanListeningRequired === true)
check('accepted output gain matches product', manifest.acceptedReferences.outputGain === 0.78 && audition.includes('const ACCEPTED_OUTPUT_GAIN = 0.78'))
check('provenance source hashes', (
  manifest.provenance.recipesSha256 === sha256(await readFile(recipePath))
  && manifest.provenance.rendererSha256 === sha256(await readFile(renderer))
  && manifest.provenance.auditionSha256 === sha256(await readFile(auditionPath))
  && manifest.provenance.verifierSha256 === sha256(await readFile(verifierPath))
  && manifest.provenance.browserSmokeSha256 === sha256(await readFile(browserSmokePath))
), JSON.stringify(manifest.provenance))
check('provenance commits declared', manifest.provenance.contractBase === manifest.sourceCommit && Boolean(manifest.provenance.initialEvidenceCommit) && Boolean(manifest.provenance.generatorCommit))
check('no autoplay', !/autoplay/i.test(html))
check('six core candidate controls', (html.match(/data-play=/g) ?? []).length === 6)
check('three accepted reference controls', (html.match(/data-reference=/g) ?? []).length === 3)
check('three context controls', (html.match(/data-context=/g) ?? []).length === 3)
check('two reject defaults', (html.match(/value="reject" checked/g) ?? []).length === 2)
check('same-letter gate implemented', audition.includes("gateMode = 'recompose'") && audition.includes('normal !== chain'))
check('Studio reference graph matches accepted product', (
  audition.includes('-0.35 + (0.7 * index) / (lines - 1)')
  && audition.includes('options.pan !== undefined')
  && audition.includes('source.connect(panner)')
  && audition.includes('panner.connect(gain)')
  && audition.includes('attack: Math.min(0.004, duration * 0.1)')
  && audition.includes('release: Math.min(0.024, duration * 0.18)')
  && audition.includes('measureStudioReferences')
))
check('test and text hooks exposed', audition.includes('window.BOMB_R3_TEST') && audition.includes('window.render_game_to_text') && audition.includes('window.advanceTime'))
check('recorded R2 media absent', !/Deep Explosion|Muffled Distant|bomb-boom-audition-r2|sources[\\/]assets/i.test([html, audition, recipes, embeddedSource].join('\n')))

const firstBeatPcmBytes = Math.round(0.056 * 48_000) * 2
const rootHashes = new Map()
for (const item of manifest.files) {
  const absolute = join(root, item.file)
  const bytes = await readFile(absolute)
  const wav = parseWav(bytes)
  rootHashes.set(item.file, sha256(bytes))
  check(`${item.file} exists`, (await stat(absolute)).isFile())
  check(`${item.file} hash`, sha256(bytes) === item.sha256)
  check(`${item.file} PCM contract`, wav.riff === 'RIFF' && wav.wave === 'WAVE' && wav.format === 1 && wav.channels === 1 && wav.sampleRate === 48_000 && wav.bitsPerSample === 16, JSON.stringify(wav))
  check(`${item.file} byte length`, wav.dataBytes + 44 === bytes.length && bytes.length === item.bytes)
  check(`${item.file} bounded signal`, item.finiteSamples && item.zeroEndpoints && item.clippedSamples === 0 && item.peak <= 0.56)
  check(`${item.file} bounded RMS`, item.kind === 'normal'
    ? item.rms >= 0.09 && item.rms <= 0.14
    : item.rms >= 0.045 && item.rms <= 0.09, String(item.rms))
  check(`${item.file} relative reference level`, item.peakVsHardDropDb >= 5 && item.peakVsHardDropDb <= 7 && Math.abs(item.peakVsStudioOneDb) <= 0.5 && item.peak <= 0.54, JSON.stringify({ peakVsHardDropDb: item.peakVsHardDropDb, peakVsStudioOneDb: item.peakVsStudioOneDb }))
  check(`${item.file} restrained high energy`, item.spectralEnergy.presence < 0.08 && item.spectralEnergy.high < 0.02, JSON.stringify(item.spectralEnergy))
  check(`${item.file} restrained sub-70 energy`, item.spectralEnergy.under70 < 0.03, String(item.spectralEnergy.under70))
}

for (const candidate of manifest.candidates) {
  const normalItem = manifest.files.find((item) => item.id === candidate.id && item.kind === 'normal')
  const chainItem = manifest.files.find((item) => item.id === candidate.id && item.kind === 'chain')
  const normalBytes = await readFile(join(root, normalItem.file))
  const chainBytes = await readFile(join(root, chainItem.file))
  check(`${candidate.id} exact 56 ms onset`, normalBytes.subarray(44, 44 + firstBeatPcmBytes).equals(chainBytes.subarray(44, 44 + firstBeatPcmBytes)))
  check(`${candidate.id} same initial peak`, Math.abs(20 * Math.log10(chainItem.peak / normalItem.peak)) <= 0.5)
  check(`${candidate.id} same 250 ms onset RMS`, Math.abs(chainItem.onsetRmsDeltaDb) <= 0.5, String(chainItem.onsetRmsDeltaDb))
  check(`${candidate.id} normal duration contract`, normalItem.durationSeconds >= 0.28 && normalItem.durationSeconds <= 0.55)
  check(`${candidate.id} chain duration contract`, chainItem.durationSeconds >= 0.85 && chainItem.durationSeconds <= 1.25)
}

const embeddedMatch = embeddedSource.match(/window\.BOMB_R3_EMBEDDED = Object\.freeze\((\{.*\})\);/)
const embedded = embeddedMatch ? JSON.parse(embeddedMatch[1]) : null
check('embedded catalog parses', Boolean(embedded))
if (embedded) {
  for (const item of manifest.files) {
    const id = `${item.id}-${item.kind}`
    const bytes = Buffer.from(embedded[id].dataUri.split(',')[1], 'base64')
    check(`${id} embedded bytes`, bytes.length === item.bytes && sha256(bytes) === item.sha256)
  }
  const studio = Buffer.from(embedded['reference-studio-clear'].dataUri.split(',')[1], 'base64')
  check('Studio reference hash', sha256(studio) === manifest.acceptedReferences.studioClear.sha256)
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 't37-bomb-r3-'))
try {
  const renderA = join(temporaryRoot, 'render-a')
  const renderB = join(temporaryRoot, 'render-b')
  execFileSync(process.execPath, [renderer, '--out', renderA], { cwd: root, stdio: 'pipe' })
  execFileSync(process.execPath, [renderer, '--out', renderB], { cwd: root, stdio: 'pipe' })
  const manifestA = JSON.parse(await readFile(join(renderA, 'manifest.json'), 'utf8'))
  const manifestB = JSON.parse(await readFile(join(renderB, 'manifest.json'), 'utf8'))
  for (const item of manifest.files) {
    const a = manifestA.files.find((entry) => entry.file === item.file)
    const b = manifestB.files.find((entry) => entry.file === item.file)
    check(`${item.file} independent renders`, a?.sha256 === b?.sha256 && a?.sha256 === rootHashes.get(item.file))
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

const report = {
  sourceCommit: manifest.sourceCommit,
  provenance: manifest.provenance,
  recipeVersion: manifest.recipeVersion,
  generatedAt: new Date().toISOString(),
  summary: { passed: failures.length === 0, checks: checks.length, failures: failures.length },
  checks,
  failures,
}
await writeFile(join(root, 'verification-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report.summary))
if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exitCode = 1
}
