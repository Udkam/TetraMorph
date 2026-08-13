import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const root = path.resolve('.');
const output = path.resolve('docs/evidence/t37/bomb-presentation-final');
const expectedSourceSha = '4d39951421234c8465960c4b81c6a7df7e0a804d';
const sourceSha = process.env.TETRAMORPH_SOURCE_SHA ?? expectedSourceSha;
const host = '127.0.0.1';
fs.mkdirSync(output, { recursive: true });

const failures = [];
const browserErrors = [];
const requireEvidence = (condition, message) => { if (!condition) failures.push(message); };
const writeDataUrl = (name, dataUrl) => {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error(`Malformed data URL for ${name}`);
  fs.writeFileSync(path.join(output, name), Buffer.from(dataUrl.slice(comma + 1), 'base64'));
};
const observe = (page, label) => {
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push({ page: label, type: 'console.error', text: message.text() });
  });
  page.on('pageerror', (error) => browserErrors.push({ page: label, type: 'pageerror', text: String(error) }));
};

execFileSync('git', ['cat-file', '-e', `${sourceSha}^{commit}`], { cwd: root, stdio: 'ignore' });
const productBindingPaths = Object.freeze([
  'src',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
]);
execFileSync('git', ['diff', '--quiet', sourceSha, '--', ...productBindingPaths], { cwd: root, stdio: 'ignore' });

const server = await createViteServer({
  root,
  appType: 'spa',
  logLevel: 'error',
  server: { host, port: 0, strictPort: false },
});
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === 'string') throw new Error('Vite did not expose a listening port.');
const origin = `http://${host}:${address.port}`;
const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader'],
});

try {
  const livePage = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  observe(livePage, 'live-mutation');
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
  await livePage.getByTestId('enter-sprint').click();
  await livePage.getByTestId('game-screen').waitFor({ state: 'visible' });
  await livePage.getByTestId('entry-countdown').waitFor({ state: 'detached', timeout: 12_000 });
  const inputBefore = await livePage.evaluate(() => {
    const state = globalThis.__TETRAMORPH_QA__?.getState();
    return {
      active: state?.active ? { ...state.active } : null,
      score: state?.score ?? null,
      lockedCells: state?.board.flat().filter(Boolean).length ?? null,
    };
  });
  await livePage.keyboard.press('ArrowLeft');
  await livePage.waitForTimeout(40);
  const afterLeft = await livePage.evaluate(() => {
    const state = globalThis.__TETRAMORPH_QA__?.getState();
    return state?.active ? { ...state.active } : null;
  });
  await livePage.keyboard.press('ArrowUp');
  await livePage.waitForTimeout(40);
  const afterRotate = await livePage.evaluate(() => {
    const state = globalThis.__TETRAMORPH_QA__?.getState();
    return state?.active ? { ...state.active } : null;
  });
  await livePage.keyboard.press('Space');
  await livePage.waitForFunction((previousLockedCells) => (
    (globalThis.__TETRAMORPH_QA__?.getState().board.flat().filter(Boolean).length ?? 0) > previousLockedCells
  ), inputBefore.lockedCells, { timeout: 2_000 });
  const afterHardDrop = await livePage.evaluate(() => {
    const state = globalThis.__TETRAMORPH_QA__?.getState();
    return {
      score: state?.score ?? null,
      lockedCells: state?.board.flat().filter(Boolean).length ?? null,
    };
  });
  await livePage.screenshot({ path: path.join(output, 'live-mutation-zh.png'), fullPage: true });
  const liveBefore = await livePage.evaluate(() => {
    globalThis.__T37_BOMB_CANVAS__ = document.querySelector('canvas');
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      domCellCount: document.querySelectorAll('[data-game-cell], [data-cell], .board-cell').length,
      qa: Boolean(globalThis.__TETRAMORPH_QA__),
      status: globalThis.__TETRAMORPH_QA__?.getState().status ?? null,
      renderText: typeof globalThis.render_game_to_text,
      viewportOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
  requireEvidence(liveBefore.canvasCount === 1, `live canvas count was ${liveBefore.canvasCount}`);
  requireEvidence(liveBefore.domCellCount === 0, `live app exposed ${liveBefore.domCellCount} DOM cells`);
  requireEvidence(liveBefore.qa && liveBefore.status === 'playing', 'live QA surface was not playing');
  requireEvidence(liveBefore.renderText === 'function', 'render_game_to_text was unavailable');
  requireEvidence(liveBefore.viewportOverflow === 0, `desktop overflow was ${liveBefore.viewportOverflow}px`);
  requireEvidence(afterLeft?.x === (inputBefore.active?.x ?? Number.NaN) - 1, 'ArrowLeft did not move the active piece left');
  requireEvidence(afterRotate?.rotation !== afterLeft?.rotation, 'ArrowUp did not rotate the active piece');
  requireEvidence(
    afterHardDrop.lockedCells > inputBefore.lockedCells && afterHardDrop.score > inputBefore.score,
    'Space did not hard-drop and lock the active piece',
  );

  await livePage.getByTestId('open-settings').click();
  await livePage.waitForFunction(() => {
    const control = document.querySelector('[data-testid="settings-restart"]');
    return control instanceof HTMLButtonElement && !control.disabled;
  });
  await livePage.getByTestId('settings-restart').click();
  await livePage.getByTestId('settings-sheet').waitFor({ state: 'detached' });
  const restart = await livePage.evaluate(() => ({
    sameCanvas: globalThis.__T37_BOMB_CANVAS__ === document.querySelector('canvas'),
    canvasCount: document.querySelectorAll('canvas').length,
    queueItems: globalThis.__TETRAMORPH_QA__?.getRendererSnapshot().mutationActivationQueueItems ?? null,
  }));
  requireEvidence(restart.sameCanvas && restart.canvasCount === 1, 'restart replaced or duplicated the Canvas');
  requireEvidence(Array.isArray(restart.queueItems) && restart.queueItems.length === 0, 'restart retained a Mutation queue');

  await livePage.getByTestId('exit-game').click();
  await livePage.locator('[role="dialog"] button.primary-action').click();
  await livePage.getByTestId('mode-home').waitFor({ state: 'visible' });
  await livePage.waitForTimeout(120);
  const exit = await livePage.evaluate(() => ({
    canvasCount: document.querySelectorAll('canvas').length,
    qa: Boolean(globalThis.__TETRAMORPH_QA__),
    renderText: typeof globalThis.render_game_to_text,
  }));
  requireEvidence(exit.canvasCount === 0 && !exit.qa && exit.renderText === 'undefined', 'exit left Canvas, QA, or text-state residue');
  await livePage.close();

  const rendererPage = await browser.newPage({ viewport: { width: 760, height: 940 }, deviceScaleFactor: 1 });
  observe(rendererPage, 'source-bound-renderer');
  await rendererPage.goto(origin, { waitUntil: 'networkidle' });
  const rendererAudit = await rendererPage.evaluate(async () => {
    const [{ TetrisRenderer }, engine, boardModule, constants, chainTimeline] = await Promise.all([
      import('/src/game/render/TetrisRenderer.ts'),
      import('/src/game/core/engine.ts'),
      import('/src/game/core/board.ts'),
      import('/src/game/core/constants.ts'),
      import('/src/animation/mutationChainTimeline.ts'),
    ]);
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.background = '#071522';
    const hostElement = document.createElement('div');
    hostElement.style.width = '720px';
    hostElement.style.height = '920px';
    hostElement.style.margin = '0 auto';
    document.body.append(hostElement);
    const renderer = new TetrisRenderer();
    await renderer.init(hostElement);
    const waitFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const captures = [];
    const pixelFrames = new Map();

    const decodePixels = async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Pixel proof could not create a 2D context.');
      context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
    };
    const regionDifference = (left, right, xStart, xEnd, yStart, yEnd) => {
      if (left.width !== right.width || left.height !== right.height) throw new Error('Pixel proof dimensions drifted.');
      const startX = Math.max(0, Math.floor(xStart));
      const endX = Math.min(left.width, Math.ceil(xEnd));
      const startY = Math.max(0, Math.floor(yStart));
      const endY = Math.min(left.height, Math.ceil(yEnd));
      let total = 0;
      let samples = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const offset = (y * left.width + x) * 4;
          total += Math.abs(left.data[offset] - right.data[offset]);
          total += Math.abs(left.data[offset + 1] - right.data[offset + 1]);
          total += Math.abs(left.data[offset + 2] - right.data[offset + 2]);
          samples += 3;
        }
      }
      return samples === 0 ? 0 : total / samples;
    };
    const emptyBoardInteriorDifference = (left, right) => regionDifference(
      left,
      right,
      left.width * .12,
      left.width * .88,
      left.height * .08,
      left.height * .68,
    );
    const rowDifferences = (left, right) => Array.from({ length: 20 }, (_, row) => (
      regionDifference(left, right, left.width * .04, left.width * .96, row * left.height / 20, (row + 1) * left.height / 20)
    ));
    const cellPatchDifference = (left, right, cell) => {
      const cellWidth = left.width / 10;
      const cellHeight = left.height / 20;
      const visibleY = cell.y - 20;
      return regionDifference(
        left,
        right,
        (cell.x + .28) * cellWidth,
        (cell.x + .72) * cellWidth,
        (visibleY + .28) * cellHeight,
        (visibleY + .72) * cellHeight,
      );
    };
    const frame = (scenario, label) => {
      const value = pixelFrames.get(`${scenario}:${label}`);
      if (!value) throw new Error(`Missing pixel frame ${scenario}:${label}`);
      return value;
    };

    const playingMutation = (seed) => engine.dispatch(engine.createInitialState(seed, 'sprint'), { type: 'start' }).state;
    const countLocked = (state) => state.board.flat().filter(Boolean).length;
    const activation = (events) => events.find((event) => event.type === 'mutation-activated' && event.item === 'bomb') ?? null;
    const capture = async (scenario, label, elapsedMs, state) => {
      await waitFrame();
      const board = renderer.captureBoardPng();
      const snapshot = renderer.getSnapshot();
      pixelFrames.set(`${scenario}:${label}`, await decodePixels(board.dataUrl));
      captures.push({
        scenario,
        label,
        elapsedMs,
        file: `${scenario}-${label}.png`,
        dataUrl: board.dataUrl,
        pixelProbe: board.pixelProbe,
        visibleLockedCells: snapshot.visibleLockedCells,
        ordinaryCueCount: snapshot.ordinaryMultiLineClearCues.length,
        mutationActivation: snapshot.mutationActivation,
        stateLockedCells: countLocked(state),
      });
    };
    const reset = (state, reducedMotion = false) => {
      renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion, modeSwitch: false });
      renderer.render(state, [{ type: 'restarted' }], 0);
    };
    const resolveCommit = (started) => {
      let transition = started;
      for (let tick = 0; tick < constants.LINE_CLEAR_DELAY_TICKS; tick += 1) {
        transition = engine.dispatch(transition.state, { type: 'tick' });
      }
      return transition;
    };

    const makeChain = () => {
      let board = boardModule.createBoard();
      for (let x = 0; x < 8; x += 1) board = boardModule.setCell(board, x, 30, 'J');
      board = boardModule.setCell(board, 4, 29, 'T');
      board = boardModule.setCell(board, 8, 31, 'S');
      board = boardModule.setCell(board, 9, 31, 'S');
      const state = {
        ...playingMutation(0x37b0),
        board,
        active: { type: 'O', rotation: 0, x: 8, y: 29 },
        mutationActiveCarrier: { id: 1, item: 'bomb' },
        mutationNextCarrierId: 3,
        mutationCarriers: [{ id: 2, item: 'bomb', cells: [{ x: 4, y: 29 }] }],
        score: 0,
        lines: 0,
      };
      const started = engine.dispatch(state, { type: 'hard-drop' });
      const committed = resolveCommit(started);
      return { preClear: state, started, committed, bomb: activation(committed.events) };
    };

    const runChain = async (scenario, reducedMotion) => {
      const chain = makeChain();
      if (chain.bomb?.bombOutcome !== 'chain-clear') throw new Error(`${scenario} did not produce chain-clear`);
      reset(chain.preClear, reducedMotion);
      renderer.render(chain.started.state, chain.started.events, 0);
      await capture(scenario, 'precommit-start', 0, chain.started.state);
      renderer.render(chain.started.state, [], 199.9);
      await capture(scenario, 'precommit-tail', 199.9, chain.started.state);
      renderer.render(chain.committed.state, chain.committed.events, 0);
      const plan = chainTimeline.mutationChainPresentationPlan(chain.bomb.chainOriginCells, reducedMotion);
      const targets = [
        ['origin', 0],
        ['before-first-beat', plan.revealMs - 1],
        ['first-beat', plan.revealMs],
        ['second-beat', plan.revealMs + plan.beatMs],
        ['mid-wave', Math.round((plan.durationMs - plan.fadeMs) * .58)],
        ['tail', plan.durationMs - 1],
        ['complete', plan.durationMs],
      ];
      let elapsed = 0;
      for (const [label, target] of targets) {
        renderer.render(chain.committed.state, [], target - elapsed);
        elapsed = target;
        await capture(scenario, label, target, chain.committed.state);
      }
      return {
        startEvent: chain.started.events.find((event) => event.type === 'clear-started') ?? null,
        bombEvent: chain.bomb,
        plan,
        boardEmptyAfterCommit: chain.committed.state.board.flat().every((cell) => cell === null),
      };
    };

    const fullChain = await runChain('chain-full', false);
    const reducedChain = await runChain('chain-reduced', true);

    let disjointBoard = boardModule.createBoard();
    for (const row of [30, 39]) for (let x = 0; x < 10; x += 1) disjointBoard = boardModule.setCell(disjointBoard, x, row, 'J');
    disjointBoard = boardModule.setCell(disjointBoard, 0, 28, 'S');
    const disjointState = {
      ...playingMutation(0x37b1),
      board: disjointBoard,
      active: null,
      phase: 'line-clear',
      phaseTicks: constants.LINE_CLEAR_DELAY_TICKS - 1,
      pendingClearRows: [30, 39],
      mutationCarriers: [
        { id: 8, item: 'bomb', cells: [{ x: 8, y: 39 }] },
        { id: 3, item: 'bomb', cells: [{ x: 3, y: 30 }] },
      ],
      score: 0,
      lines: 0,
    };
    const disjointCommit = engine.dispatch(disjointState, { type: 'tick' });
    const disjointBomb = activation(disjointCommit.events);
    reset(disjointState);
    renderer.render(disjointCommit.state, [], 0);
    await capture('normal-disjoint', 'baseline', 0, disjointCommit.state);
    reset(disjointState);
    renderer.render(disjointCommit.state, disjointCommit.events, 0);
    await capture('normal-disjoint', 'warning', 0, disjointCommit.state);
    renderer.render(disjointCommit.state, [], 220);
    await capture('normal-disjoint', 'impact', 220, disjointCommit.state);

    let hiddenBoard = boardModule.createBoard();
    for (let x = 0; x < 10; x += 1) hiddenBoard = boardModule.setCell(hiddenBoard, x, 3, 'T');
    const hiddenState = {
      ...playingMutation(0x37b2),
      board: hiddenBoard,
      active: null,
      phase: 'line-clear',
      phaseTicks: constants.LINE_CLEAR_DELAY_TICKS - 1,
      pendingClearRows: [3],
      mutationCarriers: [{ id: 1, item: 'bomb', cells: [{ x: 4, y: 3 }] }],
      score: 0,
      lines: 0,
    };
    const hiddenCommit = engine.dispatch(hiddenState, { type: 'tick' });
    const hiddenBomb = activation(hiddenCommit.events);
    reset(hiddenState);
    renderer.render(hiddenCommit.state, [], 0);
    await capture('normal-hidden', 'baseline', 0, hiddenCommit.state);
    reset(hiddenState);
    renderer.render(hiddenCommit.state, hiddenCommit.events, 0);
    await capture('normal-hidden', 'warning', 0, hiddenCommit.state);
    renderer.render(hiddenCommit.state, [], 160);
    await capture('normal-hidden', 'pulse', 160, hiddenCommit.state);
    renderer.render(hiddenCommit.state, [], 240);
    await capture('normal-hidden', 'shockwave', 400, hiddenCommit.state);
    reset(hiddenState, true);
    renderer.render(hiddenCommit.state, [], 0);
    await capture('normal-hidden-reduced', 'baseline', 0, hiddenCommit.state);
    reset(hiddenState, true);
    renderer.render(hiddenCommit.state, hiddenCommit.events, 0);
    await capture('normal-hidden-reduced', 'endpoint', 0, hiddenCommit.state);

    const chainForToggle = makeChain();
    reset(chainForToggle.preClear);
    renderer.render(chainForToggle.started.state, chainForToggle.started.events, 0);
    renderer.render(chainForToggle.committed.state, chainForToggle.committed.events, 0);
    const fullPlan = chainTimeline.mutationChainPresentationPlan(chainForToggle.bomb.chainOriginCells, false);
    renderer.render(chainForToggle.committed.state, [], fullPlan.durationMs * .4);
    const beforeToggle = renderer.getSnapshot().mutationActivation;
    renderer.setOptions({ reducedMotion: true });
    renderer.render(chainForToggle.committed.state, [], 0);
    const afterReduced = renderer.getSnapshot().mutationActivation;
    renderer.setOptions({ reducedMotion: false });
    renderer.render(chainForToggle.committed.state, [], 0);
    const afterFull = renderer.getSnapshot().mutationActivation;

    const originCarrierDifferences = fullChain.bombEvent.chainOriginCells.map((cell) => (
      cellPatchDifference(frame('chain-full', 'precommit-tail'), frame('chain-full', 'origin'), cell)
    ));
    const firstBeatRows = rowDifferences(
      frame('chain-reduced', 'before-first-beat'),
      frame('chain-reduced', 'first-beat'),
    );
    const secondBeatRows = rowDifferences(
      frame('chain-reduced', 'first-beat'),
      frame('chain-reduced', 'second-beat'),
    );
    const midWaveRows = rowDifferences(
      frame('chain-reduced', 'before-first-beat'),
      frame('chain-reduced', 'mid-wave'),
    );
    const disjointRows = rowDifferences(
      frame('normal-disjoint', 'baseline'),
      frame('normal-disjoint', 'warning'),
    );
    const hiddenDifferences = {
      warning: emptyBoardInteriorDifference(frame('normal-hidden', 'baseline'), frame('normal-hidden', 'warning')),
      pulse: emptyBoardInteriorDifference(frame('normal-hidden', 'baseline'), frame('normal-hidden', 'pulse')),
      shockwave: emptyBoardInteriorDifference(frame('normal-hidden', 'baseline'), frame('normal-hidden', 'shockwave')),
      reducedEndpoint: emptyBoardInteriorDifference(
        frame('normal-hidden-reduced', 'baseline'),
        frame('normal-hidden-reduced', 'endpoint'),
      ),
    };

    renderer.destroy();
    return {
      captures,
      fullChain,
      reducedChain,
      normalDisjoint: { bombEvent: disjointBomb },
      normalHidden: { bombEvent: hiddenBomb },
      toggle: { beforeToggle, afterReduced, afterFull },
      geometryProof: {
        originCarrierDifferences,
        firstBeatRows,
        secondBeatRows,
        midWaveRows,
        disjointRows,
        hiddenDifferences,
      },
      canvasCountAfterDestroy: document.querySelectorAll('canvas').length,
    };
  });

  for (const capture of rendererAudit.captures) {
    writeDataUrl(capture.file, capture.dataUrl);
    delete capture.dataUrl;
    requireEvidence(capture.pixelProbe.nonTransparentSamples > 0, `${capture.file} was blank`);
    requireEvidence(capture.pixelProbe.distinctBuckets >= 4, `${capture.file} lacked material variation`);
  }
  const byKey = new Map(rendererAudit.captures.map((capture) => [`${capture.scenario}:${capture.label}`, capture]));
  requireEvidence(rendererAudit.fullChain.startEvent?.mutationBombOutcome === 'chain-clear', 'full chain lacked clear-start preview');
  requireEvidence(rendererAudit.fullChain.bombEvent?.chainOriginCarrierId === 1, 'full chain origin was not primary Bomb 1');
  requireEvidence(rendererAudit.fullChain.bombEvent?.chainOriginCells?.length === 4, 'full chain did not retain the complete origin carrier');
  requireEvidence(rendererAudit.fullChain.boardEmptyAfterCommit, 'full chain did not clear the canonical board');
  requireEvidence(rendererAudit.reducedChain.boardEmptyAfterCommit, 'reduced chain did not clear the canonical board');
  requireEvidence(byKey.get('chain-full:precommit-start')?.ordinaryCueCount === 0, 'chain precommit overlapped an ordinary clear cue');
  requireEvidence(byKey.get('chain-full:precommit-tail')?.ordinaryCueCount === 0, 'chain precommit tail overlapped an ordinary clear cue');
  requireEvidence(byKey.get('chain-full:origin')?.mutationActivation?.item === 'bomb', 'chain origin did not start Bomb activation');
  requireEvidence(byKey.get('chain-full:complete')?.mutationActivation === null, 'full chain outlived its shared plan');
  requireEvidence(byKey.get('chain-reduced:complete')?.mutationActivation === null, 'reduced chain outlived its shared plan');
  requireEvidence(
    rendererAudit.renderer?.geometryProof === undefined,
    'internal evidence schema collision',
  );
  const geometry = rendererAudit.geometryProof;
  requireEvidence(
    geometry.originCarrierDifferences.length === 4 && geometry.originCarrierDifferences.every((difference) => difference < 36),
    `origin carrier was not preserved above the replayed board: ${geometry.originCarrierDifferences.join(', ')}`,
  );
  const firstOutside = geometry.firstBeatRows.filter((_value, row) => ![9, 10].includes(row));
  requireEvidence(
    Math.min(geometry.firstBeatRows[9], geometry.firstBeatRows[10]) > Math.max(...firstOutside) + 1,
    'first reduced beat did not isolate both origin rows',
  );
  const secondOutside = geometry.secondBeatRows.filter((_value, row) => ![8, 9, 10, 11].includes(row));
  requireEvidence(
    Math.min(geometry.secondBeatRows[8], geometry.secondBeatRows[11]) > Math.max(...secondOutside) + 1,
    'second reduced beat did not expand both upward and downward',
  );
  requireEvidence(
    geometry.midWaveRows[6] > 1 && geometry.midWaveRows[13] > 1,
    'mid-wave pixels did not reach both sides of the origin',
  );
  requireEvidence(
    JSON.stringify(rendererAudit.normalDisjoint.bombEvent?.blastRows) === JSON.stringify([29, 30, 31, 38, 39]),
    'normal disjoint blast rows drifted',
  );
  requireEvidence(rendererAudit.normalDisjoint.bombEvent?.bombOutcome === 'blast', 'disjoint Bomb incorrectly chained');
  const disjointAffected = [9, 10, 11, 18, 19].map((row) => geometry.disjointRows[row]);
  const disjointGap = [12, 13, 14, 15, 16, 17].map((row) => geometry.disjointRows[row]);
  requireEvidence(
    Math.min(...disjointAffected) > Math.max(...disjointGap) + .25,
    'normal Bomb pixels merged two disjoint blast bands through the real gap',
  );
  requireEvidence(
    JSON.stringify(rendererAudit.normalHidden.bombEvent?.blastRows) === JSON.stringify([2, 3, 4]),
    'hidden-only blast rows drifted',
  );
  for (const key of ['normal-hidden:warning', 'normal-hidden:pulse', 'normal-hidden:shockwave', 'normal-hidden-reduced:endpoint']) {
    requireEvidence(byKey.get(key)?.mutationActivation?.item === 'bomb', `${key} did not retain the active Bomb timeline`);
  }
  requireEvidence(
    Object.values(geometry.hiddenDifferences).every((difference) => difference < .02),
    `hidden-only Bomb drew visible fallback pixels: ${JSON.stringify(geometry.hiddenDifferences)}`,
  );
  const ratio = (sample) => sample ? sample.elapsedMs / sample.durationMs : null;
  requireEvidence(Math.abs(ratio(rendererAudit.toggle.beforeToggle) - .4) < .01, 'pre-toggle progress was not 40%');
  requireEvidence(Math.abs(ratio(rendererAudit.toggle.afterReduced) - .4) < .01, 'full-to-reduced toggle changed progress');
  requireEvidence(Math.abs(ratio(rendererAudit.toggle.afterFull) - .4) < .01, 'reduced-to-full toggle changed progress');
  requireEvidence(rendererAudit.canvasCountAfterDestroy === 0, 'renderer destroy left a Canvas');
  await rendererPage.close();

  const sheetPage = await browser.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 1 });
  observe(sheetPage, 'contact-sheets');
  const makeSheet = async (scenario, title, columns) => {
    const captures = rendererAudit.captures.filter((capture) => capture.scenario === scenario);
    const cards = captures.map((capture) => {
      const image = fs.readFileSync(path.join(output, capture.file)).toString('base64');
      return `<figure><img src="data:image/png;base64,${image}"><figcaption>${capture.label}<br>${capture.elapsedMs} ms</figcaption></figure>`;
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
  await makeSheet('chain-full', 'Bomb chain clear — full motion, source-bound production renderer', 3);
  await makeSheet('chain-reduced', 'Bomb chain clear — reduced motion', 3);
  await makeSheet('normal-disjoint', 'Normal Bomb — two real disjoint blast bands', 2);
  await makeSheet('normal-hidden', 'Normal Bomb — hidden-only blast has no false visible endpoint', 3);
  await sheetPage.close();

  requireEvidence(browserErrors.length === 0, `browser emitted ${browserErrors.length} errors`);
  const screenshotNames = fs.readdirSync(output).filter((name) => name.endsWith('.png')).sort();
  const audit = {
    schemaVersion: 1,
    result: failures.length === 0 ? 'PASS' : 'FAIL',
    sourceSha,
    origin,
    evidenceBoundary: {
      liveApp: 'integration, one Canvas, real controls, zero errors, restart/exit cleanup',
      sourceBoundRenderer: 'supplemental deterministic Core-to-renderer Bomb frames; not a natural-play App claim',
    },
    productBindingPaths,
    live: { input: { before: inputBefore, afterLeft, afterRotate, afterHardDrop }, before: liveBefore, restart, exit },
    renderer: rendererAudit,
    screenshots: screenshotNames.map((name) => ({
      name,
      sha256: createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex'),
    })),
    browserErrors,
    failures,
  };
  fs.writeFileSync(path.join(output, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(failures.join('\n'));
  process.stdout.write(`PASS source=${sourceSha.slice(0, 7)} captures=${rendererAudit.captures.length} errors=0\n`);
} finally {
  await browser.close();
  await server.close();
}
