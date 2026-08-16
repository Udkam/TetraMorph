// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTH, BASE, BYTE_CONTRACT, CONTRACT, HUMAN_STATUS, ICE, ITEMS, MATRIX_CASES, OUTPUT,
  PRE_REPORT, PRODUCT_BINDINGS, PROFILE, SEEDS, SOURCE, STAGES, STAGE_E_ANCHORS,
  TERMINAL, prefix, repo, root,
} from './evidence-contract.mjs';
import { assertItemSnapshot } from './product-fixture.mjs';

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
/** @param {readonly string[]} left @param {readonly string[]} right */
const equalSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
/** @param {any} left @param {any} right */
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sourcePaths = SOURCE.map((path) => prefix + path);
const outputPaths = OUTPUT.map((path) => prefix + path);
const preReportPaths = PRE_REPORT.map((path) => prefix + path);
const terminalPaths = TERMINAL.map((path) => prefix + path);

/** @param {Buffer} bytes @param {string} label */
function text(bytes, label) {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error(`${label}: UTF-8 BOM`);
  const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (value.includes('\r')) throw new Error(`${label}: CR byte`);
  if (!value.endsWith('\n')) throw new Error(`${label}: missing final LF`);
  return value;
}

/** @param {string} directory @param {string} [base] @returns {Promise<string[]>} */
async function files(directory, base = '') {
  /** @type {string[]} */
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await files(join(directory, entry.name), relative));
    else found.push(relative);
  }
  return found;
}

/** @param {string} from @param {string} to @param {string[]} expected @param {string} label */
function exactRange(from, to, expected, label) {
  const actual = git('diff', '--name-only', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  if (!equalSet(actual, expected)) throw new Error(`${label}: ${actual.join(',')}`);
}

/** @param {string} head @param {string[]} expected @param {string} label */
function exactTree(head, expected, label) {
  const actual = git('ls-tree', '-r', '--name-only', head, '--', prefix).split(/\r?\n/u).filter(Boolean);
  if (!equalSet(actual, expected)) throw new Error(`${label}: ${actual.join(',')}`);
}

const FROZEN_C050 = Object.freeze({
  commit: 'bcdfe9a94ba0b59141d09a5654ca56c6de787b5c',
  parent: '3eb110f546e84c5003c9d2eaa73dfa0f8f9986e9',
  status: 'C050',
  fromPath: 'docs/evidence/t37/bomb-familiar-language-audition-r5a/.gitattributes',
  fromBlob: '3eacc44b940401abb0899ee8c74833d35f56df1c',
  toPath: 'docs/evidence/t37/material-ice-current-head/.gitattributes',
  toBlob: '94afc642601372e041806b12a5fcea82dac719b7',
});

/** @param {string} commit @param {string} parent @param {string} status @param {string} fromPath @param {string} toPath */
function isFrozenC050(commit, parent, status, fromPath, toPath) {
  return commit === FROZEN_C050.commit && parent === FROZEN_C050.parent && status === FROZEN_C050.status
    && fromPath === FROZEN_C050.fromPath && toPath === FROZEN_C050.toPath
    && git('rev-parse', `${parent}:${fromPath}`) === FROZEN_C050.fromBlob
    && git('rev-parse', `${commit}:${toPath}`) === FROZEN_C050.toBlob;
}

/** @param {string} from @param {string} to @param {string[]} allowed @param {string} label */
function linearHistory(from, to, allowed, label) {
  const commits = git('rev-list', '--reverse', '--ancestry-path', `${from}..${to}`).split(/\r?\n/u).filter(Boolean);
  if (commits.length === 0) throw new Error(`${label}: empty`);
  const touched = new Set();
  let expectedParent = from;
  let frozenCopyCount = 0;
  const allowedSet = new Set(allowed);
  for (const commit of commits) {
    const line = git('rev-list', '--parents', '-n', '1', commit).split(/\s+/u);
    if (line.length !== 2 || line[1] !== expectedParent) throw new Error(`${label}: non-linear ${commit}`);
    const fields = gitRaw(
      'diff-tree', '--no-commit-id', '--name-status', '-r', '-z',
      '--find-renames=50%', '--find-copies=50%', '--find-copies-harder', line[1], commit,
    ).toString('utf8').split('\0');
    if (fields.pop() !== '' || fields.length === 0) throw new Error(`${label}: empty or malformed commit ${commit}`);
    let index = 0;
    while (index < fields.length) {
      const status = fields[index++];
      if (/^[RC]\d+$/u.test(status)) {
        const fromPath = fields[index++]; const toPath = fields[index++];
        if (!fromPath || !toPath) throw new Error(`${label}: malformed ${status} ${commit}`);
        if (isFrozenC050(commit, line[1], status, fromPath, toPath)) {
          frozenCopyCount += 1;
          if (frozenCopyCount !== 1 || !allowedSet.has(toPath)) throw new Error(`${label}: invalid frozen C050 normalization`);
          touched.add(toPath);
          continue;
        }
        throw new Error(`${label}: forbidden ${status} ${fromPath} -> ${toPath}`);
      }
      const path = fields[index++];
      if (!path) throw new Error(`${label}: missing path after ${status} in ${commit}`);
      if (status !== 'A' && status !== 'M') throw new Error(`${label}: forbidden status ${status} ${path}`);
      if (!allowedSet.has(path)) throw new Error(`${label}: out-of-set path ${commit} ${path}`);
      touched.add(path);
    }
    expectedParent = commit;
  }
  const expectedFrozenCopyCount = commits.includes(FROZEN_C050.commit) ? 1 : 0;
  if (frozenCopyCount !== expectedFrozenCopyCount) throw new Error(`${label}: frozen C050 count ${frozenCopyCount} != ${expectedFrozenCopyCount}`);
  if (expectedParent !== to) throw new Error(`${label}: endpoint ${expectedParent} != ${to}`);
  if (!equalSet([...touched], allowed)) throw new Error(`${label}: touched ${[...touched].join(',')}`);
  return commits;
}

/** @param {any} tracker */
const relevantListeners = (tracker) => {
  const counts = tracker?.listenerCounts ?? {};
  return Object.fromEntries(Object.keys(counts)
    .filter((key) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key))
    .sort()
    .map((key) => [key, Number(counts[key])]));
};
/** @param {any} before @param {any} after */
const sameRelevantListeners = (before, after) => Boolean(before?.listenerCounts && after?.listenerCounts)
  && deepEqual(relevantListeners(before), relevantListeners(after));
/** @param {any} tracker */
const noRelevantListeners = (tracker) => Boolean(tracker?.listenerCounts)
  && Object.values(relevantListeners(tracker)).every((count) => count === 0);
/** @param {any} tracker */
const activeRafs = (tracker) => Number.isInteger(tracker?.activeRafs) ? Number(tracker.activeRafs) : -1;
/** @param {any} tracker @returns {Array<{id: number|null, closed: boolean, closeCalls: number}>|null} */
const contextRecords = (tracker) => Array.isArray(tracker?.contexts) ? tracker.contexts.map((/** @type {any} */ entry) => ({
  id: Number.isInteger(entry?.id) ? Number(entry.id) : null,
  closed: entry?.closed === true,
  closeCalls: Number.isInteger(entry?.closeCalls) ? Number(entry.closeCalls) : -1,
})) : null;
/** @param {any} before @param {any} after */
const sameContextRecords = (before, after) => contextRecords(before) !== null && deepEqual(contextRecords(before), contextRecords(after));
/** @param {any} before @param {any} after */
function closedContextSuccessors(before, after) {
  const baseline = contextRecords(before); const closed = contextRecords(after);
  return baseline !== null && closed !== null && closed.length === baseline.length
    && closed.every((entry, index) => entry.id === baseline[index]?.id && entry.closed && entry.closeCalls === (baseline[index]?.closeCalls ?? -2) + 1);
}
/** @param {any} before @param {any} after */
function exactReentryContexts(before, after) {
  const baseline = contextRecords(before); const reentry = contextRecords(after);
  if (baseline === null || reentry === null || reentry.length !== baseline.length + 1) return false;
  const oldClosed = reentry.slice(0, baseline.length).every((entry, index) => entry.id === baseline[index]?.id
    && entry.closed && entry.closeCalls === (baseline[index]?.closeCalls ?? -2) + 1);
  const fresh = reentry.at(-1);
  return oldClosed && fresh !== undefined && fresh.id !== null && !baseline.some(({ id }) => id === fresh.id)
    && !fresh.closed && fresh.closeCalls === 0;
}

/** @param {any} value @param {string} label @param {string[]} errors */
function assertTextState(value, label, errors) {
  if (typeof value?.textState !== 'string') { errors.push(`${label}: missing textState`); return; }
  try {
    const state = JSON.parse(value.textState);
    if (state.mode !== 'sprint' || state.screen !== 'game') errors.push(`${label}: textState route mismatch`);
  } catch { errors.push(`${label}: invalid textState JSON`); }
}

/** @param {any} observed @param {string} label @param {string[]} errors */
function assertCleanObservations(observed, label, errors) {
  if (!observed || typeof observed !== 'object') { errors.push(`${label}: missing observations`); return; }
  for (const key of ['consoleErrors', 'pageErrors', 'requestErrors']) {
    if (!Array.isArray(observed[key])) errors.push(`${label}: ${key} is not an array`);
    else if (observed[key].length > 0) errors.push(`${label}: ${key} is not empty`);
  }
}

/** @param {any} audit @returns {Promise<string[]>} */
async function semanticProofErrors(audit) {
  /** @type {string[]} */
  const errors = [];
  if (!equalSet(Object.keys(audit?.cases ?? {}), ITEMS)) errors.push('semantic: item set mismatch');
  for (const item of /** @type {Array<'freeze'|'bomb'|'multiplier'|'collapse'>} */ (ITEMS)) {
    const entry = audit?.cases?.[item];
    if (!entry) { errors.push(`${item}: missing semantic entry`); continue; }
    if (entry.seed !== SEEDS[item] || entry.profile !== PROFILE[item]) errors.push(`${item}: fixture contract mismatch`);
    if (!equalSet(Object.keys(entry.stages ?? {}), STAGES)) errors.push(`${item}: stage set mismatch`);
    for (const stage of STAGES) {
      const label = `${item}/${stage}`; const proof = entry.stages?.[stage]; const file = `${item}-${stage}.png`;
      if (!proof?.value) { errors.push(`${label}: missing proof value`); continue; }
      if (proof.file !== file) errors.push(`${label}: filename mismatch`);
      const bytes = await readFile(join(root, file));
      if (proof.sha256 !== sha(bytes) || proof.bytes !== bytes.length) errors.push(`${label}: screenshot byte binding mismatch`);
      assertItemSnapshot(proof.value, item, stage, errors);
      if (proof.value.root?.language !== 'zh-CN' || proof.value.root?.theme !== 'deep-tide' || proof.value.root?.reducedMotion !== 'false') {
        errors.push(`${label}: semantic settings mismatch`);
      }
      assertTextState(proof.value, label, errors);
    }
    if (!Array.isArray(entry.observations) || entry.observations.length !== 3) errors.push(`${item}: expected three observation groups`);
    for (const [index, observed] of (entry.observations ?? []).entries()) assertCleanObservations(observed, `${item}/observations-${index}`, errors);
  }
  return errors;
}

/** @param {any} audit @returns {Promise<string[]>} */
async function matrixProofErrors(audit) {
  /** @type {string[]} */
  const errors = [];
  if (!equalSet(Object.keys(audit?.cases ?? {}), MATRIX_CASES.map(({ name }) => name))) errors.push('matrix: case set mismatch');
  const expectedCoverage = {
    themes: ['deep-tide', 'mineral-mist', 'sunstone'], motion: ['full', 'reduced'], languages: ['en', 'zh-CN'],
    viewports: ['1125x1196', '1440x900', '390x844'], items: ['bomb', 'collapse', 'freeze', 'multiplier'],
  };
  if (!deepEqual(audit?.coverage, expectedCoverage)) errors.push('matrix: coverage mismatch');
  for (const entry of MATRIX_CASES) {
    const proof = audit?.cases?.[entry.name]; const file = `${entry.name}.png`;
    if (!proof?.value) { errors.push(`${entry.name}: missing proof value`); continue; }
    if (!deepEqual(proof.contract, entry) || proof.file !== file) errors.push(`${entry.name}: case contract mismatch`);
    const bytes = await readFile(join(root, file));
    if (proof.sha256 !== sha(bytes) || proof.bytes !== bytes.length) errors.push(`${entry.name}: screenshot byte binding mismatch`);
    assertItemSnapshot(proof.value, /** @type {'freeze'|'bomb'|'multiplier'|'collapse'} */ (entry.item), 'active-ghost', errors);
    if (proof.value.root?.language !== entry.language || proof.value.root?.theme !== entry.theme
      || proof.value.root?.reducedMotion !== String(entry.reduced)) errors.push(`${entry.name}: matrix settings mismatch`);
    assertTextState(proof.value, entry.name, errors);
    assertCleanObservations(proof.observations, `${entry.name}/observations`, errors);
  }
  return errors;
}

/** @param {any} browser */
function browserLifecycleProof(browser) {
  return {
    canvasOwners: {
      initial: { canvasCount: browser.initial?.canvasCount, canvases: browser.initial?.tracker?.canvases },
      restartBefore: { canvasCount: browser.restarted?.before?.canvasCount, canvases: browser.restarted?.before?.canvases },
      restartAfter: { canvasCount: browser.restarted?.after?.canvasCount, canvases: browser.restarted?.after?.canvases },
      preferences: { canvasCount: browser.changedPreferences?.canvasCount, canvases: browser.changedPreferences?.tracker?.canvases },
      exit: { canvases: browser.exited?.tracker?.canvases },
      reentry: { canvasCount: browser.reentered?.canvasCount, canvases: browser.reentered?.tracker?.canvases },
      hmrBaseline: { canvasCount: browser.hmr?.before?.canvasCount, canvases: browser.hmr?.before?.tracker?.canvases },
      hmrAfter: { canvasCount: browser.hmr?.after?.canvasCount, canvases: browser.hmr?.after?.tracker?.canvases },
      terminal: { canvases: browser.terminal?.canvases },
    },
    activeRafs: {
      initial: activeRafs(browser.initial?.tracker), restartBefore: activeRafs(browser.restarted?.before), restartAfter: activeRafs(browser.restarted?.after),
      preferences: activeRafs(browser.changedPreferences?.tracker), exit: activeRafs(browser.exited?.tracker), reentry: activeRafs(browser.reentered?.tracker),
      hmrBaseline: activeRafs(browser.hmr?.before?.tracker), hmrAfter: activeRafs(browser.hmr?.after?.tracker), terminal: activeRafs(browser.terminal),
    },
    relevantListeners: {
      initial: relevantListeners(browser.initial?.tracker), restartBefore: relevantListeners(browser.restarted?.before), restartAfter: relevantListeners(browser.restarted?.after),
      preferences: relevantListeners(browser.changedPreferences?.tracker), exit: relevantListeners(browser.exited?.tracker), reentry: relevantListeners(browser.reentered?.tracker),
      hmrBaseline: relevantListeners(browser.hmr?.before?.tracker), hmrAfter: relevantListeners(browser.hmr?.after?.tracker), terminal: relevantListeners(browser.terminal),
    },
    contexts: {
      initial: contextRecords(browser.initial?.tracker), restartBefore: contextRecords(browser.restarted?.before), restartAfter: contextRecords(browser.restarted?.after),
      preferences: contextRecords(browser.changedPreferences?.tracker), exit: contextRecords(browser.exited?.tracker), reentry: contextRecords(browser.reentered?.tracker),
      hmrBaseline: contextRecords(browser.hmr?.before?.tracker), hmrAfter: contextRecords(browser.hmr?.after?.tracker), terminal: contextRecords(browser.terminal),
    },
  };
}

/** @param {any} browser */
function browserLifecycleAssertions(browser) {
  const observations = browser.observations ?? {};
  return {
    realProductRoute: typeof browser.pageUrl === 'string' && browser.pageUrl.startsWith(String(browser.origin).replace(/\/$/u, '')),
    observationsClean: Array.isArray(observations.consoleErrors) && observations.consoleErrors.length === 0
      && Array.isArray(observations.pageErrors) && observations.pageErrors.length === 0
      && Array.isArray(observations.requestErrors) && observations.requestErrors.length === 0,
    initialOwners: browser.initial?.canvasCount === 1 && browser.initial?.tracker?.canvases === 1 && browser.initial?.domCellCount === 0
      && browser.initial?.tracker?.liveContexts === 1 && activeRafs(browser.initial?.tracker) >= 1,
    initialContextRecordExact: contextRecords(browser.initial?.tracker)?.length === 1 && contextRecords(browser.initial?.tracker)?.[0]?.id !== null
      && contextRecords(browser.initial?.tracker)?.[0]?.closed === false && contextRecords(browser.initial?.tracker)?.[0]?.closeCalls === 0,
    restartOwnersExact: browser.restarted?.before?.qaId === browser.restarted?.after?.qaId && browser.restarted?.before?.canvasId === browser.restarted?.after?.canvasId
      && browser.restarted?.after?.liveContexts === 1,
    restartCanvasesExact: browser.restarted?.before?.canvasCount === 1 && browser.restarted?.before?.canvases === 1
      && browser.restarted?.after?.canvasCount === 1 && browser.restarted?.after?.canvases === 1,
    restartRafsExact: activeRafs(browser.restarted?.before) >= 1 && activeRafs(browser.restarted?.after) === activeRafs(browser.restarted?.before),
    restartContextsExact: sameContextRecords(browser.restarted?.before, browser.restarted?.after),
    restartListenersExact: sameRelevantListeners(browser.restarted?.before, browser.restarted?.after),
    preferencesOwnersExact: browser.changedPreferences?.tracker?.qaId === browser.initial?.tracker?.qaId && browser.changedPreferences?.tracker?.canvasId === browser.initial?.tracker?.canvasId
      && browser.changedPreferences?.tracker?.liveContexts === 1,
    preferencesCanvasesExact: browser.changedPreferences?.canvasCount === 1 && browser.changedPreferences?.tracker?.canvases === 1,
    preferencesRafsExact: activeRafs(browser.changedPreferences?.tracker) === activeRafs(browser.restarted?.after)
      && activeRafs(browser.changedPreferences?.tracker) === activeRafs(browser.initial?.tracker),
    preferencesContextsExact: sameContextRecords(browser.restarted?.after, browser.changedPreferences?.tracker)
      && sameContextRecords(browser.initial?.tracker, browser.changedPreferences?.tracker),
    preferencesListenersExact: sameRelevantListeners(browser.initial?.tracker, browser.changedPreferences?.tracker),
    exitOwnersClean: browser.exited?.oldRendererRetired === true && browser.exited?.tracker?.canvases === 0 && browser.exited?.tracker?.liveContexts === 0
      && browser.exited?.qaPresent === false && browser.exited?.textHook === false,
    exitRafsZero: activeRafs(browser.exited?.tracker) === 0,
    exitListenersZero: noRelevantListeners(browser.exited?.tracker),
    exitContextsClosedExact: closedContextSuccessors(browser.changedPreferences?.tracker, browser.exited?.tracker),
    reentryOwnersFresh: browser.reentered?.tracker?.qaId !== browser.initial?.tracker?.qaId && browser.reentered?.tracker?.canvasId !== browser.initial?.tracker?.canvasId
      && browser.reentered?.tracker?.liveContexts === 1,
    reentryCanvasesExact: browser.reentered?.canvasCount === 1 && browser.reentered?.tracker?.canvases === 1,
    reentryRafsExact: activeRafs(browser.reentered?.tracker) === activeRafs(browser.changedPreferences?.tracker),
    reentryContextsExact: exactReentryContexts(browser.changedPreferences?.tracker, browser.reentered?.tracker),
    reentryListenersExact: sameRelevantListeners(browser.changedPreferences?.tracker, browser.reentered?.tracker),
    hmrDelivered: Array.isArray(browser.hmr?.requests) && browser.hmr.requests.length >= 1,
    hmrOwnersBound: browser.hmr?.after?.canvasCount === 1 && browser.hmr?.after?.tracker?.liveContexts === 1
      && (browser.hmr?.oldOwner?.sameOwner === true || browser.hmr?.oldOwner?.oldRenderer === 'retired'),
    hmrRafBaselineActive: activeRafs(browser.hmr?.before?.tracker) >= 1,
    hmrRafsExact: activeRafs(browser.hmr?.after?.tracker) === activeRafs(browser.hmr?.before?.tracker),
    hmrRafsNotDoubled: activeRafs(browser.hmr?.after?.tracker) <= activeRafs(browser.hmr?.before?.tracker),
    hmrListenersExact: sameRelevantListeners(browser.hmr?.before?.tracker, browser.hmr?.after?.tracker),
    terminalOwnersClean: browser.terminal?.canvases === 0 && browser.terminal?.liveContexts === 0,
    terminalRafsZero: activeRafs(browser.terminal) === 0,
    terminalListenersZero: noRelevantListeners(browser.terminal),
  };
}

/** @param {string} head @param {{kind: string, path: string}} entry */
function bind(head, entry) {
  const object = git('rev-parse', `${head}:${entry.path}`);
  if (entry.kind === 'tree') return { ...entry, gitObject: object };
  const bytes = blob(head, entry.path);
  return { ...entry, gitObject: object, sha256: sha(bytes), bytes: bytes.length };
}

const head = git('rev-parse', 'HEAD');
if (git('merge-base', '--is-ancestor', BASE, AUTH) !== '') throw new Error('R5B terminal is not the authorization parent.');
if (git('merge-base', '--is-ancestor', AUTH, head) !== '') throw new Error('Authorization is not source ancestor.');
exactRange(AUTH, head, sourcePaths, 'authorization-to-source exact range');
const sourceCommits = linearHistory(AUTH, head, sourcePaths, 'authorization-to-source history');
exactTree(head, sourcePaths, 'source exact tree');

const actual = await files(root);
if (!equalSet(actual, [...SOURCE, ...OUTPUT])) throw new Error(`Pre-manifest directory drift: ${actual.join(',')}`);
const sourceBindings = sourcePaths.map((path) => {
  const bytes = blob(head, path); if (!path.endsWith('.png')) text(bytes, path);
  return { path, gitObject: git('rev-parse', `${head}:${path}`), sha256: sha(bytes), bytes: bytes.length };
});
/** @type {any[]} */
const outputBindings = [];
for (const relative of OUTPUT) {
  const bytes = await readFile(join(root, relative));
  if (!relative.endsWith('.png')) text(bytes, relative);
  outputBindings.push({ path: prefix + relative, sha256: sha(bytes), bytes: bytes.length });
}
const contractBindings = CONTRACT.map((path) => {
  const bytes = blob(AUTH, path); text(bytes, `${AUTH}:${path}`);
  return { path, gitObject: git('rev-parse', `${AUTH}:${path}`), sha256: sha(bytes), bytes: bytes.length };
});
const productBindings = PRODUCT_BINDINGS.map((entry) => bind(BASE, entry));
for (const anchor of STAGE_E_ANCHORS) if (git('merge-base', '--is-ancestor', anchor, BASE) !== '') throw new Error(`Missing Stage E anchor ${anchor}.`);

const semantic = JSON.parse(await readFile(join(root, 'material-semantic-audit.json'), 'utf8'));
const matrix = JSON.parse(await readFile(join(root, 'material-matrix-audit.json'), 'utf8'));
const browser = JSON.parse(await readFile(join(root, 'browser-report.json'), 'utf8'));
const ice = JSON.parse(await readFile(join(root, 'ice-provenance-audit.json'), 'utf8'));
for (const [label, value, schema] of [
  ['semantic', semantic, 'tetramorph.t37.material-semantic.v1'],
  ['matrix', matrix, 'tetramorph.t37.material-matrix.v1'],
  ['browser', browser, 'tetramorph.t37.material-browser.v1'],
  ['ice', ice, 'tetramorph.t37.ice-provenance.v1'],
]) {
  if (value.schema !== schema || value.passed !== true || value.errors?.length > 0 || value.failures?.length > 0) throw new Error(`${label} audit is not fail-closed green.`);
  if (new Date(value.generatedAt).toISOString() !== value.generatedAt) throw new Error(`${label} generatedAt is not canonical ISO.`);
}
const semanticErrors = await semanticProofErrors(semantic);
if (semanticErrors.length > 0) throw new Error(`semantic proof recomputation failed:\n${semanticErrors.join('\n')}`);
const matrixErrors = await matrixProofErrors(matrix);
if (matrixErrors.length > 0) throw new Error(`matrix proof recomputation failed:\n${matrixErrors.join('\n')}`);
const recomputedLifecycleProof = browserLifecycleProof(browser);
const recomputedLifecycleAssertions = browserLifecycleAssertions(browser);
const lifecycleFailures = Object.entries(recomputedLifecycleAssertions).filter(([, passed]) => !passed).map(([label]) => label);
if (lifecycleFailures.length > 0) throw new Error(`browser lifecycle recomputation failed:\n${lifecycleFailures.join('\n')}`);
if (!deepEqual(browser.lifecycleProof, recomputedLifecycleProof)) throw new Error('browser lifecycle proof does not match raw tracker data.');
if (!deepEqual(browser.assertions, recomputedLifecycleAssertions)) throw new Error('browser lifecycle assertions do not match independent recomputation.');

const manifest = {
  schema: 'tetramorph.t37.material-ice-manifest.v1', generatedAt: new Date().toISOString(),
  provenance: { r5bTerminalBase: BASE, authorizationHead: AUTH, evidenceSourceHead: head, sourceCommits, productHead: BASE, writerBoundary: `${prefix}**` },
  humanStatus: HUMAN_STATUS,
  pathContracts: { source: sourcePaths, outputs: outputPaths, preReport: preReportPaths, terminal: terminalPaths, contract: CONTRACT, product: PRODUCT_BINDINGS },
  countContracts: { source: 10, semanticPng: 20, matrixPng: 6, outputsBeforeManifest: 36, preReport: 37, terminal: 1 },
  byteContract: BYTE_CONTRACT,
  stageEAnchors: STAGE_E_ANCHORS,
  iceContract: ICE,
  sourceBindings, outputBindings, contractBindings, productBindings,
  auditSummary: {
    semantic: { schema: semantic.schema, generatedAt: semantic.generatedAt, passed: semantic.passed, cases: Object.keys(semantic.cases).sort() },
    matrix: { schema: matrix.schema, generatedAt: matrix.generatedAt, passed: matrix.passed, cases: Object.keys(matrix.cases).sort(), coverage: matrix.coverage },
    browser: { schema: browser.schema, generatedAt: browser.generatedAt, passed: browser.passed, assertions: browser.assertions },
    ice: { schema: ice.schema, generatedAt: ice.generatedAt, passed: ice.passed, originalAcquisition: ice.originalAcquisition },
  },
};
await writeFile(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
