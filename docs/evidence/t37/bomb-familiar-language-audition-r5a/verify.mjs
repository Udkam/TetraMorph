import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { renderCandidatesInPinnedBrowser } from './render-candidates.mjs';

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const repository = join(root, '..', '..', '..', '..');
const prefix = 'docs/evidence/t37/bomb-familiar-language-audition-r5a/';
const rel = (path) => relative(repository, path).replaceAll('\\', '/');
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const near = (value, expected, tolerance = 1e-9) => Math.abs(value - expected) <= tolerance;
const checks = [];
const failures = [];
const check = (condition, label) => { checks.push(label); if (!condition) failures.push(label); };

const expected = {
  reviewRangeBaseSha: 'b11b7b552f1504094a94ccc5e21410a694bf2881',
  contractAcceptedSha: '8f29bb82f40fac00764d1be822875368f426145c',
  authorizationSha: '265b697a1707b89a128fdfe9f15b22076b02d587',
  currentProductSourceSha: 'b11b7b552f1504094a94ccc5e21410a694bf2881',
  playwright: '1.61.1',
  chromium: '149.0.7827.55',
};
const sourceNames = [
  '.gitattributes', 'README.md', 'candidateContract.ts', 'candidateGraph.ts',
  'render-harness.html', 'render-harness.ts', 'render-candidates.mjs', 'audioSession.ts',
  'signalMetrics.ts', 'metric-harness.html', 'metric-harness.ts', 'fixture.ts',
  'fixture-harness.html', 'fixture-harness.ts', 'audition.ts', 'index.html', 'styles.css',
  'browser-smoke.mjs', 'client-actions.json', 'write-manifest.mjs', 'verify.mjs',
];
const generatedNames = [
  'assets/A.wav', 'assets/B.wav', 'assets/C.wav', 'manifest.json', 'verification-report.json',
  'browser-report.json', 'client-smoke/shot-0.png', 'client-smoke/shot-1.png', 'client-smoke/shot-2.png',
  'client-smoke/state-0.json', 'client-smoke/state-1.json', 'client-smoke/state-2.json',
  'r5a-desktop-impact.png', 'r5a-mobile.png', 'r5a-reduced-technical.png',
];
const baseToContract = [
  'docs/CURRENT_TASK.md', 'docs/DESIGN.md',
  'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md',
  'docs/phases/t37-unified-material-curriculum.md',
];
const contractToAuthorization = [
  'docs/CURRENT_TASK.md', 'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md', 'docs/logs/CHANGELOG.md',
];
const sorted = (values) => [...values].sort();
const rangePaths = (from, to) => git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);

const manifestBytes = await readFile(join(root, 'manifest.json'));
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const browserReport = JSON.parse(await readFile(join(root, 'browser-report.json'), 'utf8'));
check(manifest.schema === 'tetramorph.t37.bomb-r5a-familiar-language-audition.v1', 'manifest schema');
for (const [key, value] of Object.entries(expected).filter(([key]) => key.endsWith('Sha'))) {
  check(manifest.provenance[key] === value, `provenance ${key}`);
}
check(manifest.provenance.writerBoundary === `${prefix}**`, 'writer boundary');
check(manifest.provenance.normalOnly && !manifest.provenance.productAudioChanged, 'normal-only no-product-edit boundary');
check(manifest.humanGate.status === 'OPEN' && manifest.humanGate.defaultVerdict === 'reject-all', 'human gate open and fail-closed');
check(manifest.humanGate.automaticAcceptanceForbidden, 'automatic acceptance forbidden');
check(JSON.stringify(manifest.humanGate.candidates) === '["A","B","C"]', 'neutral candidate labels');
check(manifest.environment.playwright === expected.playwright && manifest.environment.chromium === expected.chromium, 'pinned browser environment');
check(manifest.environment.sampleRate === 48_000 && manifest.environment.channelsRendered === 2
  && manifest.environment.preRollFrames === 24_000 && manifest.environment.analysisFrames === 8_640, 'offline render window');
check(manifest.environment.stemFormat === 'mono PCM16 WAV'
  && manifest.environment.stemBoundary.includes('pre-enabledGate'), 'pre-output stem boundary');

git('merge-base', '--is-ancestor', expected.reviewRangeBaseSha, expected.contractAcceptedSha);
git('merge-base', '--is-ancestor', expected.contractAcceptedSha, expected.authorizationSha);
git('merge-base', '--is-ancestor', expected.authorizationSha, manifest.provenance.evidenceSourceHead);
check(JSON.stringify(sorted(rangePaths(expected.reviewRangeBaseSha, expected.contractAcceptedSha))) === JSON.stringify(sorted(baseToContract)), 'review-to-contract paths');
check(JSON.stringify(sorted(rangePaths(expected.contractAcceptedSha, expected.authorizationSha))) === JSON.stringify(sorted(contractToAuthorization)), 'contract-to-authorization paths');
check(JSON.stringify(sorted(rangePaths(expected.authorizationSha, manifest.provenance.evidenceSourceHead)))
  === JSON.stringify(sorted(sourceNames.map((name) => `${prefix}${name}`))), 'authorization-to-source paths');
check(rangePaths(expected.currentProductSourceSha, manifest.provenance.evidenceSourceHead)
  .filter((path) => path.startsWith('src/')).length === 0, 'product source tree unchanged');

for (const binding of manifest.sourceBindings) {
  const bytes = await readFile(join(repository, binding.path));
  check(sha256(bytes) === binding.sha256, `bound source ${binding.role}`);
}
for (const binding of manifest.productionBindings) {
  const bytes = await readFile(join(repository, binding.path));
  check(sha256(bytes) === binding.sha256, `bound production SHA ${binding.path}`);
  check(git('hash-object', binding.path) === binding.gitBlob, `bound production blob ${binding.path}`);
  check(git('rev-parse', `${expected.currentProductSourceSha}:${binding.path}`) === binding.gitBlob, `snapshot production blob ${binding.path}`);
}
for (const binding of manifest.contractBindings) {
  check(git('rev-parse', `${binding.commit}:${binding.path}`) === binding.gitBlob, `bound contract blob ${binding.commit}:${binding.path}`);
}
for (const output of manifest.evidenceOutputs) {
  const bytes = await readFile(join(repository, output.path));
  check(bytes.length === output.bytes && sha256(bytes) === output.sha256, `bound evidence ${output.path}`);
}

const renderUrl = process.argv[2]
  ? new URL('render-harness.html', process.argv[2]).href
  : 'http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/render-harness.html';
const rendered = await renderCandidatesInPinnedBrowser(renderUrl);
check(rendered.playwrightVersion === expected.playwright && rendered.browserVersion === expected.chromium, 'rerender pinned versions');
const expectedStemHashes = {
  A: 'be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254',
  B: 'b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc',
  C: 'ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6',
};
const expectedActivity = {
  A: { first: 290, last: 4223, activity: 81.9375, lastMs: 87.97916666666667, sources: 4 },
  B: { first: 291, last: 6465, activity: 128.625, lastMs: 134.6875, sources: 3 },
  C: { first: 291, last: 3430, activity: 65.39583333333333, lastMs: 71.45833333333333, sources: 1 },
};
for (const candidate of manifest.candidates) {
  const id = candidate.id;
  const bytes = await readFile(join(repository, candidate.path));
  const proof = rendered.stems[id];
  const activity = expectedActivity[id];
  check(sha256(bytes) === expectedStemHashes[id] && candidate.sha256 === expectedStemHashes[id], `${id} frozen stem hash`);
  check(bytes.equals(proof.bytes) && proof.deterministic && proof.leftRightIdentical, `${id} pinned double render`);
  check(candidate.bytes === 17_324 && candidate.sampleRate === 48_000 && candidate.channels === 1
    && candidate.bitsPerSample === 16 && candidate.frames === 8_640, `${id} PCM shape`);
  check(candidate.firstNonZeroFrame === activity.first && candidate.lastNonZeroFrame === activity.last
    && near(candidate.activityMs, activity.activity) && near(candidate.lastNonZeroMs, activity.lastMs), `${id} decoded PCM activity`);
  check(candidate.renderProof.reservedSources === activity.sources
    && candidate.renderProof.scheduledSources === activity.sources, `${id} atomic source count`);
}

const metricBaseUrl = process.argv[2]
  ?? 'http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/';
const metricBrowser = await chromium.launch({ headless: true });
const metricBrowserVersion = metricBrowser.version();
const metricErrors = [];
const metricPage = await metricBrowser.newPage();
metricPage.on('console', (message) => { if (message.type() === 'error') metricErrors.push(`console: ${message.text()}`); });
metricPage.on('pageerror', (error) => metricErrors.push(`page: ${error.message}`));
metricPage.on('response', (response) => { if (response.status() >= 400) metricErrors.push(`${response.status()} ${response.url()}`); });
await metricPage.goto(new URL('metric-harness.html', metricBaseUrl).href, { waitUntil: 'load' });
await metricPage.waitForFunction(() => window.__R5A_METRIC_READY__ === true, null, { timeout: 20_000 });
const liveMetrics = await metricPage.evaluate(() => window.__R5A_METRIC__.measure());
await metricBrowser.close();
check(metricBrowserVersion === expected.chromium, 'metric browser pinned version');
check(require('playwright/package.json').version === expected.playwright, 'verifier Playwright version');
check(JSON.stringify(liveMetrics) === JSON.stringify(manifest.metrics), 'live metrics reproduce manifest');
check(liveMetrics.failures.length === 0 && metricErrors.length === 0, 'live metrics pass without browser errors');
check(liveMetrics.peakSpreadDb <= 0.5, 'peak spread threshold');
for (const [id, value] of Object.entries(liveMetrics.candidates)) {
  check(value.peak >= 0.165 && value.peak <= 0.196 && value.peak <= 0.2, `${id} peak threshold`);
  check(value.maxRms10Ms >= 0.075 && value.maxRms10Ms <= 0.105, `${id} 10ms RMS threshold`);
  check(value.maxRms50Ms >= 0.042 && value.maxRms50Ms <= 0.060, `${id} 50ms RMS threshold`);
  check(value.energy >= liveMetrics.references.hardDrop.energy && value.energy <= liveMetrics.energyCeiling, `${id} energy threshold`);
  check(value.attackMs >= 4 && value.activityMs >= 60 && value.activityMs <= 135, `${id} attack/activity threshold`);
  check(value.lastNonZeroMs <= 135 && value.energyEnd99Ms <= 135, `${id} tail threshold`);
  check(value.below120Percent <= 3 && value.atOrAbove2000Percent <= 1, `${id} spectral threshold`);
}

function terminalClean(value, expectedCanvasCount = 0) {
  return !value.ready && value.disposed && value.canvasCount === expectedCanvasCount && value.pendingTimers === 0
    && !value.renderer.ready && value.renderer.disposed && !value.renderer.frameCallbackActive
    && value.renderer.canvasCount === expectedCanvasCount
    && value.renderer.activeParticles === 0 && value.audio.phase === 'disposed' && value.audio.closed
    && value.audio.activeSources === 0 && value.audio.pendingSources === 0 && value.audio.timers === 0;
}
check(browserReport.passed && browserReport.failures.length === 0, 'browser report passes');
check(browserReport.consoleErrors.length === 0 && browserReport.pageErrors.length === 0 && browserReport.requestErrors.length === 0, 'browser report zero errors');
check(browserReport.initial.audio.phase === 'cold' && browserReport.initial.playCount === 0
  && browserReport.initial.verdict === 'reject', 'browser no autoplay reject default');
check(browserReport.naturalCompletion.renderer.cleanupComplete
  && browserReport.naturalCompletion.audio.phase === 'ready', 'browser natural completion reusable');
check(browserReport.reusableStop.ready && browserReport.reusableStop.canvasCount === 1
  && browserReport.reusableStop.audio.phase === 'ready', 'browser stop reusable');
check(browserReport.reducedStatic && browserReport.reducedFrames.every((frame) => frame.renderer.activeParticles === 0), 'browser reduced static');
check(browserReport.lifecycle.length === 12, 'browser lifecycle matrix size');
const lifecycleKeys = new Set();
for (const scenario of browserReport.lifecycle) {
  lifecycleKeys.add(`${scenario.method}:${scenario.entryState}`);
  const expectedPhase = scenario.entryState === 'idle' ? 'ready' : scenario.entryState;
  check(scenario.before.audio.phase === expectedPhase, `${scenario.method}/${scenario.entryState} entry state`);
  check(terminalClean(scenario.terminal, scenario.method === 'hmr' ? 1 : 0), `${scenario.method}/${scenario.entryState} terminal cleanup`);
  if (scenario.entryState === 'priming') check(scenario.terminal.audio.latePrimeIgnored >= 1, `${scenario.method} late-prime guard`);
  if (scenario.method === 'hmr') check(scenario.fresh?.ready && scenario.fresh.canvasCount === 1
    && scenario.fresh.renderer.ready && !scenario.fresh.renderer.disposed
    && scenario.fresh.renderer.canvasCount === 1
    && scenario.fresh.audio.phase === 'cold', `hmr/${scenario.entryState} fresh instance`);
}
check(lifecycleKeys.size === 12, 'browser lifecycle matrix uniqueness');

const clientNames = await readdir(join(root, 'client-smoke'));
check(!clientNames.some((name) => /^errors-.*\.json$/u.test(name)), 'prescribed client has no error report');
const clientStates = await Promise.all([0, 1, 2].map(async (index) => JSON.parse(
  await readFile(join(root, 'client-smoke', `state-${index}.json`), 'utf8'),
)));
check(clientStates.every((value) => value.ready && !value.disposed && value.verdict === 'reject'
  && value.canvasCount === 1 && value.domCellCount === 0 && value.error === null), 'prescribed client one Canvas/reject');
check(clientStates.every((value) => value.lastSchedule?.candidate === 'A'
  && near(value.lastSchedule.audioOffsetMs, 220, 1e-6)), 'prescribed client exact schedule');
check(clientStates[1].renderer.reviewElapsedMs > clientStates[0].renderer.reviewElapsedMs
  && clientStates[2].renderer.reviewElapsedMs >= clientStates[1].renderer.reviewElapsedMs, 'prescribed client visual progression');
check(clientStates[2].renderer.cleanupComplete && clientStates[2].renderer.activeParticles === 0
  && !clientStates[2].renderer.frameCallbackActive, 'prescribed client final visual cleanup');
check(clientStates[2].audio.phase === 'ready' && clientStates[2].audio.activeSources === 0
  && clientStates[2].audio.pendingSources === 0 && clientStates[2].audio.timers === 0, 'prescribed client final audio cleanup');

async function listFiles(directory, base = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await listFiles(join(directory, entry.name), name));
    else result.push(name);
  }
  return result;
}
const actualFiles = await listFiles(root);
const allowedFiles = new Set([...sourceNames, ...generatedNames, 'vite-runtime.log', 'vite-runtime-error.log']);
check(actualFiles.every((name) => allowedFiles.has(name)), `directory contains only allowed source/generated/temp files: ${actualFiles.filter((name) => !allowedFiles.has(name)).join(', ')}`);
check(sourceNames.every((name) => actualFiles.includes(name)), 'all source allowlist files exist');
check(generatedNames.filter((name) => name !== 'verification-report.json').every((name) => actualFiles.includes(name)), 'all pre-report generated files exist');

const report = {
  schema: 'tetramorph.t37.bomb-r5a-verification.v1',
  generatedAt: new Date().toISOString(),
  passed: failures.length === 0,
  checks: checks.length,
  failures,
  manifestSha256: sha256(manifestBytes),
  evidenceSourceHead: manifest.provenance.evidenceSourceHead,
  pinnedEnvironment: { playwright: expected.playwright, chromium: expected.chromium },
  metrics: liveMetrics,
  lifecycleScenarios: browserReport.lifecycle.length,
  humanGate: 'OPEN — automatic verification does not accept sound quality',
};
await writeFile(join(root, 'verification-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, failures: report.failures,
  manifestSha256: report.manifestSha256, humanGate: report.humanGate }));
if (!report.passed) process.exitCode = 1;
