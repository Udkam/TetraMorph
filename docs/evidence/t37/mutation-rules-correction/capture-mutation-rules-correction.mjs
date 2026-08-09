import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.argv[2] ?? 'http://127.0.0.1:4185';
const output = path.resolve('docs/evidence/t37/mutation-rules-correction');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
fs.mkdirSync(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ type: 'console', text: message.text() });
});
page.on('pageerror', (error) => errors.push({ type: 'page', text: error.message }));

try {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:reduced-motion:v1', 'off');
    localStorage.setItem(
      'tetramorph:mode-rule-intros:v1',
      JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']),
    );
  });
  await page.goto(`${origin}/play/mutation`, { waitUntil: 'networkidle' });
  await page.getByTestId('game-screen').waitFor({ state: 'visible' });
  await page.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
  await page.evaluate(() => window.__TETRAMORPH_QA__?.setFrozen(true));
  await page.evaluate(() => document.fonts.ready);

  const live = await page.evaluate(() => {
    const collected = window.__TETRAMORPH_LAYOUT_QA__?.collect();
    const cadence = document.querySelector('[data-stat-role="fall-cadence"] strong');
    const unit = document.querySelector('[data-stat-role="fall-cadence"] .run-stats__unit');
    return {
      layout: collected ? {
        viewport: collected.viewport,
        bounds: collected.bounds,
        assertions: collected.assertions,
        state: {
          mode: collected.state?.mode ?? null,
          status: collected.state?.status ?? null,
          active: collected.state?.active ?? null,
        },
        renderer: {
          canvas: collected.renderer?.canvas ?? null,
          board: collected.renderer?.board ?? null,
          preview: collected.renderer?.preview ?? null,
          activeCells: collected.renderer?.activeCells ?? [],
          ghostCells: collected.renderer?.ghostCells ?? [],
        },
      } : null,
      cadence: cadence?.textContent?.trim() ?? null,
      cadenceAria: cadence?.getAttribute('aria-label') ?? null,
      unit: unit?.textContent?.trim() ?? null,
    };
  });
  await page.screenshot({ path: path.join(output, 'mutation-live.png'), fullPage: true });

  const deterministicScenario = await page.evaluate(async () => {
    const core = await import('/src/game/core/index.ts');
    const presentation = await import('/src/game/render/presentation.ts');
    const app = await import('/src/App.tsx');
    const localization = await import('/src/ui/localization.ts');
    const board = core.createBoard();
    for (let x = 0; x < 8; x += 1) board[39][x] = 'T';
    board[34][8] = 'J';
    const base = core.dispatch(core.createInitialState(0x5a71, 'sprint'), { type: 'start' }).state;
    const state = {
      ...base,
      board,
      active: { type: 'O', rotation: 0, x: 8, y: 0 },
      mutationCollapseLandingLatched: true,
      mutationCarriers: [{ id: 4, item: 'freeze', cells: [{ x: 8, y: 34 }] }],
      mutationActiveCarrier: { id: 5, item: 'bomb' },
    };
    const projected = presentation.projectedLandingCells(state);
    const first = core.dispatch(state, { type: 'hard-drop' });
    const second = core.dispatch(state, { type: 'hard-drop' });
    const locked = first.events.find((event) => event.type === 'piece-locked');
    const fastest = { ...base, lines: 60 };
    return {
      fastestTicks: core.gravityForMode('sprint', 0, 0, 60),
      fastestZh: app.fallCadenceLabel(fastest, 'zh-CN'),
      fastestEn: app.fallCadenceLabel(fastest, 'en'),
      supergravityRuleEn: localization.modeRules('en', 'sprint')
        .find((fact) => fact.id === 'items')?.value ?? null,
      projected,
      lockedCells: locked?.cells ?? null,
      hardDropDistance: first.events.find((event) => event.type === 'hard-dropped')?.distance ?? null,
      clearStarted: first.events.some((event) => event.type === 'clear-started'),
      floatingCell: first.state.board[34][8],
      floorGap: first.state.board[39][8],
      independentFloorCell: first.state.board[39][9],
      carriers: first.state.mutationCarriers,
      deterministic: core.stateHash(first.state) === core.stateHash(second.state)
        && JSON.stringify(first.events) === JSON.stringify(second.events),
    };
  });

  await page.getByTestId('open-settings').click();
  await page.getByTestId('settings-sheet').waitFor({ state: 'visible' });
  await page.getByTestId('settings-tab-rules').click();
  const rulesText = (await page.getByTestId('settings-rules').innerText()).replace(/\s+/g, ' ').trim();
  await page.screenshot({ path: path.join(output, 'mutation-rules.png'), fullPage: true });

  assert.equal(live.layout?.assertions?.canvasCount, 1);
  assert.equal(live.layout?.assertions?.domCellCount, 0);
  assert.equal(live.layout?.assertions?.noHorizontalOverflow, true);
  assert.equal(live.cadence, '0.8');
  assert.equal(live.cadenceAria, '0.8 秒/格');
  assert.equal(live.unit, '秒/格');
  assert.equal(deterministicScenario.fastestTicks, 6);
  assert.equal(deterministicScenario.fastestZh, '0.1 秒/格');
  assert.equal(deterministicScenario.fastestEn, '0.1 s/cell');
  assert.match(deterministicScenario.supergravityRuleEn, /without moving locked cells/);
  assert.deepEqual(deterministicScenario.projected, deterministicScenario.lockedCells);
  assert.equal(deterministicScenario.hardDropDistance, 32);
  assert.equal(deterministicScenario.clearStarted, false);
  assert.equal(deterministicScenario.floatingCell, 'J');
  assert.equal(deterministicScenario.floorGap, null);
  assert.equal(deterministicScenario.independentFloorCell, 'O');
  assert.equal(deterministicScenario.carriers[0]?.cells[0]?.y, 34);
  assert.equal(deterministicScenario.carriers[1]?.cells[3]?.y, 39);
  assert.equal(deterministicScenario.deterministic, true);
  assert.match(rulesText, /自身各列独立下沉，已落定方块不移动/);
  assert.deepEqual(errors, []);

  const audit = {
    sourceSha,
    origin,
    live,
    deterministicScenario,
    rulesText,
    errors,
    assertions: {
      oneCanvas: true,
      zeroDomBoardCells: true,
      noHorizontalOverflow: true,
      mutationFloorIsPointOneSeconds: true,
      settledCellsRemainFixed: true,
      noTunnelOrFalseClear: true,
      ghostMatchesLock: true,
      carrierCoordinatesMatch: true,
      bilingualRuleIsExplicit: true,
      browserErrors: 0,
    },
  };
  fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  console.log(`PASS source=${sourceSha} canvas=1 errors=0 floorTicks=6 fixedFloatingCell=true`);
} finally {
  await browser.close();
}
