import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const output = path.resolve('docs/evidence/t37/gameplay-feedback-r1');
const origin = process.env.TETRAMORPH_EVIDENCE_ORIGIN ?? 'http://127.0.0.1:4188';
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
const closeTo = (actual, expected, tolerance = 1.25) => Math.abs(actual - expected) <= tolerance;

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
  observe(livePage, 'live');
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
  await livePage.screenshot({ path: path.join(output, 'live-marathon.png'), fullPage: true });

  const liveBefore = await livePage.evaluate(() => {
    globalThis.__T37_EVIDENCE_CANVAS__ = document.querySelector('canvas');
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      domCellCount: document.querySelectorAll('[data-game-cell]').length,
      qa: Boolean(globalThis.__TETRAMORPH_QA__),
      status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
      phase: globalThis.__TETRAMORPH_QA__?.getState().phase ?? null,
      renderer: globalThis.__TETRAMORPH_QA__?.getRendererSnapshot() ?? null,
    };
  });
  requireEvidence(liveBefore.canvasCount === 1, `live app canvas count was ${liveBefore.canvasCount}`);
  requireEvidence(liveBefore.domCellCount === 0, `live app exposed ${liveBefore.domCellCount} DOM cells`);
  requireEvidence(liveBefore.qa && liveBefore.status === 'playing', 'live QA surface was not playing');

  await livePage.locator('[data-testid="open-settings"]').click();
  await livePage.waitForFunction(() => {
    const control = document.querySelector('[data-testid="settings-restart"]');
    return control instanceof HTMLButtonElement && !control.disabled;
  });
  await livePage.locator('[data-testid="settings-restart"]').click();
  await livePage.waitForSelector('[data-testid="settings-sheet"]', { state: 'detached' });
  const restart = await livePage.evaluate(() => ({
    sameCanvas: globalThis.__T37_EVIDENCE_CANVAS__ === document.querySelector('canvas'),
    canvasCount: document.querySelectorAll('canvas').length,
    domCellCount: document.querySelectorAll('[data-game-cell]').length,
    status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
  }));
  requireEvidence(restart.sameCanvas && restart.canvasCount === 1, 'restart replaced or duplicated the gameplay canvas');
  requireEvidence(
    restart.domCellCount === 0 && ['ready', 'playing'].includes(restart.status),
    'restart did not preserve the canonical live topology',
  );

  await livePage.locator('[data-testid="exit-game"]').click();
  await livePage.locator('[role="dialog"] button.primary-action').click();
  await livePage.waitForSelector('[data-testid="mode-home"]');
  await livePage.waitForTimeout(350);
  const exit = await livePage.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas').length,
    qa: Boolean(globalThis.__TETRAMORPH_QA__),
    renderText: typeof globalThis.render_game_to_text,
  }));
  requireEvidence(exit.canvasCount === 0 && !exit.qa && exit.renderText === 'undefined', 'exit left canvas or QA lifecycle residue');
  await livePage.close();

  const rendererPage = await browser.newPage({ viewport: { width: 760, height: 940 }, deviceScaleFactor: 1 });
  observe(rendererPage, 'renderer');
  await rendererPage.goto(origin, { waitUntil: 'networkidle' });
  const rendererAudit = await rendererPage.evaluate(async () => {
    const [{ TetrisRenderer }, engine, boardModule, timeline] = await Promise.all([
      import('/src/game/render/TetrisRenderer.ts'),
      import('/src/game/core/engine.ts'),
      import('/src/game/core/board.ts'),
      import('/src/animation/lineClearTimeline.ts'),
    ]);
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.background = '#071724';
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

    for (const count of [2, 3, 4]) {
      const rows = Array.from({ length: count }, (_, index) => 40 - count + index);
      let board = boardModule.createBoard();
      for (const row of rows) {
        for (let x = 0; x < 10; x += 1) board = boardModule.setCell(board, x, row, ['I', 'T', 'L', 'S'][row % 4]);
      }
      board = boardModule.setCell(board, 2, rows[0] - 2, 'J');
      board = boardModule.setCell(board, 3, rows[0] - 2, 'J');
      board = boardModule.setCell(board, 3, rows[0] - 1, 'J');
      const base = {
        ...engine.createInitialState(0x3700 + count, 'marathon'),
        board,
        active: null,
        status: 'playing',
        phase: 'line-clear',
        phaseTicks: 0,
        pendingClearRows: [...rows].reverse(),
      };
      const releaseTicks = timeline.LINE_CLEAR_RELEASE_TICKS[count];
      for (let beat = 0; beat < releaseTicks.length; beat += 1) {
        const frame = { ...base, phaseTicks: releaseTicks[beat] };
        renderer.render(frame, [], 16.67);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const capture = renderer.captureBoardPng();
        const snapshot = renderer.getSnapshot();
        captures.push({
          file: `clear-${count}-beat-${beat + 1}.png`,
          count,
          beat: beat + 1,
          phaseTick: releaseTicks[beat],
          dataUrl: capture.dataUrl,
          visibleLockedCells: snapshot.visibleLockedCells,
          ordinaryLineClear: snapshot.ordinaryLineClear,
          frame: capture.frame,
          pixelProbe: capture.pixelProbe,
        });
      }

      const boardBefore = JSON.stringify(base.board);
      let current = base;
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
    }

    renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion: true });
    const rows = [36, 37, 38, 39];
    let reducedBoard = boardModule.createBoard();
    for (const row of rows) for (let x = 0; x < 10; x += 1) reducedBoard = boardModule.setCell(reducedBoard, x, row, 'I');
    const reducedState = {
      ...engine.createInitialState(0x37ff, 'marathon'),
      board: reducedBoard,
      active: null,
      status: 'playing',
      phase: 'line-clear',
      phaseTicks: 7,
      pendingClearRows: [...rows].reverse(),
    };
    renderer.render(reducedState, [], 16.67);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const reducedCapture = renderer.captureBoardPng();
    captures.push({
      file: 'clear-4-reduced-beat-3.png',
      count: 4,
      beat: 3,
      phaseTick: 7,
      reducedMotion: true,
      dataUrl: reducedCapture.dataUrl,
      visibleLockedCells: renderer.getSnapshot().visibleLockedCells,
      ordinaryLineClear: renderer.getSnapshot().ordinaryLineClear,
      frame: reducedCapture.frame,
      pixelProbe: reducedCapture.pixelProbe,
    });
    renderer.destroy();
    return { captures, core, canvasCountAfterDestroy: document.querySelectorAll('canvas').length };
  });

  for (const capture of rendererAudit.captures) {
    writeDataUrl(capture.file, capture.dataUrl);
    delete capture.dataUrl;
    const expectedRows = Array.from({ length: capture.beat }, (_, index) => 40 - capture.count + index);
    requireEvidence(
      JSON.stringify(capture.ordinaryLineClear?.releasedRows) === JSON.stringify(expectedRows),
      `${capture.file} released ${JSON.stringify(capture.ordinaryLineClear?.releasedRows)} instead of ${JSON.stringify(expectedRows)}`,
    );
  }
  for (const item of rendererAudit.core) {
    requireEvidence(item.unchangedDuringHold && item.beforePhaseTicks === 11, `${item.count}-line Core mutated before tick 12`);
    requireEvidence(item.boardChangedAtCommit && item.pendingAfterCommit.length === 0, `${item.count}-line Core did not commit atomically at tick 12`);
    requireEvidence(item.lineEvent?.count === item.count, `${item.count}-line Core emitted the wrong resolution event`);
  }
  requireEvidence(rendererAudit.canvasCountAfterDestroy === 0, 'isolated renderer left a canvas after destroy');
  await rendererPage.close();

  const audioPage = await browser.newPage();
  observe(audioPage, 'audio');
  await audioPage.goto(origin, { waitUntil: 'networkidle' });
  const audioAudit = await audioPage.evaluate(async () => {
    const [{ AudioEngine }, { createBrowserPlatform }] = await Promise.all([
      import('/src/game/audio/AudioEngine.ts'),
      import('/src/platform/browserPlatform.ts'),
    ]);

    const makeHarness = () => {
      const context = new AudioContext();
      const starts = [];
      const filters = [];
      const originalOscillator = context.createOscillator.bind(context);
      const originalBufferSource = context.createBufferSource.bind(context);
      const originalFilter = context.createBiquadFilter.bind(context);
      context.createOscillator = () => {
        const node = originalOscillator();
        const start = node.start.bind(node);
        node.start = (at = 0, ...rest) => { starts.push({ kind: 'oscillator', at }); return start(at, ...rest); };
        return node;
      };
      context.createBufferSource = () => {
        const node = originalBufferSource();
        const start = node.start.bind(node);
        node.start = (at = 0, ...rest) => { starts.push({ kind: 'buffer', at }); return start(at, ...rest); };
        return node;
      };
      context.createBiquadFilter = () => {
        const node = originalFilter();
        const record = { node, frequency: null, q: null };
        const setFrequency = node.frequency.setValueAtTime.bind(node.frequency);
        const setQ = node.Q.setValueAtTime.bind(node.Q);
        node.frequency.setValueAtTime = (value, at) => {
          record.frequency = { value, at };
          return setFrequency(value, at);
        };
        node.Q.setValueAtTime = (value, at) => {
          record.q = { value, at };
          return setQ(value, at);
        };
        filters.push(record);
        return node;
      };
      return { context, starts, filters };
    };
    const loader = async (url) => (await fetch(url)).arrayBuffer();

    const clearHarness = makeHarness();
    const clearEngine = new AudioEngine(
      createBrowserPlatform({ audioContextFactory: () => clearHarness.context }),
      loader,
    );
    await clearEngine.prime();
    const clearStartIndex = clearHarness.starts.length;
    clearEngine.play([{ type: 'clear-started', rows: [39, 36, 38, 37] }]);
    const clearRecords = clearHarness.starts.slice(clearStartIndex).filter((entry) => entry.kind === 'buffer');
    const clearOrigin = clearRecords[0]?.at ?? 0;
    const clearOffsetsMs = clearRecords.map((entry) => Math.round((entry.at - clearOrigin) * 1_000));
    clearEngine.destroy();

    const bombHarness = makeHarness();
    const bombEngine = new AudioEngine(
      createBrowserPlatform({ audioContextFactory: () => bombHarness.context }),
      loader,
    );
    await bombEngine.prime();
    const bombStartIndex = bombHarness.starts.length;
    bombEngine.play([{ type: 'mutation-activated', item: 'bomb', durationTicks: 0, score: 1200, rowsRemoved: 3 }]);
    const bombRecords = bombHarness.starts.slice(bombStartIndex);
    const bombOrigin = Math.min(...bombRecords.map((entry) => entry.at));
    const oscillatorOffsetsMs = bombRecords
      .filter((entry) => entry.kind === 'oscillator')
      .map((entry) => Math.round((entry.at - bombOrigin) * 1_000));
    const noiseOffsetsMs = bombRecords
      .filter((entry) => entry.kind === 'buffer')
      .map((entry) => Math.round((entry.at - bombOrigin) * 1_000));
    const lowPass = bombHarness.filters.map((record) => ({
      type: record.node.type,
      frequency: Math.round(record.frequency?.value ?? record.node.frequency.value),
      q: Math.round((record.q?.value ?? record.node.Q.value) * 100) / 100,
    }));
    bombEngine.destroy();
    return { clearOffsetsMs, oscillatorOffsetsMs, noiseOffsetsMs, lowPass };
  });
  requireEvidence(
    audioAudit.clearOffsetsMs.length === 4 && audioAudit.clearOffsetsMs.every((value, index) => closeTo(value, [0, 60, 120, 180][index])),
    `Studio clear offsets were ${JSON.stringify(audioAudit.clearOffsetsMs)}`,
  );
  requireEvidence(
    audioAudit.oscillatorOffsetsMs.length === 3 && audioAudit.oscillatorOffsetsMs.every((value, index) => closeTo(value, [0, 220, 235][index])),
    `Bomb oscillator offsets were ${JSON.stringify(audioAudit.oscillatorOffsetsMs)}`,
  );
  requireEvidence(
    audioAudit.noiseOffsetsMs.length === 1 && closeTo(audioAudit.noiseOffsetsMs[0], 220),
    `Bomb air offset was ${JSON.stringify(audioAudit.noiseOffsetsMs)}`,
  );
  requireEvidence(
    audioAudit.lowPass.some((filter) => filter.type === 'lowpass' && filter.frequency === 880 && filter.q === 0.55),
    `Bomb low-pass contract was ${JSON.stringify(audioAudit.lowPass)}`,
  );
  await audioPage.close();

  requireEvidence(browserErrors.length === 0, `browser emitted ${browserErrors.length} error(s)`);
  const audit = {
    task: 'T37 live-play feedback correction R1',
    sourceSha,
    origin,
    capturedAt: new Date().toISOString(),
    live: { before: liveBefore, restart, exit },
    renderer: rendererAudit,
    audio: audioAudit,
    prescribedClient: {
      directory: 'client-final',
      screenshot: 'client-final/shot-0.png',
      state: 'client-final/state-0.json',
      errorArtifacts: [],
    },
    browserErrors,
    failures,
    pass: failures.length === 0,
  };
  fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(`Evidence failed:\n- ${failures.join('\n- ')}`);
  console.log(`PASS source=${sourceSha} frames=${rendererAudit.captures.length + 1} errors=${browserErrors.length}`);
} finally {
  await browser.close();
}
