// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTH, BASE, BYTE_CONTRACT, CLIENT, CONTRACT, HUMAN_STATUS, ICE, ITEMS, MATRIX_CASES,
  MATRIX_PNG, OUTPUT, PRE_REPORT, PRODUCT_BINDINGS, SEMANTIC_PNG, SOURCE, STAGES,
  SEEDS, STAGE_E_ANCHORS, TERMINAL, prefix, repo, root,
} from './evidence-contract.mjs';

/** @param {import('node:crypto').BinaryLike} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {...string} args */
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
/** @param {...string} args */
const gitRaw = (...args) => execFileSync('git', args, { cwd: repo });
/** @param {string} head @param {string} path */
const blob = (head, path) => gitRaw('show', `${head}:${path}`);
/** @param {readonly string[]} values */
const sorted = (values) => [...values].sort();
/** @param {any} left @param {any} right */
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** @param {readonly string[]} left @param {readonly string[]} right */
const equalSet = (left, right) => deepEqual(sorted(left), sorted(right));
/** @type {Array<{label: string, passed: boolean, detail: any}>} */
const checks = [];
/** @type {string[]} */
const failures = [];
/** @param {unknown} passed @param {string} label @param {any} [detail] */
const check = (passed, label, detail = null) => { checks.push({ label, passed: Boolean(passed), detail }); if (!passed) failures.push(label); };
const sourcePaths = SOURCE.map((path) => prefix + path);
const outputPaths = OUTPUT.map((path) => prefix + path);
const preReportPaths = PRE_REPORT.map((path) => prefix + path);
const terminalPaths = TERMINAL.map((path) => prefix + path);

/** @param {Buffer} bytes @param {string} label */
function text(bytes, label) {
  let value = '';
  try { value = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { check(false, `${label}: valid UTF-8`); return ''; }
  check(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), `${label}: no BOM`);
  check(!value.includes('\r'), `${label}: LF-only`);
  check(value.endsWith('\n'), `${label}: final LF`);
  return value;
}

/** @param {string} from @param {string} to */
function range(from, to) { return git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean); }
/** @param {string} head */
function tree(head) { return git('ls-tree', '-r', '--name-only', head, '--', prefix).split(/\r?\n/u).filter(Boolean); }
/** @param {string} head @param {string} path */
function exists(head, path) { try { git('cat-file', '-e', `${head}:${path}`); return true; } catch { return false; } }
/** @param {string} from @param {string} to @param {string[]} allowed @param {string} label */
function linearHistory(from, to, allowed, label) {
  const commits = git('rev-list', '--reverse', '--ancestry-path', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  const touched = new Set(); let valid = commits.length > 0;
  for (const commit of commits) {
    const parents = git('rev-list', '--parents', '-n', '1', commit).split(/\s+/u);
    if (parents.length !== 2) { valid = false; continue; }
    const changes = gitRaw('diff-tree', '--no-commit-id', '--name-status', '-r', '-z', parents[1], commit).toString('utf8').split('\0').filter(Boolean);
    if (changes.length % 2 !== 0) { valid = false; continue; }
    for (let index = 0; index < changes.length; index += 2) {
      const status = changes[index]; const path = changes[index + 1];
      if (!['A', 'M', 'D'].includes(status) || !allowed.includes(path)) valid = false;
      touched.add(path);
    }
  }
  check(valid && equalSet([...touched], allowed), label, { commits, touched: sorted([...touched]) });
  return commits;
}
/** @param {string} head @param {{kind: string, path: string}} entry */
function bind(head, entry) {
  const object = git('rev-parse', `${head}:${entry.path}`);
  if (entry.kind === 'tree') return { ...entry, gitObject: object };
  const bytes = blob(head, entry.path);
  return { ...entry, gitObject: object, sha256: sha(bytes), bytes: bytes.length };
}
/** @param {Buffer} bytes @param {string} label */
function png(bytes, label) {
  const signature = '89504e470d0a1a0a';
  const valid = bytes.length > 1000 && bytes.subarray(0, 8).toString('hex') === signature;
  const width = valid ? bytes.readUInt32BE(16) : 0; const height = valid ? bytes.readUInt32BE(20) : 0;
  check(valid && width >= 300 && height >= 300, `${label}: real PNG dimensions`, { bytes: bytes.length, width, height });
}
/** @param {string} directory @param {string} [base] @returns {Promise<string[]>} */
async function files(directory, base = '') {
  /** @type {string[]} */
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await files(join(directory, entry.name), relative)); else found.push(relative);
  }
  return found;
}

const head = git('rev-parse', 'HEAD');
let terminalCommitted = exists(head, prefix + TERMINAL[0]);
/** @type {any} */
let committedTerminal = null;
let generated = head;
if (terminalCommitted) {
  committedTerminal = JSON.parse(text(blob(head, prefix + TERMINAL[0]), 'committed terminal report'));
  generated = committedTerminal.generatedInputHead;
}
check(git('merge-base', '--is-ancestor', BASE, AUTH) === '', 'R5B terminal precedes authorization');
check(git('merge-base', '--is-ancestor', AUTH, generated) === '', 'authorization precedes generated input');

const manifestBytes = blob(generated, prefix + 'manifest.json');
const manifest = JSON.parse(text(manifestBytes, 'manifest'));
const sourceHead = manifest.provenance.evidenceSourceHead;
check(equalSet(range(AUTH, sourceHead), sourcePaths), 'authorization-to-source exact endpoint');
linearHistory(AUTH, sourceHead, sourcePaths, 'authorization-to-source exact linear history');
check(equalSet(range(sourceHead, generated), preReportPaths), 'source-to-generated exact endpoint');
linearHistory(sourceHead, generated, preReportPaths, 'source-to-generated exact linear history');
check(equalSet(tree(sourceHead), sourcePaths), 'source exact tree');
check(equalSet(tree(generated), [...sourcePaths, ...preReportPaths]), 'generated exact tree');
if (terminalCommitted) {
  check(equalSet(range(generated, head), terminalPaths), 'generated-to-terminal exact endpoint');
  linearHistory(generated, head, terminalPaths, 'generated-to-terminal exact linear history');
  check(equalSet(tree(head), [...sourcePaths, ...preReportPaths, ...terminalPaths]), 'terminal exact tree');
}

check(manifest.schema === 'tetramorph.t37.material-ice-manifest.v1', 'manifest schema');
check(manifest.provenance.r5bTerminalBase === BASE && manifest.provenance.authorizationHead === AUTH
  && manifest.provenance.productHead === BASE, 'manifest exact heads');
check(manifest.humanStatus === HUMAN_STATUS, 'manifest human status open');
check(deepEqual(manifest.byteContract, BYTE_CONTRACT), 'manifest byte contract');
check(deepEqual(manifest.pathContracts, { source: sourcePaths, outputs: outputPaths, preReport: preReportPaths, terminal: terminalPaths, contract: CONTRACT, product: PRODUCT_BINDINGS }), 'manifest path contracts');
check(deepEqual(manifest.countContracts, { source: 10, semanticPng: 20, matrixPng: 6, outputsBeforeManifest: 36, preReport: 37, terminal: 1 }), 'manifest count contracts');
check(deepEqual(manifest.stageEAnchors, STAGE_E_ANCHORS), 'manifest Stage E anchors');
check(deepEqual(manifest.iceContract, ICE), 'manifest Ice contract');

const expectedSourceBindings = sourcePaths.map((path) => { const bytes = blob(sourceHead, path); text(bytes, path); return { path, gitObject: git('rev-parse', `${sourceHead}:${path}`), sha256: sha(bytes), bytes: bytes.length }; });
const expectedContractBindings = CONTRACT.map((path) => { const bytes = blob(AUTH, path); text(bytes, `${AUTH}:${path}`); return { path, gitObject: git('rev-parse', `${AUTH}:${path}`), sha256: sha(bytes), bytes: bytes.length }; });
const expectedProductBindings = PRODUCT_BINDINGS.map((entry) => bind(BASE, entry));
const expectedOutputBindings = OUTPUT.map((relative) => {
  const bytes = blob(generated, prefix + relative);
  if (relative.endsWith('.png')) png(bytes, relative); else text(bytes, relative);
  return { path: prefix + relative, sha256: sha(bytes), bytes: bytes.length };
});
check(deepEqual(manifest.sourceBindings, expectedSourceBindings), 'source Git-blob bindings');
check(deepEqual(manifest.contractBindings, expectedContractBindings), 'contract Git-blob bindings');
check(deepEqual(manifest.productBindings, expectedProductBindings), 'product Git-object bindings');
check(deepEqual(manifest.outputBindings, expectedOutputBindings), 'output Git-blob bindings');
for (const anchor of STAGE_E_ANCHORS) check(git('merge-base', '--is-ancestor', anchor, BASE) === '', `Stage E ancestor ${anchor}`);

const semantic = JSON.parse(text(blob(generated, prefix + 'material-semantic-audit.json'), 'semantic audit'));
check(semantic.schema === 'tetramorph.t37.material-semantic.v1' && semantic.passed === true && semantic.errors.length === 0, 'semantic audit green');
check(equalSet(Object.keys(semantic.cases), ITEMS), 'semantic four items');
for (const item of /** @type {Array<'freeze'|'bomb'|'multiplier'|'collapse'>} */ (ITEMS)) {
  const entry = semantic.cases[item];
  check(entry.seed === SEEDS[item], `${item}: exact seed`);
  check(equalSet(Object.keys(entry.stages), STAGES), `${item}: five stages`);
  for (const stage of STAGES) {
    const proof = entry.stages[stage];
    check(proof.file === `${item}-${stage}.png`, `${item}/${stage}: filename`);
    check(proof.sha256 === sha(blob(generated, prefix + proof.file)), `${item}/${stage}: screenshot hash`);
    check(proof.value.canvasCount === 1 && proof.value.domCellCount === 0, `${item}/${stage}: one Canvas zero cells`);
    check(proof.value.layout?.assertions?.noHorizontalOverflow === true && proof.value.layout?.assertions?.noVerticalOverflow === true, `${item}/${stage}: no overflow`);
    check(typeof proof.value.textState === 'string' && JSON.parse(proof.value.textState).mode === 'sprint', `${item}/${stage}: real text-state route`);
  }
}
check(equalSet(SEMANTIC_PNG, ITEMS.flatMap((item) => STAGES.map((stage) => `${item}-${stage}.png`))), 'semantic filename contract');

const matrix = JSON.parse(text(blob(generated, prefix + 'material-matrix-audit.json'), 'matrix audit'));
check(matrix.schema === 'tetramorph.t37.material-matrix.v1' && matrix.passed === true && matrix.errors.length === 0, 'matrix audit green');
check(equalSet(Object.keys(matrix.cases), MATRIX_CASES.map(({ name }) => name)), 'matrix six cases');
check(deepEqual(matrix.coverage, { themes: ['deep-tide', 'mineral-mist', 'sunstone'], motion: ['full', 'reduced'], languages: ['en', 'zh-CN'], viewports: ['1125x1196', '1440x900', '390x844'], items: ['bomb', 'collapse', 'freeze', 'multiplier'] }), 'matrix exact coverage');
for (const entry of MATRIX_CASES) {
  const proof = matrix.cases[entry.name];
  check(deepEqual(proof.contract, entry), `${entry.name}: contract`);
  check(proof.sha256 === sha(blob(generated, prefix + `${entry.name}.png`)), `${entry.name}: screenshot hash`);
  check(proof.value.root.language === entry.language && proof.value.root.theme === entry.theme && proof.value.root.reducedMotion === String(entry.reduced), `${entry.name}: root state`);
}
check(equalSet(MATRIX_PNG, MATRIX_CASES.map(({ name }) => `${name}.png`)), 'matrix filename contract');

const browser = JSON.parse(text(blob(generated, prefix + 'browser-report.json'), 'browser report'));
check(browser.schema === 'tetramorph.t37.material-browser.v1' && browser.passed === true && browser.failures.length === 0, 'browser report green');
check(Object.values(browser.assertions).every((value) => value === true), 'browser lifecycle assertions');
check(browser.initial.canvasCount === 1 && browser.initial.domCellCount === 0 && browser.initial.tracker.liveContexts === 1, 'browser initial owners');
check(browser.restarted.before.qaId === browser.restarted.after.qaId && browser.restarted.before.canvasId === browser.restarted.after.canvasId, 'browser restart reuse');
check(browser.changedPreferences.tracker.qaId === browser.initial.tracker.qaId && browser.changedPreferences.tracker.canvasId === browser.initial.tracker.canvasId, 'browser preference reuse');
check(browser.exited.oldRendererRetired && browser.exited.tracker.canvases === 0 && browser.exited.tracker.liveContexts === 0, 'browser UI exit terminal');
check(browser.reentered.tracker.qaId !== browser.initial.tracker.qaId && browser.reentered.tracker.canvasId !== browser.initial.tracker.canvasId && browser.reentered.tracker.liveContexts === 1, 'browser re-entry replacement');
check(browser.hmr.requests.length >= 1 && browser.hmr.after.canvasCount === 1 && browser.hmr.after.tracker.liveContexts === 1, 'browser HMR no owner leak');
check(browser.terminal.canvases === 0 && browser.terminal.liveContexts === 0, 'browser final cleanup');

const ice = JSON.parse(text(blob(generated, prefix + 'ice-provenance-audit.json'), 'Ice provenance'));
check(ice.schema === 'tetramorph.t37.ice-provenance.v1' && ice.passed === true && ice.failures.length === 0 && ice.checks.every((/** @type {any} */ entry) => entry.passed), 'Ice provenance green');
check(deepEqual(ice.product, { ...ICE, observedGitBlob: ICE.gitBlob, observedBytes: ICE.bytes, observedSha256: ICE.sha256 }), 'Ice exact product identity');
check(deepEqual(ice.originalAcquisition, { filename: ICE.originalFilename, sha256: null, status: 'OPEN / login required', productOggIsOriginal: false, previewSubstitutionAllowed: false }), 'Ice original gap remains open');
check(ice.runtimeResponses.length === 1 && ice.runtimeResponses[0].sha256 === ICE.sha256 && ice.runtimeResponses[0].bytes === ICE.bytes, 'Ice runtime response bytes');

for (const statePath of CLIENT.filter((path) => path.endsWith('.json'))) {
  const state = JSON.parse(text(blob(generated, prefix + statePath), statePath));
  check(state.mode === 'sprint' && state.screen === 'game', `${statePath}: prescribed real product state`);
}

const expectedDirectory = terminalCommitted ? [...SOURCE, ...PRE_REPORT, ...TERMINAL] : [...SOURCE, ...PRE_REPORT];
check(equalSet(await files(root), expectedDirectory), 'worktree exact directory');
const manifestSha256 = sha(manifestBytes);
const report = {
  schema: 'tetramorph.t37.material-ice-verification.v1', generatedAt: new Date().toISOString(),
  passed: failures.length === 0, failures, checks,
  manifestSha256, evidenceSourceHead: sourceHead, generatedInputHead: generated,
  r5bTerminalBase: BASE,
  pathContracts: { source: sourcePaths, outputs: outputPaths, preReport: preReportPaths, terminal: terminalPaths },
  humanStatus: HUMAN_STATUS,
};

if (terminalCommitted) {
  const stable = { ...committedTerminal, generatedAt: report.generatedAt, checks: report.checks };
  check(committedTerminal.schema === report.schema && committedTerminal.passed === report.passed
    && deepEqual(committedTerminal.failures, report.failures)
    && committedTerminal.manifestSha256 === report.manifestSha256
    && committedTerminal.evidenceSourceHead === report.evidenceSourceHead
    && committedTerminal.generatedInputHead === report.generatedInputHead
    && committedTerminal.r5bTerminalBase === BASE
    && deepEqual(committedTerminal.pathContracts, report.pathContracts)
    && committedTerminal.humanStatus === HUMAN_STATUS, 'committed terminal report invariants');
  void stable;
} else {
  await writeFile(join(root, TERMINAL[0]), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
report.passed = failures.length === 0;
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, failures, generatedInputHead: generated, humanStatus: HUMAN_STATUS }));
if (!report.passed) process.exitCode = 1;
