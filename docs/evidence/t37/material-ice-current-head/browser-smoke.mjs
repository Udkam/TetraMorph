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
const relevantListeners = (tracker) => Object.fromEntries(Object.entries(tracker?.listenerCounts ?? {}).filter(([key]) => /:(keydown|keyup|blur|visibilitychange)$/u.test(key)));
/** @param {any} before @param {any} after */
const noListenerGrowth = (before, after) => Object.entries(relevantListeners(after)).every(([key, count]) => Number(count) <= Number(relevantListeners(before)[key] ?? 0));

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
check(initial.canvasCount === 1 && initial.domCellCount === 0, 'initial product ownership');
check(initial.tracker?.liveContexts === 1, 'initial live AudioContext');
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
  const before = w.__MATERIAL_TRACKER__.snapshot();
  w.__TETRAMORPH_QA__.restart();
  w.__TETRAMORPH_QA__.start();
  w.__TETRAMORPH_QA__.setFrozen(true);
  return { before, after: w.__MATERIAL_TRACKER__.snapshot(), state: w.__TETRAMORPH_QA__.getState() };
});
check(restarted.before.qaId === restarted.after.qaId && restarted.before.canvasId === restarted.after.canvasId, 'restart reuses runtime and Canvas');
check(restarted.before.contexts.at(-1)?.id === restarted.after.contexts.at(-1)?.id && restarted.after.liveContexts === 1, 'restart reuses AudioContext');
check(noListenerGrowth(restarted.before, restarted.after), 'restart listener stability');

await page.getByTestId('open-settings').click();
await page.getByTestId('theme-mineral-mist').click();
await page.getByTestId('reduced-motion-toggle').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-theme') === 'mineral-mist'
  && document.querySelector('.app')?.getAttribute('data-reduced-motion') === 'true');
const changedPreferences = await snapshot(page);
check(changedPreferences.tracker?.qaId === initial.tracker?.qaId && changedPreferences.tracker?.canvasId === initial.tracker?.canvasId, 'theme/motion reuse runtime and Canvas');
check(changedPreferences.tracker?.contexts.at(-1)?.id === initial.tracker?.contexts.at(-1)?.id && changedPreferences.tracker?.liveContexts === 1, 'theme/motion reuse AudioContext');
check(noListenerGrowth(initial.tracker, changedPreferences.tracker), 'theme/motion listener stability');

await page.evaluate(() => { const w = /** @type {any} */ (window); w.__MATERIAL_EXIT_QA__ = w.__TETRAMORPH_QA__; });
await page.getByTestId('exit-game').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => { const w = /** @type {any} */ (window); return !w.__TETRAMORPH_QA__ && document.querySelectorAll('canvas').length === 0
  && w.__MATERIAL_TRACKER__.snapshot().liveContexts === 0; });
const exited = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  let oldRendererRetired = false;
  try { w.__MATERIAL_EXIT_QA__.captureBoardPng(); } catch { oldRendererRetired = true; }
  return { tracker: w.__MATERIAL_TRACKER__.snapshot(), oldRendererRetired, qaPresent: Boolean(w.__TETRAMORPH_QA__), textHook: Boolean(w.render_game_to_text) };
});
check(exited.tracker.canvases === 0 && exited.tracker.liveContexts === 0 && exited.oldRendererRetired, 'UI exit retires Canvas/renderer/audio');
check(!exited.qaPresent && !exited.textHook, 'UI exit retires QA hooks');
check(Number(relevantListeners(exited.tracker)['window:keydown'] ?? 0) < Number(relevantListeners(changedPreferences.tracker)['window:keydown'] ?? 0), 'UI exit removes input listeners');
check(Number(relevantListeners(exited.tracker)['document:visibilitychange'] ?? 0) < Number(relevantListeners(changedPreferences.tracker)['document:visibilitychange'] ?? 0), 'UI exit removes visibility listener');

await page.getByTestId('enter-sprint').click();
await page.getByTestId('game-screen').waitFor({ state: 'visible' });
await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
await page.waitForFunction(() => Boolean(/** @type {any} */ (window).__TETRAMORPH_QA__));
await page.evaluate(() => /** @type {any} */ (window).__TETRAMORPH_QA__.setFrozen(true));
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(100);
const reentered = await snapshot(page);
check(reentered.tracker?.qaId !== initial.tracker?.qaId && reentered.tracker?.canvasId !== initial.tracker?.canvasId, 're-entry owns fresh runtime and Canvas');
check(reentered.tracker?.liveContexts === 1 && reentered.tracker?.contexts.length >= 2
  && reentered.tracker?.contexts.slice(0, -1).every((/** @type {any} */ entry) => entry.closed), 're-entry owns one fresh AudioContext');
check(JSON.stringify(relevantListeners(reentered.tracker)) === JSON.stringify(relevantListeners(changedPreferences.tracker)), 're-entry restores one listener set');

await page.evaluate(() => { const w = /** @type {any} */ (window); w.__MATERIAL_HMR_QA__ = w.__TETRAMORPH_QA__; });
const beforeHmr = await snapshot(page);
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
check(hmrRequests.length >= 1, 'Vite delivered App HMR update');
check(afterHmr.canvasCount === 1 && afterHmr.tracker?.liveContexts === 1, 'HMR leaves one Canvas and AudioContext');
check(afterHmr.tracker?.activeRafs <= (beforeHmr.tracker?.activeRafs ?? 1) + 1, 'HMR frame/ticker callback bound');
check(noListenerGrowth(beforeHmr.tracker, afterHmr.tracker), 'HMR listener bound');
check(oldHmrOwner.sameOwner || oldHmrOwner.oldRenderer === 'retired', 'HMR old renderer disposition');

await page.getByTestId('exit-game').click();
await page.locator('.action-sheet__actions > .primary-action').click();
await page.getByTestId('mode-home').waitFor({ state: 'visible' });
await page.waitForFunction(() => document.querySelectorAll('canvas').length === 0 && /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot().liveContexts === 0);
const terminal = await page.evaluate(() => /** @type {any} */ (window).__MATERIAL_TRACKER__.snapshot());
check(terminal.canvases === 0 && terminal.liveContexts === 0 && Number(relevantListeners(terminal)['window:keydown'] ?? 0) === 0, 'post-HMR terminal cleanup');

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

const report = {
  schema: 'tetramorph.t37.material-browser.v1', generatedAt: new Date().toISOString(),
  origin, browser: await browser.version(), passed: failures.length === 0, failures,
  initial, afterFreeze, restarted, changedPreferences, exited, reentered,
  hmr: { before: beforeHmr, requests: hmrRequests, after: afterHmr, oldOwner: oldHmrOwner },
  terminal, observations: observed,
  assertions: {
    realProductRoute: page.url().startsWith(origin.replace(/\/$/u, '')),
    restartThemeMotionReuse: restarted.before.qaId === restarted.after.qaId && changedPreferences.tracker?.qaId === initial.tracker?.qaId,
    uiExitReentryReplacement: exited.oldRendererRetired && reentered.tracker?.qaId !== initial.tracker?.qaId,
    hmrDelivered: hmrRequests.length >= 1,
    terminalClean: terminal.canvases === 0 && terminal.liveContexts === 0,
  },
  humanStatus: HUMAN_STATUS,
};

await writeFile(join(root, 'ice-provenance-audit.json'), `${JSON.stringify(iceProvenance, null, 2)}\n`, 'utf8');
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await context.close();
await browser.close();
if (!report.passed) throw new Error(failures.join('\n'));
