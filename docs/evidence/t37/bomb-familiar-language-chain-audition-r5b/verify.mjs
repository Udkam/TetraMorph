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
const PRODUCT_CONTRACT = [
  { kind: 'tree', path: 'src/game/core', object: 'e9b3a3ed0d001072f5291a8fc841c1849e4db44f' },
  { kind: 'tree', path: 'src/game/audio', object: '7d7d562681f6682b7be9eb9c7bb8c3acb1852580' },
  { kind: 'tree', path: 'src/game/render', object: '7248a4b568155510de575c60b8ae690c726d58f9' },
  ...['src/game/render/TetrisRenderer.ts', 'src/animation/mutationChainTimeline.ts', 'src/animation/mutationTimeline.ts', 'src/design/mutationTokens.ts', 'src/game/runtime/GameRuntime.ts', 'src/platform/browserPlatform.ts', 'src/game/audio/acceptedPlayback.ts', 'src/game/audio/AudioEngine.ts', 'src/game/audio/bombStemPlayback.ts', 'src/game/audio/audioAssetCatalog.ts', 'src/assets/audio/t37/bomb-familiar-a.wav', 'src/assets/audio/t37/bomb-familiar-b.wav', 'src/assets/audio/t37/bomb-familiar-c.wav'].map((path) => ({ kind: 'blob', path })),
];
const R5A_SOURCE_PATHS = ['.gitattributes', 'README.md', 'audioSession.ts', 'audition.ts', 'browser-smoke.mjs', 'candidateContract.ts', 'candidateGraph.ts', 'client-actions.json', 'fixture-harness.html', 'fixture-harness.ts', 'fixture.ts', 'index.html', 'metric-harness.html', 'metric-harness.ts', 'render-candidates.mjs', 'render-harness.html', 'render-harness.ts', 'signalMetrics.ts', 'styles.css', 'verify.mjs', 'write-manifest.mjs'].map((path) => r5aPrefix + path);
const R5A_OUTPUT_PATHS = ['assets/A.wav', 'assets/B.wav', 'assets/C.wav', 'browser-report.json', 'client-smoke/shot-0.png', 'client-smoke/shot-1.png', 'client-smoke/shot-2.png', 'client-smoke/state-0.json', 'client-smoke/state-1.json', 'client-smoke/state-2.json', 'manifest.json', 'r5a-desktop-impact.png', 'r5a-mobile.png', 'r5a-reduced-technical.png'].map((path) => r5aPrefix + path);
const R5A_TERMINAL_PATHS = [r5aPrefix + 'verification-report.json'];
const WAV = Object.freeze({ A: 'be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254', B: 'b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc', C: 'ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6' });
const PCM16_POSITIVE_SCALE = Math.fround(1 / 32_767);
const PCM16_NEGATIVE_SCALE = Math.fround(1 / 32_768);
const FULL_BEATS = Array.from({ length: 20 }, (_, index) => 220 + index * 56);
const REDUCED_BEATS = Array.from({ length: 20 }, (_, index) => 50 + index * 20);
const HUMAN_STATUS = 'OPEN / NOT ACCEPTED — automated evidence is technical only';
const BYTE_CONTRACT = Object.freeze({ text: 'UTF-8 no-BOM LF-only', png: 'binary-unfiltered', committedDomain: 'git blob', precommitDomain: 'validated raw worktree bytes', manifestSelfHash: 'excluded' });
const TIMING = Object.freeze({ normalFrames: 19_200, fullChainFrames: 65_664, reducedChainFrames: 22_368, fullBeatStartsMs: FULL_BEATS, reducedBeatStartsMs: REDUCED_BEATS });
const MANIFEST_KEYS = ['schema', 'generatedAt', 'provenance', 'historyDisclosure', 'pathContracts', 'countContracts', 'byteContract', 'timing', 'wav', 'sourceBindings', 'outputBindings', 'contractBindings', 'productBindings', 'r5aBindings'];
const TERMINAL_KEYS = ['schema', 'generatedAt', 'passed', 'failures', 'checks', 'manifestSha256', 'evidenceSourceHead', 'generatedInputHead', 'pathContracts', 'humanStatus'];
const BROWSER_KEYS = ['schema', 'generatedAt', 'passed', 'failures', 'initial', 'naturalPair', 'domRoutes', 'technical', 'sameContext', 'stemAssets', 'stopped', 'restarted', 'disabled', 'enabled', 'reenabledReplay', 'reducedState', 'reducedTerminal', 'mobileTerminal', 'desktopTerminal', 'races', 'variantRace', 'assetRequests', 'layout', 'consoleErrors', 'pageErrors', 'requestErrors'];

if (SOURCE.length !== 10 || PRE_REPORT.length !== 12 || TERMINAL.length !== 1 || CONTRACT.length !== 4 || R5A_SOURCE_PATHS.length !== 21 || R5A_OUTPUT_PATHS.length !== 14 || R5A_TERMINAL_PATHS.length !== 1) throw new Error('Independent frozen path-count contract drifted.');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const blob = (head, path) => execFileSync('git', ['show', `${head}:${path}`], { cwd: repo });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const equalSet = (left, right) => deepEqual([...left].sort(), [...right].sort());
const canonicalIso = (value) => { try { return typeof value === 'string' && new Date(value).toISOString() === value; } catch { return false; } };
function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !equalSet(Object.keys(value), expected)) throw new Error(`${label} keys drifted.`);
}
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
  if (entry.object && object !== entry.object) throw new Error(`Independent product tree drift: ${entry.path}`);
  return entry.kind === 'tree' ? { kind: 'tree', head: PRODUCT, path: entry.path, gitObject: object } : bindBlob(PRODUCT, entry.path);
}
function exactLinearHistory(from, to, expected, label, inspect = () => {}) {
  git('merge-base', '--is-ancestor', from, to);
  const rows = git('rev-list', '--reverse', '--parents', `${from}..${to}`).split(/\r?\n/u).filter(Boolean).map((line) => line.split(' '));
  const touched = new Set();
  for (const [commit, ...parents] of rows) {
    if (parents.length !== 1) throw new Error(`${label}: independent non-linear commit ${commit}.`);
    const changes = git('diff-tree', '--no-commit-id', '--name-status', '--find-renames=50%', '--find-copies=50%', '--find-copies-harder', '-l0', '-r', commit).split(/\r?\n/u).filter(Boolean).map((line) => {
      const [status, path, extra] = line.split('\t');
      if (!['A', 'M', 'D'].includes(status) || !path || extra) throw new Error(`${label}: independent unsupported history entry at ${commit}: ${line}`);
      if (!expected.includes(path)) throw new Error(`${label}: independent unauthorized path ${path} at ${commit}.`);
      touched.add(path);
      return { status, path };
    });
    if (changes.length === 0) throw new Error(`${label}: independent empty commit ${commit}.`);
    const statuses = new Set(changes.map(({ status }) => status));
    if (statuses.has('A') && statuses.has('D')) throw new Error(`${label}: independent mixed add/delete commit ${commit}.`);
    inspect(commit, parents[0], changes);
  }
  if (!equalSet(touched, expected)) throw new Error(`${label}: independent touched-path union drifted.`);
  return rows;
}
function historyDisclosure(from, to, sourcePaths) {
  let sawAdd = false;
  let sawRevert = false;
  const expected = [...sourcePaths, COORDINATOR_DETOUR.path];
  exactLinearHistory(from, to, expected, 'authorization history', (commit, parent, changes) => {
    if (commit === COORDINATOR_DETOUR.addHead) {
      sawAdd = true;
      if (parent !== COORDINATOR_DETOUR.addParent || !deepEqual(changes, [{ status: 'A', path: COORDINATOR_DETOUR.path }])) throw new Error('Independent coordinator add detour drifted.');
    } else if (commit === COORDINATOR_DETOUR.revertHead) {
      sawRevert = true;
      if (parent !== COORDINATOR_DETOUR.revertParent || !deepEqual(changes, [{ status: 'D', path: COORDINATOR_DETOUR.path }])) throw new Error('Independent coordinator revert detour drifted.');
    } else if (changes.some(({ path }) => path === COORDINATOR_DETOUR.path)) {
      throw new Error(`Independent coordinator detour touched by unauthorized commit ${commit}.`);
    }
  });
  if (!sawAdd || !sawRevert) throw new Error('Independent coordinator detour commits are absent from authorization history.');
  if (exists(to, COORDINATOR_DETOUR.path)) throw new Error('Independent authorization detour is not net-zero at the source endpoint.');
  const added = blob(COORDINATOR_DETOUR.addHead, COORDINATOR_DETOUR.path);
  text(added, `independent ${COORDINATOR_DETOUR.path}`);
  if (git('rev-parse', `${COORDINATOR_DETOUR.addHead}:${COORDINATOR_DETOUR.path}`) !== COORDINATOR_DETOUR.addGitObject) throw new Error('Independent coordinator detour blob drifted.');
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
function decodeWav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('WAV RIFF contract drift.');
  let cursor = 12;
  let format;
  let data;
  while (cursor + 8 <= bytes.length) {
    const tag = bytes.toString('ascii', cursor, cursor + 4);
    const size = bytes.readUInt32LE(cursor + 4);
    const body = cursor + 8;
    if (body + size > bytes.length) throw new Error(`WAV ${tag} chunk overflow.`);
    if (tag === 'fmt ') format = { encoding: bytes.readUInt16LE(body), channels: bytes.readUInt16LE(body + 2), sampleRate: bytes.readUInt32LE(body + 4), bits: bytes.readUInt16LE(body + 14) };
    if (tag === 'data') { data = bytes.subarray(body, body + size); break; }
    cursor = body + size + (size % 2);
  }
  if (!format || !data || format.encoding !== 1 || format.channels !== 1 || format.sampleRate !== 48_000 || format.bits !== 16 || data.length !== 17_280) throw new Error('PCM16 WAV shape drift.');
  const samples = new Float32Array(8_640);
  for (let index = 0; index < samples.length; index += 1) {
    const pcm16 = data.readInt16LE(index * 2);
    const scale = pcm16 < 0 ? PCM16_NEGATIVE_SCALE : PCM16_POSITIVE_SCALE;
    samples[index] = Math.fround(pcm16 * scale);
  }
  const checkpoints = [0, 1, 47, 511, 2_047, 4_319, 8_638, 8_639].map((frame) => ({ frame, pcm16: data.readInt16LE(frame * 2), float: samples[frame] }));
  return { samples, pcm16Sha256: sha(data), checkpoints };
}
function compose(stem, beats, reduced) {
  const profile = reduced ? { grainFrames: 1_728, fadeFrames: 768, gain: 0.055 } : { grainFrames: 4_032, fadeFrames: 1_344, gain: 0.11 };
  const starts = beats.map((value) => value * 48);
  const output = new Float32Array(Math.max(starts[0] + 8_640, starts.at(-1) + profile.grainFrames));
  output.set(stem, starts[0]);
  for (const start of starts.slice(1)) {
    for (let index = 0; index < profile.grainFrames; index += 1) {
      const fadeStart = profile.grainFrames - profile.fadeFrames;
      const weight = index < fadeStart ? 1 : 0.5 * (1 + Math.cos(Math.PI * ((index - fadeStart) / (profile.fadeFrames - 1))));
      output[start + index] += stem[index] * profile.gain * weight;
    }
  }
  return { output, profile };
}

const checks = [];
function check(value, label) { if (!value) throw new Error(label); checks.push(label); }
function verifyActiveOwners(state, label, { liveContexts, eventSources, pendingTimers, frameCallbacks }) {
  check(state.ready === true && state.disposed === false && state.disposing === false && state.domRetired === false && state.qaGlobals === true, `${label} active flags`);
  check(state.canvasCount === 1 && state.renderer.canvasCount === 1 && state.renderer.rendererOwners === 1, `${label} one Canvas/Renderer`);
  check(state.audio.liveContexts === liveContexts && state.audio.eventSources === eventSources && state.audio.pendingTransitions === 0 && state.audio.maxLiveContextsObserved <= 1, `${label} bounded audio/transitions`);
  check(state.pendingTimers === pendingTimers && state.renderer.frameCallbacks === frameCallbacks && state.listenerCount === 3, `${label} timers/RAF/listeners`);
  check(state.renderer.tickerOwners === 1 && state.renderer.tickerObserved === true && state.renderer.tickerApplicationBound === true && state.renderer.tickerStarted === true && state.renderer.tickerDestroyed === false && state.renderer.tickerIdentity > 0, `${label} real Pixi ticker identity/state`);
  check(state.renderer.tickerListenerCount === state.renderer.tickerInitialListenerCount && state.renderer.tickerListenerCount > 0, `${label} real Pixi ticker listener count`);
}
function verifyTerminalOwners(state, label) {
  check(state.ready === false && state.disposed === true && state.disposing === false && state.domRetired === true && state.qaGlobals === false, `${label} terminal flags`);
  check(state.canvasCount === 0 && state.renderer.canvasCount === 0 && state.renderer.rendererOwners === 0, `${label} zero Canvas/Renderer`);
  check(state.audio.liveContexts === 0 && state.audio.eventSources === 0 && state.audio.pendingTransitions === 0 && state.audio.maxLiveContextsObserved <= 1, `${label} zero audio/transitions`);
  check(state.pendingTimers === 0 && state.renderer.frameCallbacks === 0 && state.listenerCount === 0, `${label} zero timers/RAF/listeners`);
  check(state.renderer.tickerOwners === 0 && state.renderer.tickerObserved === true && state.renderer.tickerApplicationBound === false && state.renderer.tickerStarted === false && state.renderer.tickerDestroyed === true && state.renderer.tickerListenerCount === 0 && state.renderer.tickerIdentity > 0, `${label} destroyed real Pixi ticker`);
}
const head = git('rev-parse', 'HEAD');
const reportPath = prefix + TERMINAL[0];
const terminalCommitted = exists(head, reportPath);
let committedReport = null;
let generated = head;
if (terminalCommitted) {
  const committedReportBytes = blob(head, reportPath);
  text(committedReportBytes, 'committed verification-report.json');
  committedReport = JSON.parse(committedReportBytes.toString('utf8'));
  exactKeys(committedReport, TERMINAL_KEYS, 'terminal report');
  generated = committedReport.generatedInputHead;
  exactRange(generated, head, [reportPath], 'generated-to-terminal');
  exactLinearHistory(generated, head, [reportPath], 'generated-to-terminal history');
}
const manifestBytes = blob(generated, prefix + 'manifest.json');
text(manifestBytes, 'manifest blob');
const manifest = JSON.parse(manifestBytes.toString('utf8'));
exactKeys(manifest, MANIFEST_KEYS, 'manifest');
exactKeys(manifest.provenance, ['authorizationHead', 'evidenceSourceHead', 'productHead', 'r5a', 'writerBoundary', 'humanStatus'], 'manifest provenance');
exactKeys(manifest.provenance.r5a, ['source', 'outputs', 'report'], 'manifest R5A provenance');
exactKeys(manifest.historyDisclosure, ['range', 'allowedSourcePrefix', 'touchedPaths', 'disposition', 'coordinatorDetour'], 'manifest history disclosure');
exactKeys(manifest.historyDisclosure.coordinatorDetour, ['path', 'add', 'revert'], 'manifest coordinator detour');
exactKeys(manifest.historyDisclosure.coordinatorDetour.add, ['head', 'parent', 'status', 'gitObject', 'sha256', 'bytes'], 'manifest coordinator add');
exactKeys(manifest.historyDisclosure.coordinatorDetour.revert, ['head', 'parent', 'status'], 'manifest coordinator revert');
const sourceHead = manifest.provenance.evidenceSourceHead;
const sourcePaths = SOURCE.map((path) => prefix + path);
const prePaths = PRE_REPORT.map((path) => prefix + path);
const terminalPaths = TERMINAL.map((path) => prefix + path);

exactRange(AUTH, sourceHead, sourcePaths, 'authorization-to-source');
const expectedHistoryDisclosure = historyDisclosure(AUTH, sourceHead, sourcePaths);
exactRange(sourceHead, generated, prePaths, 'source-to-generated');
exactLinearHistory(sourceHead, generated, prePaths, 'source-to-generated history');
exactTree(sourceHead, prefix, sourcePaths, 'source exact tree');
exactTree(generated, prefix, [...sourcePaths, ...prePaths], 'generated exact tree');
if (terminalCommitted) exactTree(head, prefix, [...sourcePaths, ...prePaths, ...terminalPaths], 'terminal exact tree');
exactRange(R5A_SOURCE, R5A_OUTPUT, R5A_OUTPUT_PATHS, 'R5A source-to-output');
exactLinearHistory(R5A_SOURCE, R5A_OUTPUT, R5A_OUTPUT_PATHS, 'R5A source-to-output history');
exactRange(R5A_OUTPUT, R5A_REPORT, R5A_TERMINAL_PATHS, 'R5A output-to-terminal');
exactLinearHistory(R5A_OUTPUT, R5A_REPORT, R5A_TERMINAL_PATHS, 'R5A output-to-terminal history');
exactTree(R5A_SOURCE, r5aPrefix, R5A_SOURCE_PATHS, 'R5A source exact tree');
exactTree(R5A_OUTPUT, r5aPrefix, [...R5A_SOURCE_PATHS, ...R5A_OUTPUT_PATHS], 'R5A output exact tree');
exactTree(R5A_REPORT, r5aPrefix, [...R5A_SOURCE_PATHS, ...R5A_OUTPUT_PATHS, ...R5A_TERMINAL_PATHS], 'R5A terminal exact tree');

check(manifest.schema === 'tetramorph.t37.r5b-manifest.v2', 'manifest schema');
check(canonicalIso(manifest.generatedAt), 'manifest canonical ISO generatedAt');
check(manifest.provenance.authorizationHead === AUTH && manifest.provenance.evidenceSourceHead === sourceHead && manifest.provenance.productHead === PRODUCT, 'manifest exact primary heads');
check(deepEqual(manifest.provenance.r5a, { source: R5A_SOURCE, outputs: R5A_OUTPUT, report: R5A_REPORT }), 'manifest exact R5A heads');
check(manifest.provenance.writerBoundary === `${prefix}**` && manifest.provenance.humanStatus === 'OPEN / NOT ACCEPTED', 'manifest boundary/human OPEN');
check(deepEqual(manifest.historyDisclosure, expectedHistoryDisclosure), 'manifest independently recomputed authorization history disclosure');
const expectedPathContracts = { source: sourcePaths, authorizationTouched: expectedHistoryDisclosure.touchedPaths, preReport: prePaths, terminal: terminalPaths, contract: CONTRACT, product: PRODUCT_CONTRACT.map(({ kind, path }) => ({ kind, path })), r5aSource: R5A_SOURCE_PATHS, r5aOutput: R5A_OUTPUT_PATHS, r5aTerminal: R5A_TERMINAL_PATHS };
check(deepEqual(manifest.pathContracts, expectedPathContracts), 'manifest exact path arrays');
check(deepEqual(manifest.countContracts, { source: 10, authorizationTouched: 11, preReport: 12, terminal: 1, contract: 4, r5aSource: 21, r5aOutput: 14, r5aTerminal: 1 }), 'manifest exact path counts');
check(deepEqual(manifest.byteContract, BYTE_CONTRACT), 'manifest complete byte/self-hash contract');
check(deepEqual(manifest.timing, TIMING), 'manifest independent exact timing/beat contract');
check(deepEqual(manifest.wav, WAV), 'manifest exact WAV hashes');

const expectedSourceBindings = sourcePaths.map((path) => bindBlob(sourceHead, path));
const expectedContractBindings = CONTRACT.map((path) => bindBlob(AUTH, path));
const expectedProductBindings = PRODUCT_CONTRACT.map(bindProduct);
const expectedR5aBindings = [...R5A_SOURCE_PATHS.map((path) => bindBlob(R5A_SOURCE, path)), ...R5A_OUTPUT_PATHS.map((path) => bindBlob(R5A_OUTPUT, path)), ...R5A_TERMINAL_PATHS.map((path) => bindBlob(R5A_REPORT, path))];
check(deepEqual(manifest.sourceBindings, expectedSourceBindings), 'independent source bindings');
check(deepEqual(manifest.contractBindings, expectedContractBindings), 'independent contract bindings');
check(deepEqual(manifest.productBindings, expectedProductBindings), 'independent product bindings/Core+audio+render trees');
check(deepEqual(manifest.r5aBindings, expectedR5aBindings), 'independent exact R5A bindings');
for (const binding of [...expectedSourceBindings, ...expectedContractBindings, ...expectedR5aBindings]) if (!binding.path.endsWith('.png') && !binding.path.endsWith('.wav')) text(blob(binding.head, binding.path), binding.path);
const expectedOutputBindings = PRE_REPORT.slice(0, -1).map((relativePath) => { const path = prefix + relativePath; const bytes = blob(generated, path); if (!path.endsWith('.png')) text(bytes, path); return { path, sha256: sha(bytes), bytes: bytes.length }; });
check(deepEqual(manifest.outputBindings, expectedOutputBindings), 'independent output bindings');

const browserBytes = blob(generated, prefix + 'browser-report.json');
text(browserBytes, 'browser-report.json');
const browser = JSON.parse(browserBytes.toString('utf8'));
exactKeys(browser, BROWSER_KEYS, 'browser report');
exactKeys(browser.races, ['stop', 'disable', 'pagehide', 'hmr'], 'browser races');
exactKeys(browser.races.hmr, ['old', 'freshBefore', 'domBefore', 'freshPrimeResult', 'freshPrimed', 'domPrimed', 'oldAfter', 'freshAfter', 'domAfter'], 'browser HMR race');
exactKeys(browser.variantRace, ['initial', 'beforeRelease', 'results', 'samples', 'state', 'terminal'], 'browser variant race');
exactKeys(browser.layout, ['desktop', 'mobile', 'reduced'], 'browser layout');
exactKeys(browser.sameContext, ['full', 'reduced'], 'browser same-context proof');
exactKeys(browser.stemAssets, ['A', 'B', 'C'], 'browser stem asset proof');
check(browser.schema === 'tetramorph.t37.r5b-browser-proof.v2' && browser.passed === true && deepEqual(browser.failures, []), 'browser schema/pass/failures');
check(canonicalIso(browser.generatedAt), 'browser canonical ISO generatedAt');
check(deepEqual(browser.consoleErrors, []) && deepEqual(browser.pageErrors, []) && deepEqual(browser.requestErrors, []), 'browser lifecycle/request errors zero');
check(browser.initial.verdict === 'reject' && browser.initial.playCount === 0 && browser.initial.audio.liveContexts === 0 && browser.initial.renderer.frameCallbacks === 0, 'browser fail-closed/no-autoplay');
verifyActiveOwners(browser.initial, 'browser initial desktop', { liveContexts: 0, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
check(browser.initial.fixture.normalOutcome === 'blast' && browser.initial.fixture.chainOutcome === 'chain-clear' && deepEqual(browser.initial.fixture.chainTriggerRows, [39]), 'browser real Core fixtures');
check(deepEqual(browser.initial.fixture.fullBeatStartsMs, FULL_BEATS) && deepEqual(browser.initial.fixture.reducedBeatStartsMs, REDUCED_BEATS), 'browser shared timeline exact beats');
check(browser.layout.desktop.overflow === false && browser.layout.desktop.minTarget >= 44 && browser.layout.desktop.canvas === 1, 'browser desktop no-overflow/44px/one Canvas layout');
check(browser.layout.mobile.overflow === false && browser.layout.mobile.minTarget >= 44 && browser.layout.mobile.canvas === 1, 'browser mobile no-overflow/44px/one Canvas layout');
check(browser.layout.reduced.overflow === false && browser.layout.reduced.minTarget >= 44 && browser.layout.reduced.canvas === 1, 'browser reduced no-overflow/44px/one Canvas layout');
check(browser.naturalPair.pairPhase === 'settled' && browser.naturalPair.pairSettledCount >= 1 && browser.naturalPair.playCount === 2 && browser.naturalPair.renderer.settledCount >= 2 && browser.naturalPair.pendingTimers === 0 && browser.naturalPair.renderer.frameCallbacks === 0 && browser.naturalPair.audio.eventSources === 0, 'browser natural full pair settled');
check(browser.naturalPair.audio.contextState === 'running' && browser.naturalPair.renderer.tickerOwners === 1 && browser.naturalPair.canvasCount === 1, 'browser gesture-running context/stable owners');
verifyActiveOwners(browser.naturalPair, 'browser natural pair', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
check(browser.domRoutes.interactionLog.some((entry) => entry.variant === 'A' && entry.route === 'pointer') && browser.domRoutes.interactionLog.some((entry) => entry.variant === 'B' && entry.route === 'keyboard') && browser.domRoutes.interactionLog.some((entry) => entry.variant === 'C' && entry.route === 'pointer'), 'browser actual A click/B Enter/C click routes');

const stemProofs = Object.fromEntries(['A', 'B', 'C'].map((variant) => {
  const bytes = blob(PRODUCT, `src/assets/audio/t37/bomb-familiar-${variant.toLowerCase()}.wav`);
  check(bytes.length === 17_324 && sha(bytes) === WAV[variant], `independent ${variant} WAV bytes/hash`);
  return [variant, decodeWav(bytes)];
}));
function verifyEvent(event, variant, scene, reduced) {
  const beats = scene === 'normal' ? [220] : (reduced ? REDUCED_BEATS : FULL_BEATS);
  const { output, profile } = compose(stemProofs[variant].samples, beats, reduced);
  const expectedBeatProof = beats.map((startMs, index) => ({ index, startMs, startFrame: startMs * 48, kind: index === 0 ? 'full-stem' : 'onset-grain', grainFrames: index === 0 ? 8_640 : profile.grainFrames, fadeFrames: index === 0 ? 0 : profile.fadeFrames, gain: index === 0 ? 1 : profile.gain, terminalWeight: index === 0 ? 1 : 0 }));
  check(event.variant === variant && event.scene === scene && event.reducedMotion === reduced, `event identity ${variant}/${scene}/${reduced}`);
  check(event.selectedAssetId === `bombFamiliar${variant}` && event.selectedAssetSha256 === WAV[variant] && event.selectedAssetBytes === 17_324, `event selected asset ${variant}/${scene}/${reduced}`);
  check(event.pcm16Sha256 === stemProofs[variant].pcm16Sha256 && deepEqual(event.pcm16Checkpoints, stemProofs[variant].checkpoints), `event independent PCM16 samples ${variant}/${scene}/${reduced}`);
  check(deepEqual(event.beatStartsMs, beats) && deepEqual(event.beatProof, expectedBeatProof), `event every beat proof ${variant}/${scene}/${reduced}`);
  check(event.channels === 1 && event.sampleRate === 48_000 && event.frames === output.length && event.expectedFrames === output.length, `event mono/exact frames ${variant}/${scene}/${reduced}`);
  check(event.finite === true && event.maxAbs <= 1 && event.preBeatMaxAbs === 0 && event.sourceStarted === true && event.sourceConnections === 1, `event finite/unclipped/source ${variant}/${scene}/${reduced}`);
  check(event.exactWithinTolerance === true && event.residualMaxAbs <= 1e-7 && event.expectedFloat32Sha256 === sha(Buffer.from(output.buffer)) && event.observedFloat32Sha256 === event.expectedFloat32Sha256, `event independent float reconstruction ${variant}/${scene}/${reduced}`);
}
check(browser.technical.length === 6, 'browser six A/B/C normal/full-chain technical events');
for (const variant of ['A', 'B', 'C']) for (const scene of ['normal', 'chain']) {
  const entry = browser.technical.find((candidate) => candidate.variant === variant && candidate.scene === scene && candidate.reducedMotion === false);
  check(!!entry, `browser technical entry ${variant}/${scene}`);
  verifyEvent(entry.event, variant, scene, false);
}
verifyEvent(browser.sameContext.full, 'A', 'chain', false);
verifyEvent(browser.sameContext.reduced, 'A', 'chain', true);
check(browser.sameContext.full.contextId === browser.sameContext.reduced.contextId, 'browser same context full-to-reduced');
for (const variant of ['A', 'B', 'C']) check(browser.stemAssets[variant].length >= 1 && browser.stemAssets[variant].every((asset) => asset.assetId === `bombFamiliar${variant}` && asset.url === asset.expectedUrl && asset.sameOrigin === true && asset.exactHash === true && asset.expectedSha256 === WAV[variant] && asset.observedSha256 === WAV[variant] && asset.expectedBytes === 17_324 && asset.observedBytes === 17_324), `browser actual fetch URL/origin/hash/bytes ${variant}`);
verifyActiveOwners(browser.stopped, 'browser reusable stop', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
check(browser.restarted.pairPhase === 'normal', 'browser restarted normal phase');
verifyActiveOwners(browser.restarted, 'browser restarted', { liveContexts: 1, eventSources: 1, pendingTimers: 1, frameCallbacks: 1 });
check(browser.disabled.enabled === false && browser.disabled.audio.enabled === false, 'browser disable remains disabled');
verifyActiveOwners(browser.disabled, 'browser reusable disable', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
check(browser.enabled.enabled === true && browser.enabled.audio.enabled === true, 'browser re-enable remains enabled');
verifyActiveOwners(browser.enabled, 'browser re-enabled idle', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
verifyActiveOwners(browser.reenabledReplay, 'browser re-enabled replay', { liveContexts: 1, eventSources: 1, pendingTimers: 0, frameCallbacks: 0 });
verifyEvent(browser.reenabledReplay.audio.events.at(-1), 'A', 'normal', false);
check(browser.reenabledReplay.playCount === browser.enabled.playCount + 1 && browser.reenabledReplay.audio.events.length === browser.enabled.audio.events.length + 1, 'browser re-enabled replay dispatches exactly one fresh event');
check(browser.reenabledReplay.audio.contextsCreated === browser.enabled.audio.contextsCreated && browser.reenabledReplay.audio.activeEngineOwnerId === browser.enabled.audio.activeEngineOwnerId && browser.reenabledReplay.renderer.tickerIdentity === browser.enabled.renderer.tickerIdentity && browser.reenabledReplay.listenerCount === browser.enabled.listenerCount, 'browser re-enabled replay creates no duplicate owner');
verifyActiveOwners(browser.reducedState, 'browser reduced technical', { liveContexts: 1, eventSources: 1, pendingTimers: 0, frameCallbacks: 0 });
verifyTerminalOwners(browser.reducedTerminal, 'browser reduced destroy');
verifyTerminalOwners(browser.mobileTerminal, 'browser mobile destroy');
verifyTerminalOwners(browser.desktopTerminal, 'browser desktop destroy');
for (const kind of ['stop', 'disable']) {
  const race = browser.races[kind];
  check(race.playCount === 0, `browser delayed ${kind} stale play cancellation`);
  verifyActiveOwners(race, `browser delayed ${kind}`, { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
}
check(browser.races.disable.enabled === false && browser.races.disable.audio.enabled === false, 'browser delayed disable remains disabled');
check(browser.races.pagehide.playCount === 0 && browser.races.pagehide.audio.staleAssetCallbacksDropped >= 1, 'browser delayed pagehide stale callback dropped');
verifyTerminalOwners(browser.races.pagehide, 'browser delayed pagehide');
check(browser.races.hmr.old.playCount === 0 && browser.races.hmr.oldAfter.playCount === 0 && browser.races.hmr.oldAfter.audio.staleAssetCallbacksDropped > browser.races.hmr.old.audio.staleAssetCallbacksDropped, 'browser delayed HMR old callback explicitly dropped');
verifyTerminalOwners(browser.races.hmr.old, 'browser delayed HMR old-before-release');
verifyTerminalOwners(browser.races.hmr.oldAfter, 'browser delayed HMR old-after-release');
verifyActiveOwners(browser.races.hmr.freshBefore, 'browser delayed HMR fresh-before-release', { liveContexts: 0, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
verifyActiveOwners(browser.races.hmr.freshPrimed, 'browser delayed HMR fresh-primed', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
verifyActiveOwners(browser.races.hmr.freshAfter, 'browser delayed HMR fresh-after-release', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
check(browser.races.hmr.freshPrimeResult === true && browser.races.hmr.freshBefore.audio.contextsCreated === 0 && browser.races.hmr.freshPrimed.audio.contextsCreated === 1 && browser.races.hmr.freshAfter.audio.contextsCreated === 1, 'browser delayed HMR samples fresh before successful prime then proves one context');
check(browser.races.hmr.freshBefore.instanceId === browser.races.hmr.freshPrimed.instanceId && browser.races.hmr.freshPrimed.instanceId === browser.races.hmr.freshAfter.instanceId && browser.races.hmr.freshPrimed.renderer.tickerIdentity === browser.races.hmr.freshAfter.renderer.tickerIdentity && browser.races.hmr.freshPrimed.ready === browser.races.hmr.freshAfter.ready && deepEqual(browser.races.hmr.domPrimed, browser.races.hmr.domAfter), 'browser delayed HMR late old callback cannot alter primed fresh identity/ticker/DOM/ready');

const variantRace = browser.variantRace;
check(variantRace.samples.length > 2 && variantRace.samples.every((sample) => sample.liveContexts <= 1 && sample.instanceId === variantRace.initial.instanceId && sample.ready === true), 'browser concurrent variant samples <=1 context/one ready instance');
check(variantRace.beforeRelease.audio.liveContexts <= 1 && variantRace.state.audio.liveContexts === 1 && variantRace.state.audio.maxLiveContextsObserved <= 1 && variantRace.state.audio.pendingTransitions === 0 && variantRace.state.audio.variant === 'C', 'browser concurrent variant exclusive final C context');
check(variantRace.state.audio.staleAssetCallbacksDropped >= 2 && deepEqual(variantRace.state.audio.assets, variantRace.beforeRelease.audio.assets), 'browser concurrent variant late A/B assets cannot pollute audit state');
check(variantRace.state.audio.assets.filter((asset) => asset.ownerId === variantRace.state.audio.activeEngineOwnerId && asset.assetId.startsWith('bombFamiliar')).length === 3, 'browser concurrent variant active owner has exact three stem audits');
const variantRaceEvents = variantRace.state.audio.events.filter((event) => ['A', 'B', 'C'].includes(event.variant));
check(variantRace.results[0] === false && variantRace.results[1] === false && variantRace.results[2] === true && variantRaceEvents.length === 1 && variantRaceEvents[0].variant === 'C', 'browser concurrent variant stale A/B suppressed and only C dispatched');
verifyActiveOwners(variantRace.state, 'browser concurrent variant final', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
verifyTerminalOwners(variantRace.terminal, 'browser concurrent variant terminal');
check(['a', 'b', 'c'].every((variant) => browser.assetRequests.some((request) => request.includes(`bomb-familiar-${variant}`))), 'browser requested all A/B/C assets');

const expectedDirectory = terminalCommitted ? [...SOURCE, ...PRE_REPORT, ...TERMINAL] : [...SOURCE, ...PRE_REPORT];
check(equalSet(await files(root), expectedDirectory), 'working directory exact source/generated/terminal set');
if (git('status', '--short', '--', ...expectedDirectory.map((path) => prefix + path))) throw new Error('Evidence inputs are dirty.');
const manifestSha256 = sha(manifestBytes);
const recomputedChecks = [...checks];
if (terminalCommitted) {
  check(committedReport.schema === 'tetramorph.t37.r5b-verification.v2', 'terminal report schema');
  check(canonicalIso(committedReport.generatedAt), 'terminal report canonical ISO generatedAt');
  check(committedReport.passed === true && deepEqual(committedReport.failures, []), 'terminal report passed/failures');
  check(deepEqual(committedReport.checks, recomputedChecks), 'terminal report exact recomputed checks');
  check(committedReport.evidenceSourceHead === sourceHead && committedReport.generatedInputHead === generated, 'terminal report exact heads');
  check(deepEqual(committedReport.pathContracts, expectedPathContracts), 'terminal report exact path contracts');
  check(committedReport.humanStatus === HUMAN_STATUS && committedReport.manifestSha256 === manifestSha256, 'terminal report OPEN/manifest SHA');
  console.log(JSON.stringify({ passed: true, mode: 'committed-terminal', checks: checks.length, generatedInputHead: generated }));
} else {
  if (exists(head, reportPath)) throw new Error('Terminal report must be absent before generation.');
  const reportChecks = recomputedChecks;
  const report = { schema: 'tetramorph.t37.r5b-verification.v2', generatedAt: new Date().toISOString(), passed: true, failures: [], checks: reportChecks, manifestSha256, evidenceSourceHead: sourceHead, generatedInputHead: generated, pathContracts: expectedPathContracts, humanStatus: HUMAN_STATUS };
  exactKeys(report, TERMINAL_KEYS, 'generated terminal report');
  if (!canonicalIso(report.generatedAt)) throw new Error('Generated terminal report timestamp is not canonical ISO.');
  const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
  text(bytes, 'verification-report.json');
  await writeFile(join(root, TERMINAL[0]), bytes);
  console.log(JSON.stringify({ passed: true, mode: 'precommit-terminal', checks: reportChecks.length, generatedInputHead: generated, manifestSha256 }));
}
