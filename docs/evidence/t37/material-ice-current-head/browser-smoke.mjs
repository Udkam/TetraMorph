// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { statSync, utimesSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { AUTH, BASE, HUMAN_STATUS, ICE, SEEDS, repo, root } from './evidence-contract.mjs';
import { advanceToActive, loadScenarios, openMutation, runActions, scenarioFor, snapshot } from './product-fixture.mjs';

const origin = process.argv[2] ?? 'http://127.0.0.1:5193';
/** @type {string[]} */
const failures = [];
/** @param {unknown} value @param {string} label */
const check = (value, label) => { if (!value) failures.push(label); };
/** @param {import('node:crypto').BinaryLike} bytes */
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {...string} args */
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
/** @param {string} head @param {string} path */
const gitBytes = (head, path) => execFileSync('git', ['show', `${head}:${path}`], { cwd: repo });
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
  && JSON.stringify(relevantListeners(before)) === JSON.stringify(relevantListeners(after));
/** @param {any} tracker */
const noRelevantListeners = (tracker) => Boolean(tracker?.listenerCounts)
  && Object.values(relevantListeners(tracker)).every((count) => count === 0);
/** @param {any} tracker */
const activeRafs = (tracker) => Number.isInteger(tracker?.activeRafs) ? Number(tracker.activeRafs) : -1;
/** @param {any} left @param {any} right */
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** @param {any} tracker @returns {Array<{id: number|null, closed: boolean, closeCalls: number, state: string|null}>|null} */
const contextRecords = (tracker) => Array.isArray(tracker?.contexts) ? tracker.contexts.map((/** @type {any} */ entry) => ({
  id: Number.isInteger(entry?.id) ? Number(entry.id) : null,
  closed: entry?.closed === true,
  closeCalls: Number.isInteger(entry?.closeCalls) ? Number(entry.closeCalls) : -1,
  state: typeof entry?.state === 'string' ? entry.state : null,
})) : null;
/** @param {any} before @param {any} after */
const sameContextRecords = (before, after) => contextRecords(before) !== null && deepEqual(contextRecords(before), contextRecords(after));
/** @param {any} reentry @param {any} beforeHmr */
const exactPreHmrContextContinuity = (reentry, beforeHmr) => reentry?.liveContexts === 1 && beforeHmr?.liveContexts === 1
  && sameContextRecords(reentry, beforeHmr);
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
const deriveHmrContextBranch = (oldOwner) => oldOwner?.sameOwner === true && oldOwner?.oldRenderer === 'active' ? 'same-owner'
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

check(git('rev-parse', AUTH) === AUTH, 'authorization head missing');
check(git('rev-parse', BASE) === BASE, 'R5B terminal base missing');
check(git('merge-base', '--is-ancestor', BASE, 'HEAD') === '', 'R5B terminal is not ancestor');

const browser = await chromium.launch({ headless: true });
const scenarios = await loadScenarios();
const opened = await openMutation(browser, origin, {
  label: 'lifecycle', item: 'freeze', seed: SEEDS.freeze,
  theme: 'deep-tide', reduced: false, language: 'zh-CN', viewport: { width: 1440, height: 900 },
});
const { page, context, observed } = opened;

await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const initial = await snapshot(page);
check(initial.canvasCount === 1 && initial.tracker?.canvases === 1 && initial.domCellCount === 0, 'initial product ownership');
check(initial.tracker?.liveContexts === 1 && contextRecords(initial.tracker)?.length === 1
  && contextRecords(initial.tracker)?.[0]?.closed === false && contextRecords(initial.tracker)?.[0]?.closeCalls === 0, 'initial exact AudioContext record');
check(initial.tracker?.activeRafs >= 1, 'initial renderer/ticker frame activity');

const freeze = scenarioFor(scenarios, 'freeze');
await runActions(page, freeze.actions[0]); await advanceToActive(page);
await runActions(page, freeze.actions[1]); await advanceToActive(page);
await runActions(page, freeze.actions[2]); await advanceToActive(page);
await page.waitForTimeout(520);
const afterFreeze = await snapshot(page);
const runtimeIceResponses = (await Promise.all(observed.iceResponsePromises)).map(({ url, status, body }) => ({ url, status, bytes: body.length, sha256: hash(body) }));
check(runtimeIceResponses.length === 1, 'one runtime Ice asset response');
check(runtimeIceResponses[0]?.status === 200 && runtimeIceResponses[0]?.sha256 === ICE.sha256 && runtimeIceResponses[0]?.bytes === ICE.bytes, 'runtime Ice response exact bytes');

const restarted = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  const tracked = () => ({ ...w.__MATERIAL_TRACKER__.snapshot(), canvasCount: document.querySelectorAll('canvas').length });
  const before = tracked();
  w.__TETRAMORPH_QA__.restart();
  w.__TETRAMORPH_QA__.start();
  w.__TETRAMORPH_QA__.setFrozen(true);
  return { before, after: tracked(), state: w.__TETRAMORPH_QA__.getState() };
});
check(restarted.before.qaId === restarted.after.qaId && restarted.before.canvasId === restarted.after.canvasId, 'restart reuses runtime and Canvas');
check(restarted.before.canvasCount === 1 && restarted.before.canvases === 1
  && restarted.after.canvasCount === 1 && restarted.after.canvases === 1, 'restart exact Canvas ownership');
check(activeRafs(restarted.before) >= 1 && activeRafs(restarted.after) === activeRafs(restarted.before), 'restart active RAFs exactly match baseline');
check(restarted.after.liveContexts === 1 && sameContextRecords(restarted.before, restarted.after), 'restart creates no AudioContext and preserves closed records');
check(sameRelevantListeners(restarted.before, restarted.after), 'restart relevant listener set is exactly stable');

await page.getByTestId('open-settings').click();
await page.getByTestId('theme-mineral-mist').click();
await page.getByTestId('reduced-motion-toggle').click();
const settingsSheet = page.getByTestId('settings-sheet');
check(await settingsSheet.count() === 1, 'one settings sheet owns preference dismissal');
await settingsSheet.waitFor({ state: 'visible' });
const settingsDismiss = settingsSheet.locator('.settings-console__actions > .primary-action');
check(await settingsDismiss.count() === 1, 'one settings-sheet primary dismissal action');
await settingsDismiss.click();
await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-theme') === 'mineral-mist'
  && document.querySelector('.app')?.getAttribute('data-reduced-motion') === 'true');
const changedPreferences = await snapshot(page);
check(changedPreferences.tracker?.qaId === initial.tracker?.qaId && changedPreferences.tracker?.canvasId === initial.tracker?.canvasId, 'theme/motion reuse runtime and Canvas');
check(changedPreferences.canvasCount === 1 && changedPreferences.tracker?.canvases === 1, 'theme/motion exact Canvas ownership');
check(activeRafs(changedPreferences.tracker) === activeRafs(restarted.after)
  && activeRafs(changedPreferences.tracker) === activeRafs(initial.tracker), 'theme/motion active RAFs exactly match baseline');
check(changedPreferences.tracker?.liveContexts === 1 && sameContextRecords(restarted.after, changedPreferences.tracker)
  && sameContextRecords(initial.tracker, changedPreferences.tracker), 'theme/motion creates no AudioContext and preserves closed records');
check(sameRelevantListeners(initial.tracker, changedPreferences.tracker), 'theme/motion relevant listener set is exactly stable');

await page.evaluate(() => { const w = /** @type {any} */ (window); w.__MATERIAL_EXIT_QA__ = w.__TETRAMORPH_QA__; });
await page.getByTestId('exit-game').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const w = /** @type {any} */ (window);
  const tracker = w.__MATERIAL_TRACKER__.snapshot();
  const relevant = Object.entries(tracker.listenerCounts).filter(([key]) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key));
  return !w.__TETRAMORPH_QA__ && document.querySelectorAll('canvas').length === 0
    && tracker.liveContexts === 0 && tracker.activeRafs === 0
    && relevant.every(([, count]) => Number(count) === 0);
});
const exited = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  let oldRendererRetired = false;
  try { w.__MATERIAL_EXIT_QA__.captureBoardPng(); } catch { oldRendererRetired = true; }
  return { tracker: w.__MATERIAL_TRACKER__.snapshot(), oldRendererRetired, qaPresent: Boolean(w.__TETRAMORPH_QA__), textHook: Boolean(w.render_game_to_text) };
});
check(exited.tracker.canvases === 0 && exited.tracker.liveContexts === 0 && exited.oldRendererRetired, 'UI exit retires Canvas/renderer/audio');
check(!exited.qaPresent && !exited.textHook, 'UI exit retires QA hooks');
check(activeRafs(exited.tracker) === 0, 'UI exit retires every tracked RAF');
check(noRelevantListeners(exited.tracker), 'UI exit retires every relevant listener');
check(closedContextSuccessors(changedPreferences.tracker, exited.tracker), 'UI exit closes each baseline AudioContext exactly once');

await page.getByTestId('enter-sprint').click();
await page.getByTestId('game-screen').waitFor({ state: 'visible' });
await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
await page.waitForFunction(() => Boolean(/** @type {any} */ (window).__TETRAMORPH_QA__));
await page.evaluate(() => /** @type {any} */ (window).__TETRAMORPH_QA__.setFrozen(true));
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const reentered = await snapshot(page);
check(reentered.tracker?.qaId !== initial.tracker?.qaId && reentered.tracker?.canvasId !== initial.tracker?.canvasId, 're-entry owns fresh runtime and Canvas');
check(reentered.canvasCount === 1 && reentered.tracker?.canvases === 1, 're-entry exact Canvas ownership');
check(activeRafs(reentered.tracker) === activeRafs(changedPreferences.tracker), 're-entry active RAFs exactly match baseline');
check(reentered.tracker?.liveContexts === 1 && exactReentryContexts(changedPreferences.tracker, reentered.tracker), 're-entry adds exactly one AudioContext after exact old-context closure');
check(sameRelevantListeners(reentered.tracker, changedPreferences.tracker), 're-entry restores the exact relevant listener set');

await page.evaluate(() => { const w = /** @type {any} */ (window); w.__MATERIAL_HMR_QA__ = w.__TETRAMORPH_QA__; });
const beforeHmr = await snapshot(page);
check(exactPreHmrContextContinuity(reentered.tracker, beforeHmr.tracker), 're-entry to HMR-before exact AudioContext continuity');
const requestMarker = observed.requests.length;
const appPath = join(repo, 'src/App.tsx');
const beforeStat = statSync(appPath);
const touch = new Date(Math.max(Date.now(), beforeStat.mtimeMs + 1100));
utimesSync(appPath, beforeStat.atime, touch);
await page.waitForFunction(() => document.querySelectorAll('canvas').length === 1 && Boolean(/** @type {any} */ (window).__TETRAMORPH_QA__), null, { timeout: 10_000 });
await page.waitForTimeout(1800);
const hmrRequests = observed.requests.slice(requestMarker).filter((/** @type {string} */ url) => /\/src\/App\.tsx\?t=/u.test(url));
const afterHmr = await snapshot(page);
const oldHmrOwner = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  const sameOwner = w.__MATERIAL_HMR_QA__ === w.__TETRAMORPH_QA__;
  let oldRenderer = 'active';
  if (!sameOwner) { try { w.__MATERIAL_HMR_QA__.captureBoardPng(); } catch { oldRenderer = 'retired'; } }
  return { sameOwner, oldRenderer };
});
const hmrContextBranch = deriveHmrContextBranch(oldHmrOwner);
check(hmrRequests.length >= 1, 'Vite delivered App HMR update');
check(afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1, 'HMR leaves one Canvas and AudioContext');
check(activeRafs(beforeHmr.tracker) >= 1 && activeRafs(afterHmr.tracker) === activeRafs(beforeHmr.tracker), 'HMR active RAFs exactly equal the live baseline');
check(sameRelevantListeners(beforeHmr.tracker, afterHmr.tracker), 'HMR relevant listener set is exactly stable');
check(hmrContextBranch !== 'invalid', 'HMR old renderer disposition is internally consistent');
check(hmrContextBranch !== 'invalid' && exactHmrContexts(beforeHmr.tracker, afterHmr.tracker, hmrContextBranch), 'HMR exact branch-specific AudioContext history');

await page.getByTestId('exit-game').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => {
  const tracker = /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot();
  const relevant = Object.entries(tracker.listenerCounts).filter(([key]) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key));
  return document.querySelectorAll('canvas').length === 0 && tracker.liveContexts === 0
    && tracker.activeRafs === 0 && relevant.every(([, count]) => Number(count) === 0);
});
const terminal = await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot());
check(terminal.canvases === 0 && terminal.liveContexts === 0 && activeRafs(terminal) === 0 && noRelevantListeners(terminal), 'post-HMR terminal cleanup');
check(exactTerminalContexts(afterHmr.tracker, terminal), 'post-HMR terminal exact AudioContext closure');

const iceBytes = gitBytes(BASE, ICE.path);
const catalog = gitBytes(BASE, 'src/game/audio/audioAssetCatalog.ts').toString('utf8');
const start = catalog.indexOf('  freezeIce: {');
const end = catalog.indexOf('  bombFamiliarA:', start);
const freezeCatalog = catalog.slice(start, end);
const lsTree = git('ls-tree', BASE, '--', ICE.path).split(/\s+/u);
const provenanceChecks = [
  { label: 'product Ogg bytes/hash/blob', passed: iceBytes.length === ICE.bytes && hash(iceBytes) === ICE.sha256 && lsTree[2] === ICE.gitBlob },
  { label: 'official Freesound identity', passed: freezeCatalog.includes(ICE.pageUrl) && freezeCatalog.includes('soundId: 819779') && freezeCatalog.includes("author: 'sbml'") && freezeCatalog.includes("title: 'Ice cubes'") },
  { label: 'CC0 catalog binding', passed: freezeCatalog.includes('license: CC0_LICENSE') && freezeCatalog.includes('licenseFile: CC0_LICENSE_FILE') },
  { label: 'window and envelope', passed: freezeCatalog.includes('windowStartSeconds: 0.19375') && freezeCatalog.includes('windowDurationSeconds: 0.44') && freezeCatalog.includes('gain: 0.78') && freezeCatalog.includes('attack: 0.003') && freezeCatalog.includes('release: 0.012') },
  { label: 'original filename and null SHA', passed: freezeCatalog.includes(`originalFilename: '${ICE.originalFilename}'`) && freezeCatalog.includes('originalSha256: null') && freezeCatalog.includes("status: 'pending'") },
  { label: 'no original substitution', passed: ICE.originalSha256 === null && ICE.originalStatus === 'OPEN / login required' && ICE.substitutionAllowed === false },
  { label: 'runtime fetched exact product Ogg', passed: runtimeIceResponses.length === 1 && runtimeIceResponses[0]?.sha256 === ICE.sha256 && runtimeIceResponses[0]?.bytes === ICE.bytes },
];
const iceProvenance = {
  schema: 'tetramorph.t37.ice-provenance.v1', generatedAt: new Date().toISOString(),
  productHead: BASE, authorizationHead: AUTH, passed: provenanceChecks.every(({ passed }) => passed),
  failures: provenanceChecks.filter(({ passed }) => !passed).map(({ label }) => label), checks: provenanceChecks,
  product: { ...ICE, observedGitBlob: lsTree[2] ?? null, observedBytes: iceBytes.length, observedSha256: hash(iceBytes) },
  runtimeResponses: runtimeIceResponses,
  originalAcquisition: { filename: ICE.originalFilename, sha256: null, status: 'OPEN / login required', productOggIsOriginal: false, previewSubstitutionAllowed: false },
  humanStatus: HUMAN_STATUS,
};
if (!iceProvenance.passed) failures.push(...iceProvenance.failures.map((value) => `Ice provenance: ${value}`));

const lifecycleProof = {
  canvasOwners: {
    initial: { canvasCount: initial.canvasCount, canvases: initial.tracker?.canvases },
    restartBefore: { canvasCount: restarted.before.canvasCount, canvases: restarted.before.canvases },
    restartAfter: { canvasCount: restarted.after.canvasCount, canvases: restarted.after.canvases },
    preferences: { canvasCount: changedPreferences.canvasCount, canvases: changedPreferences.tracker?.canvases },
    exit: { canvases: exited.tracker.canvases },
    reentry: { canvasCount: reentered.canvasCount, canvases: reentered.tracker?.canvases },
    hmrBaseline: { canvasCount: beforeHmr.canvasCount, canvases: beforeHmr.tracker?.canvases },
    hmrAfter: { canvasCount: afterHmr.canvasCount, canvases: afterHmr.tracker?.canvases },
    terminal: { canvases: terminal.canvases },
  },
  activeRafs: {
    initial: activeRafs(initial.tracker), restartBefore: activeRafs(restarted.before), restartAfter: activeRafs(restarted.after),
    preferences: activeRafs(changedPreferences.tracker), exit: activeRafs(exited.tracker), reentry: activeRafs(reentered.tracker),
    hmrBaseline: activeRafs(beforeHmr.tracker), hmrAfter: activeRafs(afterHmr.tracker), terminal: activeRafs(terminal),
  },
  relevantListeners: {
    initial: relevantListeners(initial.tracker), restartBefore: relevantListeners(restarted.before), restartAfter: relevantListeners(restarted.after),
    preferences: relevantListeners(changedPreferences.tracker), exit: relevantListeners(exited.tracker), reentry: relevantListeners(reentered.tracker),
    hmrBaseline: relevantListeners(beforeHmr.tracker), hmrAfter: relevantListeners(afterHmr.tracker), terminal: relevantListeners(terminal),
  },
  contexts: {
    initial: contextRecords(initial.tracker), restartBefore: contextRecords(restarted.before), restartAfter: contextRecords(restarted.after),
    preferences: contextRecords(changedPreferences.tracker), exit: contextRecords(exited.tracker), reentry: contextRecords(reentered.tracker),
    hmrBaseline: contextRecords(beforeHmr.tracker), hmrAfter: contextRecords(afterHmr.tracker), terminal: contextRecords(terminal),
  },
  hmrContexts: {
    branch: hmrContextBranch, before: contextRecords(beforeHmr.tracker), after: contextRecords(afterHmr.tracker),
    beforeLiveContexts: beforeHmr.tracker?.liveContexts, afterLiveContexts: afterHmr.tracker?.liveContexts,
  },
  preHmrContexts: {
    reentry: contextRecords(reentered.tracker), beforeHmr: contextRecords(beforeHmr.tracker),
    reentryLiveContexts: reentered.tracker?.liveContexts, beforeHmrLiveContexts: beforeHmr.tracker?.liveContexts,
  },
  terminalContexts: {
    afterHmr: contextRecords(afterHmr.tracker), terminal: contextRecords(terminal),
    afterHmrLiveContexts: afterHmr.tracker?.liveContexts, terminalLiveContexts: terminal.liveContexts,
  },
};
const lifecycleAssertions = {
  realProductRoute: page.url().startsWith(origin.replace(/\/$/u, '')),
  observationsClean: observed.consoleErrors.length === 0 && observed.pageErrors.length === 0 && observed.requestErrors.length === 0,
  initialOwners: initial.canvasCount === 1 && initial.tracker?.canvases === 1 && initial.domCellCount === 0 && initial.tracker?.liveContexts === 1 && activeRafs(initial.tracker) >= 1,
  initialContextRecordExact: contextRecords(initial.tracker)?.length === 1 && contextRecords(initial.tracker)?.[0]?.id !== null
    && contextRecords(initial.tracker)?.[0]?.closed === false && contextRecords(initial.tracker)?.[0]?.closeCalls === 0,
  restartOwnersExact: restarted.before.qaId === restarted.after.qaId && restarted.before.canvasId === restarted.after.canvasId
    && restarted.after.liveContexts === 1,
  restartCanvasesExact: restarted.before.canvasCount === 1 && restarted.before.canvases === 1
    && restarted.after.canvasCount === 1 && restarted.after.canvases === 1,
  restartRafsExact: activeRafs(restarted.before) >= 1 && activeRafs(restarted.after) === activeRafs(restarted.before),
  restartContextsExact: sameContextRecords(restarted.before, restarted.after),
  restartListenersExact: sameRelevantListeners(restarted.before, restarted.after),
  preferencesOwnersExact: changedPreferences.tracker?.qaId === initial.tracker?.qaId && changedPreferences.tracker?.canvasId === initial.tracker?.canvasId
    && changedPreferences.tracker?.liveContexts === 1,
  preferencesCanvasesExact: changedPreferences.canvasCount === 1 && changedPreferences.tracker?.canvases === 1,
  preferencesRafsExact: activeRafs(changedPreferences.tracker) === activeRafs(restarted.after)
    && activeRafs(changedPreferences.tracker) === activeRafs(initial.tracker),
  preferencesContextsExact: sameContextRecords(restarted.after, changedPreferences.tracker)
    && sameContextRecords(initial.tracker, changedPreferences.tracker),
  preferencesListenersExact: sameRelevantListeners(initial.tracker, changedPreferences.tracker),
  exitOwnersClean: exited.oldRendererRetired && exited.tracker.canvases === 0 && exited.tracker.liveContexts === 0 && !exited.qaPresent && !exited.textHook,
  exitRafsZero: activeRafs(exited.tracker) === 0,
  exitListenersZero: noRelevantListeners(exited.tracker),
  exitContextsClosedExact: closedContextSuccessors(changedPreferences.tracker, exited.tracker),
  reentryOwnersFresh: reentered.tracker?.qaId !== initial.tracker?.qaId && reentered.tracker?.canvasId !== initial.tracker?.canvasId
    && reentered.tracker?.liveContexts === 1,
  reentryCanvasesExact: reentered.canvasCount === 1 && reentered.tracker?.canvases === 1,
  reentryRafsExact: activeRafs(reentered.tracker) === activeRafs(changedPreferences.tracker),
  reentryContextsExact: exactReentryContexts(changedPreferences.tracker, reentered.tracker),
  reentryListenersExact: sameRelevantListeners(changedPreferences.tracker, reentered.tracker),
  hmrDelivered: hmrRequests.length >= 1,
  hmrOwnersBound: afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1 && (oldHmrOwner.sameOwner || oldHmrOwner.oldRenderer === 'retired'),
  hmrRafBaselineActive: activeRafs(beforeHmr.tracker) >= 1,
  hmrRafsExact: activeRafs(afterHmr.tracker) === activeRafs(beforeHmr.tracker),
  hmrRafsNotDoubled: activeRafs(afterHmr.tracker) <= activeRafs(beforeHmr.tracker),
  hmrListenersExact: sameRelevantListeners(beforeHmr.tracker, afterHmr.tracker),
  preHmrContextsExact: exactPreHmrContextContinuity(reentered.tracker, beforeHmr.tracker),
  hmrContextBranchValid: hmrContextBranch !== 'invalid',
  hmrContextsExact: exactHmrContexts(beforeHmr.tracker, afterHmr.tracker, hmrContextBranch),
  terminalOwnersClean: terminal.canvases === 0 && terminal.liveContexts === 0,
  terminalRafsZero: activeRafs(terminal) === 0,
  terminalListenersZero: noRelevantListeners(terminal),
  terminalContextsExact: exactTerminalContexts(afterHmr.tracker, terminal),
};
for (const [label, passed] of Object.entries(lifecycleAssertions)) check(passed, `lifecycle assertion: ${label}`);

const report = {
  schema: 'tetramorph.t37.material-browser.v1', generatedAt: new Date().toISOString(),
  origin, pageUrl: page.url(), browser: await browser.version(), passed: failures.length === 0, failures,
  initial, afterFreeze, restarted, changedPreferences, exited, reentered,
  hmr: { before: beforeHmr, requests: hmrRequests, after: afterHmr, oldOwner: oldHmrOwner },
  terminal, observations: observed, lifecycleProof, assertions: lifecycleAssertions,
  humanStatus: HUMAN_STATUS,
};

await writeFile(join(root, 'ice-provenance-audit.json'), `${JSON.stringify(iceProvenance, null, 2)}\n`, 'utf8');
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await context.close();
await browser.close();
if (!report.passed) throw new Error(failures.join('\n'));
