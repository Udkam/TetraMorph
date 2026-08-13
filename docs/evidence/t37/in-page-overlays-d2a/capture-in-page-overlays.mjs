import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const ROOT = path.resolve('.');
const OUTPUT = path.resolve('docs/evidence/t37/in-page-overlays-d2a');
const HOST = '127.0.0.1';
const EXPECTED_SOURCE_SHA = '27d319428701708d892961de4cb5aa1fbbe522b2';
const INTRO_ROUTE = 'SLLLHTTTTTTTTTTTTCCCRRRRRHTTTTTTTTTTTTCHTTTCRRHTTTTTTTTTTTT';
const PRODUCT_PATHS = [
  'src/App.tsx',
  'src/App.test.ts',
  'src/ui/ActionSheet.tsx',
  'src/styles/in-page-transitions.css',
  'src/styles/in-page-transitions.test.ts',
  'src/styles/settings.css',
  'src/styles/settings.test.ts',
];

const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
if (sourceSha !== EXPECTED_SOURCE_SHA) {
  throw new Error(`Source binding changed: expected ${EXPECTED_SOURCE_SHA}, got ${sourceSha}.`);
}
execFileSync('git', ['diff', '--quiet', 'HEAD', '--', ...PRODUCT_PATHS], { cwd: ROOT });
fs.mkdirSync(OUTPUT, { recursive: true });

const failures = [];
const browserErrors = [];
const evidence = {};
const requireEvidence = (condition, message) => {
  if (!condition) failures.push(message);
};
const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

const addPreferences = async (context, { reduced = false, introduced = false } = {}) => {
  await context.addInitScript(({ reducedMotion, includeIntroductions }) => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:visual-theme:v1', 'mineral-mist');
    localStorage.setItem('tetramorph:reduced-motion:v1', reducedMotion ? 'on' : 'off');
    if (includeIntroductions) {
      localStorage.setItem(
        'tetramorph:mode-rule-intros:v2',
        JSON.stringify(['marathon', 'race', 'sprint', 'endgame']),
      );
    }
  }, { reducedMotion: reduced, includeIntroductions: introduced });
};

const observe = (page, label) => {
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`${label}: console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`${label}: pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith('data:')) {
      browserErrors.push(`${label}: requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
    }
  });
};

const snapshot = (page) => page.evaluate(() => {
  const route = document.querySelector('[data-testid="route-viewport"]');
  const backdrops = [...document.querySelectorAll('[data-testid="action-sheet-backdrop"]')];
  const active = document.activeElement;
  const qaState = globalThis.__TETRAMORPH_QA__?.getState() ?? null;
  const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
  const dialogRect = dialog?.getBoundingClientRect();
  return {
    path: location.pathname,
    routeViewportCount: document.querySelectorAll('[data-testid="route-viewport"]').length,
    routeSurfaceCount: document.querySelectorAll('.app-route-surface').length,
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-game-cell]').length,
    backdropCount: backdrops.length,
    activeDialogCount: document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length,
    modalOwnerCount: document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]').length,
    sheetOutsideRoute: backdrops.every((item) => !item.closest('[data-testid="route-viewport"]')),
    sheetPhases: backdrops.map((item) => ({
      phase: item.getAttribute('data-sheet-phase'),
      motion: item.getAttribute('data-sheet-motion'),
      inert: item.hasAttribute('inert'),
      ariaHidden: item.getAttribute('aria-hidden'),
    })),
    activeTestId: active?.getAttribute?.('data-testid') ?? null,
    activeTag: active?.tagName ?? null,
    status: qaState?.status ?? null,
    mode: qaState?.mode ?? null,
    countdown: document.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown') ?? null,
    pauseCurtain: document.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase') ?? null,
    restartCurtain: document.querySelector('[data-testid="restart-curtain"]')?.getAttribute('data-curtain-phase') ?? null,
    viewport: { width: innerWidth, height: innerHeight },
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    dialogRect: dialogRect ? {
      left: dialogRect.left,
      top: dialogRect.top,
      right: dialogRect.right,
      bottom: dialogRect.bottom,
      width: dialogRect.width,
      height: dialogRect.height,
    } : null,
    routeContainsBackdrop: backdrops.some((item) => route?.contains(item)),
  };
});

const armMotion = (page, requirements) => page.evaluate((expected) => {
  const domSnapshot = () => {
    const backdrops = [...document.querySelectorAll('[data-testid="action-sheet-backdrop"]')];
    const qaState = globalThis.__TETRAMORPH_QA__?.getState() ?? null;
    return {
      path: location.pathname,
      canvasCount: document.querySelectorAll('canvas').length,
      domCellCount: document.querySelectorAll('[data-game-cell]').length,
      activeDialogCount: document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length,
      modalOwnerCount: document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]').length,
      backdropCount: backdrops.length,
      sheetOutsideRoute: backdrops.every((item) => !item.closest('[data-testid="route-viewport"]')),
      sheetPhases: backdrops.map((item) => ({
        phase: item.getAttribute('data-sheet-phase'),
        motion: item.getAttribute('data-sheet-motion'),
        inert: item.hasAttribute('inert'),
        ariaHidden: item.getAttribute('aria-hidden'),
      })),
      status: qaState?.status ?? null,
      countdown: document.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown') ?? null,
      pauseCurtain: document.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase') ?? null,
      restartCurtain: document.querySelector('[data-testid="restart-curtain"]')?.getAttribute('data-curtain-phase') ?? null,
    };
  };
  const slot = { expected, record: null };
  globalThis.__T37_D2A_MOTION__ = slot;
  const poll = () => {
    if (globalThis.__T37_D2A_MOTION__ !== slot || slot.record) return;
    const animations = document.getAnimations().map((animation) => {
      const effect = animation.effect;
      const target = effect?.target;
      const timing = effect?.getComputedTiming?.();
      return {
        name: animation.animationName ?? '',
        duration: typeof timing?.duration === 'number' ? timing.duration : null,
        targetTestId: target instanceof Element ? target.getAttribute('data-testid') : null,
        targetClass: target instanceof Element ? target.getAttribute('class') : null,
        targetMatches: (selector) => target instanceof Element && target.matches(selector),
        keyframes: effect?.getKeyframes?.().map((frame) => ({
          offset: frame.offset,
          opacity: frame.opacity ?? null,
          transform: frame.transform ?? null,
        })) ?? [],
      };
    });
    const satisfied = expected.every((requirement) => (
      animations.filter((animation) => (
        animation.name === requirement.name
          && (!requirement.selector || animation.targetMatches(requirement.selector))
      )).length >= (requirement.count ?? 1)
    ));
    if (satisfied) {
      slot.record = {
        capturedAtMs: performance.now(),
        animations: animations.map(({ targetMatches, ...animation }) => animation),
        dom: domSnapshot(),
      };
      return;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}, requirements);

const readMotion = async (page, label) => {
  await page.waitForFunction(
    () => globalThis.__T37_D2A_MOTION__?.record !== null,
    null,
    { timeout: 2_000, polling: 8 },
  );
  const record = await page.evaluate(() => structuredClone(globalThis.__T37_D2A_MOTION__.record));
  record.label = label;
  return record;
};

const motionByName = (record, name, selectorHint = null) => record.animations.filter((animation) => (
  animation.name === name && (!selectorHint || `${animation.targetClass ?? ''} ${animation.targetTestId ?? ''}`.includes(selectorHint))
));

const assertMotion = (record, name, { duration, maxDuration, count = 1, opacityOnly = false, selectorHint = null } = {}) => {
  const matches = motionByName(record, name, selectorHint);
  requireEvidence(matches.length >= count, `${record.label}: expected ${count} ${name} animations, got ${matches.length}.`);
  for (const animation of matches) {
    if (duration !== undefined) requireEvidence(animation.duration === duration, `${record.label}: ${name} duration ${animation.duration}, expected ${duration}.`);
    if (maxDuration !== undefined) requireEvidence(animation.duration > 0 && animation.duration <= maxDuration, `${record.label}: ${name} exceeded ${maxDuration} ms.`);
    if (opacityOnly) {
      requireEvidence(animation.keyframes.every((frame) => frame.transform === null || frame.transform === 'none'), `${record.label}: reduced ${name} translated.`);
    }
  }
};

const topology = (name, state, expectedCanvas) => {
  requireEvidence(state.routeViewportCount === 1, `${name}: route viewport count ${state.routeViewportCount}.`);
  requireEvidence(state.routeSurfaceCount === 1, `${name}: route surface count ${state.routeSurfaceCount}.`);
  requireEvidence(state.canvasCount === expectedCanvas, `${name}: Canvas count ${state.canvasCount}, expected ${expectedCanvas}.`);
  requireEvidence(state.domCellCount === 0, `${name}: DOM board cells appeared.`);
  requireEvidence(state.modalOwnerCount <= 1, `${name}: ${state.modalOwnerCount} modal owners.`);
};

const waitForRouteIdle = (page) => page.waitForFunction(
  () => document.querySelector('.app')?.getAttribute('data-route-transition') === 'idle',
  null,
  { timeout: 4_000, polling: 8 },
);
const waitForNoSheet = (page) => page.waitForFunction(
  () => document.querySelectorAll('[data-testid="action-sheet-backdrop"]').length === 0,
  null,
  { timeout: 2_000, polling: 8 },
);
const waitForSheetSteady = (page) => page.waitForFunction(
  () => document.querySelector('[data-testid="action-sheet-backdrop"]')?.getAttribute('data-sheet-phase') === 'steady',
  null,
  { timeout: 2_000, polling: 8 },
);
const waitForPlaying = (page) => page.waitForFunction(
  () => globalThis.__TETRAMORPH_QA__?.getState().status === 'playing',
  null,
  { timeout: 5_000, polling: 8 },
);
const screenshot = (page, name) => page.screenshot({ path: path.join(OUTPUT, name), fullPage: true, animations: 'allow' });

const replayIntroRoute = (page) => page.evaluate((route) => {
  const qa = globalThis.__TETRAMORPH_QA__;
  if (!qa) throw new Error('Missing DEV QA surface for legal Endgame replay.');
  const actions = {
    L: 'left',
    R: 'right',
    C: 'rotate-cw',
    Q: 'rotate-ccw',
    D: 'soft-drop',
    H: 'hard-drop',
  };
  for (const token of route) {
    if (token === 'S') continue;
    if (token === 'T') qa.advanceTicks(1);
    else qa.action(actions[token]);
  }
  return qa.getState();
}, INTRO_ROUTE);

const textPayload = (file) => fs.readFileSync(path.join(OUTPUT, file)).toString('utf8').replace(/\r\n?/gu, '\n');
const manifestPayload = (file) => /\.(?:json|md|mjs)$/u.test(file)
  ? Buffer.from(textPayload(file), 'utf8')
  : fs.readFileSync(path.join(OUTPUT, file));
const writeManifest = (capturedAt) => {
  const files = [
    'README.md',
    'capture-in-page-overlays.mjs',
    'audit.json',
    ...fs.readdirSync(OUTPUT).filter((file) => file.endsWith('.png')).sort(),
  ];
  const manifest = {
    sourceSha,
    capturedAt,
    algorithm: 'sha256',
    textNormalization: 'UTF-8 with CRLF and CR normalized to LF for text files',
    files: Object.fromEntries(files.map((file) => [
      file,
      createHash('sha256').update(manifestPayload(file)).digest('hex'),
    ])),
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

let server;
let browser;
let origin;
try {
  server = await createViteServer({
    root: ROOT,
    appType: 'spa',
    logLevel: 'error',
    server: { host: HOST, port: 0, strictPort: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  must(address && typeof address === 'object', 'Vite did not expose a dynamic port.');
  origin = `http://${HOST}:${address.port}`;
  browser = await chromium.launch({ headless: true });

  const fullContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await addPreferences(fullContext);
  const page = await fullContext.newPage();
  observe(page, 'desktop-full');
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await armMotion(page, [{ name: 'd2a-backdrop-in' }, { name: 'd2a-sheet-in' }]);
  await page.getByTestId('enter-marathon').click();
  const introEnter = await readMotion(page, 'first-entry-enter');
  await waitForSheetSteady(page);
  const introSteady = await snapshot(page);
  topology('first-entry-steady', introSteady, 0);
  requireEvidence(introSteady.activeDialogCount === 1, 'first-entry: no unique dialog.');
  requireEvidence(introSteady.sheetOutsideRoute && !introSteady.routeContainsBackdrop, 'first-entry: sheet is not parallel to the route viewport.');
  assertMotion(introEnter, 'd2a-backdrop-in', { duration: 120 });
  assertMotion(introEnter, 'd2a-sheet-in', { duration: 180 });
  await screenshot(page, '01-first-entry-steady.png');

  await armMotion(page, [{ name: 'd2a-backdrop-out' }, { name: 'd2a-sheet-out' }]);
  await page.getByRole('dialog').getByRole('button', { name: '返回', exact: true }).click();
  const introCancel = await readMotion(page, 'first-entry-cancel');
  assertMotion(introCancel, 'd2a-backdrop-out', { duration: 120 });
  assertMotion(introCancel, 'd2a-sheet-out', { duration: 120 });
  requireEvidence(introCancel.dom.activeDialogCount === 0, 'first-entry cancel: retiring shell kept dialog semantics.');
  requireEvidence(introCancel.dom.sheetPhases.every((item) => item.inert && item.ariaHidden === 'true'), 'first-entry cancel: retiring shell was interactive.');
  await waitForNoSheet(page);

  await page.getByTestId('enter-marathon').click();
  await waitForSheetSteady(page);
  await armMotion(page, [{ name: 'd2a-backdrop-out' }, { name: 'd2a-sheet-out' }]);
  await page.getByRole('dialog').getByRole('button', { name: '好的', exact: true }).click();
  const introCommit = await readMotion(page, 'first-entry-route-commit');
  await page.getByTestId('game-screen').waitFor();
  await page.waitForSelector('[data-testid="canvas-host"] canvas');
  requireEvidence(introCommit.dom.sheetOutsideRoute, 'first-entry commit: retiring shell entered the route viewport.');
  requireEvidence(introCommit.dom.activeDialogCount === 0, 'first-entry commit: retiring shell kept dialog semantics.');
  requireEvidence(introCommit.dom.modalOwnerCount === 0, 'first-entry commit: stale modal ownership remained.');
  await waitForRouteIdle(page);
  await waitForNoSheet(page);
  await waitForPlaying(page);
  await page.evaluate(() => globalThis.__TETRAMORPH_QA__?.setFrozen(true));
  await screenshot(page, '02-game-after-first-entry.png');

  await armMotion(page, [{ name: 'd2a-backdrop-in' }, { name: 'd2a-sheet-in' }]);
  await page.getByTestId('open-settings').click();
  const settingsEnter = await readMotion(page, 'settings-enter');
  await waitForSheetSteady(page);
  const settingsInitial = await snapshot(page);
  topology('settings-initial', settingsInitial, 1);
  requireEvidence(settingsInitial.activeDialogCount === 1, 'settings: missing unique dialog.');
  requireEvidence(await page.locator('.settings-console__panel').getAttribute('data-settings-tab-epoch') === null, 'settings: first panel replayed a child animation.');
  requireEvidence(!settingsEnter.animations.some((item) => item.name === 'd2a-settings-panel-in'), 'settings: first panel animated on open.');
  assertMotion(settingsEnter, 'd2a-backdrop-in', { duration: 120 });
  assertMotion(settingsEnter, 'd2a-sheet-in', { duration: 180 });
  await screenshot(page, '03-settings-initial.png');

  await armMotion(page, [{ name: 'd2a-settings-panel-in', selector: '.settings-console__panel' }]);
  await page.getByTestId('settings-tab-controls').click();
  const controlsSwap = await readMotion(page, 'settings-controls-swap');
  assertMotion(controlsSwap, 'd2a-settings-panel-in', { duration: 150, selectorHint: 'settings-console__panel' });
  requireEvidence(await page.locator('.settings-console__panel').getAttribute('data-settings-tab-epoch') === '1', 'settings: Controls did not create epoch 1.');
  requireEvidence(await page.locator('.settings-console__panel').getAttribute('data-settings-tab-motion') === 'full', 'settings: Controls did not freeze full motion.');

  await armMotion(page, [{ name: 'd2a-settings-panel-in', selector: '.settings-console__panel' }]);
  await page.getByTestId('settings-tab-rules').click();
  const rulesSwap = await readMotion(page, 'settings-rules-swap');
  assertMotion(rulesSwap, 'd2a-settings-panel-in', { duration: 150, selectorHint: 'settings-console__panel' });
  requireEvidence(await page.locator('.settings-console__panel').getAttribute('data-settings-tab-epoch') === '2', 'settings: Rules did not create epoch 2.');
  await screenshot(page, '04-settings-rules.png');

  await armMotion(page, [{ name: 'd2a-settings-panel-in', selector: '.settings-console__panel' }]);
  await page.getByTestId('settings-tab-settings').click();
  const settingsReturn = await readMotion(page, 'settings-return-swap');
  assertMotion(settingsReturn, 'd2a-settings-panel-in', { duration: 150, selectorHint: 'settings-console__panel' });
  requireEvidence(await page.locator('.settings-console__panel').getAttribute('data-settings-tab-epoch') === '3', 'settings: returning to Settings did not create epoch 3.');

  await armMotion(page, [{ name: 'd2a-backdrop-out' }, { name: 'd2a-sheet-out' }]);
  await page.getByTestId('settings-sheet').getByRole('button', { name: '继续游戏', exact: true }).click();
  const settingsExit = await readMotion(page, 'settings-exit');
  requireEvidence(settingsExit.dom.activeDialogCount === 0, 'settings exit: retiring shell kept dialog semantics.');
  requireEvidence(settingsExit.dom.sheetPhases.every((item) => item.inert), 'settings exit: retiring shell was not inert.');
  await waitForNoSheet(page);
  await waitForPlaying(page);

  await armMotion(page, [{ name: 'd2a-curtain-in', selector: '[data-testid="pause-curtain"]' }]);
  await page.keyboard.press('p');
  const pauseEnter = await readMotion(page, 'pause-enter');
  assertMotion(pauseEnter, 'd2a-curtain-in', { duration: 180, selectorHint: 'pause-curtain' });
  await page.waitForFunction(() => document.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase') === 'steady');
  let current = await snapshot(page);
  topology('pause-steady', current, 1);
  requireEvidence(current.status === 'paused', `pause: state is ${current.status}.`);
  await screenshot(page, '05-pause-steady.png');

  await armMotion(page, [{ name: 'd2a-backdrop-in' }, { name: 'd2a-sheet-in' }]);
  await page.getByTestId('open-settings').click();
  const pauseToSettings = await readMotion(page, 'pause-to-settings');
  await waitForSheetSteady(page);
  current = await snapshot(page);
  topology('pause-to-settings', current, 1);
  requireEvidence(current.pauseCurtain === null, 'pause-to-settings: pause curtain was not replaced.');
  requireEvidence(current.status === 'paused', 'pause-to-settings: paused Core state was lost before close.');
  requireEvidence(pauseToSettings.dom.modalOwnerCount <= 1, 'pause-to-settings: more than one modal owner.');
  await screenshot(page, '06-settings-from-pause.png');
  await page.getByTestId('settings-sheet').getByRole('button', { name: '继续游戏', exact: true }).click();
  await waitForNoSheet(page);
  await waitForPlaying(page);
  requireEvidence(await page.getByTestId('pause-curtain').count() === 0, 'settings close returned to a stale pause curtain.');

  await page.keyboard.press('p');
  await page.waitForFunction(() => document.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase') === 'steady');
  await armMotion(page, [{ name: 'd2a-curtain-out', selector: '[data-testid="pause-curtain"]' }]);
  await page.keyboard.press('Enter');
  const pauseExit = await readMotion(page, 'pause-exit');
  assertMotion(pauseExit, 'd2a-curtain-out', { duration: 120, selectorHint: 'pause-curtain' });
  requireEvidence(pauseExit.dom.pauseCurtain === 'exit', 'pause exit: no frozen exit phase.');
  await page.waitForFunction(() => !document.querySelector('[data-testid="pause-curtain"]'));
  await waitForPlaying(page);

  await armMotion(page, [{ name: 'd2a-curtain-in', selector: '[data-testid="restart-curtain"]' }]);
  await page.keyboard.press('r');
  const restartEnter = await readMotion(page, 'restart-enter');
  assertMotion(restartEnter, 'd2a-curtain-in', { duration: 180, selectorHint: 'restart-curtain' });
  await page.waitForFunction(() => document.querySelector('[data-testid="restart-curtain"]')?.getAttribute('data-curtain-phase') === 'steady');
  current = await snapshot(page);
  topology('restart-steady', current, 1);
  requireEvidence(current.status === 'paused' && current.modalOwnerCount === 1, 'restart: paused modal ownership is incorrect.');
  await screenshot(page, '07-restart-steady.png');
  await armMotion(page, [{ name: 'd2a-curtain-out', selector: '[data-testid="restart-curtain"]' }]);
  await page.keyboard.press('r');
  const restartCancel = await readMotion(page, 'restart-cancel');
  assertMotion(restartCancel, 'd2a-curtain-out', { duration: 120, selectorHint: 'restart-curtain' });
  requireEvidence(restartCancel.dom.restartCurtain === 'exit', 'restart cancel: no frozen exit phase.');
  await page.waitForFunction(() => !document.querySelector('[data-testid="restart-curtain"]'));
  await waitForPlaying(page);

  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('[data-testid="restart-curtain"]')?.getAttribute('data-curtain-phase') === 'steady');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-testid="entry-countdown"]')?.getAttribute('data-countdown') === '3');
  const restartCommit = await snapshot(page);
  topology('restart-countdown', restartCommit, 1);
  requireEvidence(restartCommit.restartCurtain === null && restartCommit.countdown === '3', 'restart confirm did not replace the curtain with countdown 3.');
  await screenshot(page, '08-restart-countdown-3.png');
  await waitForPlaying(page);
  await page.evaluate(() => globalThis.__TETRAMORPH_QA__?.setFrozen(true));

  await page.getByTestId('exit-game').click();
  await waitForSheetSteady(page);
  current = await snapshot(page);
  topology('leave-confirm', current, 1);
  requireEvidence(current.activeDialogCount === 1, 'leave: missing confirmation dialog.');
  await screenshot(page, '09-leave-confirm.png');
  await armMotion(page, [{ name: 'd2a-backdrop-out' }, { name: 'd2a-sheet-out' }]);
  await page.getByRole('dialog').getByRole('button', { name: '留在本局', exact: true }).click();
  const leaveCancel = await readMotion(page, 'leave-cancel');
  requireEvidence(leaveCancel.dom.activeDialogCount === 0, 'leave cancel: retiring shell kept dialog semantics.');
  await waitForNoSheet(page);
  await waitForPlaying(page);

  await page.getByTestId('exit-game').click();
  await waitForSheetSteady(page);
  const leaveCommitBefore = await snapshot(page);
  await page.getByRole('dialog').getByRole('button', { name: '返回首页', exact: true }).click();
  await page.getByTestId('mode-home').waitFor();
  await waitForRouteIdle(page);
  await waitForNoSheet(page);
  current = await snapshot(page);
  topology('leave-home', current, 0);
  const leaveCommit = current;
  requireEvidence(leaveCommitBefore.activeDialogCount === 1 && leaveCommit.activeDialogCount === 0, 'leave commit: route-owned dialog did not retire immediately.');
  await screenshot(page, '10-leave-home.png');
  evidence.desktop = {
    introEnter, introSteady, introCancel, introCommit,
    settingsEnter, settingsInitial, controlsSwap, rulesSwap, settingsReturn, settingsExit,
    pauseEnter, pauseToSettings, pauseExit,
    restartEnter, restartCancel, restartCommit,
    leaveCancel, leaveCommit, home: current,
  };
  await fullContext.close();

  const resultContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await addPreferences(resultContext, { introduced: true });
  const resultPage = await resultContext.newPage();
  observe(resultPage, 'terminal-result');
  await resultPage.goto(`${origin}/play/endgame/t3r-shaft-01`, { waitUntil: 'networkidle' });
  await resultPage.waitForSelector('[data-testid="canvas-host"] canvas');
  await waitForPlaying(resultPage);
  await resultPage.evaluate(() => globalThis.__TETRAMORPH_QA__?.setFrozen(true));
  await armMotion(resultPage, [{ name: 'd2a-backdrop-in' }, { name: 'd2a-sheet-in' }]);
  const firstFinish = await replayIntroRoute(resultPage);
  must(firstFinish.status === 'finished' && firstFinish.endgameCompletion === 'finished', 'Legal Intro-01 witness did not finish.');
  const resultEnter = await readMotion(resultPage, 'result-enter');
  await waitForSheetSteady(resultPage);
  current = await snapshot(resultPage);
  const resultSteady = current;
  topology('result-steady', resultSteady, 1);
  requireEvidence(resultSteady.activeDialogCount === 1 && resultSteady.status === 'finished', 'result: terminal dialog/state mismatch.');
  await screenshot(resultPage, '11-real-result-steady.png');

  await armMotion(resultPage, [{ name: 'd2a-backdrop-out' }, { name: 'd2a-sheet-out' }]);
  await resultPage.getByRole('dialog').getByRole('button', { name: '重来', exact: true }).click();
  const replayExit = await readMotion(resultPage, 'result-replay');
  await waitForNoSheet(resultPage);
  await waitForPlaying(resultPage);
  requireEvidence(replayExit.dom.activeDialogCount === 0, 'result replay: retiring dialog semantics remained.');
  requireEvidence((await snapshot(resultPage)).canvasCount === 1, 'result replay: Canvas was replaced or lost.');

  await resultPage.evaluate(() => globalThis.__TETRAMORPH_QA__?.setFrozen(true));
  const secondFinish = await replayIntroRoute(resultPage);
  must(secondFinish.status === 'finished', 'Second legal Intro-01 witness did not finish.');
  await waitForSheetSteady(resultPage);
  const resultLeaveBefore = await snapshot(resultPage);
  await resultPage.getByRole('dialog').getByRole('button', { name: '返回关卡库', exact: true }).click();
  await resultPage.getByTestId('endgame-library').waitFor();
  await waitForRouteIdle(resultPage);
  await waitForNoSheet(resultPage);
  current = await snapshot(resultPage);
  topology('result-library', current, 0);
  const resultLeave = current;
  requireEvidence(resultLeaveBefore.activeDialogCount === 1 && resultLeave.activeDialogCount === 0, 'result leave: route-owned dialog did not retire immediately.');
  await screenshot(resultPage, '12-result-leave-library.png');
  evidence.result = { firstFinish, resultEnter, steady: resultSteady, replayExit, secondFinish, resultLeave, library: current };
  await resultContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await addPreferences(reducedContext, { reduced: true, introduced: true });
  const reducedPage = await reducedContext.newPage();
  observe(reducedPage, 'mobile-reduced');
  await reducedPage.goto(`${origin}/play/endgame/t3r-shaft-01`, { waitUntil: 'networkidle' });
  await reducedPage.waitForSelector('[data-testid="canvas-host"] canvas');
  await waitForPlaying(reducedPage);
  await reducedPage.evaluate(() => globalThis.__TETRAMORPH_QA__?.setFrozen(true));

  await armMotion(reducedPage, [
    { name: 'd2a-opacity-in', selector: '[data-testid="action-sheet-backdrop"]' },
    { name: 'd2a-opacity-in', selector: '.action-sheet' },
  ]);
  await reducedPage.getByTestId('open-settings').click();
  const reducedSettings = await readMotion(reducedPage, 'reduced-settings-enter');
  await waitForSheetSteady(reducedPage);
  assertMotion(reducedSettings, 'd2a-opacity-in', { maxDuration: 32, count: 2, opacityOnly: true });
  current = await snapshot(reducedPage);
  topology('reduced-settings', current, 1);
  requireEvidence(current.document.width <= current.viewport.width, 'reduced settings: horizontal overflow.');
  requireEvidence(current.dialogRect && current.dialogRect.left >= 0 && current.dialogRect.right <= current.viewport.width, 'reduced settings: dialog escaped viewport.');
  await screenshot(reducedPage, '13-mobile-reduced-settings.png');

  await armMotion(reducedPage, [{ name: 'd2a-opacity-in', selector: '.settings-console__panel' }]);
  await reducedPage.getByTestId('settings-tab-controls').click();
  const reducedTab = await readMotion(reducedPage, 'reduced-settings-tab');
  assertMotion(reducedTab, 'd2a-opacity-in', { maxDuration: 32, opacityOnly: true, selectorHint: 'settings-console__panel' });
  requireEvidence(await reducedPage.locator('.settings-console__panel').getAttribute('data-settings-tab-motion') === 'reduced', 'reduced tab: epoch did not freeze reduced motion.');

  await armMotion(reducedPage, [
    { name: 'd2a-opacity-out', selector: '[data-testid="action-sheet-backdrop"]' },
    { name: 'd2a-opacity-out', selector: '.action-sheet' },
  ]);
  await reducedPage.keyboard.press('Escape');
  const reducedSettingsExit = await readMotion(reducedPage, 'reduced-settings-exit');
  assertMotion(reducedSettingsExit, 'd2a-opacity-out', { maxDuration: 32, count: 2, opacityOnly: true });
  await waitForNoSheet(reducedPage);
  await waitForPlaying(reducedPage);

  await armMotion(reducedPage, [{ name: 'd2a-opacity-in', selector: '[data-testid="pause-curtain"]' }]);
  await reducedPage.keyboard.press('p');
  const reducedPause = await readMotion(reducedPage, 'reduced-pause-enter');
  assertMotion(reducedPause, 'd2a-opacity-in', { maxDuration: 32, opacityOnly: true, selectorHint: 'pause-curtain' });
  await reducedPage.waitForFunction(() => document.querySelector('[data-testid="pause-curtain"]')?.getAttribute('data-curtain-phase') === 'steady');
  current = await snapshot(reducedPage);
  topology('reduced-pause', current, 1);
  requireEvidence(current.status === 'paused', 'reduced pause: state did not pause.');
  await screenshot(reducedPage, '14-mobile-reduced-pause.png');

  await armMotion(reducedPage, [{ name: 'd2a-opacity-out', selector: '[data-testid="pause-curtain"]' }]);
  await reducedPage.keyboard.press('Enter');
  const reducedPauseExit = await readMotion(reducedPage, 'reduced-pause-exit');
  assertMotion(reducedPauseExit, 'd2a-opacity-out', { maxDuration: 32, opacityOnly: true, selectorHint: 'pause-curtain' });
  await reducedPage.waitForFunction(() => !document.querySelector('[data-testid="pause-curtain"]'));
  await waitForPlaying(reducedPage);
  current = await snapshot(reducedPage);
  topology('reduced-final', current, 1);
  requireEvidence(current.document.width <= current.viewport.width, 'reduced final: horizontal overflow.');
  evidence.reduced = { reducedSettings, reducedTab, reducedSettingsExit, reducedPause, reducedPauseExit, final: current };
  await reducedContext.close();

  failures.push(...browserErrors);
  const capturedAt = new Date().toISOString();
  const audit = {
    sourceSha,
    capturedAt,
    origin,
    browser: await browser.version(),
    legalResultWitness: {
      levelId: 't3r-shaft-01',
      route: INTRO_ROUTE,
      sourceArtifact: 'docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-01-03.json',
      stateReplacementHookUsed: false,
    },
    evidence,
    browserErrors,
    failures,
    passed: failures.length === 0,
  };
  fs.writeFileSync(path.join(OUTPUT, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(failures.join('\n'));
  writeManifest(capturedAt);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.close().catch(() => {});
}
