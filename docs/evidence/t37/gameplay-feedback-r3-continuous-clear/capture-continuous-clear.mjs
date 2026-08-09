import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const output = path.resolve('docs/evidence/t37/gameplay-feedback-r3-continuous-clear');
const origin = process.env.TETRAMORPH_EVIDENCE_ORIGIN ?? 'http://127.0.0.1:4190';
const sourceSha = process.env.TETRAMORPH_SOURCE_SHA
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceBase = process.env.TETRAMORPH_SOURCE_BASE
  ?? execFileSync('git', ['rev-parse', `${sourceSha}~2`], { cwd: root, encoding: 'utf8' }).trim();
fs.mkdirSync(output, { recursive: true });

const failures = [];
const browserErrors = [];
const requireEvidence = (condition, message) => {
  if (!condition) failures.push(message);
};
const writeDataUrl = (name, dataUrl) => {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error(`Malformed data URL for ${name}`);
  fs.writeFileSync(path.join(output, name), Buffer.from(dataUrl.slice(comma + 1), 'base64'));
};

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader'],
});

const observe = (page, label) => {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push({ page: label, type: 'console.error', text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push({ page: label, type: 'pageerror', text: String(error) });
  });
};

try {
  const livePage = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  observe(livePage, 'live-marathon');
  await livePage.goto(origin, { waitUntil: 'networkidle' });
  await livePage.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:visual-theme:v1', 'deep-tide');
    localStorage.setItem('tetramorph:reduced-motion:v1', 'off');
    localStorage.setItem(
      'tetramorph:mode-rule-intros:v1',
      JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']),
    );
  });
  await livePage.reload({ waitUntil: 'networkidle' });
  await livePage.evaluate(() => document.fonts.ready);
  await livePage.locator('[data-testid="enter-marathon"]').click();
  await livePage.waitForSelector('[data-testid="entry-countdown"]', { state: 'visible', timeout: 3_000 });
  await livePage.waitForSelector('[data-testid="entry-countdown"]', { state: 'detached', timeout: 7_000 });
  await livePage.waitForSelector('[data-testid="game-screen"]');
  await livePage.screenshot({ path: path.join(output, 'live-marathon-zh.png'), fullPage: true });

  const liveBefore = await livePage.evaluate(() => {
    globalThis.__T37_R3_CANVAS__ = document.querySelector('canvas');
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      domCellCount: document.querySelectorAll('[data-game-cell]').length,
      qa: Boolean(globalThis.__TETRAMORPH_QA__),
      status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
      renderText: typeof globalThis.render_game_to_text,
      viewportOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    };
  });
  requireEvidence(liveBefore.canvasCount === 1, `live canvas count was ${liveBefore.canvasCount}`);
  requireEvidence(liveBefore.domCellCount === 0, `live app exposed ${liveBefore.domCellCount} DOM cells`);
  requireEvidence(liveBefore.qa && liveBefore.status === 'playing', 'live QA surface was not playing');
  requireEvidence(liveBefore.renderText === 'function', 'render_game_to_text was unavailable');
  requireEvidence(liveBefore.viewportOverflow === 0, `desktop overflow was ${liveBefore.viewportOverflow}px`);

  await livePage.locator('[data-testid="open-settings"]').click();
  await livePage.waitForFunction(() => {
    const control = document.querySelector('[data-testid="settings-restart"]');
    return control instanceof HTMLButtonElement && !control.disabled;
  });
  await livePage.locator('[data-testid="settings-restart"]').click();
  await livePage.waitForSelector('[data-testid="settings-sheet"]', { state: 'detached' });
  const restart = await livePage.evaluate(() => ({
    sameCanvas: globalThis.__T37_R3_CANVAS__ === document.querySelector('canvas'),
    canvasCount: document.querySelectorAll('canvas').length,
    cueCount: globalThis.__TETRAMORPH_QA__?.getRendererSnapshot()
      .ordinaryMultiLineClearCues.length ?? -1,
    status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
  }));
  requireEvidence(
    restart.sameCanvas && restart.canvasCount === 1 && restart.cueCount === 0,
    'restart replaced the canvas or retained a clear cue',
  );

  await livePage.locator('[data-testid="exit-game"]').click();
  await livePage.locator('[role="dialog"] button.primary-action').click();
  await livePage.waitForSelector('[data-testid="mode-home"]');
  await livePage.waitForTimeout(250);
  const exit = await livePage.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas').length,
    qa: Boolean(globalThis.__TETRAMORPH_QA__),
    renderText: typeof globalThis.render_game_to_text,
  }));
  requireEvidence(
    exit.canvasCount === 0 && !exit.qa && exit.renderText === 'undefined',
    'exit left canvas, QA, or text-state residue',
  );
  await livePage.close();

  const rendererPage = await browser.newPage({ viewport: { width: 760, height: 940 }, deviceScaleFactor: 1 });
  observe(rendererPage, 'isolated-renderer');
  await rendererPage.goto(origin, { waitUntil: 'networkidle' });
  const rendererAudit = await rendererPage.evaluate(async () => {
    const [{ TetrisRenderer }, engine, boardModule, timeline, presentation] = await Promise.all([
      import('/src/game/render/TetrisRenderer.ts'),
      import('/src/game/core/engine.ts'),
      import('/src/game/core/board.ts'),
      import('/src/animation/lineClearTimeline.ts'),
      import('/src/game/render/presentation.ts'),
    ]);
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.background = '#071522';
    const host = document.createElement('div');
    host.style.width = '720px';
    host.style.height = '920px';
    host.style.margin = '0 auto';
    document.body.append(host);

    const renderer = new TetrisRenderer();
    await renderer.init(host);
    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: false });
    const captures = [];
    const core = [];
    const fixedStepMs = timeline.LINE_CLEAR_FIXED_STEP_MS;
    const coreCommitMs = fixedStepMs * 12;
    const waitFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

    const makeState = (count, mode = 'marathon') => {
      const rows = Array.from({ length: count }, (_, index) => 40 - count + index);
      let board = boardModule.createBoard();
      for (let rowOrder = 0; rowOrder < rows.length; rowOrder += 1) {
        const row = rows[rowOrder];
        for (let x = 0; x < 10; x += 1) {
          board = boardModule.setCell(board, x, row, ['I', 'T', 'L', 'S'][rowOrder]);
        }
      }
      board = boardModule.setCell(board, 2, rows[0] - 2, 'J');
      board = boardModule.setCell(board, 3, rows[0] - 2, 'J');
      board = boardModule.setCell(board, 3, rows[0] - 1, 'J');
      return {
        rows,
        state: {
          ...engine.createInitialState(0x3730 + count, mode),
          board,
          active: null,
          status: 'playing',
          phase: 'line-clear',
          phaseTicks: 0,
          pendingClearRows: [...rows].reverse(),
          ...(mode === 'puzzle'
            ? {
                puzzleTargetCells: rows.flatMap((row) => (
                  Array.from({ length: 10 }, (_, x) => ({ x, y: row }))
                )),
              }
            : {}),
        },
      };
    };

    const committedState = (state) => {
      const boardBefore = JSON.stringify(state.board);
      let current = state;
      let transition = null;
      let unchangedBeforeCommit = true;
      for (let tick = 0; tick < 12; tick += 1) {
        transition = engine.dispatch(current, { type: 'tick' });
        current = transition.state;
        if (tick < 11) unchangedBeforeCommit &&= JSON.stringify(current.board) === boardBefore;
      }
      return {
        state: current,
        events: transition.events,
        unchangedBeforeCommit,
        boardChangedAtCommit: JSON.stringify(current.board) !== boardBefore,
      };
    };

    const capture = async (scenario, elapsedMs, state) => {
      await waitFrame();
      const board = renderer.captureBoardPng();
      const snapshot = renderer.getSnapshot();
      captures.push({
        file: `${scenario}-${String(captures.filter((item) => item.scenario === scenario).length).padStart(2, '0')}-${String(elapsedMs).replace('.', 'p')}ms.png`,
        scenario,
        elapsedMs,
        dataUrl: board.dataUrl,
        frame: board.frame,
        pixelProbe: board.pixelProbe,
        visibleLockedCells: snapshot.visibleLockedCells,
        cue: snapshot.ordinaryMultiLineClearCues[0] ?? null,
        phase: state.phase,
      });
    };

    const runScenario = async ({ scenario, count, mode = 'marathon', reducedMotion = false, targets }) => {
      const { rows, state } = makeState(count, mode);
      const committed = committedState(state);
      core.push({
        scenario,
        count,
        unchangedBeforeCommit: committed.unchangedBeforeCommit,
        boardChangedAtCommit: committed.boardChangedAtCommit,
        lineEvent: committed.events.find((event) => event.type === 'lines-cleared') ?? null,
      });
      renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion, modeSwitch: false });
      renderer.render(state, [{ type: 'restarted' }], 0);
      renderer.render(state, [{ type: 'clear-started', rows }], 0);
      let elapsed = 0;
      let didCommit = false;
      for (const target of targets) {
        if (!didCommit && target >= coreCommitMs) {
          const toCommit = coreCommitMs - elapsed;
          renderer.render(committed.state, committed.events, Math.max(0, toCommit));
          elapsed = coreCommitMs;
          didCommit = true;
        }
        if (target > elapsed) {
          const currentState = didCommit
            ? committed.state
            : { ...state, phaseTicks: Math.min(11, Math.floor(target / fixedStepMs)) };
          renderer.render(currentState, [], target - elapsed);
          elapsed = target;
        }
        const currentState = didCommit
          ? committed.state
          : { ...state, phaseTicks: Math.min(11, Math.floor(target / fixedStepMs)) };
        await capture(scenario, target, currentState);
      }
    };

    await runScenario({
      scenario: 'two-normal',
      count: 2,
      targets: [0, 32, 64, 96, 128, 160, 176, 180, 192],
    });
    await runScenario({
      scenario: 'four-normal',
      count: 4,
      targets: [
        0, 16.7, 33.3, 50, 66.7, 83.3, 100, 116.7, 133.3, 150, 166.7,
        180, 199.9, 200, 216.7, 233.3, 250, 266.7, 283.3, 299.9, 300,
      ],
    });
    await runScenario({
      scenario: 'four-reduced',
      count: 4,
      reducedMotion: true,
      targets: [0, 40, 80, 120, 160, 180, 199.9, 200, 250, 299.9, 300],
    });
    await runScenario({
      scenario: 'two-puzzle',
      count: 2,
      mode: 'puzzle',
      targets: [0, 40, 80, 120, 160, 180, 192, 199.9, 200, 250, 299.9, 300],
    });

    const cleanupState = makeState(4).state;
    renderer.setOptions({ reducedMotion: false, modeSwitch: false });
    renderer.render(cleanupState, [{ type: 'restarted' }], 0);
    renderer.render(cleanupState, [{ type: 'clear-started', rows: cleanupState.pendingClearRows }], 0);
    const cueBeforeModeSwitch = renderer.getSnapshot().ordinaryMultiLineClearCues.length;
    renderer.setOptions({ modeSwitch: true });
    renderer.render(cleanupState, [], 0);
    const cueAfterModeSwitch = renderer.getSnapshot().ordinaryMultiLineClearCues.length;

    const handoff = {
      first: presentation.classicLineClearCellSample(180, 0, 10, 0, 2, false),
      second: presentation.classicLineClearCellSample(180, 4, 10, 1, 2, false),
    };
    renderer.destroy();
    return {
      captures,
      core,
      constants: {
        studioOffsetsMs: timeline.STUDIO_LINE_CLEAR_OFFSETS_MS,
        sequenceMs: timeline.CLASSIC_LINE_CLEAR_SEQUENCE_MS,
        tailMs: timeline.CLASSIC_LINE_CLEAR_TAIL_MS,
        fixedStepMs,
        coreCommitMs,
      },
      handoff,
      cleanup: { cueBeforeModeSwitch, cueAfterModeSwitch },
      canvasCountAfterDestroy: document.querySelectorAll('canvas').length,
    };
  });

  for (const capture of rendererAudit.captures) {
    writeDataUrl(capture.file, capture.dataUrl);
    delete capture.dataUrl;
    requireEvidence(capture.pixelProbe.nonTransparentSamples > 0, `${capture.file} was blank`);
    requireEvidence(capture.pixelProbe.distinctBuckets >= 4, `${capture.file} lacked material variation`);
  }
  const capturesByKey = new Map(
    rendererAudit.captures.map((capture) => [`${capture.scenario}:${capture.elapsedMs}`, capture]),
  );
  requireEvidence(rendererAudit.constants.sequenceMs === 300, 'visual sequence was not 300 ms');
  requireEvidence(Math.abs(rendererAudit.constants.tailMs - 100) < 0.01, 'post-commit tail was not 100 ms');
  requireEvidence(
    JSON.stringify(rendererAudit.constants.studioOffsetsMs) === JSON.stringify({
      1: [0],
      2: [0, 180],
      3: [0, 90, 180],
      4: [0, 60, 120, 180],
    }),
    'accepted Studio offsets drifted',
  );
  requireEvidence(
    rendererAudit.handoff.first.complete === false
      && rendererAudit.handoff.first.alpha > 0
      && rendererAudit.handoff.second.active === true,
    'two-line 180 ms handoff did not overlap',
  );
  requireEvidence(
    capturesByKey.get('four-normal:33.3')?.visibleLockedCells === 43,
    'four-line center cells disappeared before an intermediate frame',
  );
  requireEvidence(
    capturesByKey.get('four-normal:33.3')?.cue?.visibleCellCount === 40,
    'four-line material cue hard-culled a cell at 33.3 ms',
  );
  requireEvidence(
    capturesByKey.get('four-normal:199.9')?.cue?.committed === false
      && capturesByKey.get('four-normal:200')?.cue?.committed === true,
    '200 ms Core commit did not preserve and mark the same visual cue',
  );
  requireEvidence(
    capturesByKey.get('four-normal:250')?.cue?.visibleCellCount > 0,
    'four-line visual cue ended before 250 ms',
  );
  requireEvidence(
    capturesByKey.get('four-normal:300')?.cue === null,
    'four-line visual cue outlived 300 ms',
  );
  requireEvidence(
    capturesByKey.get('four-reduced:80')?.cue?.restrained === true
      && capturesByKey.get('two-puzzle:80')?.cue?.restrained === true,
    'reduced-motion or Puzzle did not use restrained geometry',
  );
  for (const item of rendererAudit.core) {
    requireEvidence(item.unchangedBeforeCommit, `${item.scenario} Core changed before tick 12`);
    requireEvidence(item.boardChangedAtCommit, `${item.scenario} Core did not change at tick 12`);
    requireEvidence(item.lineEvent?.count === item.count, `${item.scenario} emitted the wrong clear event`);
  }
  requireEvidence(
    rendererAudit.cleanup.cueBeforeModeSwitch === 1
      && rendererAudit.cleanup.cueAfterModeSwitch === 0,
    'mode switch did not clear the renderer cue',
  );
  requireEvidence(rendererAudit.canvasCountAfterDestroy === 0, 'renderer destroy left a canvas');
  await rendererPage.close();

  const sheetPage = await browser.newPage({ viewport: { width: 1160, height: 900 }, deviceScaleFactor: 1 });
  const makeSheet = async (scenario, title, columns = 5) => {
    const captures = rendererAudit.captures.filter((capture) => capture.scenario === scenario);
    const cards = captures.map((capture) => {
      const image = fs.readFileSync(path.join(output, capture.file)).toString('base64');
      const cue = capture.cue
        ? `${capture.cue.visibleCellCount} cells · ${capture.cue.committed ? 'post' : 'pre'} commit`
        : 'cue complete';
      return `<figure><img src="data:image/png;base64,${image}"><figcaption>${capture.elapsedMs} ms<br>${cue}</figcaption></figure>`;
    }).join('');
    await sheetPage.setContent(`<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:24px;background:#071522;color:#e5f0f5;font:14px system-ui}
      h1{margin:0 0 18px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:12px}
      figure{margin:0;padding:8px;background:#0c2232;border:1px solid #22445a;border-radius:8px}
      img{display:block;width:100%;height:auto;background:#06111c}figcaption{padding-top:6px;line-height:1.35;color:#b9d1de}
    </style><h1>${title}</h1><div class="grid">${cards}</div>`);
    await sheetPage.waitForFunction(() => [...document.images].every((image) => image.complete));
    await sheetPage.screenshot({ path: path.join(output, `${scenario}-contact-sheet.png`), fullPage: true });
  };
  await makeSheet('two-normal', 'Two-line handoff — continuous 176 / 180 / 192 ms', 3);
  await makeSheet('four-normal', 'Four-line classic clear — real 300 ms renderer track', 5);
  await makeSheet('four-reduced', 'Reduced motion — stationary opacity track', 4);
  await makeSheet('two-puzzle', 'Puzzle — stationary opacity track', 4);
  await sheetPage.close();

  requireEvidence(browserErrors.length === 0, `browser emitted ${browserErrors.length} errors`);
  const changedPaths = execFileSync('git', ['diff', '--name-only', sourceBase, sourceSha], {
    cwd: root,
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  const expectedSourcePaths = [
    'src/animation/lineClearTimeline.test.ts',
    'src/animation/lineClearTimeline.ts',
    'src/game/render/TetrisRenderer.test.ts',
    'src/game/render/TetrisRenderer.ts',
    'src/game/render/presentation.test.ts',
    'src/game/render/presentation.ts',
  ];
  requireEvidence(
    JSON.stringify(changedPaths.sort()) === JSON.stringify(expectedSourcePaths.sort()),
    `source checkpoint paths were ${JSON.stringify(changedPaths)}`,
  );

  const audit = {
    result: failures.length === 0 ? 'PASS' : 'FAIL',
    sourceSha,
    sourceBase,
    sourceCommitPaths: changedPaths,
    origin,
    live: { before: liveBefore, restart, exit },
    renderer: rendererAudit,
    browserErrors,
    failures,
  };
  fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(failures.join('\n'));
  console.log(`PASS source=${sourceSha} captures=${rendererAudit.captures.length} consoleErrors=${browserErrors.length}`);
} finally {
  await browser.close();
}
