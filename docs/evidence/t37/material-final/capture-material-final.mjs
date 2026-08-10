import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.argv[2] ?? 'http://127.0.0.1:5193';
const output = path.resolve('docs/evidence/t37/material-final');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const scenarios = JSON.parse(fs.readFileSync(
  path.resolve('docs/evidence/t26/phase-d/mutation-scenarios.json'),
  'utf8',
));
const items = ['freeze', 'bomb', 'multiplier', 'collapse'];
const expectedPreviewCopy = {
  freeze: ['冰晶', '冰冻'],
  bomb: ['熔岩', '炸弹'],
  multiplier: ['金辉', '加倍'],
  collapse: ['重力紫晶', '超重'],
};
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const audit = {
  sourceSha,
  capturedAt: new Date().toISOString(),
  browser: await browser.version(),
  viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  items: {},
  errors: [],
};

const openScenario = async (seed, errors) => {
  const page = await browser.newPage({ viewport: audit.viewport, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = Crypto.prototype.getRandomValues;
    Crypto.prototype.getRandomValues = function deterministicQaSeed(array) {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = Number(globalThis.localStorage?.getItem('tetramorph:qa-seed') ?? 49) >>> 0;
        return array;
      }
      return original.call(this, array);
    };
  });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate((scenarioSeed) => {
    localStorage.clear();
    localStorage.setItem('tetramorph:qa-seed', String(scenarioSeed));
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:visual-theme:v1', 'deep-tide');
    localStorage.setItem('tetramorph:reduced-motion:v1', 'off');
    localStorage.setItem(
      'tetramorph:mode-rule-intros:v1',
      JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']),
    );
  }, seed);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('enter-sprint').click();
  await page.getByTestId('game-screen').waitFor({ state: 'visible' });
  await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
  await page.evaluate(() => window.__TETRAMORPH_QA__?.setFrozen(true));
  return page;
};

const actions = (page, values) => page.evaluate((requested) => {
  const qa = window.__TETRAMORPH_QA__;
  if (!qa) throw new Error('Missing DEV QA surface.');
  for (const action of requested) qa.action(action);
}, values);

const advanceToActive = (page) => page.evaluate(() => {
  const qa = window.__TETRAMORPH_QA__;
  if (!qa) throw new Error('Missing DEV QA surface.');
  for (let tick = 0; tick <= 120; tick += 1) {
    const state = qa.getState();
    if (state.active !== null && state.status === 'playing' && state.phase === 'active') return;
    qa.advanceTicks(1);
  }
  throw new Error('The next active piece did not spawn.');
});

const snapshot = (page) => page.evaluate(() => ({
  state: window.__TETRAMORPH_QA__?.getState() ?? null,
  renderer: window.__TETRAMORPH_QA__?.getRendererSnapshot() ?? null,
  layout: window.__TETRAMORPH_LAYOUT_QA__?.collect() ?? null,
  canvasCount: document.querySelectorAll('canvas').length,
  domCellCount: document.querySelectorAll('[data-game-cell], [data-cell], .board-cell').length,
  nextAria: document.querySelector('[data-testid="next-slot"]')?.getAttribute('aria-label') ?? null,
}));

const capture = async (page, name) => {
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  return snapshot(page);
};

const captureBoard = async (page, name) => {
  const result = await page.evaluate(() => window.__TETRAMORPH_QA__?.captureBoardPng());
  if (!result?.dataUrl) throw new Error(`Missing board capture for ${name}.`);
  const encoded = result.dataUrl.slice(result.dataUrl.indexOf(',') + 1);
  fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(encoded, 'base64'));
  return {
    frame: result.frame,
    resolution: result.resolution,
    outputPixels: result.outputPixels,
    pixelProbe: result.pixelProbe,
  };
};

const captureTimed = async (page, name) => {
  await page.evaluate(() => window.__TETRAMORPH_QA__?.advanceTicks(0));
  const before = await snapshot(page);
  const board = await captureBoard(page, name);
  const after = await snapshot(page);
  return { before, after, board };
};

for (const item of items) {
  // Collapse seed 163 preserves the proven I/L/T completion route while selecting
  // Supergravity from the current independent item stream.
  const scenario = item === 'collapse' ? scenarios.freeze : scenarios[item];
  const seed = item === 'collapse' ? 163 : scenario.seed;
  const errors = [];

  const materialPage = await openScenario(seed, errors);
  await actions(materialPage, scenario.actions[0]);
  await advanceToActive(materialPage);
  const preview = await capture(materialPage, `${item}-next`);

  await actions(materialPage, scenario.actions[1]);
  await advanceToActive(materialPage);
  await actions(materialPage, [...scenario.actions[2].slice(0, -1), 'soft-drop']);
  const active = await capture(materialPage, `${item}-active-ghost`);

  // Move away from the prepared completion slot so the item remains on the board.
  await actions(materialPage, ['left', 'left', 'hard-drop']);
  await advanceToActive(materialPage);
  const settled = await capture(materialPage, `${item}-settled`);
  await materialPage.close();

  const activationPage = await openScenario(seed, errors);
  await actions(activationPage, scenario.actions[0]);
  await advanceToActive(activationPage);
  await actions(activationPage, scenario.actions[1]);
  await advanceToActive(activationPage);
  await actions(activationPage, [...scenario.actions[2].slice(0, -1), 'soft-drop']);
  await actions(activationPage, ['hard-drop']);
  const clearCapture = await captureTimed(activationPage, `${item}-clear`);
  await activationPage.close();

  // Use a fresh deterministic run so extracting the clear frame cannot consume
  // the 300 ms tail before the activation frame is bound.
  const resolvedPage = await openScenario(seed, errors);
  await actions(resolvedPage, scenario.actions[0]);
  await advanceToActive(resolvedPage);
  await actions(resolvedPage, scenario.actions[1]);
  await advanceToActive(resolvedPage);
  await actions(resolvedPage, [...scenario.actions[2].slice(0, -1), 'soft-drop']);
  await actions(resolvedPage, ['hard-drop']);
  await advanceToActive(resolvedPage);
  const activationCapture = await captureTimed(resolvedPage, `${item}-activation`);
  await resolvedPage.close();

  const clear = clearCapture.before;
  const activation = activationCapture.before;

  const itemAudit = {
    seed,
    preview: {
      item: preview.renderer?.previewMutationItem ?? null,
      piece: preview.renderer?.previewPiece ?? null,
      aria: preview.nextAria,
      assertions: preview.layout?.assertions ?? null,
    },
    active: {
      item: active.state?.mutationActiveCarrier?.item ?? null,
      piece: active.state?.active?.type ?? null,
      cells: active.renderer?.activeCells ?? [],
      ghostCells: active.renderer?.ghostCells ?? [],
      assertions: active.layout?.assertions ?? null,
    },
    settled: {
      carriers: settled.state?.mutationCarriers ?? [],
      activation: settled.renderer?.mutationActivation ?? null,
      assertions: settled.layout?.assertions ?? null,
    },
    clear: {
      phase: clear.state?.phase ?? null,
      rows: clear.state?.pendingClearRows ?? [],
      carriers: clear.state?.mutationCarriers ?? [],
      lineClear: clear.renderer?.ordinaryLineClear ?? null,
      boardCapture: clearCapture.board,
      afterScreenshot: {
        lineClear: clearCapture.after.renderer?.ordinaryLineClear ?? null,
      },
      assertions: clear.layout?.assertions ?? null,
    },
    activation: {
      lastItem: activation.state?.mutationLastItem ?? null,
      flash: activation.renderer?.mutationActivation ?? null,
      cues: activation.renderer?.ordinaryMultiLineClearCues ?? [],
      boardCapture: activationCapture.board,
      afterScreenshot: {
        flash: activationCapture.after.renderer?.mutationActivation ?? null,
      },
      assertions: activation.layout?.assertions ?? null,
    },
    errors,
  };
  audit.items[item] = itemAudit;

  if (itemAudit.preview.item !== item) errors.push(`preview item mismatch: ${itemAudit.preview.item}`);
  for (const term of expectedPreviewCopy[item]) {
    if (!itemAudit.preview.aria?.includes(term)) errors.push(`Next aria misses ${term}: ${itemAudit.preview.aria}`);
  }
  if (/核心|携带/.test(itemAudit.preview.aria ?? '')) errors.push(`Next aria retains old carrier copy: ${itemAudit.preview.aria}`);
  if (itemAudit.active.item !== item) errors.push(`active item mismatch: ${itemAudit.active.item}`);
  if ((itemAudit.active.cells?.length ?? 0) !== 4) errors.push('active piece does not expose four cells');
  if ((itemAudit.active.ghostCells?.length ?? 0) !== 4) errors.push('Ghost does not expose four cells');
  if (!itemAudit.settled.carriers.some((carrier) => carrier.item === item)) {
    errors.push(`settled material missing: ${JSON.stringify(itemAudit.settled.carriers)}`);
  }
  if (itemAudit.settled.activation !== null) errors.push('safe settlement unexpectedly activated the item');
  if (itemAudit.clear.phase !== 'line-clear') errors.push(`clear phase mismatch: ${itemAudit.clear.phase}`);
  if (!itemAudit.clear.carriers.some((carrier) => carrier.item === item)) {
    errors.push(`captured clear lost material identity: ${JSON.stringify(itemAudit.clear.carriers)}`);
  }
  if (!itemAudit.clear.lineClear) errors.push('captured clear has no renderer row timeline');
  if (itemAudit.activation.lastItem !== item) {
    errors.push(`activation state mismatch: ${itemAudit.activation.lastItem}`);
  }
  if (itemAudit.activation.flash?.item !== item) {
    errors.push(`activation renderer mismatch: ${itemAudit.activation.flash?.item}`);
  }
  if (!itemAudit.activation.cues.some((cue) => cue.committed && cue.visibleCellCount > 0)) {
    errors.push(`captured clear tail is missing at activation: ${JSON.stringify(itemAudit.activation.cues)}`);
  }
  for (const [stage, stageAudit] of Object.entries({ preview, active, settled, clear, activation })) {
    if (stageAudit.canvasCount !== 1) errors.push(`${stage}: expected one Canvas, found ${stageAudit.canvasCount}`);
    if (stageAudit.domCellCount !== 0) errors.push(`${stage}: expected zero DOM cells, found ${stageAudit.domCellCount}`);
  }
  audit.errors.push(...errors.map((message) => `${item}: ${message}`));
}

const screenshots = fs.readdirSync(output).filter((name) => name.endsWith('.png')).sort();
audit.screenshots = screenshots.map((name) => ({
  name,
  sha256: createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex'),
}));
fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
await browser.close();

if (audit.errors.length > 0) throw new Error(audit.errors.join('\n'));
