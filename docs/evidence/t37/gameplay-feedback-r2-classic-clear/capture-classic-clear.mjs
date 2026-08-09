import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const output = path.resolve('docs/evidence/t37/gameplay-feedback-r2-classic-clear');
const origin = process.env.TETRAMORPH_EVIDENCE_ORIGIN ?? 'http://127.0.0.1:4189';
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
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
    if (message.type() === 'error') browserErrors.push({ page: label, type: 'console.error', text: message.text() });
  });
  page.on('pageerror', (error) => browserErrors.push({ page: label, type: 'pageerror', text: String(error) }));
};

try {
  const livePage = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  observe(livePage, 'live-desktop');
  await livePage.goto(origin, { waitUntil: 'networkidle' });
  await livePage.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', 'zh-CN');
    localStorage.setItem('tetramorph:visual-theme:v1', 'deep-tide');
    localStorage.setItem('tetramorph:reduced-motion:v1', 'off');
    localStorage.setItem('tetramorph:mode-rule-intros:v1', JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']));
  });
  await livePage.reload({ waitUntil: 'networkidle' });
  await livePage.evaluate(() => document.fonts.ready);
  await livePage.locator('[data-testid="enter-marathon"]').click();
  await livePage.waitForSelector('[data-testid="entry-countdown"]', { state: 'visible', timeout: 3_000 });
  await livePage.waitForSelector('[data-testid="entry-countdown"]', { state: 'detached', timeout: 7_000 });
  await livePage.waitForSelector('[data-testid="game-screen"]');
  await livePage.screenshot({ path: path.join(output, 'live-marathon-zh.png'), fullPage: true });

  const liveBefore = await livePage.evaluate(() => {
    globalThis.__T37_CLASSIC_CLEAR_CANVAS__ = document.querySelector('canvas');
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      domCellCount: document.querySelectorAll('[data-game-cell]').length,
      qa: Boolean(globalThis.__TETRAMORPH_QA__),
      status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
      viewportOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
  requireEvidence(liveBefore.canvasCount === 1, `live canvas count was ${liveBefore.canvasCount}`);
  requireEvidence(liveBefore.domCellCount === 0, `live app exposed ${liveBefore.domCellCount} DOM board cells`);
  requireEvidence(liveBefore.qa && liveBefore.status === 'playing', 'live QA surface was not playing');
  requireEvidence(liveBefore.viewportOverflow === 0, `desktop overflow was ${liveBefore.viewportOverflow}px`);

  await livePage.locator('[data-testid="open-settings"]').click();
  await livePage.waitForFunction(() => {
    const control = document.querySelector('[data-testid="settings-restart"]');
    return control instanceof HTMLButtonElement && !control.disabled;
  });
  await livePage.locator('[data-testid="settings-restart"]').click();
  await livePage.waitForSelector('[data-testid="settings-sheet"]', { state: 'detached' });
  const restart = await livePage.evaluate(() => ({
    sameCanvas: globalThis.__T37_CLASSIC_CLEAR_CANVAS__ === document.querySelector('canvas'),
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-game-cell]').length,
    status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
  }));
  requireEvidence(restart.sameCanvas && restart.canvasCount === 1, 'restart replaced or duplicated the gameplay canvas');
  requireEvidence(restart.domCellCount === 0 && ['ready', 'playing'].includes(restart.status), 'restart topology was invalid');

  await livePage.locator('[data-testid="exit-game"]').click();
  await livePage.locator('[role="dialog"] button.primary-action').click();
  await livePage.waitForSelector('[data-testid="mode-home"]');
  await livePage.waitForTimeout(250);
  const exit = await livePage.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas').length,
    qa: Boolean(globalThis.__TETRAMORPH_QA__),
    renderText: typeof globalThis.render_game_to_text,
  }));
  requireEvidence(exit.canvasCount === 0 && !exit.qa && exit.renderText === 'undefined', 'exit left canvas or QA residue');
  await livePage.close();

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  observe(mobilePage, 'live-mobile');
  await mobilePage.goto(origin, { waitUntil: 'networkidle' });
  await mobilePage.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('tetramorph:language:v1', 'en');
    localStorage.setItem('tetramorph:visual-theme:v1', 'mineral-mist');
    localStorage.setItem('tetramorph:reduced-motion:v1', 'off');
    localStorage.setItem('tetramorph:mode-rule-intros:v1', JSON.stringify(['marathon', 'race', 'sprint', 'puzzle']));
  });
  await mobilePage.reload({ waitUntil: 'networkidle' });
  await mobilePage.locator('[data-testid="enter-marathon"]').click();
  await mobilePage.waitForSelector('[data-testid="entry-countdown"]', { state: 'detached', timeout: 7_000 });
  await mobilePage.waitForSelector('[data-testid="game-screen"]');
  await mobilePage.screenshot({ path: path.join(output, 'live-marathon-mobile-en.png'), fullPage: true });
  const mobile = await mobilePage.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-game-cell]').length,
    overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    boardWidth: document.querySelector('[data-testid="board-frame"]')?.getBoundingClientRect().width ?? 0,
  }));
  requireEvidence(mobile.canvasCount === 1 && mobile.domCellCount === 0, 'mobile topology was invalid');
  requireEvidence(mobile.overflow === 0 && mobile.boardWidth > 0 && mobile.boardWidth <= 390, 'mobile board overflowed');
  await mobilePage.close();

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
          ...engine.createInitialState(0x3700 + count, mode),
          board,
          active: null,
          status: 'playing',
          phase: 'line-clear',
          phaseTicks: 0,
          pendingClearRows: [...rows].reverse(),
          ...(mode === 'puzzle'
            ? { puzzleTargetCells: rows.flatMap((row) => Array.from({ length: 10 }, (_, x) => ({ x, y: row }))) }
            : {}),
        },
      };
    };

    const capture = async (file, state, details = {}) => {
      renderer.render(state, [], 0);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const board = renderer.captureBoardPng();
      captures.push({
        file,
        ...details,
        phaseTick: state.phaseTicks,
        dataUrl: board.dataUrl,
        visibleLockedCells: renderer.getSnapshot().visibleLockedCells,
        ordinaryLineClear: renderer.getSnapshot().ordinaryLineClear,
        frame: board.frame,
        pixelProbe: board.pixelProbe,
      });
    };

    const tickSets = {
      2: [0, 1, 2, 3, 11],
      3: [0, 5, 11],
      4: [0, 1, 2, 3, 4, 7, 11],
    };
    for (const count of [2, 3, 4]) {
      const { rows, state } = makeState(count);
      for (const phaseTick of tickSets[count]) {
        await capture(`clear-${count}-tick-${phaseTick}.png`, { ...state, phaseTicks: phaseTick }, { count, rows });
      }

      const boardBefore = JSON.stringify(state.board);
      let current = state;
      let unchangedDuringHold = true;
      for (let tick = 0; tick < 11; tick += 1) {
        const transition = engine.dispatch(current, { type: 'tick' });
        current = transition.state;
        unchangedDuringHold &&= JSON.stringify(current.board) === boardBefore;
      }
      const committed = engine.dispatch(current, { type: 'tick' });
      core.push({
        count,
        unchangedDuringHold,
        beforePhaseTicks: current.phaseTicks,
        committedPhase: committed.state.phase,
        pendingAfterCommit: committed.state.pendingClearRows,
        boardChangedAtCommit: JSON.stringify(committed.state.board) !== boardBefore,
        lineEvent: committed.events.find((event) => event.type === 'lines-cleared') ?? null,
      });

      if (count === 4) {
        renderer.render({ ...state, phaseTicks: 11 }, [], 0);
        renderer.render(committed.state, committed.events, 0);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        let board = renderer.captureBoardPng();
        captures.push({
          file: 'clear-4-tail-0.png',
          count,
          tailVisibleCells: renderer.ordinaryLineClearTails?.[0]?.cells.length ?? 0,
          dataUrl: board.dataUrl,
          visibleLockedCells: renderer.getSnapshot().visibleLockedCells,
          ordinaryLineClear: renderer.getSnapshot().ordinaryLineClear,
          frame: board.frame,
          pixelProbe: board.pixelProbe,
        });
        renderer.render(committed.state, [], timeline.LINE_CLEAR_FIXED_STEP_MS);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        board = renderer.captureBoardPng();
        const tail = renderer.ordinaryLineClearTails?.[0];
        const tailElapsedTicks = (tail?.elapsedAtCommitTicks ?? 0) + (tail?.elapsed ?? 0) / timeline.LINE_CLEAR_FIXED_STEP_MS;
        const tailVisibleCells = tail?.cells.filter(({ cell }) => (
          !presentation.classicLineClearCellErased(tailElapsedTicks, cell.x, 10, false)
        )).length ?? 0;
        captures.push({
          file: 'clear-4-tail-1.png',
          count,
          tailVisibleCells,
          dataUrl: board.dataUrl,
          visibleLockedCells: renderer.getSnapshot().visibleLockedCells,
          ordinaryLineClear: renderer.getSnapshot().ordinaryLineClear,
          frame: board.frame,
          pixelProbe: board.pixelProbe,
        });
        renderer.render(committed.state, [], timeline.LINE_CLEAR_FIXED_STEP_MS);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        board = renderer.captureBoardPng();
        captures.push({
          file: 'clear-4-committed.png',
          count,
          tailVisibleCells: renderer.ordinaryLineClearTails?.length ?? 0,
          dataUrl: board.dataUrl,
          visibleLockedCells: renderer.getSnapshot().visibleLockedCells,
          ordinaryLineClear: renderer.getSnapshot().ordinaryLineClear,
          frame: board.frame,
          pixelProbe: board.pixelProbe,
        });
      }
    }

    const four = makeState(4).state;
    for (const theme of ['mineral-mist', 'deep-tide', 'sunstone']) {
      renderer.setOptions({ visualTheme: theme, reducedMotion: false });
      await capture(`clear-4-centre-gap-${theme}.png`, { ...four, phaseTicks: 1 }, { count: 4, theme });
    }

    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: true });
    await capture('clear-4-reduced-beat-3.png', { ...four, phaseTicks: 7 }, { count: 4, reducedMotion: true });
    await capture('clear-4-reduced-after-beat-3.png', { ...four, phaseTicks: 8 }, { count: 4, reducedMotion: true });

    const puzzle = makeState(2, 'puzzle').state;
    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: false });
    await capture('clear-2-puzzle-flash.png', { ...puzzle, phaseTicks: 0 }, { count: 2, puzzle: true });
    await capture('clear-2-puzzle-after-flash.png', { ...puzzle, phaseTicks: 1 }, { count: 2, puzzle: true });

    renderer.destroy();
    return {
      captures,
      core,
      constants: {
        releaseTicks: timeline.LINE_CLEAR_RELEASE_TICKS,
        eraseTicks: timeline.CLASSIC_LINE_CLEAR_ERASE_TICKS,
        tailTicks: timeline.CLASSIC_LINE_CLEAR_TAIL_TICKS,
      },
      canvasCountAfterDestroy: document.querySelectorAll('canvas').length,
    };
  });

  for (const capture of rendererAudit.captures) {
    writeDataUrl(capture.file, capture.dataUrl);
    delete capture.dataUrl;
    requireEvidence(capture.pixelProbe.nonTransparentSamples > 0, `${capture.file} was blank`);
    requireEvidence(capture.pixelProbe.distinctBuckets >= 4, `${capture.file} lacked visible material variation`);
  }
  const capturesByFile = new Map(rendererAudit.captures.map((capture) => [capture.file, capture]));
  requireEvidence(capturesByFile.get('clear-4-tick-0.png')?.visibleLockedCells === 43, 'four-line confirmation flash hid cells');
  requireEvidence(capturesByFile.get('clear-4-tick-1.png')?.visibleLockedCells === 41, 'four-line centre pair was not first');
  requireEvidence(capturesByFile.get('clear-4-tick-2.png')?.visibleLockedCells === 37, 'four-line centre six stage was wrong');
  requireEvidence(capturesByFile.get('clear-4-tick-3.png')?.visibleLockedCells === 33, 'four-line first row did not finish in three ticks');
  requireEvidence(capturesByFile.get('clear-4-tick-4.png')?.visibleLockedCells === 33, 'second row flash did not preserve its cells');
  requireEvidence(capturesByFile.get('clear-4-tick-7.png')?.visibleLockedCells === 23, 'third row flash order was wrong');
  requireEvidence(capturesByFile.get('clear-4-tick-11.png')?.visibleLockedCells === 13, 'final row flash order was wrong');
  requireEvidence(capturesByFile.get('clear-4-tail-0.png')?.tailVisibleCells === 8, 'commit bridge did not begin with eight cells');
  requireEvidence(capturesByFile.get('clear-4-tail-1.png')?.tailVisibleCells === 4, 'commit bridge did not narrow to four cells');
  requireEvidence(capturesByFile.get('clear-4-committed.png')?.tailVisibleCells === 0, 'commit bridge outlived two ticks');
  requireEvidence(capturesByFile.get('clear-4-reduced-beat-3.png')?.visibleLockedCells === 23, 'reduced beat did not retain the flashing row');
  requireEvidence(capturesByFile.get('clear-4-reduced-after-beat-3.png')?.visibleLockedCells === 13, 'reduced row did not resolve discretely');
  requireEvidence(capturesByFile.get('clear-2-puzzle-flash.png')?.visibleLockedCells === 23, 'Puzzle flash hid the target row early');
  requireEvidence(capturesByFile.get('clear-2-puzzle-after-flash.png')?.visibleLockedCells === 13, 'Puzzle stationary erase did not resolve');
  for (const item of rendererAudit.core) {
    requireEvidence(item.unchangedDuringHold && item.beforePhaseTicks === 11, `${item.count}-line Core changed before tick 12`);
    requireEvidence(item.boardChangedAtCommit && item.pendingAfterCommit.length === 0, `${item.count}-line Core did not commit atomically`);
    requireEvidence(item.lineEvent?.count === item.count, `${item.count}-line Core emitted the wrong event`);
  }
  requireEvidence(rendererAudit.constants.eraseTicks === 3 && rendererAudit.constants.tailTicks === 2, 'classic timing constants drifted');
  requireEvidence(rendererAudit.canvasCountAfterDestroy === 0, 'isolated renderer left a canvas after destroy');
  await rendererPage.close();

  requireEvidence(browserErrors.length === 0, `browser emitted ${browserErrors.length} errors`);
  const changedPaths = execFileSync('git', ['diff', '--name-only', `${sourceSha}^`, sourceSha], {
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
  requireEvidence(JSON.stringify(changedPaths.sort()) === JSON.stringify(expectedSourcePaths.sort()), `source checkpoint paths were ${JSON.stringify(changedPaths)}`);

  const audit = {
    result: failures.length === 0 ? 'PASS' : 'FAIL',
    sourceSha,
    sourceCommitPaths: changedPaths,
    origin,
    live: { before: liveBefore, restart, exit, mobile },
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
