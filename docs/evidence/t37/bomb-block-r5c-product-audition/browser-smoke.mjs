import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] ?? 'http://127.0.0.1:4193/docs/evidence/t37/bomb-block-r5c-product-audition/';
const outputDirectory = process.env.T37_R5C_SMOKE_OUTPUT ?? join(process.env.TEMP ?? process.cwd(), 't37-r5c-product-audition-smoke');
const failures = [];
const consoleErrors = [];
const pageErrors = [];
const requestErrors = [];
const requests = [];

function check(value, label) {
  if (!value) failures.push(label);
}

function observe(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on('response', (response) => {
    requests.push(response.url());
    if (response.status() >= 400) requestErrors.push(`${label}: ${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => requestErrors.push(`${label}: ${request.url()}`));
}

async function open(browser, viewport, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport, reducedMotion });
  observe(page, `${viewport.width}x${viewport.height}`);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__R5C_READY__ === true);
  return page;
}

async function state(page) {
  return page.evaluate(() => window.__R5C_TEST__.getState());
}

async function layout(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    canvas: document.querySelectorAll('canvas').length,
    minTarget: Math.min(...[...document.querySelectorAll('button')].map((node) => node.getBoundingClientRect().height)),
    status: document.querySelector('#status')?.textContent,
  }));
}

function proveOwners(snapshot, label, expectedLiveContexts) {
  check(snapshot.ready && !snapshot.disposed && !snapshot.disposing && !snapshot.domRetired && snapshot.qaGlobals,
    `${label}: active page ownership`);
  check(snapshot.canvasCount === 1 && snapshot.renderer.canvasCount === 1 && snapshot.renderer.rendererOwners === 1,
    `${label}: one Canvas/Renderer`);
  check(snapshot.renderer.tickerOwners === 1 && snapshot.renderer.tickerStarted && snapshot.renderer.tickerApplicationBound
    && snapshot.renderer.tickerListenerCount === snapshot.renderer.initialTickerListenerCount,
  `${label}: one real Pixi ticker`);
  check(snapshot.audio.liveContexts === expectedLiveContexts && snapshot.audio.contextsCreated <= 1,
    `${label}: bounded AudioContext count`);
}

function proveEvent(event, fixture, scene, reducedMotion) {
  const beats = scene === 'normal'
    ? [fixture.normalImpactMs]
    : reducedMotion ? fixture.reducedBeatStartsMs : fixture.fullBeatStartsMs;
  const expectedFrames = scene === 'normal' ? 16_896 : reducedMotion ? 24_960 : 67_968;
  check(event.scene === scene && event.reducedMotion === reducedMotion,
    `event identity ${scene}/${reducedMotion}`);
  check(JSON.stringify(event.beatStartsMs) === JSON.stringify(beats),
    `causal beats ${scene}/${reducedMotion}`);
  check(event.expectedFrames === expectedFrames, `event expected frame count ${scene}/${reducedMotion}`);
  check(event.firstNonZeroFrame >= beats[0] * 48 && event.preBeatMaxAbs === 0,
    `silent lead-in ${scene}/${reducedMotion}`);
  check(event.finite && event.maxAbs <= .18 && event.exactWithinTolerance
    && event.residualMaxAbs <= 1e-7 && event.expectedFloat32Sha256 === event.observedFloat32Sha256,
  `finite exact capped compositor ${scene}/${reducedMotion}`);
  check(event.sourceStarted && event.sourceConnections === 1 && event.sourceStartAt !== null,
    `one scheduled source ${scene}/${reducedMotion}`);
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const desktop = await open(browser, { width: 1440, height: 1000 });
const initial = await state(desktop);
const initialLayout = await layout(desktop);
check(initial.audio.liveContexts === 0 && initial.audio.events.length === 0 && initial.playCount === 0,
  'no autoplay or initial audio owner');
check(initial.domCellCount === 0 && initial.fixture.normalOutcome === 'blast'
  && initial.fixture.chainOutcome === 'chain-clear' && JSON.stringify(initial.fixture.chainTriggerRows) === '[39]',
'real normal and row-39 Core fixtures');
check(!initialLayout.overflow && initialLayout.canvas === 1 && initialLayout.minTarget >= 44,
  'desktop layout and 44px targets');
proveOwners(initial, 'initial desktop', 0);

await desktop.locator('#normal').click();
await desktop.waitForFunction(() => window.__R5C_TEST__.getState().audio.events.length === 1);
const normal = await state(desktop);
proveOwners(normal, 'normal', 1);
proveEvent(normal.audio.events.at(-1), normal.fixture, 'normal', false);
check(normal.audio.assets.length === 3 && new Set(normal.audio.assets.map((asset) => asset.id)).size === 3,
  'only active catalog assets prime once');
check(normal.audio.assets.every((asset) => asset.sameOrigin && asset.exactHash),
  'active catalog asset provenance');
await desktop.screenshot({ path: join(outputDirectory, 'r5c-desktop-normal.png'), fullPage: true });

await desktop.locator('#chain').click();
await desktop.waitForFunction(() => window.__R5C_TEST__.getState().audio.events.length === 2);
const chain = await state(desktop);
proveOwners(chain, 'full chain', 1);
proveEvent(chain.audio.events.at(-1), chain.fixture, 'chain', false);
await desktop.screenshot({ path: join(outputDirectory, 'r5c-desktop-chain.png'), fullPage: true });

await desktop.locator('#reduced').click();
await desktop.waitForFunction(() => window.__R5C_TEST__.getState().audio.events.length === 3);
const reduced = await state(desktop);
proveOwners(reduced, 'reduced chain', 1);
proveEvent(reduced.audio.events.at(-1), reduced.fixture, 'chain', true);

await desktop.locator('#stop').click();
await desktop.waitForFunction(() => window.__R5C_TEST__.getState().audio.activeEventSources === 0);
const stopped = await state(desktop);
proveOwners(stopped, 'stopped', 1);
check(stopped.pendingTimers === 0 && stopped.renderer.frameCallbacks === 0,
  'stop clears timers and animation callbacks');

await desktop.locator('#disable').click();
const disabled = await state(desktop);
check(!disabled.enabled && !disabled.audio.enabled && disabled.audio.activeEventSources === 0,
  'disable clears event source without destroying reusable owner');
await desktop.locator('#disable').click();
const reenabled = await state(desktop);
proveOwners(reenabled, 're-enabled', 1);

const hmr = await desktop.evaluate(async (token) => {
  const old = window.__R5C_TEST__;
  await import(`./audition.ts?smoke-hmr=${token}`);
  while (window.__R5C_READY__ !== true) await new Promise((resolve) => setTimeout(resolve, 10));
  return { old: old.getState(), fresh: window.__R5C_TEST__.getState() };
}, Date.now());
check(hmr.old.disposed && hmr.old.domRetired && hmr.old.canvasCount === 0 && hmr.old.audio.liveContexts === 0,
  'HMR fully retires old audio/canvas owner');
proveOwners(hmr.fresh, 'HMR fresh', 0);

const mobile = await open(browser, { width: 390, height: 844 });
const mobileLayout = await layout(mobile);
check(!mobileLayout.overflow && mobileLayout.canvas === 1 && mobileLayout.minTarget >= 44,
  'mobile layout and 44px targets');
await mobile.locator('#sequence').click();
await mobile.waitForFunction(() => window.__R5C_TEST__.getState().audio.events.length >= 1);
await mobile.screenshot({ path: join(outputDirectory, 'r5c-mobile-normal.png'), fullPage: true });
const mobileActive = await state(mobile);
proveOwners(mobileActive, 'mobile active', 1);

const pagehide = await open(browser, { width: 900, height: 760 });
const terminal = await pagehide.evaluate(async () => {
  const old = window.__R5C_TEST__;
  window.dispatchEvent(new PageTransitionEvent('pagehide'));
  while (!old.getState().disposed) await new Promise((resolve) => setTimeout(resolve, 10));
  return old.getState();
});
check(terminal.disposed && terminal.domRetired && terminal.canvasCount === 0
  && terminal.audio.liveContexts === 0 && terminal.listenerCount === 0,
'pagehide terminal cleanup');

await desktop.evaluate(() => window.__R5C_TEST__.dispose('smoke-finish'));
await mobile.evaluate(() => window.__R5C_TEST__.dispose('smoke-finish'));
await desktop.close();
await mobile.close();
await pagehide.close();
await browser.close();

const report = {
  url,
  outputDirectory,
  initial,
  normal,
  chain,
  reduced,
  stopped,
  disabled,
  reenabled,
  hmr,
  mobileActive,
  requests: [...new Set(requests)],
  consoleErrors,
  pageErrors,
  requestErrors,
  failures,
  passed: failures.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0 && requestErrors.length === 0,
};
await writeFile(join(outputDirectory, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
if (!report.passed) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ passed: true, outputDirectory, events: [normal, chain, reduced].map((snapshot) => snapshot.audio.events.at(-1)) }, null, 2));
}
