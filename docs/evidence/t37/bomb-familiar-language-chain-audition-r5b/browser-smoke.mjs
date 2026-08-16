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
const domSnapshot = (page) => page.evaluate(() => ({
  bodyReady: document.body.dataset.ready,
  status: document.querySelector('#status')?.textContent,
  technical: document.querySelector('#technical')?.textContent,
  canvas: document.querySelectorAll('canvas').length,
}));
function activeOwners(state, label, { liveContexts, eventSources, pendingTimers, frameCallbacks }) {
  check(state.ready && !state.disposed && !state.disposing && !state.domRetired && state.qaGlobals, `${label} active instance flags`);
  check(state.canvasCount === 1 && state.renderer.canvasCount === 1 && state.renderer.rendererOwners === 1, `${label} one Canvas/Renderer`);
  check(state.audio.liveContexts === liveContexts && state.audio.eventSources === eventSources && state.audio.maxLiveContextsObserved <= 1, `${label} bounded audio owners`);
  check(state.pendingTimers === pendingTimers && state.renderer.frameCallbacks === frameCallbacks && state.listenerCount === 3, `${label} transient timers/RAF/listeners`);
  check(state.renderer.tickerOwners === 1 && state.renderer.tickerObserved && state.renderer.tickerApplicationBound && state.renderer.tickerStarted && !state.renderer.tickerDestroyed && state.renderer.tickerListenerCount === state.renderer.tickerInitialListenerCount && state.renderer.tickerListenerCount > 0, `${label} real Pixi ticker owner`);
}
function terminalOwners(state, label) {
  check(!state.ready && state.disposed && !state.disposing && state.domRetired && !state.qaGlobals, `${label} terminal instance flags`);
  check(state.canvasCount === 0 && state.renderer.canvasCount === 0 && state.renderer.rendererOwners === 0, `${label} zero Canvas/Renderer`);
  check(state.audio.liveContexts === 0 && state.audio.eventSources === 0 && state.audio.pendingTransitions === 0, `${label} zero audio/transitions`);
  check(state.pendingTimers === 0 && state.renderer.frameCallbacks === 0 && state.listenerCount === 0, `${label} zero timers/RAF/listeners`);
  check(state.renderer.tickerOwners === 0 && state.renderer.tickerObserved && !state.renderer.tickerApplicationBound && !state.renderer.tickerStarted && state.renderer.tickerDestroyed && state.renderer.tickerListenerCount === 0, `${label} destroyed real Pixi ticker`);
}
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
      globalThis.__R5B_RACE_OLD__ = old;
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      while (!old.getState().disposed) await new Promise((resolve) => setTimeout(resolve, 10));
      return old.getState();
    });
  } else {
    resultPromise = page.evaluate(async (token) => {
      const old = window.__R5B_TEST__;
      globalThis.__R5B_RACE_OLD__ = old;
      await import(`./audition.ts?race-hmr=${token}`);
      while (window.__R5B_READY__ !== true) await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        old: old.getState(),
        freshBefore: window.__R5B_TEST__.getState(),
        domBefore: {
          bodyReady: document.body.dataset.ready,
          status: document.querySelector('#status')?.textContent,
          technical: document.querySelector('#technical')?.textContent,
          canvas: document.querySelectorAll('canvas').length,
        },
      };
    }, Date.now());
  }
  let result;
  if (kind === 'pagehide' || kind === 'hmr') {
    result = await resultPromise;
    release();
    await page.waitForFunction(() => globalThis.__R5B_RACE_OLD__.getState().audio.staleAssetCallbacksDropped >= 1);
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => ({
      old: globalThis.__R5B_RACE_OLD__.getState(),
      fresh: window.__R5B_TEST__?.getState(),
      dom: {
        bodyReady: document.body.dataset.ready,
        status: document.querySelector('#status')?.textContent,
        technical: document.querySelector('#technical')?.textContent,
        canvas: document.querySelectorAll('canvas').length,
      },
    }));
    result = kind === 'pagehide' ? after.old : { ...result, oldAfter: after.old, freshAfter: after.fresh, domAfter: after.dom };
  } else {
    release();
    await page.waitForTimeout(350);
    result = await get(page);
  }
  if (kind === 'stop' || kind === 'disable') {
    check(result.playCount === 0, `delayed ${kind} stale continuation suppressed`);
    activeOwners(result, `delayed ${kind}`, { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
    if (kind === 'disable') check(!result.enabled && !result.audio.enabled, 'delayed disable remains disabled');
    await page.evaluate(() => window.__R5B_TEST__.dispose('race-finish'));
  } else if (kind === 'pagehide') {
    check(result.playCount === 0, 'delayed pagehide stale play suppressed');
    terminalOwners(result, 'delayed pagehide');
  } else {
    check(result.old.playCount === 0 && result.oldAfter.playCount === 0, 'delayed HMR old stale play suppressed');
    check(result.oldAfter.audio.staleAssetCallbacksDropped > result.old.audio.staleAssetCallbacksDropped, 'delayed HMR explicitly drops late old asset callback');
    terminalOwners(result.old, 'delayed HMR old-before-release');
    terminalOwners(result.oldAfter, 'delayed HMR old-after-release');
    activeOwners(result.freshBefore, 'delayed HMR fresh-before-release', { liveContexts: 0, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
    activeOwners(result.freshAfter, 'delayed HMR fresh-after-release', { liveContexts: 0, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
    check(result.freshBefore.instanceId === result.freshAfter.instanceId && result.freshBefore.renderer.tickerIdentity === result.freshAfter.renderer.tickerIdentity && result.freshBefore.ready === result.freshAfter.ready && JSON.stringify(result.domBefore) === JSON.stringify(result.domAfter), 'delayed HMR late old callback cannot alter fresh identity/ticker/DOM/ready');
    await page.evaluate(() => window.__R5B_TEST__.dispose('race-finish'));
  }
  await page.close();
  return result;
}

async function concurrentVariantRace(browser) {
  const page = await open(browser, { width: 960, height: 820 });
  const initialState = await get(page);
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
  await page.evaluate(() => {
    globalThis.__R5B_VARIANT_SAMPLES__ = [];
    const sample = () => {
      const state = window.__R5B_TEST__.getState();
      globalThis.__R5B_VARIANT_SAMPLES__.push({ instanceId: state.instanceId, ready: state.ready, liveContexts: state.audio.liveContexts, activeEngineOwnerId: state.audio.activeEngineOwnerId, pendingTransitions: state.audio.pendingTransitions, assetOwnerIds: state.audio.assets.map((asset) => asset.ownerId) });
    };
    sample();
    globalThis.__R5B_VARIANT_TIMER__ = setInterval(sample, 1);
  });
  const first = page.evaluate(() => window.__R5B_TEST__.playEvent('normal', 'A', false, true));
  await held;
  const second = page.evaluate(() => window.__R5B_TEST__.playEvent('normal', 'B', false, true));
  await page.waitForFunction(() => window.__R5B_TEST__.getState().audio.variant === 'B');
  const third = page.evaluate(() => window.__R5B_TEST__.playEvent('normal', 'C', false, true));
  const thirdResult = await third;
  await page.waitForFunction(() => {
    const state = window.__R5B_TEST__.getState();
    return state.audio.variant === 'C' && state.audio.pendingTransitions === 0 && state.audio.assets.filter((asset) => asset.ownerId === state.audio.activeEngineOwnerId).length === 6;
  });
  const beforeRelease = await get(page);
  release();
  const results = [await first, await second, thirdResult];
  await page.waitForFunction(() => window.__R5B_TEST__.getState().audio.staleAssetCallbacksDropped >= 1);
  await page.waitForTimeout(500);
  const result = await page.evaluate(() => {
    clearInterval(globalThis.__R5B_VARIANT_TIMER__);
    const state = window.__R5B_TEST__.getState();
    const samples = globalThis.__R5B_VARIANT_SAMPLES__;
    delete globalThis.__R5B_VARIANT_TIMER__;
    delete globalThis.__R5B_VARIANT_SAMPLES__;
    return { state, samples };
  });
  check(result.samples.length > 2 && result.samples.every((sample) => sample.liveContexts <= 1 && sample.instanceId === initialState.instanceId && sample.ready), 'concurrent variant samples retain one ready instance and <=1 live context');
  check(result.state.audio.maxLiveContextsObserved <= 1 && result.state.audio.liveContexts === 1 && result.state.audio.pendingTransitions === 0 && result.state.audio.variant === 'C', 'concurrent variant final exclusive C owner');
  check(result.state.audio.staleAssetCallbacksDropped >= 1 && JSON.stringify(result.state.audio.assets) === JSON.stringify(beforeRelease.audio.assets), 'concurrent variant drops late assets without audit-state pollution');
  check(result.state.audio.assets.filter((asset) => asset.ownerId === result.state.audio.activeEngineOwnerId && asset.assetId.startsWith('bombFamiliar')).length === 3, 'concurrent variant active owner audits all three stems');
  check(results[0] === false && results[2] === true && result.state.audio.events.at(-1)?.variant === 'C', 'concurrent variant stale A suppressed and C dispatched');
  activeOwners(result.state, 'concurrent variant final', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
  const terminal = await page.evaluate(async () => { const old = window.__R5B_TEST__; await old.dispose('variant-race'); return old.getState(); });
  terminalOwners(terminal, 'concurrent variant terminal');
  await page.close();
  return { initial: initialState, beforeRelease, results, samples: result.samples, state: result.state, terminal };
}

const browser = await chromium.launch({ headless: true });
const desktop = await open(browser);
const initial = await get(desktop);
check(initial.verdict === 'reject' && initial.playCount === 0 && initial.audio.liveContexts === 0, 'reject/no-autoplay');
activeOwners(initial, 'initial desktop', { liveContexts: 0, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
check(initial.domCellCount === 0, 'initial desktop has no DOM cell grid');
check(initial.fixture.normalOutcome === 'blast' && initial.fixture.chainOutcome === 'chain-clear' && JSON.stringify(initial.fixture.chainTriggerRows) === '[39]', 'real Core fixtures');
const desktopLayout = await layout(desktop);
check(!desktopLayout.overflow && desktopLayout.minTarget >= 44 && desktopLayout.canvas === 1, 'desktop layout/targets');

await desktop.locator('button[data-pair="A"]').click();
await desktop.waitForFunction(() => window.__R5B_TEST__.getState().pairSettledCount >= 1, undefined, { timeout: 10_000 });
const naturalPair = await get(desktop);
check(naturalPair.interactionLog[0]?.variant === 'A' && naturalPair.interactionLog[0]?.route === 'pointer', 'actual pointer click A route');
check(naturalPair.pairPhase === 'settled' && naturalPair.playCount === 2 && naturalPair.renderer.settledCount >= 2, 'full normal-to-chain 1x pair naturally settled');
activeOwners(naturalPair, 'natural pair settled', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
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
activeOwners(stopped, 'reusable stop', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
await desktop.evaluate(() => { void window.__R5B_TEST__.restart(); });
await desktop.waitForFunction(() => {
  const state = window.__R5B_TEST__.getState();
  return state.pairPhase === 'normal' && state.audio.liveContexts === 1 && state.audio.eventSources === 1 && state.pendingTimers === 1 && state.renderer.frameCallbacks === 1;
});
const restarted = await get(desktop);
check(restarted.pairPhase === 'normal', 'restart enters normal phase');
activeOwners(restarted, 'restarted', { liveContexts: 1, eventSources: 1, pendingTimers: 1, frameCallbacks: 1 });
await desktop.evaluate(() => window.__R5B_TEST__.disable());
const disabled = await get(desktop);
check(!disabled.enabled && !disabled.audio.enabled, 'disable remains disabled');
activeOwners(disabled, 'disabled reusable', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });
await desktop.evaluate(() => window.__R5B_TEST__.enable());
const enabled = await get(desktop);
check(enabled.enabled && enabled.audio.enabled, 're-enable remains enabled');
activeOwners(enabled, 're-enabled idle', { liveContexts: 1, eventSources: 0, pendingTimers: 0, frameCallbacks: 0 });

const mobile = await open(browser, { width: 390, height: 844 });
const mobileLayout = await layout(mobile);
await mobile.evaluate(() => window.__R5B_TEST__.playEvent('chain', 'A', false, true));
await mobile.screenshot({ path: join(root, 'r5b-mobile-chain-a.png'), fullPage: true });
check(!mobileLayout.overflow && mobileLayout.minTarget >= 44 && mobileLayout.canvas === 1, 'mobile layout/targets');
const mobileTerminal = await mobile.evaluate(async () => { const old = window.__R5B_TEST__; await old.dispose('mobile'); return old.getState(); });
terminalOwners(mobileTerminal, 'mobile destroy');
await mobile.close();

const reducedPage = await open(browser, { width: 1100, height: 900 }, 'reduce');
const reducedState = await reducedPage.evaluate(async () => { await window.__R5B_TEST__.playEvent('chain', 'A', true, true); return window.__R5B_TEST__.getState(); });
proveEvent(reducedState.audio.events.at(-1), reducedState.fixture, 'A', 'chain', true);
activeOwners(reducedState, 'reduced technical', { liveContexts: 1, eventSources: 1, pendingTimers: 0, frameCallbacks: 0 });
await reducedPage.screenshot({ path: join(root, 'r5b-reduced-technical-a.png'), fullPage: true });
await reducedPage.evaluate(() => window.__R5B_TEST__.dispose('reduced'));
await reducedPage.close();

const races = {};
for (const kind of ['stop', 'disable', 'pagehide', 'hmr']) races[kind] = await delayedRace(browser, kind);
const variantRace = await concurrentVariantRace(browser);
const desktopTerminal = await desktop.evaluate(async () => { const old = window.__R5B_TEST__; await old.dispose('desktop'); return old.getState(); });
terminalOwners(desktopTerminal, 'desktop destroy');
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
  desktopTerminal,
  races,
  variantRace,
  assetRequests: [...assetRequests],
  layout: { desktop: desktopLayout, mobile: mobileLayout },
  consoleErrors,
  pageErrors,
  requestErrors,
};
await writeFile(join(root, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ passed: report.passed, failures }));
if (!report.passed) process.exitCode = 1;
