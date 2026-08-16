import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] ?? 'http://127.0.0.1:4192/docs/evidence/t37/bomb-familiar-language-chain-audition-r5b/';
const failures = [];
const consoleErrors = [];
const pageErrors = [];
const requestErrors = [];
const assetRequests = new Set();
const expectedStemHashes = Object.freeze({
  A: 'be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254',
  B: 'b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc',
  C: 'ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6',
});
const check = (value, label) => { if (!value) failures.push(label); };
function observe(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`); });
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => {
    if (/bomb-familiar-[abc].*\.wav/u.test(response.url())) assetRequests.add(response.url());
    if (response.status() >= 400) requestErrors.push(`${label}: ${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => requestErrors.push(`${label}: ${request.url()}`));
}
async function open(browser, viewport = { width: 1440, height: 1000 }, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport, reducedMotion });
  observe(page, `${viewport.width}x${viewport.height}`);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__R5B_READY__ === true);
  return page;
}
const get = (page) => page.evaluate(() => window.__R5B_TEST__.getState());
const layout = (page) => page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  minTarget: Math.min(...[...document.querySelectorAll('button,label span')].map((element) => element.getBoundingClientRect().height)),
  canvas: document.querySelectorAll('canvas').length,
}));
function proveEvent(event, fixture, variant, scene, reducedMotion) {
  const beats = scene === 'normal' ? [fixture.normalImpactMs] : (reducedMotion ? fixture.reducedBeatStartsMs : fixture.fullBeatStartsMs);
  const expectedFrames = scene === 'normal' ? 19_200 : (reducedMotion ? 22_368 : 65_664);
  check(event.variant === variant && event.scene === scene && event.reducedMotion === reducedMotion, `event identity ${variant}/${scene}/${reducedMotion}`);
  check(event.selectedAssetId === `bombFamiliar${variant}` && event.selectedAssetSha256 === expectedStemHashes[variant] && event.selectedAssetBytes === 17_324, `selected fetched stem ${variant}`);
  check(event.channels === 1 && event.sampleRate === 48_000 && event.frames === expectedFrames && event.expectedFrames === expectedFrames, `mono/frame contract ${variant}/${scene}/${reducedMotion}`);
  check(event.finite && event.maxAbs <= 1 && event.preBeatMaxAbs === 0 && event.firstNonZeroFrame >= beats[0] * 48, `finite unclipped timed signal ${variant}/${scene}/${reducedMotion}`);
  check(event.sourceStarted && event.sourceConnections === 1 && event.exactWithinTolerance && event.residualMaxAbs <= 1e-7 && event.expectedFloat32Sha256 === event.observedFloat32Sha256 && event.expectedFloat32Sha256.length === 64, `source/reconstruction ${variant}/${scene}/${reducedMotion}`);
  check(event.pcm16Sha256.length === 64 && event.pcm16Checkpoints.length === 8, `PCM16 selected-sample proof ${variant}/${scene}/${reducedMotion}`);
  check(JSON.stringify(event.beatStartsMs) === JSON.stringify(beats), `derived beats ${variant}/${scene}/${reducedMotion}`);
  check(event.beatProof.length === beats.length && event.beatProof.every((beat, index) => beat.index === index && beat.startMs === beats[index] && beat.startFrame === beats[index] * 48 && (index === 0 ? beat.kind === 'full-stem' : beat.kind === 'onset-grain' && beat.terminalWeight === 0)), `every beat reconstructed ${variant}/${scene}/${reducedMotion}`);
}

async function delayedRace(browser, kind) {
  const page = await open(browser, { width: 900, height: 800 });
  let release;
  let heldResolve;
  const held = new Promise((resolve) => { heldResolve = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let intercepted = false;
  await page.route(/bomb-familiar-a\.wav/u, async (route) => {
    if (intercepted) return route.continue();
    intercepted = true;
    heldResolve();
    await gate;
    await route.continue();
  });
  await page.locator('button[data-pair="A"]').click();
  await held;
  let resultPromise;
  if (kind === 'stop') {
    await page.evaluate(() => window.__R5B_TEST__.stop());
  } else if (kind === 'disable') {
    await page.evaluate(() => window.__R5B_TEST__.disable());
  } else if (kind === 'pagehide') {
    resultPromise = page.evaluate(async () => {
      const old = window.__R5B_TEST__;
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      while (!old.getState().disposed) await new Promise((resolve) => setTimeout(resolve, 10));
      return old.getState();
    });
  } else {
    resultPromise = page.evaluate(async (token) => {
      const old = window.__R5B_TEST__;
      await import(`./audition.ts?race-hmr=${token}`);
      while (window.__R5B_READY__ !== true) await new Promise((resolve) => setTimeout(resolve, 10));
      await window.__R5B_TEST__.prime('A');
      return { old: old.getState(), fresh: window.__R5B_TEST__.getState() };
    }, Date.now());
  }
  release();
  let result;
  if (resultPromise) result = await resultPromise;
  else {
    await page.waitForTimeout(350);
    result = await get(page);
  }
  if (kind === 'stop' || kind === 'disable') {
    check(result.playCount === 0 && result.pendingTimers === 0 && result.renderer.frameCallbacks === 0 && result.audio.eventSources === 0, `delayed ${kind} stale continuation suppressed`);
    check(result.audio.liveContexts === 1 && result.renderer.tickerOwners === 1 && result.canvasCount === 1 && result.listenerCount === 3, `delayed ${kind} reusable owners`);
    if (kind === 'disable') check(!result.enabled && !result.audio.enabled, 'delayed disable remains disabled');
    await page.evaluate(() => window.__R5B_TEST__.dispose('race-finish'));
  } else if (kind === 'pagehide') {
    check(result.playCount === 0 && result.audio.liveContexts === 0 && result.renderer.tickerOwners === 0 && result.canvasCount === 0 && result.listenerCount === 0 && !result.qaGlobals, 'delayed pagehide terminal/stale suppressed');
  } else {
    check(result.old.playCount === 0 && result.old.audio.liveContexts === 0 && result.old.renderer.tickerOwners === 0 && result.old.listenerCount === 0 && !result.old.qaGlobals, 'delayed HMR old terminal/stale suppressed');
    check(result.fresh.playCount === 0 && result.fresh.audio.liveContexts === 1 && result.fresh.renderer.tickerOwners === 1 && result.fresh.canvasCount === 1 && result.fresh.listenerCount === 3 && result.fresh.qaGlobals, 'delayed HMR one fresh owner set');
    await page.evaluate(() => window.__R5B_TEST__.dispose('race-finish'));
  }
  await page.close();
  return result;
}

const browser = await chromium.launch({ headless: true });
const desktop = await open(browser);
const initial = await get(desktop);
check(initial.verdict === 'reject' && initial.playCount === 0 && initial.audio.liveContexts === 0, 'reject/no-autoplay');
check(initial.canvasCount === 1 && initial.domCellCount === 0 && initial.renderer.tickerOwners === 1 && initial.renderer.frameCallbacks === 0, 'one production Renderer/no Renderer callback');
check(initial.fixture.normalOutcome === 'blast' && initial.fixture.chainOutcome === 'chain-clear' && JSON.stringify(initial.fixture.chainTriggerRows) === '[39]', 'real Core fixtures');
const desktopLayout = await layout(desktop);
check(!desktopLayout.overflow && desktopLayout.minTarget >= 44 && desktopLayout.canvas === 1, 'desktop layout/targets');

await desktop.locator('button[data-pair="A"]').click();
await desktop.waitForFunction(() => window.__R5B_TEST__.getState().pairSettledCount >= 1, undefined, { timeout: 10_000 });
const naturalPair = await get(desktop);
check(naturalPair.interactionLog[0]?.variant === 'A' && naturalPair.interactionLog[0]?.route === 'pointer', 'actual pointer click A route');
check(naturalPair.pairPhase === 'settled' && naturalPair.playCount === 2 && naturalPair.renderer.settledCount >= 2, 'full normal-to-chain 1x pair naturally settled');
check(naturalPair.pendingTimers === 0 && naturalPair.renderer.frameCallbacks === 0 && naturalPair.audio.eventSources === 0 && naturalPair.renderer.tickerOwners === 1, 'natural pair clears transient owners');
check(naturalPair.audio.contextState === 'running', 'real gesture resumes AudioContext');

const buttonB = desktop.locator('button[data-pair="B"]');
await buttonB.focus();
await desktop.keyboard.press('Enter');
await desktop.waitForFunction(() => window.__R5B_TEST__.getState().audio.events.some((event) => event.variant === 'B'));
let domRoutes = await get(desktop);
check(domRoutes.interactionLog.at(-1)?.variant === 'B' && domRoutes.interactionLog.at(-1)?.route === 'keyboard', 'actual keyboard Enter B route');
await desktop.locator('#stop').click();
await desktop.locator('button[data-pair="C"]').click();
await desktop.waitForFunction(() => window.__R5B_TEST__.getState().audio.events.some((event) => event.variant === 'C'));
domRoutes = await get(desktop);
check(domRoutes.interactionLog.at(-1)?.variant === 'C' && domRoutes.interactionLog.at(-1)?.route === 'pointer', 'actual pointer click C route');
await desktop.locator('#stop').click();

const technical = [];
for (const variant of ['A', 'B', 'C']) {
  for (const scene of ['normal', 'chain']) {
    const state = await desktop.evaluate(async ({ scene, variant }) => {
      await window.__R5B_TEST__.playEvent(scene, variant, false, true);
      return window.__R5B_TEST__.getState();
    }, { scene, variant });
    const event = state.audio.events.at(-1);
    proveEvent(event, state.fixture, variant, scene, false);
    technical.push({ variant, scene, reducedMotion: false, event });
    if (variant === 'A' && scene === 'normal') {
      await desktop.evaluate(() => window.advanceTime(220));
      await desktop.screenshot({ path: join(root, 'r5b-desktop-normal-a.png'), fullPage: true });
    }
    if (variant === 'A' && scene === 'chain') {
      await desktop.evaluate(() => window.advanceTime(220));
      await desktop.screenshot({ path: join(root, 'r5b-desktop-chain-a.png'), fullPage: true });
    }
  }
}
const sameContext = await desktop.evaluate(async () => {
  await window.__R5B_TEST__.playEvent('chain', 'A', false, true);
  await window.__R5B_TEST__.playEvent('chain', 'A', true, true);
  return window.__R5B_TEST__.getState();
});
const [fullA, reducedAEvent] = sameContext.audio.events.slice(-2);
proveEvent(fullA, sameContext.fixture, 'A', 'chain', false);
proveEvent(reducedAEvent, sameContext.fixture, 'A', 'chain', true);
check(fullA.contextId === reducedAEvent.contextId, 'same AudioContext full-to-reduced transition');
check(reducedAEvent.channels === 1 && reducedAEvent.finite && reducedAEvent.maxAbs <= 1 && reducedAEvent.sourceStarted && reducedAEvent.sourceConnections === 1, 'reduced mono/finite/unclipped/source connected');

const stemAssets = Object.fromEntries(['A', 'B', 'C'].map((variant) => {
  const assetId = `bombFamiliar${variant}`;
  const assets = sameContext.audio.assets.filter((asset) => asset.assetId === assetId);
  check(assets.length >= 1 && assets.every((asset) => asset.url === asset.expectedUrl && asset.sameOrigin && asset.exactHash && asset.expectedSha256 === expectedStemHashes[variant] && asset.observedBytes === 17_324 && asset.expectedBytes === 17_324), `actual fetch audit ${variant}`);
  return [variant, assets];
}));

const stopped = await desktop.evaluate(() => { window.__R5B_TEST__.stop(); return window.__R5B_TEST__.getState(); });
check(stopped.audio.liveContexts === 1 && stopped.audio.eventSources === 0 && stopped.renderer.tickerOwners === 1 && stopped.canvasCount === 1 && stopped.pendingTimers === 0 && stopped.listenerCount === 3 && stopped.renderer.frameCallbacks === 0, 'reusable stop retains owners/clears event work');
await desktop.evaluate(() => { void window.__R5B_TEST__.restart(); });
await desktop.waitForFunction(() => window.__R5B_TEST__.getState().pairPhase === 'normal');
const restarted = await get(desktop);
check(restarted.audio.liveContexts === 1 && restarted.audio.eventSources === 1 && restarted.renderer.frameCallbacks === 1 && restarted.renderer.tickerOwners === 1 && restarted.canvasCount === 1 && restarted.pendingTimers <= 1 && restarted.listenerCount === 3, 'restart replaces work without owner growth');
await desktop.evaluate(() => window.__R5B_TEST__.disable());
const disabled = await get(desktop);
check(!disabled.enabled && disabled.audio.eventSources === 0 && disabled.audio.liveContexts === 1 && disabled.canvasCount === 1 && disabled.pendingTimers === 0 && disabled.renderer.frameCallbacks === 0, 'disable reusable');
await desktop.evaluate(() => window.__R5B_TEST__.enable());
const enabled = await get(desktop);
check(enabled.enabled && enabled.audio.liveContexts === 1 && enabled.renderer.tickerOwners === 1, 're-enable no duplication');

const mobile = await open(browser, { width: 390, height: 844 });
const mobileLayout = await layout(mobile);
await mobile.evaluate(() => window.__R5B_TEST__.playEvent('chain', 'A', false, true));
await mobile.screenshot({ path: join(root, 'r5b-mobile-chain-a.png'), fullPage: true });
check(!mobileLayout.overflow && mobileLayout.minTarget >= 44 && mobileLayout.canvas === 1, 'mobile layout/targets');
const mobileTerminal = await mobile.evaluate(async () => { const old = window.__R5B_TEST__; await old.dispose('mobile'); return old.getState(); });
check(mobileTerminal.audio.liveContexts === 0 && mobileTerminal.renderer.tickerOwners === 0 && mobileTerminal.canvasCount === 0 && mobileTerminal.listenerCount === 0 && !mobileTerminal.qaGlobals, 'destroy terminal');
await mobile.close();

const reducedPage = await open(browser, { width: 1100, height: 900 }, 'reduce');
const reducedState = await reducedPage.evaluate(async () => { await window.__R5B_TEST__.playEvent('chain', 'A', true, true); return window.__R5B_TEST__.getState(); });
proveEvent(reducedState.audio.events.at(-1), reducedState.fixture, 'A', 'chain', true);
await reducedPage.screenshot({ path: join(root, 'r5b-reduced-technical-a.png'), fullPage: true });
await reducedPage.evaluate(() => window.__R5B_TEST__.dispose('reduced'));
await reducedPage.close();

const races = {};
for (const kind of ['stop', 'disable', 'pagehide', 'hmr']) races[kind] = await delayedRace(browser, kind);
await desktop.evaluate(() => window.__R5B_TEST__.dispose('desktop'));
await desktop.close();
await browser.close();

check(assetRequests.size >= 3 && ['a', 'b', 'c'].every((variant) => [...assetRequests].some((request) => request.includes(`bomb-familiar-${variant}`))), 'all product-local stems requested');
check(consoleErrors.length === 0 && pageErrors.length === 0 && requestErrors.length === 0, 'zero browser/request errors');
const report = {
  schema: 'tetramorph.t37.r5b-browser-proof.v2',
  generatedAt: new Date().toISOString(),
  passed: failures.length === 0,
  failures,
  initial,
  naturalPair,
  domRoutes,
  technical,
  sameContext: { full: fullA, reduced: reducedAEvent },
  stemAssets,
  stopped,
  restarted,
  disabled,
  enabled,
  reducedState,
  mobileTerminal,
  races,
  assetRequests: [...assetRequests],
  layout: { desktop: desktopLayout, mobile: mobileLayout },
  consoleErrors,
  pageErrors,
  requestErrors,
};
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed: report.passed, failures }));
if (!report.passed) process.exitCode = 1;
