import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..', '..', '..', '..');
const prefix = 'docs/evidence/t37/bomb-familiar-language-chain-audition-r5b/';
const r5aPrefix = 'docs/evidence/t37/bomb-familiar-language-audition-r5a/';
const AUTH = 'b611a71443288f74735d3878cd4805ea8521adfa';
const PRODUCT = '94957fd';
const R5A_SOURCE = '9d30894';
const R5A_OUTPUT = '99b47be';
const R5A_REPORT = '4ce7ba3';
const COORDINATOR_DETOUR = Object.freeze({
  path: 'docs/agent-runs/t37-unified-sensory-curriculum/SURVIVAL-OPTIMIZATION-PROPOSAL.md',
  addHead: '94e8b9b0b6480a974477d70e4ec7862a5064dfb2',
  addParent: '4638d7c01d110a4ab6da404130dfc619af2579e0',
  addGitObject: '28881be3fa887239ae3b01d16f8e58d9832ee05d',
  revertHead: '97a4ddc9fc96a0b47d56b4a99c710fd119a62535',
  revertParent: '94e8b9b0b6480a974477d70e4ec7862a5064dfb2',
});
const SOURCE = ['README.md', 'index.html', 'styles.css', 'fixture.ts', 'productAudioSession.ts', 'audition.ts', 'browser-smoke.mjs', 'client-actions.json', 'write-manifest.mjs', 'verify.mjs'];
const OUTPUT = ['browser-report.json', 'r5b-desktop-normal-a.png', 'r5b-desktop-chain-a.png', 'r5b-mobile-chain-a.png', 'r5b-reduced-technical-a.png', 'client-smoke/shot-0.png', 'client-smoke/shot-1.png', 'client-smoke/shot-2.png', 'client-smoke/state-0.json', 'client-smoke/state-1.json', 'client-smoke/state-2.json'];
const PRE_REPORT = [...OUTPUT, 'manifest.json'];
const TERMINAL = ['verification-report.json'];
const CONTRACT = ['docs/DESIGN.md', 'docs/CURRENT_TASK.md', 'docs/agent-runs/t37-unified-sensory-curriculum/STATE.md', 'docs/logs/CHANGELOG.md'];
const PRODUCT_BINDINGS = [
  { kind: 'tree', path: 'src/game/core', object: 'e9b3a3ed0d001072f5291a8fc841c1849e4db44f' },
  { kind: 'tree', path: 'src/game/audio', object: '7d7d562681f6682b7be9eb9c7bb8c3acb1852580' },
  { kind: 'tree', path: 'src/game/render', object: '7248a4b568155510de575c60b8ae690c726d58f9' },
  ...['src/game/render/TetrisRenderer.ts', 'src/animation/mutationChainTimeline.ts', 'src/animation/mutationTimeline.ts', 'src/design/mutationTokens.ts', 'src/game/runtime/GameRuntime.ts', 'src/platform/browserPlatform.ts', 'src/game/audio/acceptedPlayback.ts', 'src/game/audio/AudioEngine.ts', 'src/game/audio/bombStemPlayback.ts', 'src/game/audio/audioAssetCatalog.ts', 'src/assets/audio/t37/bomb-familiar-a.wav', 'src/assets/audio/t37/bomb-familiar-b.wav', 'src/assets/audio/t37/bomb-familiar-c.wav'].map((path) => ({ kind: 'blob', path })),
];
const R5A_SOURCE_PATHS = ['.gitattributes', 'README.md', 'audioSession.ts', 'audition.ts', 'browser-smoke.mjs', 'candidateContract.ts', 'candidateGraph.ts', 'client-actions.json', 'fixture-harness.html', 'fixture-harness.ts', 'fixture.ts', 'index.html', 'metric-harness.html', 'metric-harness.ts', 'render-candidates.mjs', 'render-harness.html', 'render-harness.ts', 'signalMetrics.ts', 'styles.css', 'verify.mjs', 'write-manifest.mjs'].map((path) => r5aPrefix + path);
const R5A_OUTPUT_PATHS = ['assets/A.wav', 'assets/B.wav', 'assets/C.wav', 'browser-report.json', 'client-smoke/shot-0.png', 'client-smoke/shot-1.png', 'client-smoke/shot-2.png', 'client-smoke/state-0.json', 'client-smoke/state-1.json', 'client-smoke/state-2.json', 'manifest.json', 'r5a-desktop-impact.png', 'r5a-mobile.png', 'r5a-reduced-technical.png'].map((path) => r5aPrefix + path);
const R5A_TERMINAL_PATHS = [r5aPrefix + 'verification-report.json'];
const WAV = Object.freeze({ A: 'be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254', B: 'b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc', C: 'ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6' });
const FULL_BEATS = Array.from({ length: 20 }, (_, index) => 220 + index * 56);
const REDUCED_BEATS = Array.from({ length: 20 }, (_, index) => 50 + index * 20);
const BYTE_CONTRACT = Object.freeze({ text: 'UTF-8 no-BOM LF-only', png: 'binary-unfiltered', committedDomain: 'git blob', precommitDomain: 'validated raw worktree bytes', manifestSelfHash: 'excluded' });
const TIMING = Object.freeze({ normalFrames: 19_200, fullChainFrames: 65_664, reducedChainFrames: 22_368, fullBeatStartsMs: FULL_BEATS, reducedBeatStartsMs: REDUCED_BEATS });
const MANIFEST_KEYS = ['schema', 'generatedAt', 'provenance', 'historyDisclosure', 'pathContracts', 'countContracts', 'byteContract', 'timing', 'wav', 'sourceBindings', 'outputBindings', 'contractBindings', 'productBindings', 'r5aBindings'];
const BROWSER_KEYS = ['schema', 'generatedAt', 'passed', 'failures', 'initial', 'naturalPair', 'domRoutes', 'technical', 'sameContext', 'stemAssets', 'stopped', 'restarted', 'disabled', 'enabled', 'reenabledReplay', 'reducedState', 'reducedTerminal', 'mobileTerminal', 'desktopTerminal', 'races', 'variantRace', 'assetRequests', 'layout', 'consoleErrors', 'pageErrors', 'requestErrors'];

if (SOURCE.length !== 10 || PRE_REPORT.length !== 12 || TERMINAL.length !== 1 || CONTRACT.length !== 4 || R5A_SOURCE_PATHS.length !== 21 || R5A_OUTPUT_PATHS.length !== 14 || R5A_TERMINAL_PATHS.length !== 1) throw new Error('Frozen path-count contract drifted.');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const blob = (head, path) => execFileSync('git', ['show', `${head}:${path}`], { cwd: repo });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sorted = (values) => [...values].sort();
const equalSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const canonicalIso = (value) => { try { return typeof value === 'string' && new Date(value).toISOString() === value; } catch { return false; } };
const range = (from, to) => git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
const treePaths = (head, pathPrefix) => git('ls-tree', '-r', '--name-only', head, '--', pathPrefix).split(/\r?\n/u).filter(Boolean);
const exists = (head, path) => { try { git('cat-file', '-e', `${head}:${path}`); return true; } catch { return false; } };
function exactRange(from, to, expected, label) {
  git('merge-base', '--is-ancestor', from, to);
  const observed = range(from, to);
  if (!equalSet(observed, expected)) throw new Error(`${label}: ${observed.join(',')}`);
}
function exactTree(head, pathPrefix, expected, label) {
  const observed = treePaths(head, pathPrefix);
  if (!equalSet(observed, expected)) throw new Error(`${label}: ${observed.join(',')}`);
}
function text(bytes, label) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error(`${label}: BOM`);
  if (bytes.includes(13)) throw new Error(`${label}: CR`);
  new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
async function files(directory, base = '') {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = base ? `${base}/${entry.name}` : entry.name;
    output.push(...(entry.isDirectory() ? await files(join(directory, entry.name), name) : [name]));
  }
  return output;
}
function bindBlob(head, path) {
  const bytes = blob(head, path);
  return { kind: 'blob', head, path, gitObject: git('rev-parse', `${head}:${path}`), sha256: sha(bytes), bytes: bytes.length };
}
function bindProduct(entry) {
  const object = git('rev-parse', `${PRODUCT}:${entry.path}`);
  if (entry.object && object !== entry.object) throw new Error(`Product tree drift: ${entry.path}`);
  return entry.kind === 'tree' ? { kind: 'tree', head: PRODUCT, path: entry.path, gitObject: object } : bindBlob(PRODUCT, entry.path);
}
function exactLinearHistory(from, to, expected, label, inspect = () => {}) {
  git('merge-base', '--is-ancestor', from, to);
  const rows = git('rev-list', '--reverse', '--parents', `${from}..${to}`).split(/\r?\n/u).filter(Boolean).map((line) => line.split(' '));
  const touched = new Set();
  for (const [commit, ...parents] of rows) {
    if (parents.length !== 1) throw new Error(`${label}: non-linear commit ${commit}.`);
    const changes = git('diff-tree', '--no-commit-id', '--name-status', '-r', commit).split(/\r?\n/u).filter(Boolean).map((line) => {
      const [status, path, extra] = line.split('\t');
      if (!['A', 'M', 'D'].includes(status) || !path || extra) throw new Error(`${label}: unsupported history entry at ${commit}: ${line}`);
      if (!expected.includes(path)) throw new Error(`${label}: unauthorized path ${path} at ${commit}.`);
      touched.add(path);
      return { status, path };
    });
    if (changes.length === 0) throw new Error(`${label}: empty commit ${commit}.`);
    inspect(commit, parents[0], changes);
  }
  if (!equalSet(touched, expected)) throw new Error(`${label}: touched-path union drifted.`);
  return rows;
}
function historyDisclosure(from, to, sourcePaths) {
  let sawAdd = false;
  let sawRevert = false;
  const expected = [...sourcePaths, COORDINATOR_DETOUR.path];
  exactLinearHistory(from, to, expected, 'authorization history', (commit, parent, changes) => {
    if (commit === COORDINATOR_DETOUR.addHead) {
      sawAdd = true;
      if (parent !== COORDINATOR_DETOUR.addParent || JSON.stringify(changes) !== JSON.stringify([{ status: 'A', path: COORDINATOR_DETOUR.path }])) throw new Error('Coordinator add detour drifted.');
    } else if (commit === COORDINATOR_DETOUR.revertHead) {
      sawRevert = true;
      if (parent !== COORDINATOR_DETOUR.revertParent || JSON.stringify(changes) !== JSON.stringify([{ status: 'D', path: COORDINATOR_DETOUR.path }])) throw new Error('Coordinator revert detour drifted.');
    } else if (changes.some(({ path }) => path === COORDINATOR_DETOUR.path)) {
      throw new Error(`Coordinator detour touched by unauthorized commit ${commit}.`);
    }
  });
  if (!sawAdd || !sawRevert) throw new Error('Coordinator detour commits are absent from authorization history.');
  if (exists(to, COORDINATOR_DETOUR.path)) throw new Error('Authorization detour is not net-zero at the source endpoint.');
  const added = blob(COORDINATOR_DETOUR.addHead, COORDINATOR_DETOUR.path);
  text(added, COORDINATOR_DETOUR.path);
  if (git('rev-parse', `${COORDINATOR_DETOUR.addHead}:${COORDINATOR_DETOUR.path}`) !== COORDINATOR_DETOUR.addGitObject) throw new Error('Coordinator detour blob drifted.');
  return {
    range: `${from}..${to}`,
    allowedSourcePrefix: prefix,
    touchedPaths: [...sourcePaths, COORDINATOR_DETOUR.path],
    disposition: 'disclosed net-zero coordinator detour; absent at source endpoint',
    coordinatorDetour: {
      path: COORDINATOR_DETOUR.path,
      add: { head: COORDINATOR_DETOUR.addHead, parent: COORDINATOR_DETOUR.addParent, status: 'A', gitObject: COORDINATOR_DETOUR.addGitObject, sha256: sha(added), bytes: added.length },
      revert: { head: COORDINATOR_DETOUR.revertHead, parent: COORDINATOR_DETOUR.revertParent, status: 'D' },
    },
  };
}

const head = git('rev-parse', 'HEAD');
const sourcePaths = SOURCE.map((path) => prefix + path);
const prePaths = PRE_REPORT.map((path) => prefix + path);
const terminalPaths = TERMINAL.map((path) => prefix + path);
exactRange(AUTH, head, sourcePaths, 'authorization-to-source');
exactTree(head, prefix, sourcePaths, 'source tree');
const disclosedHistory = historyDisclosure(AUTH, head, sourcePaths);
exactRange(R5A_SOURCE, R5A_OUTPUT, R5A_OUTPUT_PATHS, 'R5A source-to-output');
exactLinearHistory(R5A_SOURCE, R5A_OUTPUT, R5A_OUTPUT_PATHS, 'R5A source-to-output history');
exactRange(R5A_OUTPUT, R5A_REPORT, R5A_TERMINAL_PATHS, 'R5A output-to-terminal');
exactLinearHistory(R5A_OUTPUT, R5A_REPORT, R5A_TERMINAL_PATHS, 'R5A output-to-terminal history');
exactTree(R5A_SOURCE, r5aPrefix, R5A_SOURCE_PATHS, 'R5A source tree');
exactTree(R5A_OUTPUT, r5aPrefix, [...R5A_SOURCE_PATHS, ...R5A_OUTPUT_PATHS], 'R5A output tree');
exactTree(R5A_REPORT, r5aPrefix, [...R5A_SOURCE_PATHS, ...R5A_OUTPUT_PATHS, ...R5A_TERMINAL_PATHS], 'R5A terminal tree');
if (git('status', '--short', '--', ...sourcePaths)) throw new Error('Source paths are dirty.');
const actual = await files(root);
if (!equalSet(actual, [...SOURCE, ...OUTPUT])) throw new Error(`Pre-manifest directory drift: ${actual.join(',')}`);

const sourceBindings = sourcePaths.map((path) => { const binding = bindBlob(head, path); text(blob(head, path), path); return binding; });
const outputBindings = [];
for (const path of OUTPUT) {
  const bytes = await readFile(join(root, path));
  if (!path.endsWith('.png')) text(bytes, path);
  outputBindings.push({ path: prefix + path, sha256: sha(bytes), bytes: bytes.length });
}
const contractBindings = CONTRACT.map((path) => { const binding = bindBlob(AUTH, path); text(blob(AUTH, path), path); return binding; });
const productBindings = PRODUCT_BINDINGS.map(bindProduct);
const r5aBindings = [
  ...R5A_SOURCE_PATHS.map((path) => bindBlob(R5A_SOURCE, path)),
  ...R5A_OUTPUT_PATHS.map((path) => bindBlob(R5A_OUTPUT, path)),
  ...R5A_TERMINAL_PATHS.map((path) => bindBlob(R5A_REPORT, path)),
];
for (const [index, variant] of ['A', 'B', 'C'].entries()) {
  const path = `src/assets/audio/t37/bomb-familiar-${variant.toLowerCase()}.wav`;
  const bytes = blob(PRODUCT, path);
  if (bytes.length !== 17_324 || sha(bytes) !== WAV[variant]) throw new Error(`${variant} WAV byte/hash drift.`);
  if (productBindings.at(-(3 - index)).path !== path) throw new Error(`${variant} product binding order drift.`);
}
const browserBytes = await readFile(join(root, 'browser-report.json'));
text(browserBytes, 'browser-report.json');
const browser = JSON.parse(browserBytes.toString('utf8'));
if (!equalSet(Object.keys(browser), BROWSER_KEYS) || !canonicalIso(browser.generatedAt) || browser.schema !== 'tetramorph.t37.r5b-browser-proof.v2' || !browser.passed || browser.failures.length !== 0) throw new Error('Browser report failed its exact schema/time/pass contract.');
if (JSON.stringify(browser.initial.fixture.fullBeatStartsMs) !== JSON.stringify(FULL_BEATS) || JSON.stringify(browser.initial.fixture.reducedBeatStartsMs) !== JSON.stringify(REDUCED_BEATS)) throw new Error('Browser shared beat timing drifted.');

const manifest = {
  schema: 'tetramorph.t37.r5b-manifest.v2',
  generatedAt: new Date().toISOString(),
  provenance: { authorizationHead: AUTH, evidenceSourceHead: head, productHead: PRODUCT, r5a: { source: R5A_SOURCE, outputs: R5A_OUTPUT, report: R5A_REPORT }, writerBoundary: `${prefix}**`, humanStatus: 'OPEN / NOT ACCEPTED' },
  historyDisclosure: disclosedHistory,
  pathContracts: { source: sourcePaths, authorizationTouched: disclosedHistory.touchedPaths, preReport: prePaths, terminal: terminalPaths, contract: CONTRACT, product: PRODUCT_BINDINGS.map(({ kind, path }) => ({ kind, path })), r5aSource: R5A_SOURCE_PATHS, r5aOutput: R5A_OUTPUT_PATHS, r5aTerminal: R5A_TERMINAL_PATHS },
  countContracts: { source: 10, authorizationTouched: 11, preReport: 12, terminal: 1, contract: 4, r5aSource: 21, r5aOutput: 14, r5aTerminal: 1 },
  byteContract: BYTE_CONTRACT,
  timing: TIMING,
  wav: WAV,
  sourceBindings,
  outputBindings,
  contractBindings,
  productBindings,
  r5aBindings,
};
if (!equalSet(Object.keys(manifest), MANIFEST_KEYS) || !canonicalIso(manifest.generatedAt)) throw new Error('Generated manifest exact keys/time contract drifted.');
const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
text(manifestBytes, 'manifest.json');
await writeFile(join(root, 'manifest.json'), manifestBytes);
console.log(JSON.stringify({ wrote: prefix + 'manifest.json', evidenceSourceHead: head, sources: sourceBindings.length, outputs: outputBindings.length, productBindings: productBindings.length, r5aBindings: r5aBindings.length }));
