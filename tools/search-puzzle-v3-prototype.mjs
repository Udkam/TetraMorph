/**
 * Deterministic F3C setup discovery for one fixed non-published ten-row prototype.
 *
 * This tool searches only legal seeded setup histories. Its JSON is an authoring
 * candidate: current Core replay, a public completion route, and the exact shorter-
 * depth certificate remain mandatory before the prototype can be admitted.
 *
 * Usage:
 *   node tools/search-puzzle-v3-prototype.mjs
 *     --seed-start <uint32> --seed-count <positive-int>
 *     --node-budget <positive-int> --max-rss-mib <positive-int>
 *     --output <explicit-json-path>
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const WIDTH = 10;
const HEIGHT = 40;
const VISIBLE_START = 20;
const TARGET_TOP = 30;
const FULL_ROW = (1 << WIDTH) - 1;
const TYPES = Object.freeze(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
const TYPE_INDEX = new Map(TYPES.map((type, index) => [type, index]));
const SHAPES = Object.freeze({
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: Array.from({ length: 4 }, () => [[0, 0], [1, 0], [0, 1], [1, 1]]),
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
});

const TARGET_VISIBLE_ROWS = Object.freeze([
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '###....###',
  '..########',
  '..########',
  '####...###',
  '#####.####',
  '...#######',
  '##.#######',
  '######..##',
  '#######.##',
  '#######.##',
]);

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || value === undefined) throw new Error('Expected explicit --name value pairs.');
    if (values.has(name)) throw new Error(`Duplicate authoring option: ${name}.`);
    values.set(name, value);
  }
  const integer = (name, minimum, maximum) => {
    const value = Number(values.get(name));
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
    }
    return value;
  };
  const output = values.get('--output');
  if (!output) throw new Error('--output is required; this tool never chooses an implicit path.');
  const allowed = new Set(['--seed-start', '--seed-count', '--node-budget', '--max-rss-mib', '--output']);
  for (const name of values.keys()) if (!allowed.has(name)) throw new Error(`Unknown authoring option: ${name}.`);
  const seedStart = integer('--seed-start', 1, 0xffff_ffff);
  const seedCount = integer('--seed-count', 1, 1_000_000);
  if (seedStart + seedCount - 1 > 0xffff_ffff) {
    throw new Error('The explicit setup-seed range may not wrap uint32.');
  }
  return Object.freeze({
    seedStart,
    seedCount,
    nodeBudget: integer('--node-budget', 1, 1_000_000_000),
    maxRssBytes: integer('--max-rss-mib', 128, 4096) * 1024 * 1024,
    outputPath: resolve(output),
  });
}

function nextSeed(seed) {
  let value = seed >>> 0;
  if (value === 0) value = 0x6d2b79f5;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function sequenceForSeed(seed, count) {
  let randomizerSeed = seed >>> 0 || 0x6d2b79f5;
  let bag = [];
  const sequence = [];
  while (sequence.length < count) {
    if (bag.length === 0) {
      bag = [...TYPES];
      for (let index = bag.length - 1; index > 0; index -= 1) {
        randomizerSeed = nextSeed(randomizerSeed);
        const swapIndex = randomizerSeed % (index + 1);
        [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
      }
    }
    sequence.push(bag.shift());
  }
  return sequence;
}

function targetRows() {
  const rows = Array.from({ length: HEIGHT }, () => 0);
  for (const [visibleY, row] of TARGET_VISIBLE_ROWS.entries()) {
    for (const [x, cell] of [...row].entries()) if (cell === '#') rows[VISIBLE_START + visibleY] |= 1 << x;
  }
  const occupied = rows.reduce((total, row) => total + row.toString(2).replaceAll('0', '').length, 0);
  if (occupied !== 80) throw new Error(`F3C fixed mask must own exactly 80 setup cells, received ${occupied}.`);
  if (rows.slice(TARGET_TOP).some((row) => row === 0 || row === FULL_ROW)) {
    throw new Error('F3C fixed mask must contain ten contiguous nonempty, non-full rows.');
  }
  if (rows.slice(0, TARGET_TOP).some(Boolean)) throw new Error('F3C fixed mask escaped its ten-row band.');
  return rows;
}

function buildSeedTrie(seedStart, seedCount, maxRssBytes) {
  const nodes = [{ children: Array.from({ length: TYPES.length }, () => -1), seeds: [] }];
  let processedSeeds = 0;
  let memoryGuard = false;
  for (let offset = 0; offset < seedCount; offset += 1) {
    if (offset % 1024 === 0 && process.memoryUsage().rss > maxRssBytes) {
      memoryGuard = true;
      break;
    }
    const seed = (seedStart + offset) >>> 0 || 1;
    let nodeIndex = 0;
    for (const type of sequenceForSeed(seed, 20)) {
      const typeIndex = TYPE_INDEX.get(type);
      let childIndex = nodes[nodeIndex].children[typeIndex];
      if (childIndex < 0) {
        childIndex = nodes.length;
        nodes[nodeIndex].children[typeIndex] = childIndex;
        nodes.push({ children: Array.from({ length: TYPES.length }, () => -1), seeds: [] });
      }
      nodeIndex = childIndex;
    }
    nodes[nodeIndex].seeds.push(seed);
    processedSeeds += 1;
  }
  return { nodes, processedSeeds, memoryGuard };
}

function canPlace(rows, shape, x, y) {
  return shape.every(([dx, dy]) => {
    const cellX = x + dx;
    const cellY = y + dy;
    return cellX >= 0 && cellX < WIDTH && cellY >= 0 && cellY < HEIGHT
      && (rows[cellY] & (1 << cellX)) === 0;
  });
}

function landing(rows, typeRows, fixedRows, type, rotation, x) {
  const shape = SHAPES[type][rotation];
  let y = VISIBLE_START - 1;
  if (!canPlace(rows, shape, x, y)) return null;
  while (canPlace(rows, shape, x, y + 1)) y += 1;
  const cells = shape.map(([dx, dy]) => [x + dx, y + dy]);
  if (cells.some(([cellX, cellY]) => (fixedRows[cellY] & (1 << cellX)) === 0)) return null;
  for (const [cellX, cellY] of cells) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const neighborX = cellX + dx;
      const neighborY = cellY + dy;
      if (neighborX >= 0 && neighborX < WIDTH && neighborY >= 0 && neighborY < HEIGHT
        && (typeRows[neighborY] & (1 << neighborX)) !== 0) return null;
    }
  }
  return { y, cells };
}

function relevantRowsKey(rows) {
  return rows.slice(TARGET_TOP).map((row) => row.toString(36)).join('.');
}

function typeRowsKey(typeRows) {
  return typeRows.map((rows) => relevantRowsKey(rows)).join('/');
}

function boardRowsWithTypes(typeRows) {
  return Array.from({ length: 20 }, (_, visibleY) => Array.from({ length: WIDTH }, (_, x) => {
    const absoluteY = VISIBLE_START + visibleY;
    const owner = TYPES.find((_, typeIndex) => (typeRows[typeIndex][absoluteY] & (1 << x)) !== 0);
    return owner ?? '.';
  }).join(''));
}

function searchSetup(fixedRows, trie, options) {
  const rows = Array.from({ length: HEIGHT }, () => 0);
  const typeRows = TYPES.map(() => Array.from({ length: HEIGHT }, () => 0));
  const placements = [];
  const failed = new Set();
  let attemptedLandings = 0;
  let acceptedPlacements = 0;
  let memoryGuard = false;

  const visit = (nodeIndex, depth) => {
    if (depth === 20) {
      if (!rows.every((row, y) => row === fixedRows[y])) return null;
      const seed = trie[nodeIndex].seeds[0];
      return seed ? { seed, placements: placements.map((placement) => ({ ...placement })), typeRows } : null;
    }
    const key = `${nodeIndex}|${relevantRowsKey(rows)}|${typeRowsKey(typeRows)}`;
    if (failed.has(key)) return null;

    const node = trie[nodeIndex];
    for (let typeIndex = 0; typeIndex < TYPES.length; typeIndex += 1) {
      const childIndex = node.children[typeIndex];
      if (childIndex < 0) continue;
      const type = TYPES[typeIndex];
      const seenLandings = new Set();
      for (let rotation = 0; rotation < 4; rotation += 1) {
        const shape = SHAPES[type][rotation];
        const minimumX = -Math.min(...shape.map(([cellX]) => cellX));
        const maximumX = WIDTH - 1 - Math.max(...shape.map(([cellX]) => cellX));
        for (let x = minimumX; x <= maximumX; x += 1) {
          attemptedLandings += 1;
          if (attemptedLandings > options.nodeBudget) return null;
          if (attemptedLandings % 1024 === 0 && process.memoryUsage().rss > options.maxRssBytes) {
            memoryGuard = true;
            return null;
          }
          const placed = landing(rows, typeRows[typeIndex], fixedRows, type, rotation, x);
          if (!placed) continue;
          const landingKey = placed.cells.map(([cellX, cellY]) => `${cellX},${cellY}`).sort().join('|');
          if (seenLandings.has(landingKey)) continue;
          seenLandings.add(landingKey);
          acceptedPlacements += 1;
          for (const [cellX, cellY] of placed.cells) {
            rows[cellY] |= 1 << cellX;
            typeRows[typeIndex][cellY] |= 1 << cellX;
          }
          placements.push({ type, rotation, x });
          const result = visit(childIndex, depth + 1);
          if (result) return result;
          placements.pop();
          for (const [cellX, cellY] of placed.cells) {
            rows[cellY] &= ~(1 << cellX);
            typeRows[typeIndex][cellY] &= ~(1 << cellX);
          }
          if (attemptedLandings > options.nodeBudget || memoryGuard) return null;
        }
      }
    }
    failed.add(key);
    return null;
  };

  const result = visit(0, 0);
  return {
    result,
    attemptedLandings,
    acceptedPlacements,
    failedStateCount: failed.size,
    memoryGuard,
  };
}

const options = parseArguments(process.argv.slice(2));
const fixedRows = targetRows();
const trieBuild = buildSeedTrie(options.seedStart, options.seedCount, options.maxRssBytes);
const search = trieBuild.memoryGuard
  ? {
      result: null,
      attemptedLandings: 0,
      acceptedPlacements: 0,
      failedStateCount: 0,
      memoryGuard: true,
    }
  : searchSetup(fixedRows, trieBuild.nodes, options);
const status = search.result
  ? 'candidate'
  : search.memoryGuard
    ? 'memory-guard'
    : search.attemptedLandings > options.nodeBudget
      ? 'budget-exhausted'
      : 'not-found';
const output = {
  schemaVersion: 1,
  claim: 'F3C fixed-mask setup candidate only; Core route replay and exact proof remain mandatory.',
  status,
  targetRows: 10,
  targetMaskRows: TARGET_VISIBLE_ROWS,
  setup: search.result ? {
    seed: search.result.seed,
    placements: search.result.placements,
  } : null,
  boardRows: search.result ? boardRowsWithTypes(search.result.typeRows) : null,
  search: {
    seedStart: options.seedStart,
    seedCount: options.seedCount,
    nodeBudget: options.nodeBudget,
    processedSeeds: trieBuild.processedSeeds,
    trieNodeCount: trieBuild.nodes.length,
    attemptedLandings: search.attemptedLandings,
    acceptedPlacements: search.acceptedPlacements,
    failedStateCount: search.failedStateCount,
  },
};

mkdirSync(dirname(options.outputPath), { recursive: true });
writeFileSync(options.outputPath, `${JSON.stringify(output, null, 2)}\n`, { encoding: 'utf8' });
process.stdout.write(`${JSON.stringify({
  status,
  setupSeed: output.setup?.seed ?? null,
  attemptedLandings: output.search.attemptedLandings,
  acceptedPlacements: output.search.acceptedPlacements,
  failedStateCount: output.search.failedStateCount,
  trieNodeCount: output.search.trieNodeCount,
})}\n`);
if (!search.result) process.exitCode = 2;
