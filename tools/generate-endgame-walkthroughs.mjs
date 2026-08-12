import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = join(workspaceRoot, 'docs', 'workstreams', 'tetris-t37-endgame', 'fixtures', 't13', 'endgame-results.json');
const outputRoot = join(workspaceRoot, 'Solutions');
const OUTPUT_ENCODING = 'utf8';
const ROUTE_TOKEN = Object.freeze({
  S: Object.freeze({ type: 'start' }),
  T: Object.freeze({ type: 'tick' }),
  L: Object.freeze({ type: 'move', dx: -1 }),
  R: Object.freeze({ type: 'move', dx: 1 }),
  H: Object.freeze({ type: 'hard-drop' }),
  C: Object.freeze({ type: 'rotate', direction: 1 }),
});
const PIECE_COLORS = Object.freeze({
  I: '#C85A72',
  O: '#47AAA1',
  T: '#C58E4A',
  S: '#647BC0',
  Z: '#83AA57',
  J: '#9A65B1',
  L: '#4D91AD',
});

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

function targetKey(x, y) {
  return `${x}:${y}`;
}

function readableInput(tokens) {
  const labels = Object.freeze({ L: '←', R: '→', C: '↑', H: 'Space' });
  const chunks = [];
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    let count = 1;
    while (tokens[index + count] === token) count += 1;
    const label = labels[token];
    if (label) chunks.push(count > 1 && token !== 'H' ? `${label} × ${count}` : label);
    index += count;
  }
  return chunks.join(' · ') || '等待自动结算';
}

function snapshotSvg({ levelNumber, levelName, caption, state, constants, anchorCell }) {
  const cell = 24;
  const boardX = 18;
  const boardY = 48;
  const width = boardX * 2 + cell * 10;
  const height = boardY + cell * constants.VISIBLE_HEIGHT + 18;
  const remainingTargets = new Set(state.endgameTargetCells.map(({ x, y }) => targetKey(x, y)));
  const rows = state.board.slice(constants.VISIBLE_START_ROW, constants.VISIBLE_START_ROW + constants.VISIBLE_HEIGHT);
  const cells = [];

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const value = row[x];
      const left = boardX + x * cell;
      const top = boardY + y * cell;
      const fullY = constants.VISIBLE_START_ROW + y;
      cells.push(`<rect x="${left}" y="${top}" width="${cell}" height="${cell}" fill="#0B1726" stroke="#1D354B" stroke-width=".7"/>`);
      if (!value) continue;
      if (value === anchorCell) {
        cells.push(`<rect x="${left + 2}" y="${top + 2}" width="${cell - 4}" height="${cell - 4}" rx="2" fill="#9C8B73" stroke="#D4C2A4" stroke-width="1.2" stroke-dasharray="2 1"/>`);
        cells.push(`<text x="${left + cell / 2}" y="${top + 16}" fill="#312A23" font-family="ui-monospace, monospace" font-size="10" font-weight="800" text-anchor="middle">A</text>`);
        continue;
      }
      const color = PIECE_COLORS[value];
      if (!color) throw new Error(`Unknown visible material ${String(value)} in Solution-${levelNumber}.`);
      cells.push(`<rect x="${left + 2}" y="${top + 2}" width="${cell - 4}" height="${cell - 4}" rx="2" fill="${color}" stroke="#081625" stroke-width="1"/>`);
      if (remainingTargets.has(targetKey(x, fullY))) {
        cells.push(`<path d="M ${left + 5} ${top + 12} V ${top + 5} H ${left + 12}" fill="none" stroke="#F2CC74" stroke-width="1.5"/>`);
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(`第 ${levelNumber} 关 ${levelName} ${caption}`)}">`,
    `<rect width="${width}" height="${height}" rx="10" fill="#071523"/>`,
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="9" fill="none" stroke="#516B85" stroke-width="1"/>`,
    `<text x="${boardX}" y="27" fill="#DDEBFA" font-family="system-ui, sans-serif" font-size="13" font-weight="800">${escapeXml(`第 ${String(levelNumber).padStart(2, '0')} 关 · ${caption}`)}</text>`,
    ...cells,
    '</svg>',
  ].join('');
}

function assertArtifact(artifact, definitions) {
  if (artifact?.schemaVersion !== 6 || !Array.isArray(artifact.levels) || !Array.isArray(artifact.campaignOrder)) {
    throw new Error('Expected the schema-6 T13 Endgame route artifact.');
  }
  if (artifact.levels.length !== 20 || artifact.campaignOrder.length !== 20 || definitions.length !== 20) {
    throw new Error('Endgame walkthrough generation requires exactly twenty current levels.');
  }
  for (const [index, definition] of definitions.entries()) {
    const level = artifact.levels[index];
    if (!level || level.id !== definition.id || artifact.campaignOrder[index] !== definition.id) {
      throw new Error(`Schema-6 route artifact and current Endgame order disagree at ${index + 1}.`);
    }
    if (!Array.isArray(level.routes) || level.routes.length !== 2 || !level.routes.some((route) => route?.id === 'primary')) {
      throw new Error(`Endgame ${definition.id} lacks a current primary and alternate route pair.`);
    }
  }
}

function replayPrimaryRoute({ level, definition, core, constants, anchorCell }) {
  const route = level.routes.find((candidate) => candidate.id === 'primary');
  const tokens = [...route.commandStream];
  if (tokens[0] !== 'S' || tokens.some((token) => !(token in ROUTE_TOKEN))) {
    throw new Error(`Endgame ${level.id} has an invalid primary public command stream.`);
  }

  let state = core.createInitialState(0x51a1f00d, 'endgame', level.id);
  let initial = null;
  const snapshots = [];
  let playerTokens = [];
  let pending = null;

  for (const token of tokens) {
    if (pending && token !== 'T') {
      snapshots.push({ ...pending, lock: state.pieceCount, state });
      pending = null;
      playerTokens = [];
    }
    const activeType = state.active?.type ?? null;
    if (token !== 'S' && token !== 'T') playerTokens.push(token);
    state = core.dispatch(state, ROUTE_TOKEN[token]).state;
    if (token === 'S') {
      initial = state;
    } else if (token === 'H') {
      if (!activeType) throw new Error(`Endgame ${level.id} hard-dropped without an active piece.`);
      pending = { type: activeType, playerTokens: [...playerTokens], settleTicks: 0 };
    } else if (pending && token === 'T') {
      pending.settleTicks += 1;
    }
  }
  if (pending) snapshots.push({ ...pending, lock: state.pieceCount, state });

  if (!initial || state.status !== 'finished' || state.endgameCompletion !== 'finished' || state.endgameTargetCells.length !== 0) {
    throw new Error(`Endgame ${level.id} primary route does not reach the current Core success state.`);
  }
  if (snapshots.length !== route.locks || state.pieceCount !== route.locks) {
    throw new Error(`Endgame ${level.id} route lock count disagrees with schema-6 evidence.`);
  }
  const anchorCount = state.board.flat().filter((cell) => cell === anchorCell).length;
  if (anchorCount !== definition.anchorCells.length) {
    throw new Error(`Endgame ${level.id} did not retain its immutable anchors through the primary route.`);
  }
  const targetRows = definition.boardRows.filter((row) => row !== '.'.repeat(10)).length;
  if (targetRows !== level.targetRowCount || targetRows < 5 || targetRows > 8) {
    throw new Error(`Endgame ${level.id} does not meet its five-through-eight-row endgame claim.`);
  }
  return { route, initial, snapshots, final: state, targetRows };
}

async function writeWalkthrough({ levelNumber, level, definition, replay, constants, anchorCell }) {
  const solutionName = `Solution-${levelNumber}`;
  const imageDirectory = join(outputRoot, solutionName);
  await mkdir(imageDirectory, { recursive: true });
  await writeFile(
    join(imageDirectory, '00-initial.svg'),
    snapshotSvg({ levelNumber, levelName: definition.name, caption: '初始残局', state: replay.initial, constants, anchorCell }),
    OUTPUT_ENCODING,
  );

  const lines = [
    `# ${solutionName} — ${definition.name}`,
    '',
    `关卡 ${String(levelNumber).padStart(2, '0')} · \`${level.id}\` · ${replay.targetRows} 行原有方块。`,
    '',
    `下面记录 schema-6 当前残局的主路线。它以 ${replay.route.locks} 块完成，由当前 Core 逐条公开命令重放至 \`finished\`；这是可行解示例，不主张唯一解或数学最优。`,
    '',
    '标记：金色角标为尚未消去的原有方块；`A` 为固定不可消去锚点；其余彩色格是已锁定的输入方块。每张图均取该次落底后的自动结算完成时刻。',
    '',
    '## 初始残局',
    '',
    `![第 ${String(levelNumber).padStart(2, '0')} 关初始残局](${solutionName}/00-initial.svg)`,
  ];

  for (const snapshot of replay.snapshots) {
    const imageBase = `${String(snapshot.lock).padStart(2, '0')}-lock`;
    await writeFile(
      join(imageDirectory, `${imageBase}.svg`),
      snapshotSvg({ levelNumber, levelName: definition.name, caption: `第 ${String(snapshot.lock).padStart(2, '0')} 步`, state: snapshot.state, constants, anchorCell }),
      OUTPUT_ENCODING,
    );
    const next = snapshot.state.status === 'finished' ? '—' : snapshot.state.queue[0] ?? '—';
    lines.push(
      '',
      `## ${String(snapshot.lock).padStart(2, '0')} · 锁定 ${snapshot.type}`,
      '',
      `输入：${readableInput(snapshot.playerTokens)}。自动结算：${snapshot.settleTicks} tick；原有方块剩余：${snapshot.state.endgameTargetCells.length}；下一块：${next}。`,
      '',
      `![第 ${String(levelNumber).padStart(2, '0')} 关第 ${String(snapshot.lock).padStart(2, '0')} 步](${solutionName}/${imageBase}.svg)`,
    );
  }
  lines.push('', '## 完成', '', `状态：${replay.final.status}；原有方块剩余：${replay.final.endgameTargetCells.length}；总锁定：${replay.final.pieceCount}。`, '');
  await writeFile(join(outputRoot, `${solutionName}.md`), lines.join('\n'), OUTPUT_ENCODING);
}

const artifact = JSON.parse(await readFile(artifactPath, OUTPUT_ENCODING));
await mkdir(outputRoot, { recursive: true });
const vite = await createServer({ root: workspaceRoot, appType: 'custom', logLevel: 'error', server: { middlewareMode: true } });
try {
  const core = await vite.ssrLoadModule('/src/game/core/index.ts');
  const constants = await vite.ssrLoadModule('/src/game/core/constants.ts');
  const types = await vite.ssrLoadModule('/src/game/core/types.ts');
  assertArtifact(artifact, core.ENDGAME_DEFINITIONS);
  let snapshotsWritten = 0;
  for (const [index, level] of artifact.levels.entries()) {
    const definition = core.getEndgameDefinition(level.id);
    const replay = replayPrimaryRoute({ level, definition, core, constants, anchorCell: types.ANCHOR_CELL });
    await writeWalkthrough({ levelNumber: index + 1, level, definition, replay, constants, anchorCell: types.ANCHOR_CELL });
    snapshotsWritten += replay.snapshots.length + 1;
  }
  console.log(JSON.stringify({ schemaVersion: artifact.schemaVersion, levels: artifact.levels.length, snapshotsWritten, output: 'Solutions/Solution-1.md … Solution-20.md' }));
} finally {
  await vite.close();
}
