import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const ROOT = path.resolve('.');
const OUTPUT = path.resolve('docs/evidence/t37/bomb-row-causal-r2');
const EXPECTED_HEAD = '7443f0461457bea029cc461fd7ef265baac28bd1';
const EXPECTED_SOURCE = '8de0cb732adfe6337605013fd67bcfe2ba63ca86';
const PRODUCT_PATHS = [
  'src/animation/mutationChainTimeline.test.ts',
  'src/animation/mutationChainTimeline.ts',
  'src/game/audio/AudioEngine.test.ts',
  'src/game/audio/AudioEngine.ts',
  'src/game/render/TetrisRenderer.test.ts',
  'src/game/render/TetrisRenderer.ts',
];
const FRAME_TIMES = {
  full: [0, 219, 220, 276, 332, 500, 780, 999, 1000, 2000],
  reduced: [0, 49, 50, 70, 90, 150, 250, 339, 340, 1340],
};
const failures = [];
const browserErrors = [];
const requireEvidence = (condition, message) => { if (!condition) failures.push(message); };
const must = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const sourceHead = git('rev-parse', 'HEAD');
const sourceSha = git('rev-parse', EXPECTED_SOURCE);

if (sourceHead !== EXPECTED_HEAD) throw new Error(`HEAD drifted: expected ${EXPECTED_HEAD}, got ${sourceHead}.`);
if (sourceSha !== EXPECTED_SOURCE) throw new Error(`Source binding drifted: expected ${EXPECTED_SOURCE}, got ${sourceSha}.`);
execFileSync('git', ['diff', '--quiet', 'HEAD', '--', ...PRODUCT_PATHS], { cwd: ROOT });
execFileSync('git', ['diff', '--cached', '--quiet', 'HEAD', '--', ...PRODUCT_PATHS], { cwd: ROOT });
const boundRendererSource = execFileSync(
  'git',
  ['show', `${EXPECTED_SOURCE}:src/game/render/TetrisRenderer.ts`],
  { cwd: ROOT, encoding: 'utf8' },
).replace(/\r\n?/gu, '\n');
const chainMethodStart = boundRendererSource.indexOf('  private drawMutationChainClear(');
const chainMethodEnd = boundRendererSource.indexOf('\n  private advanceEffects(', chainMethodStart);
const impactMethodStart = boundRendererSource.indexOf('  private emitDeferredBombImpact(');
const impactMethodEnd = boundRendererSource.indexOf('\n  /** Pixi nulls', impactMethodStart);
must(chainMethodStart >= 0 && chainMethodEnd > chainMethodStart, 'Cannot isolate bound chain renderer method.');
must(impactMethodStart >= 0 && impactMethodEnd > impactMethodStart, 'Cannot isolate bound Bomb impact method.');
const chainMethod = boundRendererSource.slice(chainMethodStart, chainMethodEnd);
const impactMethod = boundRendererSource.slice(impactMethodStart, impactMethodEnd);
const staticGeometry = {
  sourceSha,
  chainMethodSha256: sha256(Buffer.from(chainMethod, 'utf8')),
  noRectPrimitive: !/\.(?:rect|roundRect)\s*\(/u.test(chainMethod),
  hasLocalHeatPolygon: /graphics\.poly\(\[/u.test(chainMethod),
  hasLocalCoreAndRingCircle: /graphics\s*\.circle\(/u.test(chainMethod),
  hasLocalFragments: /this\.drawMutationFragment\(/u.test(chainMethod),
  chainParticleEmissionGuarded: /if \(flash\.bombOutcome !== 'chain-clear'\) \{\s*this\.emitMutationParticles\('bomb'/u.test(impactMethod),
};
requireEvidence(Object.values(staticGeometry).slice(2).every(Boolean), 'Bound renderer static geometry gate failed.');
fs.mkdirSync(OUTPUT, { recursive: true });

const dataUrlBuffer = (dataUrl) => {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Malformed renderer PNG data URL.');
  return Buffer.from(dataUrl.slice(comma + 1), 'base64');
};
const pngSize = (buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
const textPayload = (file) => fs.readFileSync(path.join(OUTPUT, file), 'utf8').replace(/\r\n?/gu, '\n');
const manifestPayload = (file) => /\.(?:json|md|mjs)$/u.test(file)
  ? Buffer.from(textPayload(file), 'utf8')
  : fs.readFileSync(path.join(OUTPUT, file));

const server = await createViteServer({ root: ROOT, server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  const address = server.httpServer?.address();
  must(address && typeof address !== 'string', 'Vite did not expose a transient port.');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 760, height: 940 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (!request.url().startsWith('data:')) {
      browserErrors.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
    }
  });
  await page.goto(origin, { waitUntil: 'networkidle' });

  const browserAudit = await page.evaluate(async ({ frameTimes }) => {
    const [{ TetrisRenderer }, core, chain] = await Promise.all([
      import('/src/game/render/TetrisRenderer.ts'),
      import('/src/game/core/index.ts'),
      import('/src/animation/mutationChainTimeline.ts'),
    ]);
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#071522;overflow:hidden';
    const host = document.createElement('main');
    host.dataset.evidenceHost = 'bomb-row-causal-r2';
    host.style.cssText = 'width:720px;height:920px;margin:0 auto';
    document.body.append(host);

    const makeFixture = () => {
      let board = core.createBoard();
      const materials = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      for (let y = core.VISIBLE_START_ROW; y < core.BOARD_HEIGHT; y += 1) {
        for (let x = 0; x < core.BOARD_WIDTH; x += 1) {
          if (x >= 8 && y <= 30) continue;
          if (y === 30 && (x === 8 || x === 9)) continue;
          if ((x * 3 + y * 5) % 7 === 0 || y === 30) {
            board = core.setCell(board, x, y, materials[(x + y) % materials.length]);
          }
        }
      }
      board = core.setCell(board, 0, 29, 'L');
      board = core.setCell(board, 8, 31, 'S');
      board = core.setCell(board, 9, 31, 'Z');
      const state = {
        ...core.dispatch(core.createInitialState(0x37b0b2, 'sprint'), { type: 'start' }).state,
        board,
        active: { type: 'O', rotation: 0, x: 8, y: 20 },
        queue: ['T', 'I', 'S', 'Z', 'J'],
        mutationActiveCarrier: null,
        mutationCarriers: Object.freeze([
          { id: 1, item: 'bomb', cells: Object.freeze([{ x: 0, y: 29 }, { x: 0, y: 30 }]) },
          { id: 2, item: 'bomb', cells: Object.freeze([{ x: 1, y: 30 }]) },
        ]),
        mutationNextCarrierId: 3,
        status: 'playing',
        phase: 'active',
        phaseTicks: 0,
        pendingClearRows: [],
      };
      return state;
    };

    const fixture = makeFixture();
    const hardDrop = core.dispatch(fixture, { type: 'hard-drop' });
    let commit = hardDrop;
    const preCommitBoardStable = [];
    const lockedBoard = JSON.stringify(hardDrop.state.board);
    for (let tick = 0; tick < core.LINE_CLEAR_DELAY_TICKS; tick += 1) {
      commit = core.dispatch(commit.state, { type: 'tick' });
      preCommitBoardStable.push(tick === core.LINE_CLEAR_DELAY_TICKS - 1
        || JSON.stringify(commit.state.board) === lockedBoard);
    }
    const clearStarted = hardDrop.events.find((event) => event.type === 'clear-started') ?? null;
    const lineCleared = commit.events.find((event) => event.type === 'lines-cleared') ?? null;
    const activation = commit.events.find((event) => event.type === 'mutation-activated' && event.item === 'bomb') ?? null;
    const planFull = chain.mutationChainPresentationPlan(activation?.chainTriggerRows ?? [], false);
    const planReduced = chain.mutationChainPresentationPlan(activation?.chainTriggerRows ?? [], true);
    const plans = { full: planFull, reduced: planReduced };
    const captures = [];
    const mountedCanvasCounts = [];
    const postDestroyCanvasCounts = [];
    const waitFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const writeCapture = async (scenario, timeMs, renderer) => {
      await waitFrame();
      const capture = renderer.captureBoardPng();
      const snapshot = renderer.getSnapshot();
      captures.push({
        scenario,
        timeMs,
        file: `${scenario}-${String(timeMs).padStart(4, '0')}ms.png`,
        dataUrl: capture.dataUrl,
        frame: capture.frame,
        outputPixels: capture.outputPixels,
        pixelProbe: capture.pixelProbe,
        snapshot,
      });
    };

    for (const [scenario, times] of Object.entries(frameTimes)) {
      const reducedMotion = scenario === 'reduced';
      const renderer = new TetrisRenderer();
      renderer.setOptions({ visualTheme: 'deep-tide', reducedMotion, modeSwitch: false });
      await renderer.init(host);
      mountedCanvasCounts.push(document.querySelectorAll('canvas').length);
      renderer.render(hardDrop.state, [{ type: 'restarted' }], 0);
      renderer.render(commit.state, commit.events, 0);
      let elapsed = 0;
      for (const timeMs of times) {
        renderer.render(commit.state, [], timeMs - elapsed);
        elapsed = timeMs;
        await writeCapture(scenario, timeMs, renderer);
      }
      renderer.destroy();
      postDestroyCanvasCounts.push(document.querySelectorAll('canvas').length);
    }

    return {
      core: {
        clearStarted,
        lineCleared,
        activation,
        preCommitBoardStable,
        lockedBoardOccupied: hardDrop.state.board.flat().filter(Boolean).length,
        committedBoardOccupied: commit.state.board.flat().filter(Boolean).length,
        carrierRows: activation?.chainOriginCells?.map((cell) => cell.y) ?? [],
      },
      plans,
      captures,
      topology: {
        mountedCanvasCounts,
        postDestroyCanvasCounts,
        finalCanvasCount: document.querySelectorAll('canvas').length,
        domCellCount: document.querySelectorAll('[data-game-cell]').length,
        hostCount: document.querySelectorAll('[data-evidence-host="bomb-row-causal-r2"]').length,
      },
    };
  }, { frameTimes: FRAME_TIMES });

  for (const capture of browserAudit.captures) {
    const buffer = dataUrlBuffer(capture.dataUrl);
    fs.writeFileSync(path.join(OUTPUT, capture.file), buffer);
    capture.sha256 = sha256(buffer);
    capture.pngSize = pngSize(buffer);
    delete capture.dataUrl;
    requireEvidence(capture.pixelProbe.nonTransparentSamples > 0, `${capture.file} is blank.`);
    requireEvidence(capture.pixelProbe.distinctBuckets >= 8, `${capture.file} lacks visible material variation.`);
  }

  const frame = (scenario, timeMs) => browserAudit.captures.find((item) => item.scenario === scenario && item.timeMs === timeMs);
  const decodePage = await browser.newPage();
  const pixelCache = new Map();
  const pixelsFor = async (capture) => {
    if (pixelCache.has(capture.file)) return pixelCache.get(capture.file);
    const value = await decodePage.evaluate(async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) };
    }, `data:image/png;base64,${fs.readFileSync(path.join(OUTPUT, capture.file)).toString('base64')}`);
    pixelCache.set(capture.file, value);
    return value;
  };
  const regionDiff = async (leftCapture, rightCapture, row, columns = Array.from({ length: 10 }, (_, column) => column)) => {
    const [left, right] = await Promise.all([pixelsFor(leftCapture), pixelsFor(rightCapture)]);
    must(left.width === right.width && left.height === right.height, 'Frame dimensions drifted.');
    const board = leftCapture.frame;
    const scaleX = left.width / board.width;
    const scaleY = left.height / board.height;
    const cellW = left.width / 10;
    const cellH = left.height / 20;
    let changed = 0;
    let samples = 0;
    for (const column of columns) {
      const x0 = Math.max(0, Math.floor((column + .22) * cellW));
      const x1 = Math.min(left.width, Math.ceil((column + .78) * cellW));
      const visibleRow = row - 20;
      const y0 = Math.max(0, Math.floor((visibleRow + .22) * cellH));
      const y1 = Math.min(left.height, Math.ceil((visibleRow + .78) * cellH));
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
        const offset = (y * left.width + x) * 4;
        const delta = Math.abs(left.data[offset] - right.data[offset])
          + Math.abs(left.data[offset + 1] - right.data[offset + 1])
          + Math.abs(left.data[offset + 2] - right.data[offset + 2]);
        if (delta > 24) changed += 1;
        samples += 1;
      }
    }
    return { row, columns, changed, samples, ratio: samples ? changed / samples : 0, scaleX, scaleY };
  };
  const rowDiffs = {};
  for (const scenario of ['full', 'reduced']) {
    const baselineTime = 0;
    const baseline = frame(scenario, baselineTime);
    rowDiffs[scenario] = {};
    for (const [time, rows] of scenario === 'full'
      ? [[219, [30]], [220, [30, 29, 31]], [276, [29, 31, 28, 32]], [332, [28, 32, 27, 33]], [500, [25, 35]], [780, [20]]]
      : [[49, [30]], [50, [30, 29, 31]], [70, [29, 31, 28, 32]], [90, [28, 32, 27, 33]], [150, [25, 35]], [250, [20]]]) {
      rowDiffs[scenario][time] = {};
      for (const row of rows) rowDiffs[scenario][time][row] = await regionDiff(baseline, frame(scenario, time), row);
    }
  }
  const wholeFrameDiff = async (leftCapture, rightCapture) => {
    const [left, right] = await Promise.all([pixelsFor(leftCapture), pixelsFor(rightCapture)]);
    must(left.width === right.width && left.height === right.height, 'Whole-frame dimensions drifted.');
    let changed = 0;
    let totalDelta = 0;
    for (let offset = 0; offset < left.data.length; offset += 4) {
      const delta = Math.abs(left.data[offset] - right.data[offset])
        + Math.abs(left.data[offset + 1] - right.data[offset + 1])
        + Math.abs(left.data[offset + 2] - right.data[offset + 2]);
      if (delta > 24) changed += 1;
      totalDelta += delta;
    }
    const samples = left.width * left.height;
    return { changed, samples, ratio: changed / samples, meanRgbDelta: totalDelta / samples };
  };
  const horizontalRunProbe = async (capture, baseline) => {
    const [framePixels, basePixels] = await Promise.all([pixelsFor(capture), pixelsFor(baseline)]);
    let maximumRun = 0;
    let changedRowsAboveEightyPercent = 0;
    let totalChanged = 0;
    for (let y = 0; y < framePixels.height; y += 1) {
      let run = 0;
      let rowChanged = 0;
      for (let x = 0; x < framePixels.width; x += 1) {
        const offset = (y * framePixels.width + x) * 4;
        const delta = Math.abs(framePixels.data[offset] - basePixels.data[offset])
          + Math.abs(framePixels.data[offset + 1] - basePixels.data[offset + 1])
          + Math.abs(framePixels.data[offset + 2] - basePixels.data[offset + 2]);
        if (delta > 72) {
          run += 1;
          rowChanged += 1;
          totalChanged += 1;
          maximumRun = Math.max(maximumRun, run);
        } else run = 0;
      }
      if (rowChanged / framePixels.width >= .8) changedRowsAboveEightyPercent += 1;
    }
    return {
      maximumRun,
      maximumRunRatio: maximumRun / framePixels.width,
      changedRowsAboveEightyPercent,
      changedPixelRatio: totalChanged / (framePixels.width * framePixels.height),
    };
  };
  const completionDiffs = {
    full: await wholeFrameDiff(frame('full', 1000), frame('full', 2000)),
    reduced: await wholeFrameDiff(frame('reduced', 340), frame('reduced', 1340)),
  };
  const forbiddenGeometryProbes = { full: {}, reduced: {} };
  for (const scenario of ['full', 'reduced']) {
    for (const capture of browserAudit.captures.filter((item) => item.scenario === scenario)) {
      if (capture.timeMs === 0) continue;
      forbiddenGeometryProbes[scenario][capture.timeMs] = await horizontalRunProbe(capture, frame(scenario, 0));
    }
  }
  await decodePage.close();

  requireEvidence(JSON.stringify(browserAudit.core.clearStarted) === JSON.stringify({ type: 'clear-started', rows: [30], mutationBombOutcome: 'chain-clear' }), 'Core clear-started was not exact row 30 chain-clear.');
  requireEvidence(browserAudit.core.lineCleared?.rows?.length === 1 && browserAudit.core.lineCleared.rows[0] === 30, 'Core lines-cleared row drifted.');
  requireEvidence(browserAudit.core.activation?.bombOutcome === 'chain-clear', 'Core did not emit one chain-clear Bomb activation.');
  requireEvidence(JSON.stringify(browserAudit.core.activation?.chainTriggerRows) === '[30]', 'Activation did not retain chainTriggerRows=[30].');
  requireEvidence(JSON.stringify([...new Set(browserAudit.core.carrierRows)].sort((a, b) => a - b)) === '[29,30]', 'Origin carrier did not span rows 29/30.');
  requireEvidence(browserAudit.core.preCommitBoardStable.every(Boolean), 'Core board changed before the line-clear commit.');
  requireEvidence(browserAudit.core.lockedBoardOccupied >= 36 && browserAudit.core.committedBoardOccupied === 0, 'Dense fixture did not clear the complete board.');
  requireEvidence(browserAudit.plans.full.revealMs === 220 && browserAudit.plans.full.beatMs === 56 && browserAudit.plans.full.fadeMs === 220 && browserAudit.plans.full.durationMs === 1000, 'Full plan constants drifted.');
  requireEvidence(browserAudit.plans.reduced.revealMs === 50 && browserAudit.plans.reduced.beatMs === 20 && browserAudit.plans.reduced.fadeMs === 90 && browserAudit.plans.reduced.durationMs === 340, 'Reduced plan constants drifted.');
  requireEvidence(
    JSON.stringify(browserAudit.topology.mountedCanvasCounts) === '[1,1]'
      && JSON.stringify(browserAudit.topology.postDestroyCanvasCounts) === '[0,0]'
      && browserAudit.topology.finalCanvasCount === 0
      && browserAudit.topology.domCellCount === 0
      && browserAudit.topology.hostCount === 1,
    'Renderer lifecycle/topology did not hold one mounted Canvas, zero post-destroy Canvases, and zero DOM cells.',
  );
  requireEvidence(browserErrors.length === 0, `Browser emitted ${browserErrors.length} errors.`);

  const threshold = .015;
  requireEvidence(frame('full', 219).snapshot.mutationActivation.phases.find((phase) => phase.id === 'impact')?.active === false, 'Full impact activated before 220 ms.');
  requireEvidence(rowDiffs.full[220][30].ratio >= threshold, 'Full source row did not impact at 220 ms.');
  requireEvidence(browserAudit.plans.full.rowBeats.filter((beat) => beat.startMs <= 220).every((beat) => beat.row === 30), 'Full source impact reached another row at 220 ms.');
  requireEvidence(rowDiffs.full[276][29].ratio >= threshold && rowDiffs.full[276][31].ratio >= threshold, 'Full +/-1 fronts were not symmetric at 276 ms.');
  requireEvidence(rowDiffs.full[276][28].ratio < threshold && rowDiffs.full[276][32].ratio < threshold, 'Full +/-2 rows changed before 332 ms.');
  requireEvidence(rowDiffs.full[332][28].ratio >= threshold && rowDiffs.full[332][32].ratio >= threshold, 'Full +/-2 fronts were not symmetric at 332 ms.');
  requireEvidence(frame('reduced', 49).snapshot.mutationActivation.phases.find((phase) => phase.id === 'impact')?.active === false, 'Reduced impact activated before 50 ms.');
  requireEvidence(rowDiffs.reduced[50][30].ratio >= threshold, 'Reduced source row did not impact at 50 ms.');
  requireEvidence(browserAudit.plans.reduced.rowBeats.filter((beat) => beat.startMs <= 50).every((beat) => beat.row === 30), 'Reduced source impact reached another row at 50 ms.');
  requireEvidence(rowDiffs.reduced[70][29].ratio >= threshold && rowDiffs.reduced[70][31].ratio >= threshold, 'Reduced +/-1 fronts were not symmetric at 70 ms.');
  requireEvidence(rowDiffs.reduced[70][28].ratio < threshold && rowDiffs.reduced[70][32].ratio < threshold, 'Reduced +/-2 rows changed before 90 ms.');
  requireEvidence(rowDiffs.reduced[90][28].ratio >= threshold && rowDiffs.reduced[90][32].ratio >= threshold, 'Reduced +/-2 fronts were not symmetric at 90 ms.');
  requireEvidence(completionDiffs.full.ratio === 0 && completionDiffs.reduced.ratio === 0, 'Completion and +1000 ms no-replay frames differ.');
  requireEvidence(frame('full', 1000).snapshot.mutationActivation === null && frame('full', 2000).snapshot.mutationActivation === null, 'Full chain replayed or outlived completion.');
  requireEvidence(frame('reduced', 340).snapshot.mutationActivation === null && frame('reduced', 1340).snapshot.mutationActivation === null, 'Reduced chain replayed or outlived completion.');
  requireEvidence(browserAudit.captures.filter((item) => item.scenario === 'reduced').every((item) => item.snapshot.mutationActiveParticleCount === 0), 'Reduced chain emitted moving particles.');
  requireEvidence(frame('full', 220).snapshot.mutationActiveParticleCount === 0, 'Chain impact emitted the old all-board particle burst.');

  const sheetPage = await browser.newPage({ viewport: { width: 1320, height: 900 }, deviceScaleFactor: 1 });
  const contactSheet = async (scenario, title) => {
    const captures = browserAudit.captures.filter((capture) => capture.scenario === scenario && capture.timeMs < (scenario === 'full' ? 2000 : 1000));
    const cards = captures.map((capture) => `<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(OUTPUT, capture.file)).toString('base64')}"><figcaption>${capture.timeMs} ms</figcaption></figure>`).join('');
    await sheetPage.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:22px;background:#071522;color:#e9f2f6;font:14px system-ui}h1{margin:0 0 16px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}figure{margin:0;padding:7px;background:#0c2232;border:1px solid #26506a;border-radius:8px}img{display:block;width:100%;height:auto;background:#06111c}figcaption{padding-top:5px;text-align:center;color:#bed5df}</style><h1>${title}</h1><div class="grid">${cards}</div>`);
    await sheetPage.waitForFunction(() => [...document.images].every((image) => image.complete));
    await sheetPage.screenshot({ path: path.join(OUTPUT, `${scenario}-contact-sheet.png`), fullPage: true });
  };
  await contactSheet('full', 'Bomb chain R2 — full motion, row 30 spreads outward');
  await contactSheet('reduced', 'Bomb chain R2 — reduced motion, static row-causal fronts');
  await sheetPage.close();

  const productCommitPaths = git('diff-tree', '--no-commit-id', '--name-only', '-r', EXPECTED_SOURCE).split(/\r?\n/u).filter(Boolean).sort();
  requireEvidence(JSON.stringify(productCommitPaths) === JSON.stringify([...PRODUCT_PATHS].sort()), `Bound source paths drifted: ${JSON.stringify(productCommitPaths)}.`);
  const audit = {
    result: failures.length === 0 ? 'PASS' : 'FAIL',
    sourceSha,
    evidenceBaseHead: sourceHead,
    sourceCommitPaths: productCommitPaths,
    evidenceKind: 'supplemental deterministic Core-to-production-renderer; not a natural App reach or human acceptance claim',
    frameTimes: FRAME_TIMES,
    core: browserAudit.core,
    plans: browserAudit.plans,
    topology: browserAudit.topology,
    captures: browserAudit.captures,
    rowInteriorDiffs: rowDiffs,
    completionNoReplayDiffs: completionDiffs,
    evidenceLayers: {
      machineCausality: failures.length === 0 ? 'PASS' : 'FAIL',
      staticGeometry: Object.values(staticGeometry).slice(2).every(Boolean) ? 'PASS' : 'FAIL',
      visualContactSheets: 'REVIEWED_AT_ORIGINAL_RESOLUTION',
      playerAcceptance: 'OPEN',
    },
    forbiddenGeometry: {
      observationalPixelProbes: forbiddenGeometryProbes,
      staticSourceGate: staticGeometry,
      visualGate: 'contact sheets visually inspected at original resolution; human player acceptance remains open',
      allBoardParticleSignature: frame('full', 220).snapshot.mutationActiveParticleCount,
      reducedMovingParticles: Math.max(...browserAudit.captures.filter((item) => item.scenario === 'reduced').map((item) => item.snapshot.mutationActiveParticleCount)),
    },
    browserErrors,
    failures,
  };
  fs.writeFileSync(path.join(OUTPUT, 'audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

  const files = fs.readdirSync(OUTPUT).filter((file) => file !== 'manifest.json').sort();
  const manifest = {
    sourceSha,
    evidenceBaseHead: sourceHead,
    capturedAt: new Date().toISOString(),
    algorithm: 'sha256',
    textNormalization: 'UTF-8 with CRLF and CR normalized to LF for text files',
    files: Object.fromEntries(files.map((file) => [file, sha256(manifestPayload(file))])),
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (failures.length > 0) throw new Error(failures.join('\n'));
  console.log(`PASS source=${sourceSha} frames=${browserAudit.captures.length} errors=${browserErrors.length}`);
} finally {
  await browser?.close();
  await server.close();
}
