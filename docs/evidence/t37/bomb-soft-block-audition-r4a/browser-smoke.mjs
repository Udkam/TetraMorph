import { createHash } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] ?? 'http://127.0.0.1:4192/docs/evidence/t37/bomb-soft-block-audition-r4a/';
const consoleErrors = [];
const pageErrors = [];
const requestErrors = [];

const observe = (page, label) => {
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`); });
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => { if (response.status() >= 400) requestErrors.push(`${label}: ${response.status()} ${response.url()}`); });
  page.on('requestfailed', (request) => requestErrors.push(`${label}: failed ${request.url()} ${request.failure()?.errorText ?? ''}`));
};

const ready = async (page) => {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__R4A_READY__ === true, null, { timeout: 20_000 });
};

const layoutState = async (page) => ({
  overflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
  minimumControlHeight: await page.locator('button, .choice-group label, .reason-group label').evaluateAll((elements) => (
    Math.min(...elements.map((element) => element.getBoundingClientRect().height))
  )),
  canvasCount: await page.locator('canvas').count(),
});

const metricFailures = (report) => {
  const failures = [];
  const between = (value, min, max, label) => { if (value < min || value > max) failures.push(`${label}: ${value}`); };
  for (const [id, value] of Object.entries(report.candidates)) {
    between(value.peak, 0.205, 0.25, `${id} peak`);
    between(value.rms, 0.035, 0.055, `${id} rms`);
    between(value.maxRms10Ms, 0.08, 0.13, `${id} maxRms10Ms`);
    between(value.maxRms50Ms, 0.05, 0.075, `${id} maxRms50Ms`);
    between(value.energyVsHardDropDb, 1.5, 6, `${id} energyVsHardDropDb`);
    between(value.crestDb, 12, 17, `${id} crestDb`);
    between(value.peakTimeMs, 8, 22, `${id} peakTimeMs`);
    between(value.attackMs, 6, 14, `${id} attackMs`);
    between(value.spectralCentroidHz, 190, 420, `${id} centroid`);
    between(value.bandsPercent.from250To1000, 3, 20, `${id} 250-1000Hz`);
    if (value.energyEnd95Ms > 140) failures.push(`${id} 95% tail: ${value.energyEnd95Ms}`);
    if (value.energyEnd99Ms > 180) failures.push(`${id} 99% tail: ${value.energyEnd99Ms}`);
    if (value.bandsPercent.below70 > 0.5) failures.push(`${id} below70`);
    if (value.bandsPercent.from70To120 > 20) failures.push(`${id} 70-120Hz`);
    if (value.bandsPercent.from1000To2000 > 8) failures.push(`${id} 1-2kHz`);
    if (value.bandsPercent.from2000To4000 > 4) failures.push(`${id} 2-4kHz`);
    if (value.bandsPercent.above4000 > 1) failures.push(`${id} above4kHz`);
  }
  if (report.peakSpreadDb > 0.5) failures.push(`peak spread: ${report.peakSpreadDb}`);
  if (report.references.studioOneLine.peak < 0.19 || report.references.studioOneLine.peak > 0.2) failures.push('Studio reference drifted');
  return failures;
};

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
observe(desktop, 'desktop');
await ready(desktop);
const initial = await desktop.evaluate(() => window.__R4A_TEST__.getState());
const metrics = await desktop.evaluate(() => window.__R4A_TEST__.measureCompleteGraphs());
const metricsFailures = metricFailures(metrics);
const desktopLayout = await layoutState(desktop);

await desktop.locator('[data-play="X"]').click();
await desktop.waitForFunction(() => window.__R4A_TEST__.getState().lastSchedule?.candidate === 'X');
await desktop.locator('[data-play="Y"]').click();
await desktop.waitForFunction(() => window.__R4A_TEST__.getState().lastSchedule?.candidate === 'Y');
const fastSwitch = await desktop.evaluate(() => window.__R4A_TEST__.getState());

const desktopImpact = await desktop.evaluate(async () => {
  window.__R4A_TEST__.stop();
  await window.__R4A_TEST__.playCandidate('X');
  window.advanceTime(220.01);
  return window.__R4A_TEST__.getState();
});
const desktopImagePath = join(root, 'r4a-desktop-impact.png');
await desktop.screenshot({ path: desktopImagePath, fullPage: true });
const desktopImageBytes = (await readFile(desktopImagePath)).length;
await desktop.evaluate(() => {
  window.advanceTime(1_250);
});
await desktop.waitForTimeout(450);
const fullCleanup = await desktop.evaluate(() => window.__R4A_TEST__.getState());
await desktop.evaluate(() => window.__R4A_TEST__.stop());

await desktop.locator('[data-compare="Z"]').click();
await desktop.waitForFunction(() => window.__R4A_TEST__.getState().lastSchedule?.candidate === 'Z', null, { timeout: 3_000 });
const comparison = await desktop.evaluate(() => window.__R4A_TEST__.getState());
await desktop.locator('[data-reference="hard-drop"]').click();
await desktop.locator('[data-reference="studio"]').click();
await desktop.locator('.choice-group label').filter({ has: desktop.locator('input[value="X"]') }).click();
await desktop.locator('.reason-group label').filter({ has: desktop.locator('input[value="too-loud"]') }).click();
await desktop.locator('#record-verdict').click();
const selectedVerdict = await desktop.evaluate(() => window.__R4A_TEST__.getState());
await desktop.locator('.choice-group label').filter({ has: desktop.locator('input[value="reject"]') }).click();
await desktop.locator('.reason-group label').filter({ has: desktop.locator('input[value="too-loud"]') }).click();
await desktop.locator('#record-verdict').click();

await desktop.evaluate(() => import('./audition.ts?browser-smoke-hmr=1'));
await desktop.waitForFunction(() => window.__R4A_READY__ === true && window.__R4A_TEST__.getState().canvasCount === 1);
const hmrReload = await desktop.evaluate(() => window.__R4A_TEST__.getState());
await desktop.evaluate(() => window.__R4A_TEST__.dispose());
const desktopDisposed = await desktop.evaluate(() => window.__R4A_TEST__.getState());

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
observe(mobile, 'mobile');
await ready(mobile);
const mobileInitial = await mobile.evaluate(() => window.__R4A_TEST__.getState());
const mobileLayout = await layoutState(mobile);
const mobileImagePath = join(root, 'r4a-mobile.png');
await mobile.screenshot({ path: mobileImagePath, fullPage: true });
const mobileImageBytes = (await readFile(mobileImagePath)).length;
await mobile.evaluate(() => window.__R4A_TEST__.dispose());

const reduced = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
observe(reduced, 'reduced');
await ready(reduced);
const reducedStaticFrames = [];
let reducedImpact = null;
for (const atMs of [0, 219, 220.01, 619]) {
  const state = await reduced.evaluate((time) => window.__R4A_TEST__.runReducedTechnical('Z', time), atMs);
  const temporaryPath = join(root, `reduced-static-${String(atMs).replace('.', '-')}.png`);
  await reduced.locator('#canvas-host canvas').screenshot({ path: temporaryPath });
  const bytes = await readFile(temporaryPath);
  await unlink(temporaryPath);
  reducedStaticFrames.push({ atMs, sha256: createHash('sha256').update(bytes).digest('hex'), state: state.renderer });
  if (atMs === 220.01) reducedImpact = state;
}
const reducedImagePath = join(root, 'r4a-reduced-technical.png');
await reduced.screenshot({ path: reducedImagePath, fullPage: true });
const reducedImageBytes = (await readFile(reducedImagePath)).length;
await reduced.evaluate(() => window.advanceTime(851));
await reduced.waitForTimeout(450);
const reducedCleanup = await reduced.evaluate(() => window.__R4A_TEST__.getState());
await reduced.evaluate(() => window.__R4A_TEST__.stop());
await reduced.evaluate(() => window.__R4A_TEST__.dispose());
await browser.close();

const scheduleExact = (state) => Math.abs(
  (state.lastSchedule.audioStartAtSeconds - state.lastSchedule.scheduledFromSeconds) - 0.22,
) < 1e-9 && Math.abs(state.lastSchedule.audioOffsetMs - 220) < 1e-6;
const graphExact = JSON.stringify(metrics.graph) === JSON.stringify({
  mutationBus: 0.96,
  candidateEffects: 1,
  candidateMaster: 1.85,
  compressor: { threshold: -4, knee: 6, ratio: 3, attack: 0.003, release: 0.12 },
  enabledGate: 1,
  volume: 1,
  output: 0.78,
});
const reducedStatic = new Set(reducedStaticFrames.map((frame) => frame.sha256)).size === 1;

const passed = (
  initial.ready && initial.playCount === 0 && initial.verdict === 'reject'
  && !initial.audio.primed && initial.canvasCount === 1 && initial.domCellCount === 0
  && initial.fixture.previewOutcome === 'blast' && initial.fixture.bombOutcome === 'blast'
  && JSON.stringify(initial.fixture.clearRows) === '[39]' && JSON.stringify(initial.fixture.blastRows) === '[38,39]'
  && initial.fixture.participatingBombCount === 1 && !initial.fixture.hasChainOriginCarrierId
  && !initial.fixture.hasChainOriginCells && !initial.fixture.hasChainTriggerRows
  && metricsFailures.length === 0 && graphExact
  && metrics.references.hardDrop.peak >= 0.1766 && metrics.references.hardDrop.peak <= 0.1769
  && metrics.references.studioOneLine.peak >= 0.1955 && metrics.references.studioOneLine.peak <= 0.1957
  && desktopLayout.canvasCount === 1 && !desktopLayout.overflow && desktopLayout.minimumControlHeight >= 44
  && fastSwitch.audio.canceledBeforeStart >= 1 && fastSwitch.audio.pendingCandidates.length === 1
  && fastSwitch.audio.pendingCandidates[0]?.id === 'Y' && scheduleExact(fastSwitch)
  && desktopImpact.renderer.elapsedMs >= 220 && desktopImpact.renderer.activeParticles > 0 && scheduleExact(desktopImpact)
  && fullCleanup.renderer.cleanupComplete && fullCleanup.renderer.activeParticles === 0 && fullCleanup.renderer.mutationActivation === null
  && fullCleanup.audio.activeSources === 0 && fullCleanup.audio.pendingCandidates.length === 0 && fullCleanup.pendingTimers === 0
  && comparison.lastCue === '候选 Z' && comparison.pendingTimers === 0 && scheduleExact(comparison)
  && selectedVerdict.verdict === 'X' && selectedVerdict.reasons.includes('too-loud')
  && hmrReload.canvasCount === 1 && hmrReload.audio.activeSources === 0 && hmrReload.pendingTimers === 0
  && desktopDisposed.disposed && desktopDisposed.canvasCount === 0 && desktopDisposed.audio.closed && desktopDisposed.audio.activeSources === 0
  && mobileInitial.verdict === 'reject' && mobileInitial.canvasCount === 1
  && mobileLayout.canvasCount === 1 && !mobileLayout.overflow && mobileLayout.minimumControlHeight >= 44
  && reducedStatic && reducedStaticFrames.every((frame) => frame.state.reducedMotion && frame.state.activeParticles === 0)
  && reducedImpact.renderer.reducedMotion && reducedImpact.renderer.activeParticles === 0
  && reducedImpact.renderer.elapsedMs >= 220 && scheduleExact(reducedImpact)
  && reducedCleanup.renderer.cleanupComplete && reducedCleanup.renderer.activeParticles === 0
  && reducedCleanup.audio.activeSources === 0 && reducedCleanup.audio.pendingCandidates.length === 0 && reducedCleanup.pendingTimers === 0
  && desktopImageBytes > 20_000 && mobileImageBytes > 20_000 && reducedImageBytes > 20_000
  && consoleErrors.length === 0 && pageErrors.length === 0 && requestErrors.length === 0
);

const report = {
  generatedAt: new Date().toISOString(), url, passed,
  initial, metrics, metricsFailures, fastSwitch, desktopImpact, fullCleanup, comparison,
  selectedVerdict, hmrReload, desktopDisposed, mobileInitial, reducedStaticFrames, reducedImpact, reducedCleanup,
  graphExact, reducedStatic,
  layout: { desktop: desktopLayout, mobile: mobileLayout },
  screenshots: {
    desktop: { file: 'r4a-desktop-impact.png', bytes: desktopImageBytes },
    mobile: { file: 'r4a-mobile.png', bytes: mobileImageBytes },
    reduced: { file: 'r4a-reduced-technical.png', bytes: reducedImageBytes },
  },
  consoleErrors, pageErrors, requestErrors,
};
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed, metricsFailures, layout: report.layout, screenshots: report.screenshots, errors: { consoleErrors, pageErrors, requestErrors } }));
if (!passed) process.exitCode = 1;
