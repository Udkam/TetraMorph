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
 *     --shard-count <positive-int> --shard-index <zero-based-int>
 *     --cursor <completed-probes> --node-budget <new-probes>
 *     --max-rss-mib <positive-int>
 *     --output <explicit-json-path>
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const WIDTH = 10;
const HEIGHT = 40;
const VISIBLE_START = 20;
const TARGET_TOP = 30;
const FULL_ROW = (1 << WIDTH) - 1;
const MAX_PROBES = 1_000_000_000;
const SEQUENCE_LENGTH = 20;
const TRAVERSAL_VERSION = 'seed-shard-replay-v1';
const QUEUE_GENERATOR_VERSION = 'xorshift32-fisher-yates-seven-bag-v1';
const SETUP_RULES_VERSION = 'visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1';
const TRAVERSAL_ORDER = 'type-index/rotation-0..3/x-ascending/landing-cell-dedupe-v1';
const STOP = Symbol('search-stop');
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

const REVERSE_ALGORITHM_VERSION = 'seeded-reverse-v1';
const REVERSE_CURSOR_SCHEMA_VERSION = 1;
const REVERSE_TYPE_ORDER_VERSION = 'I,O,T,S,Z,J,L-v1';
const REVERSE_CANDIDATE_ORDER_VERSION =
  'type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1';
const MASK_BYTES = 13;
const MASK_HEX_DIGITS = 25;
const PROBE_BLOCK_SIZE = 1024;

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Canonical reverse JSON accepts safe integers only.');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value !== 'object') throw new Error('Canonical reverse JSON received an unsupported value.');
  const keys = Object.keys(value).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function u8(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xff) throw new Error('u8 overflow.');
  return Buffer.from([value]);
}

function i8(value) {
  if (!Number.isSafeInteger(value) || value < -0x80 || value > 0x7f) throw new Error('i8 overflow.');
  return Buffer.from([value & 0xff]);
}

function u32be(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) throw new Error('u32 overflow.');
  const bytes = Buffer.allocUnsafe(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function u64be(value) {
  const number = typeof value === 'bigint' ? value : BigInt(value);
  if (number < 0n || number > 0xffff_ffff_ffff_ffffn) throw new Error('u64 overflow.');
  const bytes = Buffer.allocUnsafe(8);
  bytes.writeBigUInt64BE(number);
  return bytes;
}

function utf8Bytes(value) {
  const bytes = Buffer.from(value, 'utf8');
  return Buffer.concat([u32be(bytes.length), bytes]);
}

function rawSha256(parts) {
  const hasher = createHash('sha256');
  for (const part of parts) hasher.update(part);
  return hasher.digest();
}

function labeledHash(label, parts = []) {
  return rawSha256([Buffer.from(`${label}\0`, 'ascii'), ...parts]);
}

function hashHex(bytes) {
  return bytes.toString('hex').toUpperCase();
}

function maskBytes(mask) {
  if (typeof mask !== 'bigint' || mask < 0n || mask >= (1n << 100n)) throw new Error('Mask overflow.');
  const bytes = Buffer.alloc(MASK_BYTES);
  let rest = mask;
  for (let index = MASK_BYTES - 1; index >= 0; index -= 1) {
    bytes[index] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return bytes;
}

function bytesMask(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== MASK_BYTES || (bytes[0] & 0xf0) !== 0) {
    throw new Error('Mask bytes must be a padded 100-bit unsigned integer.');
  }
  let mask = 0n;
  for (const byte of bytes) mask = (mask << 8n) | BigInt(byte);
  return mask;
}

function maskHex(mask) {
  return mask.toString(16).toUpperCase().padStart(MASK_HEX_DIGITS, '0');
}

function parseMaskHex(value) {
  if (typeof value !== 'string' || !/^[0-9A-F]{25}$/.test(value)) throw new Error('Invalid reverse mask.');
  return bytesMask(Buffer.from(`0${value}`, 'hex'));
}

function rowsMask(rows = TARGET_VISIBLE_ROWS) {
  let mask = 0n;
  const firstMaskRow = TARGET_TOP - VISIBLE_START;
  for (let row = firstMaskRow; row < rows.length; row += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (rows[row][x] === '#') mask |= 1n << BigInt((row - firstMaskRow) * WIDTH + x);
    }
  }
  return mask;
}

function descriptorBytes(descriptor) {
  return Buffer.concat([
    u8(descriptor.typeIndex), u8(descriptor.rotation), i8(descriptor.x), u8(descriptor.absoluteY),
    maskBytes(descriptor.cellMask),
  ]);
}

function descriptorJson(descriptor) {
  return {
    typeIndex: descriptor.typeIndex,
    rotation: descriptor.rotation,
    x: descriptor.x,
    absoluteY: descriptor.absoluteY,
    cellMask: maskHex(descriptor.cellMask),
  };
}

function descriptorMask(type, rotation, x, absoluteY) {
  let mask = 0n;
  for (const [dx, dy] of SHAPES[type][rotation]) {
    const cellX = x + dx;
    const cellY = absoluteY + dy;
    if (cellX < 0 || cellX >= WIDTH || cellY < TARGET_TOP || cellY >= HEIGHT) return null;
    mask |= 1n << BigInt((cellY - TARGET_TOP) * WIDTH + cellX);
  }
  return mask;
}

function buildReverseCatalog(fixedMask = rowsMask()) {
  const descriptors = [];
  const seen = TYPES.map(() => new Set());
  for (let typeIndex = 0; typeIndex < TYPES.length; typeIndex += 1) {
    const type = TYPES[typeIndex];
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const shape = SHAPES[type][rotation];
      const minimumX = -Math.min(...shape.map(([x]) => x)) || 0;
      const maximumX = WIDTH - 1 - Math.max(...shape.map(([x]) => x));
      const minimumY = TARGET_TOP - Math.min(...shape.map(([, y]) => y));
      const maximumY = HEIGHT - 1 - Math.max(...shape.map(([, y]) => y));
      for (let x = minimumX; x <= maximumX; x += 1) {
        for (let absoluteY = minimumY; absoluteY <= maximumY; absoluteY += 1) {
          const cellMask = descriptorMask(type, rotation, x, absoluteY);
          if (cellMask === null || (cellMask & fixedMask) !== cellMask) continue;
          const key = maskHex(cellMask);
          if (seen[typeIndex].has(key)) continue;
          seen[typeIndex].add(key);
          descriptors.push(Object.freeze({ typeIndex, rotation, x, absoluteY, cellMask }));
        }
      }
    }
  }
  const catalogHash = labeledHash('T37-RCAT-v1', [
    u32be(descriptors.length), ...descriptors.map(descriptorBytes),
  ]);
  return Object.freeze({ descriptors: Object.freeze(descriptors), catalogHash });
}

function shapeTableHash() {
  const parts = [u32be(TYPES.length)];
  for (let typeIndex = 0; typeIndex < TYPES.length; typeIndex += 1) {
    parts.push(u8(typeIndex), u32be(4));
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const shape = SHAPES[TYPES[typeIndex]][rotation];
      parts.push(u8(rotation), u32be(shape.length));
      for (const [x, y] of shape) parts.push(i8(x), i8(y));
    }
  }
  return labeledHash('T37-RSHAPES-v1', parts);
}

function fullQueueHash(seedStart, seedCount) {
  const parts = [u32be(seedStart), u32be(seedCount)];
  for (let offset = 0; offset < seedCount; offset += 1) {
    const seed = seedStart + offset;
    parts.push(u32be(seed), ...sequenceForSeed(seed, SEQUENCE_LENGTH).map((type) => u8(TYPE_INDEX.get(type))));
  }
  return labeledHash('T37-RQUEUE-v1', parts);
}

function reverseTrieHash(nodes) {
  const parts = [u32be(nodes.length)];
  for (const node of nodes) {
    for (const child of node.children) parts.push(u32be(child < 0 ? 0xffff_ffff : child));
    parts.push(u32be(node.seeds.length), ...node.seeds.map(u32be));
  }
  return labeledHash('T37-RTRIE-v1', parts);
}

function buildReverseTrie(seedStart, seedCount, maxRssBytes, rssBytes = () => process.memoryUsage().rss) {
  const nodes = [{ depth: 0, children: Array(TYPES.length).fill(-1), seeds: [] }];
  let processedSeeds = 0;
  const guarded = () => rssBytes() > maxRssBytes;
  for (let offset = 0; offset < seedCount; offset += 1) {
    if (offset % 1024 === 0 && guarded()) return { nodes, processedSeeds, memoryGuard: true, trieHash: null };
    const seed = seedStart + offset;
    let nodeIndex = 0;
    for (const type of sequenceForSeed(seed, SEQUENCE_LENGTH).toReversed()) {
      const typeIndex = TYPE_INDEX.get(type);
      let child = nodes[nodeIndex].children[typeIndex];
      if (child < 0) {
        child = nodes.length;
        nodes[nodeIndex].children[typeIndex] = child;
        nodes.push({ depth: nodes[nodeIndex].depth + 1, children: Array(TYPES.length).fill(-1), seeds: [] });
      }
      nodeIndex = child;
    }
    nodes[nodeIndex].seeds.push(seed);
    processedSeeds += 1;
  }
  if (guarded()) return { nodes, processedSeeds, memoryGuard: true, trieHash: null };
  return { nodes, processedSeeds, memoryGuard: false, trieHash: reverseTrieHash(nodes) };
}

function reverseDomainHash(identity) {
  return labeledHash('T37-RDOMAIN-v1', [
    maskBytes(identity.fixedMask), identity.catalogHash, identity.shapeHash, identity.queueHash, identity.trieHash,
    u32be(identity.fullSeedStart), u32be(identity.fullSeedCount), u32be(SEQUENCE_LENGTH),
    u32be(identity.shardCount), u32be(identity.shardIndex), u32be(identity.startOffset), u32be(identity.endOffset),
    utf8Bytes(REVERSE_ALGORITHM_VERSION), utf8Bytes(SETUP_RULES_VERSION),
    utf8Bytes(REVERSE_TYPE_ORDER_VERSION), utf8Bytes(QUEUE_GENERATOR_VERSION),
    utf8Bytes(REVERSE_CANDIDATE_ORDER_VERSION),
  ]);
}

function memoHash(keys) {
  const sorted = [...keys].map((key) => Buffer.isBuffer(key) ? key : Buffer.from(key, 'hex'))
    .sort(Buffer.compare);
  return labeledHash('T37-RMEMO-v1', [u32be(sorted.length), ...sorted]);
}

function probeRootHash(totalProbeCount, peaks, partialTokens) {
  const parts = [u64be(totalProbeCount), u32be(PROBE_BLOCK_SIZE), u32be(peaks.length)];
  for (const peak of peaks) parts.push(peak === null ? u8(0) : Buffer.concat([u8(1), peak]));
  parts.push(u32be(partialTokens.length), ...partialTokens);
  return labeledHash('T37-RPROOT-v1', parts);
}

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
  const allowed = new Set([
    '--seed-start', '--seed-count', '--shard-count', '--shard-index', '--cursor',
    '--node-budget', '--max-rss-mib', '--output',
  ]);
  for (const name of values.keys()) if (!allowed.has(name)) throw new Error(`Unknown authoring option: ${name}.`);
  const seedStart = integer('--seed-start', 1, 0xffff_ffff);
  const seedCount = integer('--seed-count', 1, 1_000_000);
  if (seedStart + seedCount - 1 > 0xffff_ffff) {
    throw new Error('The explicit setup-seed range may not wrap uint32.');
  }
  const shardCount = integer('--shard-count', 1, seedCount);
  const shardIndex = integer('--shard-index', 0, shardCount - 1);
  const cursor = integer('--cursor', 0, MAX_PROBES - 1);
  const nodeBudget = integer('--node-budget', 1, MAX_PROBES);
  if (cursor + nodeBudget > MAX_PROBES) {
    throw new Error(`--cursor plus --node-budget may not exceed ${MAX_PROBES}.`);
  }
  const shardStartOffset = Math.floor((seedCount * shardIndex) / shardCount);
  const shardEndOffset = Math.floor((seedCount * (shardIndex + 1)) / shardCount);
  return Object.freeze({
    seedStart,
    seedCount,
    shardCount,
    shardIndex,
    shardStartOffset,
    shardEndOffset,
    selectedSeedStart: seedStart + shardStartOffset,
    selectedSeedCount: shardEndOffset - shardStartOffset,
    cursor,
    nodeBudget,
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

function uppercaseSha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex').toUpperCase();
}

function domainIdentity(options) {
  const queueHasher = createHash('sha256');
  for (let offset = 0; offset < options.seedCount; offset += 1) {
    if (offset % 1024 === 0 && process.memoryUsage().rss > options.maxRssBytes) {
      throw new Error('The RSS guard stopped domain identity construction.');
    }
    const seed = options.seedStart + offset;
    queueHasher.update(`${seed}:${sequenceForSeed(seed, SEQUENCE_LENGTH).join('')}\n`, 'utf8');
  }
  const queueSequenceDigest = queueHasher.digest('hex').toUpperCase();
  const domainPayload = {
    traversalVersion: TRAVERSAL_VERSION,
    queueGeneratorVersion: QUEUE_GENERATOR_VERSION,
    setupRulesVersion: SETUP_RULES_VERSION,
    queueSequenceDigest,
    boardGeometry: { width: WIDTH, height: HEIGHT, visibleStart: VISIBLE_START, targetTop: TARGET_TOP },
    targetMaskRows: TARGET_VISIBLE_ROWS,
    pieceTypes: TYPES,
    pieceShapes: TYPES.map((type) => [type, SHAPES[type].map((shape) => shape.map(([x, y]) => [x, y]))]),
    seedStart: options.seedStart,
    seedCount: options.seedCount,
    sequenceLength: SEQUENCE_LENGTH,
    shardCount: options.shardCount,
    traversalOrder: TRAVERSAL_ORDER,
  };
  return {
    queueSequenceDigest,
    domainHash: uppercaseSha256(`${JSON.stringify(domainPayload)}\n`),
  };
}

function failedMemoHash(failed) {
  const hasher = createHash('sha256');
  for (const key of [...failed].sort()) hasher.update(`${key}\n`, 'utf8');
  return hasher.digest('hex').toUpperCase();
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
    for (const type of sequenceForSeed(seed, SEQUENCE_LENGTH)) {
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
  const probeHasher = createHash('sha256');
  const absoluteProbeLimit = options.cursor + options.nodeBudget;
  let attemptedLandings = 0;
  let acceptedPlacements = 0;
  let stopReason = null;

  const visit = (nodeIndex, depth) => {
    if (depth === SEQUENCE_LENGTH) {
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
          if (attemptedLandings >= absoluteProbeLimit) {
            stopReason = 'budget';
            return STOP;
          }
          if (attemptedLandings % 1024 === 0 && process.memoryUsage().rss > options.maxRssBytes) {
            stopReason = 'memory';
            return STOP;
          }
          probeHasher.update(`${key}|${type}|${rotation}|${x}\n`, 'utf8');
          attemptedLandings += 1;
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
          if (result !== STOP && result) return result;
          placements.pop();
          for (const [cellX, cellY] of placed.cells) {
            rows[cellY] &= ~(1 << cellX);
            typeRows[typeIndex][cellY] &= ~(1 << cellX);
          }
          if (result === STOP) return STOP;
        }
      }
    }
    failed.add(key);
    return null;
  };

  const outcome = visit(0, 0);
  const result = outcome === STOP ? null : outcome;
  const complete = outcome === null;
  if (result && attemptedLandings <= options.cursor) {
    throw new Error('The replay cursor would skip a previously covered candidate.');
  }
  if (complete && attemptedLandings < options.cursor) {
    throw new Error('The replay cursor extends beyond natural shard exhaustion.');
  }
  return {
    result,
    attemptedLandings,
    acceptedPlacements,
    failedStateCount: failed.size,
    stopReason,
    complete,
    probeHash: probeHasher.digest('hex').toUpperCase(),
    memoHash: failedMemoHash(failed),
  };
}

function runForward(argv) {
const options = parseArguments(argv);
const fixedRows = targetRows();
const identity = domainIdentity(options);
const trieBuild = buildSeedTrie(options.selectedSeedStart, options.selectedSeedCount, options.maxRssBytes);
const search = trieBuild.memoryGuard
  ? {
      result: null,
      attemptedLandings: 0,
      acceptedPlacements: 0,
      failedStateCount: 0,
      stopReason: 'memory',
      complete: false,
      probeHash: uppercaseSha256(''),
      memoHash: uppercaseSha256(''),
    }
  : searchSetup(fixedRows, trieBuild.nodes, options);
const status = search.result
  ? 'candidate'
  : search.stopReason === 'memory'
    ? 'memory-guard'
    : search.stopReason === 'budget'
      ? 'budget-exhausted'
      : 'not-found';
const nextCursor = Math.max(options.cursor, search.attemptedLandings);
const output = {
  schemaVersion: 2,
  claim: 'F3C fixed-mask setup candidate only; Core route replay and exact proof remain mandatory.',
  status,
  domain: {
    traversalVersion: TRAVERSAL_VERSION,
    queueGeneratorVersion: QUEUE_GENERATOR_VERSION,
    setupRulesVersion: SETUP_RULES_VERSION,
    queueSequenceDigest: identity.queueSequenceDigest,
    domainHash: identity.domainHash,
    seedStart: options.seedStart,
    seedCount: options.seedCount,
    sequenceLength: SEQUENCE_LENGTH,
    shardCount: options.shardCount,
    traversalOrder: TRAVERSAL_ORDER,
  },
  shard: {
    count: options.shardCount,
    index: options.shardIndex,
    startOffset: options.shardStartOffset,
    endOffsetExclusive: options.shardEndOffset,
    seedStart: options.selectedSeedStart,
    seedCount: options.selectedSeedCount,
  },
  coverage: {
    startCursor: options.cursor,
    nextCursor,
    replayedLandingProbes: Math.min(options.cursor, search.attemptedLandings),
    newLandingProbes: Math.max(0, search.attemptedLandings - options.cursor),
    complete: search.complete,
  },
  evidence: {
    probeHash: search.probeHash,
    memoHash: search.memoHash,
  },
  targetRows: 10,
  targetMaskRows: TARGET_VISIBLE_ROWS,
  setup: search.result ? {
    seed: search.result.seed,
    placements: search.result.placements,
  } : null,
  boardRows: search.result ? boardRowsWithTypes(search.result.typeRows) : null,
  search: {
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
  shardIndex: output.shard.index,
  nextCursor: output.coverage.nextCursor,
  attemptedLandings: output.search.attemptedLandings,
  acceptedPlacements: output.search.acceptedPlacements,
  failedStateCount: output.search.failedStateCount,
  trieNodeCount: output.search.trieNodeCount,
})}\n`);
if (!search.result) process.exitCode = 2;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) runForward(process.argv.slice(2));

export const __reverseTest = Object.freeze({
  TYPES,
  SHAPES,
  TARGET_VISIBLE_ROWS,
  REVERSE_ALGORITHM_VERSION,
  REVERSE_CURSOR_SCHEMA_VERSION,
  REVERSE_TYPE_ORDER_VERSION,
  REVERSE_CANDIDATE_ORDER_VERSION,
  SETUP_RULES_VERSION,
  QUEUE_GENERATOR_VERSION,
  PROBE_BLOCK_SIZE,
  canonicalJson,
  maskBytes,
  bytesMask,
  maskHex,
  parseMaskHex,
  rowsMask,
  descriptorBytes,
  descriptorJson,
  buildReverseCatalog,
  shapeTableHash,
  fullQueueHash,
  buildReverseTrie,
  reverseTrieHash,
  reverseDomainHash,
  memoHash,
  probeRootHash,
  sequenceForSeed,
  hashHex,
});
