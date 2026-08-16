import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCandidatesInPinnedBrowser } from './render-candidates.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repository = join(root, '..', '..', '..', '..');
const prefix = 'docs/evidence/t37/bomb-familiar-language-audition-r5a/';
const rel = (path) => relative(repository, path).replaceAll('\\', '/');
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readHash = async (path) => sha256(await readFile(path));

const provenance = {
  reviewRangeBaseSha: 'b11b7b552f1504094a94ccc5e21410a694bf2881',
  contractAcceptedSha: '8f29bb82f40fac00764d1be822875368f426145c',
  authorizationSha: '265b697a1707b89a128fdfe9f15b22076b02d587',
  originalEvidenceSourceSha: '1646b1cbe5e809262ef3f06af98c8a775a94be6d',
  supersededPreReportSha: '9b8cd1d920da2e3078aa634c60d644ea1f31e090',
  revisionBaseSha: '476ec187ac04c4b758b9411871d1af07791dd1ff',
  accessibilityRevisionBaseSha: 'db47e50667cc729e3f6df16bd7daaaca2e724d6f',
  currentProductSourceSha: 'b11b7b552f1504094a94ccc5e21410a694bf2881',
};
const sourceNames = [
  '.gitattributes', 'README.md', 'candidateContract.ts', 'candidateGraph.ts',
  'render-harness.html', 'render-harness.ts', 'render-candidates.mjs', 'audioSession.ts',
  'signalMetrics.ts', 'metric-harness.html', 'metric-harness.ts', 'fixture.ts',
  'fixture-harness.html', 'fixture-harness.ts', 'audition.ts', 'index.html', 'styles.css',
  'browser-smoke.mjs', 'client-actions.json', 'write-manifest.mjs', 'verify.mjs',
];
const baseToContractPaths = [
  'docs/CURRENT_TASK.md',
  'docs/DESIGN.md',
  'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md',
  'docs/phases/t37-unified-material-curriculum.md',
];
const contractToAuthorizationPaths = [
  'docs/CURRENT_TASK.md',
  'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md',
  'docs/logs/CHANGELOG.md',
];
const productionPaths = [
  'src/game/core/index.ts',
  'src/game/render/TetrisRenderer.ts',
  'src/animation/mutationTimeline.ts',
  'src/design/mutationTokens.ts',
  'src/game/audio/acceptedPlayback.ts',
  'src/game/audio/audioGesture.ts',
  'src/game/audio/audioAssetCatalog.ts',
  'src/assets/audio/t37/studio-progress-step.ogg',
];
const outputNames = [
  'browser-report.json',
  'client-smoke/shot-0.png', 'client-smoke/shot-1.png', 'client-smoke/shot-2.png',
  'client-smoke/state-0.json', 'client-smoke/state-1.json', 'client-smoke/state-2.json',
  'r5a-desktop-impact.png', 'r5a-mobile.png', 'r5a-reduced-technical.png',
];
const preReportGeneratedNames = [
  'assets/A.wav', 'assets/B.wav', 'assets/C.wav', 'manifest.json', ...outputNames,
];
const allGeneratedNames = [...preReportGeneratedNames, 'verification-report.json'];
const revisionSourceNames = ['audition.ts', 'browser-smoke.mjs', 'styles.css', 'verify.mjs', 'write-manifest.mjs'];
const revisionPaths = [...revisionSourceNames, ...allGeneratedNames]
  .map((name) => `${prefix}${name}`);
const accessibilityRevisionSourceNames = ['browser-smoke.mjs', 'styles.css', 'verify.mjs', 'write-manifest.mjs'];
const accessibilityRevisionPaths = [...accessibilityRevisionSourceNames, ...allGeneratedNames]
  .map((name) => `${prefix}${name}`);

const sorted = (values) => [...values].sort();
function exactPaths(from, to, expected, label) {
  git('merge-base', '--is-ancestor', from, to);
  const actual = git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  if (JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(expected))) {
    throw new Error(`${label} path boundary drifted: ${actual.join(', ')}`);
  }
  return actual;
}

const evidenceSourceHead = git('rev-parse', 'HEAD');
exactPaths(provenance.reviewRangeBaseSha, provenance.contractAcceptedSha, baseToContractPaths, 'review-to-contract');
exactPaths(provenance.contractAcceptedSha, provenance.authorizationSha, contractToAuthorizationPaths, 'contract-to-authorization');
exactPaths(provenance.authorizationSha, provenance.originalEvidenceSourceSha,
  sourceNames.map((name) => `${prefix}${name}`), 'authorization-to-original-source');
exactPaths(provenance.originalEvidenceSourceSha, provenance.supersededPreReportSha,
  preReportGeneratedNames.map((name) => `${prefix}${name}`), 'original-source-to-superseded-pre-report');
exactPaths(provenance.supersededPreReportSha, provenance.revisionBaseSha,
  [`${prefix}verification-report.json`], 'superseded-pre-report-to-revision-base');
exactPaths(provenance.revisionBaseSha, evidenceSourceHead, revisionPaths, 'revision-base-to-source');
exactPaths(provenance.accessibilityRevisionBaseSha, evidenceSourceHead,
  accessibilityRevisionPaths, 'accessibility-revision-base-to-source');
const sourceTreeFiles = git('ls-tree', '-r', '--name-only', evidenceSourceHead, '--', prefix)
  .split(/\r?\n/u).filter(Boolean);
const lingeringGenerated = allGeneratedNames
  .map((name) => `${prefix}${name}`)
  .filter((path) => sourceTreeFiles.includes(path));
if (lingeringGenerated.length) throw new Error(`Revised source head still contains generated outputs: ${lingeringGenerated.join(', ')}`);
const productChanges = git('diff', '--name-only', `${provenance.currentProductSourceSha}..${evidenceSourceHead}`, '--', 'src')
  .split(/\r?\n/u).filter(Boolean);
if (productChanges.length) throw new Error(`Product source changed after the frozen snapshot: ${productChanges.join(', ')}`);
const dirtySource = git('status', '--short', '--', ...sourceNames.map((name) => `${prefix}${name}`));
if (dirtySource) throw new Error(`R5A source is dirty at manifest generation: ${dirtySource}`);

const sourceBindings = [];
for (const name of sourceNames) {
  const path = join(root, name);
  sourceBindings.push({ role: `r5a-source:${name}`, path: rel(path), sha256: await readHash(path) });
}
const productionBindings = [];
for (const path of productionPaths) {
  const currentBlob = git('hash-object', path);
  const snapshotBlob = git('rev-parse', `${provenance.currentProductSourceSha}:${path}`);
  if (currentBlob !== snapshotBlob) throw new Error(`Production binding drifted from snapshot: ${path}`);
  productionBindings.push({
    role: `production:${path}`,
    path,
    gitBlob: currentBlob,
    sha256: await readHash(join(repository, path)),
  });
}
const contractBindings = [];
for (const [commit, paths] of [
  [provenance.contractAcceptedSha, baseToContractPaths],
  [provenance.authorizationSha, contractToAuthorizationPaths],
]) {
  for (const path of paths) contractBindings.push({ commit, path, gitBlob: git('rev-parse', `${commit}:${path}`) });
}

const renderUrl = process.argv[2]
  ?? 'http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/render-harness.html';
const rendered = await renderCandidatesInPinnedBrowser(renderUrl);
const candidates = [];
for (const id of ['A', 'B', 'C']) {
  const path = join(root, 'assets', `${id}.wav`);
  const bytes = await readFile(path);
  const proof = rendered.stems[id];
  if (!bytes.equals(proof.bytes)) throw new Error(`${id} committed stem differs from pinned rerender.`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let firstNonZeroFrame = -1;
  let lastNonZeroFrame = -1;
  for (let frame = 0; frame < 8_640; frame += 1) {
    if (view.getInt16(44 + frame * 2, true) === 0) continue;
    if (firstNonZeroFrame < 0) firstNonZeroFrame = frame;
    lastNonZeroFrame = frame;
  }
  candidates.push({
    id,
    path: rel(path),
    sha256: sha256(bytes),
    bytes: bytes.length,
    sampleRate: view.getUint32(24, true),
    channels: view.getUint16(22, true),
    bitsPerSample: view.getUint16(34, true),
    frames: view.getUint32(40, true) / 2,
    firstNonZeroFrame,
    lastNonZeroFrame,
    activityMs: (lastNonZeroFrame - firstNonZeroFrame) / 48,
    lastNonZeroMs: lastNonZeroFrame / 48,
    renderProof: {
      runHashes: proof.runHashes,
      deterministic: proof.deterministic,
      leftRightIdentical: proof.leftRightIdentical,
      reservedSources: proof.reservedSources,
      scheduledSources: proof.scheduledSources,
    },
  });
}

const browserReport = JSON.parse(await readFile(join(root, 'browser-report.json'), 'utf8'));
if (!browserReport.passed) throw new Error('R5A browser report is not passing.');
const evidenceOutputs = [];
for (const name of outputNames) {
  const path = join(root, name);
  const bytes = await readFile(path);
  evidenceOutputs.push({ path: rel(path), sha256: sha256(bytes), bytes: bytes.length });
}

const manifest = {
  schema: 'tetramorph.t37.bomb-r5a-familiar-language-audition.v3',
  generatedAt: new Date().toISOString(),
  provenance: {
    ...provenance,
    evidenceSourceHead,
    reviewRangeBaseTree: git('rev-parse', `${provenance.reviewRangeBaseSha}^{tree}`),
    contractAcceptedTree: git('rev-parse', `${provenance.contractAcceptedSha}^{tree}`),
    authorizationTree: git('rev-parse', `${provenance.authorizationSha}^{tree}`),
    originalEvidenceSourceTree: git('rev-parse', `${provenance.originalEvidenceSourceSha}^{tree}`),
    supersededPreReportTree: git('rev-parse', `${provenance.supersededPreReportSha}^{tree}`),
    revisionBaseTree: git('rev-parse', `${provenance.revisionBaseSha}^{tree}`),
    accessibilityRevisionBaseTree: git('rev-parse', `${provenance.accessibilityRevisionBaseSha}^{tree}`),
    currentProductSourceTree: git('rev-parse', `${provenance.currentProductSourceSha}^{tree}`),
    evidenceSourceTree: git('rev-parse', `${evidenceSourceHead}^{tree}`),
    writerBoundary: `${prefix}**`,
    productAudioChanged: false,
    normalOnly: true,
    revisionReason: 'P2 shared-dispose/HMR ownership race and P3 keyboard-focus proof repair',
  },
  pathContracts: {
    baseToContract: baseToContractPaths,
    contractToAuthorization: contractToAuthorizationPaths,
    authorizationToOriginalSource: sourceNames.map((name) => `${prefix}${name}`),
    originalSourceToSupersededPreReport: preReportGeneratedNames.map((name) => `${prefix}${name}`),
    supersededPreReportToRevisionBase: [`${prefix}verification-report.json`],
    revisionBaseToSource: revisionPaths,
    accessibilityRevisionBaseToSource: accessibilityRevisionPaths,
    sourceToPreReport: preReportGeneratedNames.map((name) => `${prefix}${name}`),
    terminalReport: `${prefix}verification-report.json`,
  },
  humanGate: {
    status: 'OPEN',
    defaultVerdict: 'reject-all',
    candidates: ['A', 'B', 'C'],
    automaticAcceptanceForbidden: true,
    blocksSubsequentCoordinatorWork: false,
  },
  environment: {
    playwright: rendered.playwrightVersion,
    chromium: rendered.browserVersion,
    sampleRate: 48_000,
    channelsRendered: 2,
    preRollFrames: 24_000,
    analysisFrames: 8_640,
    stemFormat: 'mono PCM16 WAV',
    stemBoundary: 'post-owned-compressors-and-candidate-trim / pre-enabledGate-and-output',
  },
  candidatesContract: {
    labels: ['A', 'B', 'C'],
    sourceReservations: { A: 4, B: 3, C: 1 },
    trims: { A: 0.9793104026564039, B: 0.4452, C: 0.8625147192924494 },
    A: { atoms: ['hard-drop@0ms pan0', 'lock@9ms pan0', 'move@18ms pan0'], branch: 'Action master 1.85 -> Action compressor' },
    B: { atoms: ['hard-drop@0ms pan0', 'Studio excerpt@12ms pan0'], studio: { rate: 1.18, targetPeak: 0.5, maxDurationMs: 117, fadeMs: 21.06, stopAfterEndMs: 6 }, branch: 'Action and Studio compressors -> sum' },
    C: { layer: { instrument: 'countdown-knock', duration: 0.070, gain: 0.250, attack: 0.006, release: 0.240, frequency: 440, brightness: 0.20, spread: 1, seed: 0x544d3336, endFrequency: 'omitted' }, branch: 'mutation .96 -> effects 1 -> master 1.85 -> Action compressor' },
    auditionGraph: { stemSource: 1, enabledGate: 1, outputVolume: 1, output: 0.78 },
  },
  timing: {
    visualImpactMs: 220,
    rendererDurationMs: browserReport.initial.renderer.durationMs,
    rendererReviewDurationMs: browserReport.initial.renderer.reviewDurationMs,
    fullMotionTasteSurface: '1x',
    reducedMotionTechnicalOnly: true,
  },
  metrics: browserReport.metrics,
  lifecycle: {
    scenarioCount: browserReport.lifecycle.length,
    entryStates: ['priming', 'pending', 'playing', 'idle'],
    terminalMethods: ['dispose', 'pagehide', 'hmr'],
  },
  accessibility: {
    keyboardProof: browserReport.keyboardInput,
    minimumControlHeightPx: {
      desktop: browserReport.layout.desktop.minimumControlHeight,
      mobile: browserReport.layout.mobile.minimumControlHeight,
    },
  },
  sourceBindings,
  productionBindings,
  contractBindings,
  candidates,
  evidenceOutputs,
};
await writeFile(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  wrote: rel(join(root, 'manifest.json')),
  evidenceSourceHead,
  sourceBindings: sourceBindings.length,
  productionBindings: productionBindings.length,
  candidates: Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate.sha256])),
  outputs: evidenceOutputs.length,
}));
