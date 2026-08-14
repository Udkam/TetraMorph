import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { R4A_RECIPES } from './recipes.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const repository = join(root, '..', '..', '..', '..');
const rel = (path) => relative(repository, path).replaceAll('\\', '/');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readHash = async (path) => sha256(await readFile(path));
const git = (...args) => execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();

const CONTRACT_BASE_SHA = '8c2b81def4cbf2d320a26c6575fc1e9f0c023576';
const CURRENT_PRODUCT_SHA = '56a23812ec640b913de894290bca4c9511f86cff';
git('merge-base', '--is-ancestor', CURRENT_PRODUCT_SHA, 'HEAD');

const sourceFiles = [
  ['recipe', join(root, 'recipes.mjs')],
  ['generator', join(root, 'render-candidates.mjs')],
  ['audio-graph', join(root, 'audioGraph.ts')],
  ['core-renderer-fixture', join(root, 'fixture.ts')],
  ['player-harness', join(root, 'audition.ts')],
  ['player-page', join(root, 'index.html')],
  ['player-style', join(root, 'styles.css')],
  ['browser-verifier', join(root, 'browser-smoke.mjs')],
  ['signal-verifier', join(root, 'verify.mjs')],
  ['manifest-writer', join(root, 'write-manifest.mjs')],
  ['production-renderer', join(repository, 'src/game/render/TetrisRenderer.ts')],
  ['production-mutation-timeline', join(repository, 'src/animation/mutationTimeline.ts')],
  ['production-mutation-tokens', join(repository, 'src/design/mutationTokens.ts')],
  ['production-accepted-playback', join(repository, 'src/game/audio/acceptedPlayback.ts')],
  ['production-audio-asset-catalog', join(repository, 'src/game/audio/audioAssetCatalog.ts')],
];
const sourceBindings = [];
for (const [role, path] of sourceFiles) {
  sourceBindings.push({ role, path: rel(path), sha256: await readHash(path) });
}

const tokenSource = await readFile(join(repository, 'src/design/mutationTokens.ts'), 'utf8');
const bombToken = tokenSource.match(/bomb:\s*\{[\s\S]*?animation:\s*\{\s*enterMs:\s*(\d+),\s*pulseMs:\s*(\d+),\s*exitMs:\s*(\d+),\s*activationMs:\s*(\d+)/);
if (!bombToken) throw new Error('Could not recompute the production Bomb token timing.');
const enterMs = Number(bombToken[1]);
const pulseMs = Number(bombToken[2]);
const impactMs = enterMs + pulseMs;
if (impactMs !== 220) throw new Error(`Production Bomb impact drifted to ${impactMs} ms.`);

const browserReportPath = join(root, 'browser-report.json');
const browserReport = JSON.parse(await readFile(browserReportPath, 'utf8'));
if (!browserReport.passed) throw new Error('Browser report is not passing.');

const candidates = [];
for (const [id, recipe] of Object.entries(R4A_RECIPES)) {
  const path = join(root, 'assets', `${id}.wav`);
  const bytes = await readFile(path);
  const activityMs = Math.max(...recipe.contacts.map((voice) => voice.delayMs + voice.durationMs));
  candidates.push({
    id,
    path: rel(path),
    sha256: sha256(bytes),
    bytes: bytes.length,
    sampleRate: bytes.readUInt32LE(24),
    channels: bytes.readUInt16LE(22),
    bitsPerSample: bytes.readUInt16LE(34),
    fileDurationMs: (bytes.readUInt32LE(40) / 2) / bytes.readUInt32LE(24) * 1_000,
    activityMs,
    contacts: recipe.contacts,
  });
}

const evidenceOutputs = [];
for (const name of ['browser-report.json', 'r4a-desktop-impact.png', 'r4a-mobile.png', 'r4a-reduced-technical.png']) {
  const path = join(root, name);
  const bytes = await readFile(path);
  evidenceOutputs.push({ path: rel(path), sha256: sha256(bytes), bytes: bytes.length });
}

const manifest = {
  schema: 'tetramorph.t37.bomb-r4a-normal-audition.v1',
  generatedAt: new Date().toISOString(),
  contract: {
    baseSha: CONTRACT_BASE_SHA,
    currentProductSha: CURRENT_PRODUCT_SHA,
    evidenceSourceHead: git('rev-parse', 'HEAD'),
    writerBoundary: 'docs/evidence/t37/bomb-soft-block-audition-r4a/**',
    normalOnly: true,
    productAudioChanged: false,
  },
  humanGate: {
    status: 'OPEN',
    defaultVerdict: 'reject-all',
    candidates: ['X', 'Y', 'Z'],
    automaticAcceptanceForbidden: true,
  },
  synthesis: {
    sampleRate: 48_000,
    format: 'mono PCM16 WAV',
    fileDurationMs: 180,
    voiceGainBoostCompletedInWav: 1.45,
    voiceGainCeilingCompletedInWav: 0.5,
    importedRecordedMedia: false,
    importedR2OrR3Media: false,
    noiseSource: false,
    frequencySweep: false,
    reverb: false,
  },
  timing: {
    tokenEnterMs: enterMs,
    tokenPulseMs: pulseMs,
    recomputedImpactMs: impactMs,
    rendererDurationMs: browserReport.initial.renderer.durationMs,
    fullMotionTasteSurface: '1x',
    reducedMotionTechnicalOnly: true,
  },
  graph: browserReport.metrics.graph,
  references: {
    hardDropPeak: browserReport.metrics.references.hardDrop.peak,
    studioOneLinePeak: browserReport.metrics.references.studioOneLine.peak,
  },
  candidates,
  sourceBindings,
  evidenceOutputs,
};
await writeFile(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ wrote: rel(join(root, 'manifest.json')), candidates: candidates.map(({ id, sha256: hash }) => ({ id, sha256: hash })), impactMs }));
