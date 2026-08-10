import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.argv[2] ?? 'http://127.0.0.1:5193';
const output = path.resolve('docs/evidence/t37/material-matrix');
const productPaths = [
  'src/game/render/theme.ts',
  'src/game/render/TetrisRenderer.ts',
  'src/ui/localization.ts',
  'src/App.tsx',
  'src/game/audio/AudioEngine.ts',
];
const sourceSha = execFileSync(
  'git',
  ['rev-list', '-1', 'HEAD', '--', ...productPaths],
  { encoding: 'utf8' },
).trim();
const scenarios = JSON.parse(fs.readFileSync(
  path.resolve('docs/evidence/t26/phase-d/mutation-scenarios.json'),
  'utf8',
));
const cases = [
  {
    name: 'deep-normal-desktop-freeze',
    item: 'freeze', seed: 49, profile: 'freeze', theme: 'deep-tide', reduced: false,
    language: 'zh-CN', viewport: { width: 1440, height: 900 },
  },
  {
    name: 'deep-reduced-mobile-collapse',
    item: 'collapse', seed: 163, profile: 'freeze', theme: 'deep-tide', reduced: true,
    language: 'en', viewport: { width: 390, height: 844 },
  },
  {
    name: 'mineral-normal-portrait-multiplier',
    item: 'multiplier', seed: 11, profile: 'multiplier', theme: 'mineral-mist', reduced: false,
    language: 'en', viewport: { width: 1125, height: 1196 },
  },
  {
    name: 'mineral-reduced-mobile-bomb',
    item: 'bomb', seed: 90, profile: 'bomb', theme: 'mineral-mist', reduced: true,
    language: 'zh-CN', viewport: { width: 390, height: 844 },
  },
  {
    name: 'sunstone-normal-desktop-collapse',
    item: 'collapse', seed: 163, profile: 'freeze', theme: 'sunstone', reduced: false,
    language: 'zh-CN', viewport: { width: 1440, height: 900 },
  },
  {
    name: 'sunstone-reduced-portrait-freeze',
    item: 'freeze', seed: 49, profile: 'freeze', theme: 'sunstone', reduced: true,
    language: 'en', viewport: { width: 1125, height: 1196 },
  },
];
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const audit = {
  sourceSha,
  capturedAt: new Date().toISOString(),
  browser: await browser.version(),
  cases: {},
  errors: [],
};

for (const entry of cases) {
  const errors = [];
  const page = await browser.newPage({ viewport: entry.viewport, deviceScaleFactor: 1 });
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
  await page.evaluate((settings) => {
    localStorage.clear();
    localStorage.setItem('tetramorph:qa-seed', String(settings.seed));
    localStorage.setItem('tetramorph:language:v1', settings.language);
    localStorage.setItem('tetramorph:visual-theme:v1', settings.theme);
    localStorage.setItem('tetramorph:reduced-motion:v1', settings.reduced ? 'on' : 'off');
    localStorage.setItem(
      'tetramorph:mode-rule-intros:v1',
      JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']),
    );
  }, entry);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('enter-sprint').click();
  await page.getByTestId('game-screen').waitFor({ state: 'visible' });
  await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
  await page.evaluate(() => window.__TETRAMORPH_QA__?.setFrozen(true));

  const scenario = scenarios[entry.profile];
  const runActions = (values) => page.evaluate((requested) => {
    const qa = window.__TETRAMORPH_QA__;
    if (!qa) throw new Error('Missing DEV QA surface.');
    for (const action of requested) qa.action(action);
  }, values);
  const advanceToActive = () => page.evaluate(() => {
    const qa = window.__TETRAMORPH_QA__;
    if (!qa) throw new Error('Missing DEV QA surface.');
    for (let tick = 0; tick <= 120; tick += 1) {
      const state = qa.getState();
      if (state.active !== null && state.status === 'playing' && state.phase === 'active') return;
      qa.advanceTicks(1);
    }
    throw new Error('The next active piece did not spawn.');
  });

  await runActions(scenario.actions[0]);
  await advanceToActive();
  await runActions(scenario.actions[1]);
  await advanceToActive();
  await runActions([...scenario.actions[2].slice(0, -1), 'soft-drop']);
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(output, `${entry.name}.png`), fullPage: true });

  const observed = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const state = window.__TETRAMORPH_QA__?.getState() ?? null;
    const renderer = window.__TETRAMORPH_QA__?.getRendererSnapshot() ?? null;
    const layout = window.__TETRAMORPH_LAYOUT_QA__?.collect() ?? null;
    return {
      root: {
        language: app?.getAttribute('lang') ?? null,
        theme: app?.getAttribute('data-theme') ?? null,
        reducedMotion: app?.getAttribute('data-reduced-motion') ?? null,
      },
      item: state?.mutationActiveCarrier?.item ?? null,
      piece: state?.active?.type ?? null,
      activeCells: renderer?.activeCells ?? [],
      ghostCells: renderer?.ghostCells ?? [],
      previewItem: renderer?.previewMutationItem ?? null,
      assertions: layout?.assertions ?? null,
    };
  });
  const caseAudit = { ...entry, observed, errors };
  audit.cases[entry.name] = caseAudit;

  if (observed.root.language !== entry.language) errors.push(`language mismatch: ${observed.root.language}`);
  if (observed.root.theme !== entry.theme) errors.push(`theme mismatch: ${observed.root.theme}`);
  if (observed.root.reducedMotion !== String(entry.reduced)) {
    errors.push(`reduced-motion mismatch: ${observed.root.reducedMotion}`);
  }
  if (observed.item !== entry.item) errors.push(`item mismatch: ${observed.item}`);
  if (observed.activeCells.length !== 4) errors.push(`active cells mismatch: ${observed.activeCells.length}`);
  if (observed.ghostCells.length !== 4) errors.push(`Ghost cells mismatch: ${observed.ghostCells.length}`);
  if (observed.assertions?.canvasCount !== 1) errors.push(`Canvas mismatch: ${JSON.stringify(observed.assertions)}`);
  if (observed.assertions?.domCellCount !== 0) errors.push(`DOM cell mismatch: ${JSON.stringify(observed.assertions)}`);
  if (!observed.assertions?.noHorizontalOverflow) errors.push('horizontal overflow');
  if (!observed.assertions?.noVerticalOverflow) errors.push('vertical overflow');
  audit.errors.push(...errors.map((message) => `${entry.name}: ${message}`));
  await page.close();
}

audit.coverage = {
  themes: [...new Set(cases.map((entry) => entry.theme))].sort(),
  motionPreferences: [...new Set(cases.map((entry) => entry.reduced ? 'reduced' : 'full'))].sort(),
  languages: [...new Set(cases.map((entry) => entry.language))].sort(),
  viewports: [...new Set(cases.map((entry) => `${entry.viewport.width}x${entry.viewport.height}`))].sort(),
  items: [...new Set(cases.map((entry) => entry.item))].sort(),
};
const screenshots = fs.readdirSync(output).filter((name) => name.endsWith('.png')).sort();
audit.screenshots = screenshots.map((name) => ({
  name,
  sha256: createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex'),
}));
fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
await browser.close();

if (audit.errors.length > 0) throw new Error(audit.errors.join('\n'));
