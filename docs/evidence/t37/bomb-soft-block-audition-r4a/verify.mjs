import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { R4A_RECIPES, encodeMonoPcm16Wav, renderCandidate, validateRecipes } from './recipes.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repository = join(root, '..', '..', '..', '..');
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const browser = JSON.parse(await readFile(join(root, 'browser-report.json'), 'utf8'));
const checks = [];
const failures = [];
const check = (condition, label) => {
  checks.push(label);
  if (!condition) failures.push(label);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const near = (value, expected, tolerance) => Math.abs(value - expected) <= tolerance;
const between = (value, min, max) => value >= min && value <= max;

check(manifest.schema === 'tetramorph.t37.bomb-r4a-normal-audition.v1', 'manifest schema');
check(manifest.contract.baseSha === '8c2b81def4cbf2d320a26c6575fc1e9f0c023576', 'contract base SHA');
check(manifest.contract.currentProductSha === '56a23812ec640b913de894290bca4c9511f86cff', 'current product SHA');
check(manifest.contract.writerBoundary === 'docs/evidence/t37/bomb-soft-block-audition-r4a/**', 'writer boundary');
check(manifest.contract.normalOnly && !manifest.contract.productAudioChanged, 'normal-only evidence boundary');
check(manifest.humanGate.status === 'OPEN' && manifest.humanGate.defaultVerdict === 'reject-all', 'human gate remains open and fail-closed');
check(manifest.humanGate.automaticAcceptanceForbidden, 'automatic acceptance is forbidden');
check(JSON.stringify(manifest.humanGate.candidates) === '["X","Y","Z"]', 'neutral candidate labels');
check(manifest.synthesis.sampleRate === 48_000 && manifest.synthesis.format === 'mono PCM16 WAV', 'WAV contract');
check(manifest.synthesis.voiceGainBoostCompletedInWav === 1.45 && manifest.synthesis.voiceGainCeilingCompletedInWav === 0.5, 'per-voice boost is completed in WAV');
check(!manifest.synthesis.importedRecordedMedia && !manifest.synthesis.importedR2OrR3Media, 'no recorded or prior-round media');
check(!manifest.synthesis.noiseSource && !manifest.synthesis.frequencySweep && !manifest.synthesis.reverb, 'no noise sweep or reverb');
check(manifest.timing.tokenEnterMs === 120 && manifest.timing.tokenPulseMs === 100 && manifest.timing.recomputedImpactMs === 220, 'production impact recomputation');
check(manifest.timing.rendererDurationMs === 620, 'production renderer duration');
check(manifest.timing.fullMotionTasteSurface === '1x' && manifest.timing.reducedMotionTechnicalOnly, 'taste and reduced-motion separation');

for (const recipeError of validateRecipes()) failures.push(`recipe: ${recipeError}`);
checks.push('recipe structural validation');
const recipeSource = await readFile(join(root, 'recipes.mjs'), 'utf8');
check(!recipeSource.includes('bomb-block-burst-audition-r3') && !recipeSource.includes('bomb-boom-audition-r2'), 'recipe has no R2/R3 import');
check(!recipeSource.includes('endFrequency') && !recipeSource.includes('createConvolver'), 'recipe has no sweep or convolution');

for (const candidate of manifest.candidates) {
  const id = candidate.id;
  const bytes = await readFile(join(repository, candidate.path));
  const deterministic = encodeMonoPcm16Wav(renderCandidate(id));
  check(bytes.equals(deterministic), `${id} deterministic bytes`);
  check(sha256(bytes) === candidate.sha256, `${id} manifest SHA-256`);
  check(bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WAVE', `${id} RIFF/WAVE`);
  check(bytes.readUInt16LE(20) === 1 && bytes.readUInt16LE(22) === 1, `${id} PCM mono`);
  check(bytes.readUInt32LE(24) === 48_000 && bytes.readUInt16LE(34) === 16, `${id} 48k PCM16`);
  check(near(candidate.fileDurationMs, 180, 0.001) && between(candidate.fileDurationMs, 140, 220), `${id} file duration`);
  check(between(candidate.activityMs, 110, 160), `${id} activity duration`);
  check(bytes.readInt16LE(44) === 0 && bytes.readInt16LE(bytes.length - 2) === 0, `${id} zero endpoints`);
  check(candidate.contacts.length <= 3, `${id} contact voice ceiling`);
  for (const contact of candidate.contacts) {
    check(contact.partial === null || contact.partial === undefined || between(contact.partial.frequency, 900, 1_800), `${id} internal partial bound`);
  }
}

for (const binding of manifest.sourceBindings) {
  const bytes = await readFile(join(repository, binding.path));
  check(sha256(bytes) === binding.sha256, `bound source ${binding.role}`);
}
for (const output of manifest.evidenceOutputs) {
  const bytes = await readFile(join(repository, output.path));
  check(bytes.length === output.bytes && sha256(bytes) === output.sha256, `bound evidence ${output.path}`);
}

const clientActions = JSON.parse(await readFile(join(root, 'client-actions.json'), 'utf8'));
check(JSON.stringify(clientActions) === JSON.stringify({
  steps: [
    { buttons: [], frames: 6 },
    { buttons: [], frames: 8 },
    { buttons: [], frames: 12 },
  ],
}), 'prescribed client action sequence');
const clientSmokeNames = await readdir(join(root, 'client-smoke'));
check(!clientSmokeNames.some((name) => /^errors-.*\.json$/u.test(name)), 'prescribed client has no error report');
const clientStates = await Promise.all([0, 1, 2].map(async (index) => JSON.parse(
  await readFile(join(root, 'client-smoke', `state-${index}.json`), 'utf8'),
)));
check(clientStates.every((state) => (
  state.ready
  && !state.disposed
  && state.error === null
  && state.playCount === 1
  && state.verdict === 'reject'
  && state.canvasCount === 1
  && state.domCellCount === 0
)), 'prescribed client keeps one Canvas and reject default');
check(clientStates.every((state) => (
  state.pendingTimers === 0
  && state.audio.activeSources === 0
  && state.audio.pendingCandidates.length === 0
)), 'prescribed client drains audio and timers at every capture');
check(clientStates.every((state) => (
  state.lastSchedule.candidate === 'X'
  && state.lastSchedule.audioOffsetMs === 220
  && near(state.lastSchedule.audioStartAtSeconds - state.lastSchedule.scheduledFromSeconds, 0.22, Number.EPSILON)
)), 'prescribed client binds sound to the 220ms visual impact');
check(
  clientStates[0].reviewState === 'running'
  && !clientStates[0].renderer.cleanupComplete
  && clientStates[0].renderer.activeParticles > 0,
  'prescribed client first frame retains the bounded particle field',
);
check(
  clientStates[1].reviewState === 'running'
  && !clientStates[1].renderer.cleanupComplete
  && clientStates[1].renderer.activeParticles > 0
  && clientStates[1].renderer.activeParticles < clientStates[0].renderer.activeParticles
  && clientStates[1].renderer.reviewElapsedMs > clientStates[0].renderer.reviewElapsedMs,
  'prescribed client second frame shows particle decay',
);
check(
  clientStates[2].reviewState === 'complete'
  && clientStates[2].renderer.cleanupComplete
  && clientStates[2].renderer.reviewElapsedMs === 1470
  && clientStates[2].renderer.activeParticles === 0
  && clientStates[2].renderer.activeCandidate === null
  && clientStates[2].renderer.mutationActivation === null,
  'prescribed client final frame is residue-free',
);

const expectedGraph = {
  mutationBus: 0.96,
  candidateEffects: 1,
  candidateMaster: 1.85,
  compressor: { threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 },
  enabledGate: 1,
  volume: 1,
  output: 0.78,
};
check(JSON.stringify(manifest.graph) === JSON.stringify(expectedGraph), 'complete candidate graph');
check(browser.passed && browser.metricsFailures.length === 0, 'browser report passes');
check(browser.graphExact && browser.reducedStatic, 'browser graph and reduced static proof');
check(new Set(browser.reducedStaticFrames.map((frame) => frame.sha256)).size === 1, 'reduced 0/219/220/619 pixel identity');
check(browser.reducedStaticFrames.every((frame) => frame.state.activeParticles === 0), 'reduced frames have zero particles');
check(browser.initial.verdict === 'reject' && browser.initial.playCount === 0 && !browser.initial.audio.primed, 'no autoplay and reject default');
check(browser.initial.canvasCount === 1 && browser.initial.domCellCount === 0, 'one Canvas and no DOM grid');
check(browser.initial.fixture.bombOutcome === 'blast' && browser.initial.fixture.participatingBombCount === 1, 'normal Core blast fixture');
check(!browser.initial.fixture.hasChainOriginCarrierId && !browser.initial.fixture.hasChainOriginCells && !browser.initial.fixture.hasChainTriggerRows, 'normal fixture has no chain fields');
check(browser.fastSwitch.audio.canceledBeforeStart >= 1 && browser.fastSwitch.audio.pendingCandidates.length === 1, 'pre-impact switch cancels old source');
check(browser.fullCleanup.audio.activeSources === 0 && browser.fullCleanup.audio.pendingCandidates.length === 0 && browser.fullCleanup.pendingTimers === 0, 'full-motion runtime cleanup');
check(browser.reducedCleanup.audio.activeSources === 0 && browser.reducedCleanup.audio.pendingCandidates.length === 0 && browser.reducedCleanup.pendingTimers === 0, 'reduced runtime cleanup');
check(browser.desktopDisposed.canvasCount === 0 && browser.desktopDisposed.audio.closed, 'dispose removes Canvas and closes context');
check(!browser.layout.desktop.overflow && !browser.layout.mobile.overflow, 'responsive no-overflow');
check(browser.layout.desktop.minimumControlHeight >= 44 && browser.layout.mobile.minimumControlHeight >= 44, '44px controls');
check(browser.consoleErrors.length === 0 && browser.pageErrors.length === 0 && browser.requestErrors.length === 0, 'zero browser errors');
check(near(browser.metrics.references.hardDrop.peak, 0.17671825, 0.0002), 'hard-drop reference peak');
check(near(browser.metrics.references.studioOneLine.peak, 0.19556463, 0.0002), 'Studio one-line reference peak');

for (const [id, value] of Object.entries(browser.metrics.candidates)) {
  check(between(value.peak, 0.205, 0.25) && value.peak <= 0.26, `${id} final peak`);
  check(between(value.rms, 0.035, 0.055), `${id} final RMS`);
  check(between(value.maxRms10Ms, 0.08, 0.13) && between(value.maxRms50Ms, 0.05, 0.075), `${id} window RMS`);
  check(between(value.energyVsHardDropDb, 1.5, 6), `${id} relative energy`);
  check(between(value.crestDb, 12, 17) && between(value.peakTimeMs, 8, 22) && between(value.attackMs, 6, 14), `${id} transient shape`);
  check(value.energyEnd95Ms <= 140 && value.energyEnd99Ms <= 180, `${id} energy tail`);
  check(between(value.spectralCentroidHz, 190, 420), `${id} centroid`);
  check(value.bandsPercent.below70 <= 0.5 && value.bandsPercent.from70To120 <= 20, `${id} low bands`);
  check(between(value.bandsPercent.from250To1000, 3, 20), `${id} 250Hz-1kHz band`);
  check(value.bandsPercent.from1000To2000 <= 8 && value.bandsPercent.from2000To4000 <= 4 && value.bandsPercent.above4000 <= 1, `${id} high bands`);
}
check(browser.metrics.peakSpreadDb <= 0.5, 'candidate peak spread');

const report = {
  generatedAt: new Date().toISOString(),
  passed: failures.length === 0,
  checks: checks.length,
  failures,
  humanGate: 'OPEN — automatic verification does not accept sound quality',
  metrics: browser.metrics,
  reducedStaticSha256: browser.reducedStaticFrames[0]?.sha256 ?? null,
};
await writeFile(join(root, 'verification-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, failures: report.failures, humanGate: report.humanGate }));
if (!report.passed) process.exitCode = 1;
