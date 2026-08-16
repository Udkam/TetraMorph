// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTH, BASE, BYTE_CONTRACT, CLIENT, CONTRACT, HUMAN_STATUS, ICE, ITEMS, MATRIX_CASES,
  MATRIX_PNG, OUTPUT, PRE_REPORT, PRODUCT_BINDINGS, PROFILE, SEMANTIC_PNG, SOURCE,
  STAGES, SEEDS, STAGE_E_ANCHORS, TERMINAL, prefix, repo, root,
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
  const touched = new Set(); const allowedSet = new Set(allowed); const historyErrors = [];
  let expectedParent = from; let frozenCopyCount = 0;
  if (commits.length === 0) historyErrors.push('empty range');
  for (const commit of commits) {
    const parents = git('rev-list', '--parents', '-n', '1', commit).split(/\s+/u);
    if (parents.length !== 2 || parents[1] !== expectedParent) {
      historyErrors.push(`non-linear ${commit}`);
      continue;
    }
    const fields = gitRaw(
      'diff-tree', '--no-commit-id', '--name-status', '-r', '-z',
      '--find-renames=50%', '--find-copies=50%', '--find-copies-harder', parents[1], commit,
    ).toString('utf8').split('\0');
    if (fields.pop() !== '' || fields.length === 0) {
      historyErrors.push(`empty or malformed commit ${commit}`);
      expectedParent = commit;
      continue;
    }
    let index = 0;
    while (index < fields.length) {
      const status = fields[index++];
      if (/^[RC]\d+$/u.test(status)) {
        const fromPath = fields[index++]; const toPath = fields[index++];
        if (!fromPath || !toPath) historyErrors.push(`malformed ${status} ${commit}`);
        else if (isFrozenC050(commit, parents[1], status, fromPath, toPath)) {
          frozenCopyCount += 1;
          if (frozenCopyCount !== 1 || !allowedSet.has(toPath)) historyErrors.push('invalid frozen C050 normalization');
          touched.add(toPath);
        } else historyErrors.push(`forbidden ${status} ${fromPath} -> ${toPath}`);
        continue;
      }
      const path = fields[index++];
      if (!path) { historyErrors.push(`missing path after ${status} in ${commit}`); break; }
      if (status !== 'A' && status !== 'M') historyErrors.push(`forbidden status ${status} ${path}`);
      if (!allowedSet.has(path)) historyErrors.push(`out-of-set path ${commit} ${path}`);
      touched.add(path);
    }
    expectedParent = commit;
  }
  const expectedFrozenCopyCount = commits.includes(FROZEN_C050.commit) ? 1 : 0;
  if (frozenCopyCount !== expectedFrozenCopyCount) historyErrors.push(`frozen C050 count ${frozenCopyCount} != ${expectedFrozenCopyCount}`);
  if (expectedParent !== to) historyErrors.push(`endpoint ${expectedParent} != ${to}`);
  if (!equalSet([...touched], allowed)) historyErrors.push(`touched ${sorted([...touched]).join(',')}`);
  check(historyErrors.length === 0, label, { commits, touched: sorted([...touched]), historyErrors });
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
/** @param {any} tracker @returns {Array<{id: number|null, closed: boolean, closeCalls: number, state: string|null}>|null} */
const contextRecords = (tracker) => Array.isArray(tracker?.contexts) ? tracker.contexts.map((/** @type {any} */ entry) => ({
  id: Number.isInteger(entry?.id) ? Number(entry.id) : null,
  closed: entry?.closed === true,
  closeCalls: Number.isInteger(entry?.closeCalls) ? Number(entry.closeCalls) : -1,
  state: typeof entry?.state === 'string' ? entry.state : null,
})) : null;
/** @param {any} before @param {any} after */
const sameContextRecords = (before, after) => contextRecords(before) !== null && deepEqual(contextRecords(before), contextRecords(after));
/** @param {any} before @param {any} after */
function closedContextSuccessors(before, after) {
  const baseline = contextRecords(before); const closed = contextRecords(after);
  return baseline !== null && closed !== null && closed.length === baseline.length
    && closed.every((entry, index) => entry.id === baseline[index]?.id && baseline[index]?.closed === false
      && baseline[index]?.state !== null && baseline[index]?.state !== 'closed' && baseline[index]?.closeCalls === 0
      && entry.closed && entry.state === 'closed' && entry.closeCalls === 1);
}
/** @param {any} before @param {any} after */
function exactReentryContexts(before, after) {
  const baseline = contextRecords(before); const reentry = contextRecords(after);
  if (baseline === null || reentry === null || reentry.length !== baseline.length + 1) return false;
  const oldClosed = reentry.slice(0, baseline.length).every((entry, index) => entry.id === baseline[index]?.id
    && baseline[index]?.closed === false && baseline[index]?.state !== null && baseline[index]?.state !== 'closed' && baseline[index]?.closeCalls === 0
    && entry.closed && entry.state === 'closed' && entry.closeCalls === 1);
  const fresh = reentry.at(-1);
  return oldClosed && fresh !== undefined && fresh.id !== null && !baseline.some(({ id }) => id === fresh.id)
    && !fresh.closed && fresh.state !== null && fresh.state !== 'closed' && fresh.closeCalls === 0;
}
/** @param {any} oldOwner @returns {'same-owner'|'replacement'|'invalid'} */
const deriveHmrContextBranch = (oldOwner) => oldOwner?.sameOwner === true ? 'same-owner'
  : oldOwner?.sameOwner === false && oldOwner?.oldRenderer === 'retired' ? 'replacement' : 'invalid';
/** @param {any} before @param {any} after @param {'same-owner'|'replacement'|'invalid'} branch */
function exactHmrContexts(before, after, branch) {
  const baseline = contextRecords(before); const result = contextRecords(after);
  if (baseline === null || result === null || before?.liveContexts !== 1 || after?.liveContexts !== 1) return false;
  if (branch === 'same-owner') return deepEqual(baseline, result);
  if (branch !== 'replacement' || baseline.length < 1 || result.length !== baseline.length + 1) return false;
  const oldLive = baseline.at(-1); const retired = result[baseline.length - 1]; const fresh = result.at(-1);
  const unchangedPrefix = deepEqual(baseline.slice(0, -1), result.slice(0, baseline.length - 1));
  const baselineLive = oldLive !== undefined && oldLive.id !== null && !oldLive.closed && oldLive.state !== null
    && oldLive.state !== 'closed' && oldLive.closeCalls === 0
    && baseline.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1;
  const oldClosed = retired !== undefined && retired.id === oldLive?.id && retired.closed && retired.state === 'closed' && retired.closeCalls === 1;
  const freshLive = fresh !== undefined && fresh.id !== null && !baseline.some(({ id }) => id === fresh.id)
    && !fresh.closed && fresh.state !== null && fresh.state !== 'closed' && fresh.closeCalls === 0
    && result.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1;
  return unchangedPrefix && baselineLive && oldClosed && freshLive;
}
/** @param {any} afterHmr @param {any} terminal */
function exactTerminalContexts(afterHmr, terminal) {
  const baseline = contextRecords(afterHmr); const result = contextRecords(terminal);
  if (baseline === null || result === null || baseline.length < 1 || result.length !== baseline.length
    || afterHmr?.liveContexts !== 1 || terminal?.liveContexts !== 0) return false;
  const live = baseline.at(-1); const closed = result.at(-1);
  const uniqueLastLive = live !== undefined && live.id !== null && !live.closed && live.state !== null && live.state !== 'closed'
    && live.closeCalls === 0 && baseline.filter((entry) => !entry.closed && entry.state !== 'closed').length === 1;
  const exactClose = closed !== undefined && closed.id === live?.id && closed.closed && closed.state === 'closed' && closed.closeCalls === 1;
  return uniqueLastLive && exactClose && deepEqual(baseline.slice(0, -1), result.slice(0, -1));
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

/** @param {any} browser */
function browserLifecycleProof(browser) {
  const hmrContextBranch = deriveHmrContextBranch(browser.hmr?.oldOwner);
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
    hmrContexts: {
      branch: hmrContextBranch, before: contextRecords(browser.hmr?.before?.tracker), after: contextRecords(browser.hmr?.after?.tracker),
      beforeLiveContexts: browser.hmr?.before?.tracker?.liveContexts, afterLiveContexts: browser.hmr?.after?.tracker?.liveContexts,
    },
    terminalContexts: {
      afterHmr: contextRecords(browser.hmr?.after?.tracker), terminal: contextRecords(browser.terminal),
      afterHmrLiveContexts: browser.hmr?.after?.tracker?.liveContexts, terminalLiveContexts: browser.terminal?.liveContexts,
    },
  };
}

/** @param {any} browser */
function browserLifecycleAssertions(browser) {
  const observations = browser.observations ?? {};
  const hmrContextBranch = deriveHmrContextBranch(browser.hmr?.oldOwner);
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
    hmrContextBranchValid: hmrContextBranch !== 'invalid',
    hmrContextsExact: exactHmrContexts(browser.hmr?.before?.tracker, browser.hmr?.after?.tracker, hmrContextBranch),
    terminalOwnersClean: browser.terminal?.canvases === 0 && browser.terminal?.liveContexts === 0,
    terminalRafsZero: activeRafs(browser.terminal) === 0,
    terminalListenersZero: noRelevantListeners(browser.terminal),
    terminalContextsExact: exactTerminalContexts(browser.hmr?.after?.tracker, browser.terminal),
  };
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
check(semantic.schema === 'tetramorph.t37.material-semantic.v1' && semantic.passed === true
  && Array.isArray(semantic.errors) && semantic.errors.length === 0, 'semantic audit declared green');
check(equalSet(Object.keys(semantic.cases), ITEMS), 'semantic four items');
for (const item of /** @type {Array<'freeze'|'bomb'|'multiplier'|'collapse'>} */ (ITEMS)) {
  const entry = semantic.cases[item];
  check(entry.seed === SEEDS[item] && entry.profile === PROFILE[item], `${item}: exact fixture contract`);
  check(equalSet(Object.keys(entry.stages), STAGES), `${item}: five stages`);
  for (const stage of STAGES) {
    const proof = entry.stages[stage];
    check(proof.file === `${item}-${stage}.png`, `${item}/${stage}: filename`);
    const screenshot = blob(generated, prefix + proof.file);
    check(proof.sha256 === sha(screenshot) && proof.bytes === screenshot.length, `${item}/${stage}: screenshot byte binding`);
    /** @type {string[]} */
    const snapshotErrors = [];
    assertItemSnapshot(proof.value, item, stage, snapshotErrors);
    check(snapshotErrors.length === 0, `${item}/${stage}: independent item snapshot semantics`, snapshotErrors);
    check(proof.value.root?.language === 'zh-CN' && proof.value.root?.theme === 'deep-tide'
      && proof.value.root?.reducedMotion === 'false', `${item}/${stage}: semantic settings`);
    /** @type {string[]} */
    const textErrors = [];
    assertTextState(proof.value, `${item}/${stage}`, textErrors);
    check(textErrors.length === 0, `${item}/${stage}: textState`, textErrors);
  }
  check(Array.isArray(entry.observations) && entry.observations.length === 3, `${item}: three observation groups`);
  for (const [index, observed] of entry.observations.entries()) {
    /** @type {string[]} */
    const observationErrors = [];
    assertCleanObservations(observed, `${item}/observations-${index}`, observationErrors);
    check(observationErrors.length === 0, `${item}/observations-${index}: zero browser errors`, observationErrors);
  }
}
check(equalSet(SEMANTIC_PNG, ITEMS.flatMap((item) => STAGES.map((stage) => `${item}-${stage}.png`))), 'semantic filename contract');

const matrix = JSON.parse(text(blob(generated, prefix + 'material-matrix-audit.json'), 'matrix audit'));
check(matrix.schema === 'tetramorph.t37.material-matrix.v1' && matrix.passed === true
  && Array.isArray(matrix.errors) && matrix.errors.length === 0, 'matrix audit declared green');
check(equalSet(Object.keys(matrix.cases), MATRIX_CASES.map(({ name }) => name)), 'matrix six cases');
check(deepEqual(matrix.coverage, { themes: ['deep-tide', 'mineral-mist', 'sunstone'], motion: ['full', 'reduced'], languages: ['en', 'zh-CN'], viewports: ['1125x1196', '1440x900', '390x844'], items: ['bomb', 'collapse', 'freeze', 'multiplier'] }), 'matrix exact coverage');
for (const entry of MATRIX_CASES) {
  const proof = matrix.cases[entry.name];
  check(deepEqual(proof.contract, entry) && proof.file === `${entry.name}.png`, `${entry.name}: contract`);
  const screenshot = blob(generated, prefix + `${entry.name}.png`);
  check(proof.sha256 === sha(screenshot) && proof.bytes === screenshot.length, `${entry.name}: screenshot byte binding`);
  /** @type {string[]} */
  const snapshotErrors = [];
  assertItemSnapshot(proof.value, /** @type {'freeze'|'bomb'|'multiplier'|'collapse'} */ (entry.item), 'active-ghost', snapshotErrors);
  check(snapshotErrors.length === 0, `${entry.name}: independent item snapshot semantics`, snapshotErrors);
  check(proof.value.root.language === entry.language && proof.value.root.theme === entry.theme && proof.value.root.reducedMotion === String(entry.reduced), `${entry.name}: root state`);
  /** @type {string[]} */
  const textErrors = [];
  assertTextState(proof.value, entry.name, textErrors);
  check(textErrors.length === 0, `${entry.name}: textState`, textErrors);
  /** @type {string[]} */
  const observationErrors = [];
  assertCleanObservations(proof.observations, `${entry.name}/observations`, observationErrors);
  check(observationErrors.length === 0, `${entry.name}: zero browser errors`, observationErrors);
}
check(equalSet(MATRIX_PNG, MATRIX_CASES.map(({ name }) => `${name}.png`)), 'matrix filename contract');

const browser = JSON.parse(text(blob(generated, prefix + 'browser-report.json'), 'browser report'));
check(browser.schema === 'tetramorph.t37.material-browser.v1' && browser.passed === true
  && Array.isArray(browser.failures) && browser.failures.length === 0, 'browser report declared green');
const recomputedLifecycleProof = browserLifecycleProof(browser);
const recomputedLifecycleAssertions = browserLifecycleAssertions(browser);
for (const [label, passed] of Object.entries(recomputedLifecycleAssertions)) check(passed, `browser lifecycle: ${label}`);
check(deepEqual(browser.lifecycleProof, recomputedLifecycleProof), 'browser lifecycle proof matches raw tracker data', { expected: recomputedLifecycleProof, actual: browser.lifecycleProof });
check(deepEqual(browser.assertions, recomputedLifecycleAssertions), 'browser assertions match independent recomputation', { expected: recomputedLifecycleAssertions, actual: browser.assertions });

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
