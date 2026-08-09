import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const output = path.resolve('docs/evidence/t37/route-handoff-d1');
const origin = process.env.T37_ROUTE_ORIGIN ?? 'http://127.0.0.1:4192';
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();

fs.mkdirSync(output, { recursive: true });

const failures = [];
const browserErrors = [];
const evidence = {};

const requireEvidence = (condition, message) => {
  if (!condition) failures.push(message);
};

const addKnownPreferences = async (context, { reducedMotion = false } = {}) => {
  await context.addInitScript(({ reduced }) => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:visual-theme:v1', 'mineral-mist');
    localStorage.setItem('tetramorph:reduced-motion:v1', reduced ? 'on' : 'off');
    localStorage.setItem(
      'tetramorph:mode-rule-intros:v1',
      JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']),
    );
  }, { reduced: reducedMotion });
};

const observePage = (page, label) => {
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`${label}: console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`${label}: pageerror: ${error.message}`));
};

const routeSnapshot = (page) => page.evaluate((collectAnimations) => {
  const app = document.querySelector('.app');
  const viewport = document.querySelector('[data-testid="route-viewport"]');
  const surface = document.querySelector('.app-route-surface');
  const active = document.activeElement;
  const viewportStyle = viewport ? getComputedStyle(viewport) : null;
  const surfaceStyle = surface ? getComputedStyle(surface) : null;
  const rect = viewport?.getBoundingClientRect();
  return {
    path: location.pathname,
    historyState: history.state,
    transitionMode: app?.getAttribute('data-route-transition') ?? null,
    appDirection: app?.getAttribute('data-route-direction') ?? null,
    rootDirection: document.documentElement.dataset.routeDirection ?? null,
    viewportCount: document.querySelectorAll('[data-testid="route-viewport"]').length,
    surfaceCount: document.querySelectorAll('.app-route-surface').length,
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-game-cell]').length,
    activeTestId: active?.getAttribute?.('data-testid') ?? null,
    activeAriaLabel: active?.getAttribute?.('aria-label') ?? null,
    surfaceTestId: surface?.getAttribute('data-testid') ?? null,
    surfaceViewTransitionName: surfaceStyle?.viewTransitionName ?? null,
    viewportViewTransitionName: viewportStyle?.viewTransitionName ?? null,
    viewportOpacity: viewportStyle?.opacity ?? null,
    viewportTransform: viewportStyle?.transform ?? null,
    viewportRect: rect ? {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      scrollWidth: viewport.scrollWidth,
      scrollHeight: viewport.scrollHeight,
    } : null,
    animations: collectAnimations
      ? document.getAnimations().map((animation) => {
        const effect = animation.effect;
        const timing = effect?.getComputedTiming?.();
        return {
          name: animation.animationName ?? '',
          currentTime: typeof animation.currentTime === 'number' ? animation.currentTime : null,
          duration: typeof timing?.duration === 'number' ? timing.duration : null,
          playState: animation.playState,
          pseudoElement: effect?.pseudoElement ?? null,
        };
      }).filter((animation) => animation.name.startsWith('t37-route-'))
      : [],
  };
}, true);

const pauseRouteAnimations = async (page, expectedName) => {
  await page.waitForFunction((name) => document.getAnimations().some(
    (animation) => animation.animationName === name,
  ), expectedName, { timeout: 2_000, polling: 8 });
  return page.evaluate((name) => {
    const animations = document.getAnimations().filter(
      (animation) => animation.animationName?.startsWith('t37-route-'),
    );
    for (const animation of animations) animation.pause();
    if (!animations.some((animation) => animation.animationName === name)) {
      throw new Error(`Missing route animation ${name}`);
    }
    return animations.map((animation) => ({
      name: animation.animationName,
      pseudoElement: animation.effect?.pseudoElement ?? null,
      duration: animation.effect?.getComputedTiming?.().duration ?? null,
    }));
  }, expectedName);
};

const seekRouteAnimations = async (page, timeMs) => {
  await page.evaluate((time) => {
    for (const animation of document.getAnimations()) {
      if (!animation.animationName?.startsWith('t37-route-')) continue;
      animation.pause();
      animation.currentTime = time;
    }
  }, timeMs);
};

const finishRouteAnimations = async (page) => {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (!animation.animationName?.startsWith('t37-route-')) continue;
      try {
        animation.finish();
      } catch {
        animation.play();
      }
    }
  });
  await page.waitForFunction(
    () => document.querySelector('.app')?.getAttribute('data-route-transition') === 'idle',
    null,
    { timeout: 2_000, polling: 8 },
  );
};

const screenshot = (page, name) => page.screenshot({
  path: path.join(output, name),
  fullPage: true,
  animations: 'allow',
});

const manifestPayload = (file) => {
  const bytes = fs.readFileSync(path.join(output, file));
  if (!/\.(?:json|md|mjs)$/u.test(file)) return bytes;
  return Buffer.from(bytes.toString('utf8').replace(/\r\n?/gu, '\n'), 'utf8');
};

const writeManifest = ({ sourceSha: boundSourceSha, capturedAt }) => {
  const manifestFiles = [
    'README.md',
    'capture-route-handoff.mjs',
    'audit.json',
    ...fs.readdirSync(output).filter((file) => file.endsWith('.png')).sort(),
  ];
  const manifest = {
    sourceSha: boundSourceSha,
    capturedAt,
    algorithm: 'sha256',
    textNormalization: 'UTF-8 with CRLF and CR normalized to LF for .json, .md, and .mjs',
    files: Object.fromEntries(manifestFiles.map((file) => [
      file,
      createHash('sha256').update(manifestPayload(file)).digest('hex'),
    ])),
  };
  fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

const waitForIdle = (page) => page.waitForFunction(
  () => document.querySelector('.app')?.getAttribute('data-route-transition') === 'idle',
  null,
  { timeout: 3_000, polling: 8 },
);

const validateTopology = (name, snapshot, { expectedCanvas = null } = {}) => {
  requireEvidence(snapshot.viewportCount === 1, `${name}: expected one route viewport, got ${snapshot.viewportCount}`);
  requireEvidence(snapshot.surfaceCount === 1, `${name}: expected one route surface, got ${snapshot.surfaceCount}`);
  requireEvidence(snapshot.canvasCount <= 1, `${name}: expected at most one Canvas, got ${snapshot.canvasCount}`);
  requireEvidence(snapshot.domCellCount === 0, `${name}: DOM board cells appeared (${snapshot.domCellCount})`);
  requireEvidence(snapshot.viewportViewTransitionName === 'app-route', `${name}: viewport is not named app-route`);
  if (expectedCanvas !== null) {
    requireEvidence(snapshot.canvasCount === expectedCanvas, `${name}: expected ${expectedCanvas} Canvas, got ${snapshot.canvasCount}`);
  }
};

if (process.argv.includes('--manifest-only')) {
  const audit = JSON.parse(fs.readFileSync(path.join(output, 'audit.json'), 'utf8'));
  writeManifest(audit);
  process.exit(0);
}

let browser;
try {
  const response = await fetch(origin);
  if (!response.ok) throw new Error(`Evidence origin returned ${response.status}: ${origin}`);

  browser = await chromium.launch({ headless: true });

  // Native forward/back: freeze the compositor-owned pseudo elements at exact times.
  const nativeContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await addKnownPreferences(nativeContext);
  const nativePage = await nativeContext.newPage();
  observePage(nativePage, 'native');
  await nativePage.goto(origin, { waitUntil: 'networkidle' });
  await nativePage.evaluate(() => document.fonts.ready);
  requireEvidence(await nativePage.evaluate(() => typeof document.startViewTransition === 'function'), 'native: View Transition API unavailable');
  await screenshot(nativePage, 'native-home-final.png');

  await nativePage.evaluate(() => document.querySelector('[data-testid="enter-puzzle"]')?.click());
  await nativePage.getByTestId('puzzle-library').waitFor();
  const forwardAnimations = await pauseRouteAnimations(nativePage, 't37-route-settle');
  const forwardFrames = [];
  for (const timeMs of [0, 60, 120, 200]) {
    await seekRouteAnimations(nativePage, timeMs);
    const frame = await routeSnapshot(nativePage);
    forwardFrames.push({ timeMs, ...frame });
    await screenshot(nativePage, `native-forward-${String(timeMs).padStart(3, '0')}ms.png`);
  }
  const forwardDuring = forwardFrames[1];
  validateTopology('native-forward', forwardDuring, { expectedCanvas: 0 });
  requireEvidence(forwardDuring.path === '/puzzles', `native-forward: wrong path ${forwardDuring.path}`);
  requireEvidence(forwardDuring.transitionMode === 'native', `native-forward: wrong mode ${forwardDuring.transitionMode}`);
  requireEvidence(forwardDuring.appDirection === 'forward' && forwardDuring.rootDirection === 'forward', 'native-forward: forward direction was not exposed on app and root');
  requireEvidence(forwardAnimations.some((animation) => animation.name === 't37-route-release' && animation.duration === 120), 'native-forward: missing 120 ms release animation');
  requireEvidence(forwardAnimations.some((animation) => animation.name === 't37-route-settle' && animation.duration === 200), 'native-forward: missing 200 ms settle animation');
  requireEvidence(forwardAnimations.some((animation) => animation.pseudoElement?.includes('view-transition-old')), 'native-forward: missing old-route pseudo snapshot');
  requireEvidence(forwardAnimations.some((animation) => animation.pseudoElement?.includes('view-transition-new')), 'native-forward: missing new-route pseudo snapshot');
  await finishRouteAnimations(nativePage);
  await nativePage.waitForFunction(() => document.activeElement?.matches('[data-testid="level-row"][aria-pressed="true"]'));
  const forwardFinal = await routeSnapshot(nativePage);
  validateTopology('native-forward-final', forwardFinal, { expectedCanvas: 0 });
  requireEvidence(forwardFinal.transitionMode === 'idle' && forwardFinal.appDirection === 'neutral' && forwardFinal.rootDirection === null, 'native-forward-final: terminal state did not reset to idle/neutral');
  requireEvidence(forwardFinal.activeTestId === 'level-row', `native-forward-final: selected level did not receive focus (${forwardFinal.activeTestId})`);
  await screenshot(nativePage, 'native-forward-final.png');

  await nativePage.evaluate(() => history.back());
  await nativePage.getByTestId('mode-home').waitFor();
  const backAnimations = await pauseRouteAnimations(nativePage, 't37-route-settle');
  await seekRouteAnimations(nativePage, 80);
  const backDuring = await routeSnapshot(nativePage);
  validateTopology('native-back', backDuring, { expectedCanvas: 0 });
  requireEvidence(backDuring.path === '/', `native-back: wrong path ${backDuring.path}`);
  requireEvidence(backDuring.appDirection === 'back' && backDuring.rootDirection === 'back', 'native-back: back direction was not exposed on app and root');
  requireEvidence(backAnimations.some((animation) => animation.pseudoElement?.includes('view-transition-old')), 'native-back: missing old-route pseudo snapshot');
  requireEvidence(backAnimations.some((animation) => animation.pseudoElement?.includes('view-transition-new')), 'native-back: missing new-route pseudo snapshot');
  await screenshot(nativePage, 'native-back-080ms.png');
  await finishRouteAnimations(nativePage);
  await nativePage.waitForFunction(() => document.activeElement?.matches('[data-testid="enter-marathon"]'));
  const backFinal = await routeSnapshot(nativePage);
  validateTopology('native-back-final', backFinal, { expectedCanvas: 0 });
  requireEvidence(backFinal.activeTestId === 'enter-marathon', `native-back-final: home mode did not receive focus (${backFinal.activeTestId})`);

  // Enter a game while native capture is active. The pseudo animation cannot exist
  // until Pixi has mounted its one Canvas and rendered the destination snapshot.
  await nativePage.evaluate(() => document.querySelector('[data-testid="enter-marathon"]')?.click());
  await nativePage.getByTestId('game-screen').waitFor();
  await nativePage.waitForSelector('[data-testid="canvas-host"] canvas');
  await pauseRouteAnimations(nativePage, 't37-route-settle');
  await seekRouteAnimations(nativePage, 80);
  const gameDuring = await routeSnapshot(nativePage);
  const gameText = await nativePage.evaluate(() => globalThis.render_game_to_text?.() ?? null);
  validateTopology('native-game-ready', gameDuring, { expectedCanvas: 1 });
  requireEvidence(gameDuring.path === '/play/classic', `native-game-ready: wrong path ${gameDuring.path}`);
  requireEvidence(typeof gameText === 'string' && gameText.length > 0, 'native-game-ready: render_game_to_text is unavailable');
  await screenshot(nativePage, 'native-game-canvas-ready-080ms.png');

  // Keyboard input reaches the committed route even while the compositor animation
  // is frozen for evidence. Leaving immediately proves the newer request retires the
  // active transition and cleans up the Canvas without waiting for visual completion.
  await nativePage.keyboard.press('Escape');
  const exitDialog = nativePage.getByRole('dialog');
  await exitDialog.waitFor({ timeout: 2_000 });
  await nativePage.waitForFunction(() => document.activeElement?.matches('[role="dialog"] [data-autofocus]'));
  const interruptionInput = await routeSnapshot(nativePage);
  await nativePage.keyboard.press('Enter');
  await nativePage.getByTestId('mode-home').waitFor();
  await waitForIdle(nativePage);
  const interruptedFinal = await routeSnapshot(nativePage);
  validateTopology('native-interrupted-final', interruptedFinal, { expectedCanvas: 0 });
  requireEvidence(interruptedFinal.path === '/', `native-interrupted-final: wrong path ${interruptedFinal.path}`);
  await screenshot(nativePage, 'native-interrupted-home-final.png');

  // Two same-stack intents: only the latest route may commit or own history.
  await nativePage.evaluate(() => {
    document.querySelector('[data-testid="enter-puzzle"]')?.click();
    document.querySelector('[data-testid="enter-marathon"]')?.click();
  });
  await nativePage.getByTestId('game-screen').waitFor();
  await nativePage.waitForSelector('[data-testid="canvas-host"] canvas');
  await waitForIdle(nativePage);
  const rapidFinal = await routeSnapshot(nativePage);
  const rapidText = await nativePage.evaluate(() => globalThis.render_game_to_text?.() ?? null);
  validateTopology('native-rapid-latest', rapidFinal, { expectedCanvas: 1 });
  requireEvidence(rapidFinal.path === '/play/classic', `native-rapid-latest: latest route lost (${rapidFinal.path})`);
  requireEvidence(rapidFinal.historyState?.tetramorphRoute?.navigation?.screen === 'game', 'native-rapid-latest: history does not own the latest game route');
  requireEvidence(typeof rapidText === 'string' && rapidText.length > 0, 'native-rapid-latest: render_game_to_text is unavailable');
  await screenshot(nativePage, 'native-rapid-latest-classic-final.png');

  evidence.native = {
    forwardAnimations,
    forwardFrames,
    forwardFinal,
    backAnimations,
    backDuring,
    backFinal,
    gameDuring,
    interruptionInput,
    gameText: gameText ? JSON.parse(gameText) : null,
    interruptedFinal,
    rapidFinal,
    rapidText: rapidText ? JSON.parse(rapidText) : null,
  };
  await nativeContext.close();

  // Fallback stays visible and interactive when the browser has no native API.
  const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await fallbackContext.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'startViewTransition', {
      value: undefined,
      configurable: true,
    });
  });
  await addKnownPreferences(fallbackContext);
  const fallbackPage = await fallbackContext.newPage();
  observePage(fallbackPage, 'fallback');
  await fallbackPage.goto(origin, { waitUntil: 'networkidle' });
  await fallbackPage.evaluate(() => document.querySelector('[data-testid="enter-puzzle"]')?.click());
  await fallbackPage.getByTestId('puzzle-library').waitFor();
  const fallbackAnimations = await pauseRouteAnimations(fallbackPage, 't37-route-settle');
  await seekRouteAnimations(fallbackPage, 80);
  const fallbackDuring = await routeSnapshot(fallbackPage);
  validateTopology('fallback', fallbackDuring, { expectedCanvas: 0 });
  requireEvidence(fallbackDuring.transitionMode === 'fallback', `fallback: wrong mode ${fallbackDuring.transitionMode}`);
  requireEvidence(fallbackAnimations.some((animation) => animation.name === 't37-route-settle' && animation.duration === 160 && animation.pseudoElement === null), 'fallback: missing 160 ms element settle animation');
  requireEvidence(fallbackDuring.viewportTransform !== 'none', 'fallback: destination has no continuous transform sample');
  await screenshot(fallbackPage, 'fallback-forward-080ms.png');
  await finishRouteAnimations(fallbackPage);
  const fallbackFinal = await routeSnapshot(fallbackPage);
  validateTopology('fallback-final', fallbackFinal, { expectedCanvas: 0 });
  requireEvidence(fallbackFinal.transitionMode === 'idle', 'fallback-final: did not return to idle');
  await screenshot(fallbackPage, 'fallback-forward-final.png');
  evidence.fallback = { animations: fallbackAnimations, during: fallbackDuring, final: fallbackFinal };
  await fallbackContext.close();

  // Reduced motion is a short opacity-only handoff controlled by the resolved app setting.
  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await addKnownPreferences(reducedContext, { reducedMotion: true });
  const reducedPage = await reducedContext.newPage();
  observePage(reducedPage, 'reduced');
  await reducedPage.goto(origin, { waitUntil: 'networkidle' });
  const reducedSamples = await reducedPage.evaluate(async () => {
    const samples = [];
    const startedAt = performance.now();
    document.querySelector('[data-testid="enter-puzzle"]')?.click();
    for (let frame = 0; frame < 12; frame += 1) {
      const app = document.querySelector('.app');
      const viewport = document.querySelector('[data-testid="route-viewport"]');
      const style = viewport ? getComputedStyle(viewport) : null;
      const animations = document.getAnimations()
        .filter((animation) => animation.animationName?.startsWith('t37-route-'))
        .map((animation) => ({
          name: animation.animationName,
          duration: animation.effect?.getComputedTiming?.().duration ?? null,
          currentTime: typeof animation.currentTime === 'number' ? animation.currentTime : null,
          pseudoElement: animation.effect?.pseudoElement ?? null,
        }));
      samples.push({
        elapsedMs: performance.now() - startedAt,
        mode: app?.getAttribute('data-route-transition') ?? null,
        direction: app?.getAttribute('data-route-direction') ?? null,
        path: location.pathname,
        opacity: style?.opacity ?? null,
        transform: style?.transform ?? null,
        animations,
      });
      if (samples.length > 1 && samples.at(-1)?.mode === 'idle') break;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return samples;
  });
  await reducedPage.getByTestId('puzzle-library').waitFor();
  const reducedActive = reducedSamples.filter((sample) => sample.mode === 'reduced');
  requireEvidence(reducedActive.length > 0, `reduced: no active sample ${JSON.stringify(reducedSamples)}`);
  requireEvidence(reducedActive.every((sample) => sample.transform === 'none'), `reduced: translation appeared ${JSON.stringify(reducedActive)}`);
  requireEvidence(reducedActive.some((sample) => sample.animations.some((animation) => (
    animation.name === 't37-route-reduced'
      && typeof animation.duration === 'number'
      && animation.duration > 0
      && animation.duration <= 32
  ))), 'reduced: missing opacity handoff bounded to 32 ms or less');
  requireEvidence(reducedSamples.at(-1)?.mode === 'idle', `reduced: did not settle within sampled frames ${JSON.stringify(reducedSamples)}`);
  const reducedFinal = await routeSnapshot(reducedPage);
  validateTopology('reduced-final', reducedFinal, { expectedCanvas: 0 });
  requireEvidence(reducedFinal.transitionMode === 'idle', 'reduced-final: did not return to idle');
  await screenshot(reducedPage, 'reduced-forward-final.png');
  evidence.reduced = { samples: reducedSamples, final: reducedFinal };
  await reducedContext.close();

  // Mobile endpoint: the stable viewport must remain exactly one dynamic viewport wide/high.
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await addKnownPreferences(mobileContext);
  const mobilePage = await mobileContext.newPage();
  observePage(mobilePage, 'mobile');
  await mobilePage.goto(origin, { waitUntil: 'networkidle' });
  await mobilePage.getByTestId('enter-puzzle').click();
  await mobilePage.getByTestId('puzzle-library').waitFor();
  await waitForIdle(mobilePage);
  const mobileFinal = await routeSnapshot(mobilePage);
  const mobileGeometry = await mobilePage.evaluate(() => ({
    innerWidth,
    innerHeight,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentScrollHeight: document.documentElement.scrollHeight,
    routeControlHeights: [
      document.querySelector('.library-back'),
      document.querySelector('[data-testid="start-selected-puzzle"]'),
      ...document.querySelectorAll('[data-testid="level-row"]'),
    ].filter(Boolean).map((control) => ({
      testId: control.getAttribute('data-testid'),
      className: control.className,
      height: control.getBoundingClientRect().height,
    })),
  }));
  validateTopology('mobile-final', mobileFinal, { expectedCanvas: 0 });
  requireEvidence(mobileFinal.viewportRect?.width === 390 && mobileFinal.viewportRect?.height === 844, `mobile-final: wrong viewport rect ${JSON.stringify(mobileFinal.viewportRect)}`);
  requireEvidence(mobileGeometry.documentScrollWidth === mobileGeometry.innerWidth, `mobile-final: horizontal overflow ${JSON.stringify(mobileGeometry)}`);
  requireEvidence(mobileGeometry.documentScrollHeight === mobileGeometry.innerHeight, `mobile-final: vertical overflow ${JSON.stringify(mobileGeometry)}`);
  requireEvidence(mobileGeometry.routeControlHeights.every((control) => control.height >= 44), `mobile-final: route control below 44 px ${JSON.stringify(mobileGeometry.routeControlHeights)}`);
  await screenshot(mobilePage, 'mobile-puzzle-final.png');
  evidence.mobile = { final: mobileFinal, geometry: mobileGeometry };
  await mobileContext.close();

  failures.push(...browserErrors);
  const audit = {
    sourceSha,
    capturedAt: new Date().toISOString(),
    origin,
    browser: await browser.version(),
    evidence,
    browserErrors,
    failures,
  };
  fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(failures.join('\n'));

  writeManifest(audit);
} finally {
  if (browser) await browser.close().catch(() => {});
}
