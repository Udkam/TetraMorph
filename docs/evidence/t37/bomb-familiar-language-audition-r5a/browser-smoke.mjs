import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2]
  ?? 'http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-audition-r5a/';
const playwrightVersion = require('playwright/package.json').version;
const expectedPlaywright = '1.61.1';
const expectedChromium = '149.0.7827.55';
const consoleErrors = [];
const pageErrors = [];
const requestErrors = [];
const failures = [];

const check = (condition, label) => { if (!condition) failures.push(label); };
const near = (value, expected, tolerance = 1e-9) => Math.abs(value - expected) <= tolerance;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`); });
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => { if (response.status() >= 400) requestErrors.push(`${label}: ${response.status()} ${response.url()}`); });
  page.on('requestfailed', (request) => requestErrors.push(`${label}: failed ${request.url()} ${request.failure()?.errorText ?? ''}`));
}

async function ready(page) {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__R5A_READY__ === true, null, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

async function state(page) {
  return page.evaluate(() => window.__R5A_TEST__.getState());
}

async function layout(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    canvasCount: document.querySelectorAll('canvas').length,
    comparisonCount: document.querySelectorAll('[data-compare]').length,
    minimumControlHeight: Math.min(...[...document.querySelectorAll('button, .choice-group label, .reason-group label')]
      .map((element) => element.getBoundingClientRect().height)),
    visibleText: document.body.innerText,
  }));
}

function scheduleExact(value) {
  return value?.lastSchedule
    && near(value.lastSchedule.audioStartAtSeconds - value.lastSchedule.scheduledFromSeconds, 0.22)
    && near(value.lastSchedule.audioOffsetMs, 220, 1e-6);
}

function terminalClean(value, expectedCanvasCount = 0) {
  return !value.ready
    && value.disposed
    && !value.disposing
    && value.canvasCount === expectedCanvasCount
    && value.pendingTimers === 0
    && !value.renderer.ready
    && value.renderer.disposed
    && value.renderer.canvasCount === expectedCanvasCount
    && !value.renderer.frameCallbackActive
    && value.renderer.activeParticles === 0
    && value.audio.phase === 'disposed'
    && value.audio.closed
    && value.audio.activeSources === 0
    && value.audio.pendingSources === 0
    && value.audio.timers === 0;
}

const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
check(playwrightVersion === expectedPlaywright, `Playwright version ${playwrightVersion}`);
check(browserVersion === expectedChromium, `Chromium version ${browserVersion}`);

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
observe(desktop, 'desktop');
await ready(desktop);
const initial = await state(desktop);
const desktopLayout = await layout(desktop);
check(initial.ready && !initial.disposed && initial.playCount === 0 && initial.verdict === 'reject', 'initial ready/reject/no-autoplay');
check(initial.audio.phase === 'cold' && !initial.audio.primed && initial.audio.activeSources === 0, 'initial audio cold');
check(initial.canvasCount === 1 && initial.domCellCount === 0, 'initial single Canvas');
check(initial.fixture.bombOutcome === 'blast' && initial.fixture.participatingBombCount === 1, 'normal Core Bomb fixture');
check(!initial.fixture.hasChainOriginCarrierId && !initial.fixture.hasChainOriginCells && !initial.fixture.hasChainTriggerRows, 'normal fixture excludes chain');
check(!desktopLayout.overflow && desktopLayout.canvasCount === 1 && desktopLayout.minimumControlHeight >= 44, 'desktop responsive controls');
check(desktopLayout.comparisonCount === 6, 'both references compare to every candidate');
check(!/Action stack|Clear collision|Compact block knock/u.test(desktopLayout.visibleText), 'internal candidate names hidden');

await desktop.locator('[data-play="A"]').click();
await desktop.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'pending');
const pendingA = await state(desktop);
await desktop.evaluate(() => window.__R5A_TEST__.playCandidate('B'));
await desktop.waitForFunction(() => window.__R5A_TEST__.getState().lastSchedule?.candidate === 'B');
const switchedB = await state(desktop);
check(pendingA.audio.pendingSources === 1 && scheduleExact(pendingA), 'A pending at exact impact');
check(switchedB.audio.canceledBeforeStart >= 1 && switchedB.audio.pendingSources === 1 && scheduleExact(switchedB), 'rapid switch cancels superseded source');
check(switchedB.renderer.canvasCount === 1 && switchedB.renderer.frameCallbackActive, 'rapid switch reuses Renderer');
await desktop.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'playing', null, { timeout: 1_000 });
const activeB = await state(desktop);
check(activeB.audio.activeSources === 1 && activeB.audio.pendingSources === 0, 'candidate reaches playing state');
await desktop.locator('#stop-all').click();
const reusableStop = await state(desktop);
check(reusableStop.ready && reusableStop.audio.phase === 'ready' && reusableStop.audio.activeSources === 0
  && reusableStop.audio.timers === 0 && reusableStop.pendingTimers === 0, 'stop is reusable');
check(reusableStop.renderer.ready && reusableStop.renderer.canvasCount === 1 && !reusableStop.renderer.frameCallbackActive, 'stop retains one Renderer');

const desktopImpact = await desktop.evaluate(async () => {
  await window.__R5A_TEST__.playCandidate('A');
  window.advanceTime(220.01);
  return window.__R5A_TEST__.getState();
});
check(scheduleExact(desktopImpact) && desktopImpact.renderer.activeParticles > 0, 'desktop exact visual/audio impact');
const desktopImagePath = join(root, 'r5a-desktop-impact.png');
await desktop.screenshot({ path: desktopImagePath, fullPage: true });
await desktop.evaluate(() => window.advanceTime(1_250));
await desktop.waitForTimeout(450);
const naturalCompletion = await state(desktop);
check(naturalCompletion.ready && naturalCompletion.renderer.cleanupComplete
  && naturalCompletion.renderer.activeParticles === 0 && !naturalCompletion.renderer.frameCallbackActive, 'natural Renderer completion reusable');
check(naturalCompletion.audio.phase === 'ready' && naturalCompletion.audio.activeSources === 0
  && naturalCompletion.audio.pendingSources === 0 && naturalCompletion.audio.timers === 0, 'natural audio completion reusable');

await desktop.locator('[data-compare="C"][data-reference="studio"]').click();
await desktop.waitForFunction(() => window.__R5A_TEST__.getState().lastSchedule?.candidate === 'C', null, { timeout: 2_000 });
const studioComparison = await state(desktop);
check(studioComparison.lastCue === '候选 C' && scheduleExact(studioComparison), 'Studio-to-candidate comparison');
await desktop.locator('#stop-all').click();
await desktop.locator('[data-reference="hard-drop"]:not([data-compare])').click();
await desktop.waitForFunction(() => window.__R5A_TEST__.getState().lastCue?.includes('硬降'));
const hardDropReference = await state(desktop);
await desktop.locator('[data-reference="studio"]:not([data-compare])').click();
await desktop.waitForFunction(() => window.__R5A_TEST__.getState().lastCue?.includes('Studio'));
const studioReference = await state(desktop);
check(hardDropReference.audio.currentCue === 'hard-drop' && studioReference.audio.currentCue === 'studio', 'complete reference controls');
await desktop.locator('#stop-all').click();
await desktop.locator('.choice-group label').filter({ has: desktop.locator('input[value="B"]') }).click();
await desktop.locator('.reason-group label').filter({ has: desktop.locator('input[value="not-block-like"]') }).click();
await desktop.locator('#record-verdict').click();
const selectedVerdict = await state(desktop);
check(selectedVerdict.verdict === 'B' && selectedVerdict.reasons.includes('not-block-like'), 'optional verdict input');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observe(mobile, 'mobile');
await ready(mobile);
const mobileInitial = await state(mobile);
const mobileLayout = await layout(mobile);
check(mobileInitial.verdict === 'reject' && mobileInitial.audio.phase === 'cold', 'mobile reject/cold default');
check(!mobileLayout.overflow && mobileLayout.canvasCount === 1 && mobileLayout.minimumControlHeight >= 44, 'mobile responsive controls');
const mobileImagePath = join(root, 'r5a-mobile.png');
await mobile.screenshot({ path: mobileImagePath, fullPage: true });
await mobile.evaluate(() => window.__R5A_TEST__.dispose('mobile-finish'));

const reduced = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
observe(reduced, 'reduced');
await ready(reduced);
const reducedFrames = [];
let reducedImpact = null;
for (const atMs of [0, 219, 220.01, 619]) {
  const value = await reduced.evaluate((time) => window.__R5A_TEST__.runReducedTechnical('C', time), atMs);
  const bytes = await reduced.locator('#canvas-host canvas').screenshot();
  reducedFrames.push({ atMs, sha256: sha256(bytes), renderer: value.renderer });
  if (atMs === 220.01) reducedImpact = value;
}
const reducedStatic = new Set(reducedFrames.map((frame) => frame.sha256)).size === 1;
check(reducedStatic && reducedFrames.every((frame) => frame.renderer.reducedMotion
  && frame.renderer.activeParticles === 0), 'reduced motion is static technical evidence');
check(reducedImpact && scheduleExact(reducedImpact), 'reduced motion keeps identical stem timing');
const reducedImagePath = join(root, 'r5a-reduced-technical.png');
await reduced.screenshot({ path: reducedImagePath, fullPage: true });
await reduced.evaluate(() => window.advanceTime(851));
await reduced.waitForTimeout(450);
const reducedCompletion = await state(reduced);
check(reducedCompletion.renderer.cleanupComplete && !reducedCompletion.renderer.frameCallbackActive
  && reducedCompletion.audio.phase === 'ready' && reducedCompletion.audio.activeSources === 0, 'reduced completion cleanup');
await reduced.evaluate(() => window.__R5A_TEST__.dispose('reduced-finish'));

const metricPage = await browser.newPage();
observe(metricPage, 'metrics');
await metricPage.goto(new URL('metric-harness.html', baseUrl).href, { waitUntil: 'load' });
await metricPage.waitForFunction(() => window.__R5A_METRIC_READY__ === true, null, { timeout: 20_000 });
const metrics = await metricPage.evaluate(() => window.__R5A_METRIC__.measure());
check(metrics.failures.length === 0, `metric failures: ${metrics.failures.join(', ')}`);
check(metrics.peakSpreadDb <= 0.5, 'candidate peak spread');
check(Object.values(metrics.candidates).every((candidate) => candidate.leftRightIdentical), 'metric candidate channel identity');
check(metrics.references.hardDrop.leftRightIdentical && metrics.references.studioOneLine.leftRightIdentical, 'reference channel identity');
await metricPage.close();

async function lifecycleScenario(method, entryState) {
  const label = `${method}-${entryState}`;
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  observe(page, label);
  let releasePrime = null;
  let primeRequestSeen = null;
  let resolvePrimeRequest;
  if (entryState === 'priming') {
    primeRequestSeen = new Promise((resolve) => { resolvePrimeRequest = resolve; });
    const held = new Promise((resolve) => { releasePrime = resolve; });
    await page.route('**/assets/A.wav*', async (route) => {
      resolvePrimeRequest();
      await held;
      await route.continue();
    });
  }
  await ready(page);
  if (entryState === 'idle') {
    await page.evaluate(() => window.__R5A_TEST__.prime());
    await page.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'ready');
  } else if (entryState === 'pending') {
    await page.evaluate(() => window.__R5A_TEST__.playCandidate('A'));
    await page.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'pending');
  } else if (entryState === 'playing') {
    await page.evaluate(() => window.__R5A_TEST__.playCandidate('A'));
    await page.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'playing', null, { timeout: 1_000 });
  } else {
    await page.locator('[data-play="A"]').click();
    await primeRequestSeen;
    await page.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'priming');
  }
  const before = await state(page);
  const oldInstanceId = before.instanceId;
  if (method === 'hmr') {
    await page.evaluate(() => { window.__R5A_OLD_TEST__ = window.__R5A_TEST__; });
    await page.evaluate((token) => import(`./audition.ts?browser-smoke-hmr=${token}`), `${entryState}-${Date.now()}`);
  } else if (method === 'pagehide') {
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  } else {
    await page.evaluate(() => window.__R5A_TEST__.dispose('explicit-test'));
  }
  if (releasePrime) releasePrime();
  let terminal;
  let fresh = null;
  if (method === 'hmr') {
    await page.waitForFunction((id) => window.__R5A_READY__ === true
      && window.__R5A_TEST__.getState().instanceId > id
      && document.querySelectorAll('canvas').length === 1, oldInstanceId, { timeout: 20_000 });
    if (entryState === 'priming') {
      await page.waitForFunction(() => window.__R5A_OLD_TEST__.getState().audio.latePrimeIgnored >= 1);
    }
    terminal = await page.evaluate(() => window.__R5A_OLD_TEST__.getState());
    fresh = await state(page);
  } else {
    await page.waitForFunction(() => window.__R5A_TEST__.getState().audio.phase === 'disposed');
    if (entryState === 'priming') {
      await page.waitForFunction(() => window.__R5A_TEST__.getState().audio.latePrimeIgnored >= 1);
    }
    terminal = await state(page);
  }
  const expectedPhase = entryState === 'idle' ? 'ready' : entryState;
  check(before.audio.phase === expectedPhase, `${label} entered exact state`);
  check(terminalClean(terminal, method === 'hmr' ? 1 : 0), `${label} terminal cleanup`);
  if (entryState === 'priming') check(terminal.audio.latePrimeIgnored >= 1, `${label} late prime ignored`);
  if (fresh) check(fresh.ready && fresh.instanceId > oldInstanceId && fresh.canvasCount === 1
    && fresh.renderer.ready && !fresh.renderer.disposed && fresh.renderer.canvasCount === 1
    && fresh.audio.phase === 'cold' && fresh.terminalAuditCount >= 1, `${label} fresh instance`);
  await page.close();
  return { method, entryState, before, terminal, fresh };
}

const lifecycle = [];
for (const method of ['dispose', 'pagehide', 'hmr']) {
  for (const entryState of ['priming', 'pending', 'playing', 'idle']) {
    lifecycle.push(await lifecycleScenario(method, entryState));
  }
}

await desktop.evaluate(() => window.__R5A_TEST__.dispose('desktop-finish'));
await browser.close();
check(consoleErrors.length === 0, `console errors: ${consoleErrors.join(' | ')}`);
check(pageErrors.length === 0, `page errors: ${pageErrors.join(' | ')}`);
check(requestErrors.length === 0, `request errors: ${requestErrors.join(' | ')}`);

const report = {
  schema: 'tetramorph.t37.bomb-r5a-browser-proof.v1',
  generatedAt: new Date().toISOString(),
  url: baseUrl,
  playwrightVersion,
  browserVersion,
  passed: failures.length === 0,
  failures,
  initial,
  pendingA,
  switchedB,
  activeB,
  reusableStop,
  desktopImpact,
  naturalCompletion,
  studioComparison,
  hardDropReference,
  studioReference,
  selectedVerdict,
  mobileInitial,
  reducedFrames,
  reducedImpact,
  reducedCompletion,
  reducedStatic,
  metrics,
  lifecycle,
  layout: { desktop: desktopLayout, mobile: mobileLayout },
  screenshots: {
    desktop: { file: 'r5a-desktop-impact.png' },
    mobile: { file: 'r5a-mobile.png' },
    reduced: { file: 'r5a-reduced-technical.png' },
  },
  consoleErrors,
  pageErrors,
  requestErrors,
};
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  passed: report.passed,
  failures: report.failures,
  lifecycleScenarios: lifecycle.length,
  metricsFailures: metrics.failures,
  errors: { consoleErrors, pageErrors, requestErrors },
}));
if (!report.passed) process.exitCode = 1;
