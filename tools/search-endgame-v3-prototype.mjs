/**
 * Deterministic F3C setup discovery for one fixed non-published ten-row prototype.
 *
 * This tool searches only legal seeded setup histories. Its JSON is an authoring
 * candidate: current Core replay, a public completion route, and the exact shorter-
 * depth certificate remain mandatory before the prototype can be admitted.
 *
 * Usage:
 *   node tools/search-endgame-v3-prototype.mjs
 *     --seed-start <uint32> --seed-count <positive-int>
 *     --shard-count <positive-int> --shard-index <zero-based-int>
 *     --cursor <completed-probes> --node-budget <new-probes>
 *     --max-rss-mib <positive-int>
 *     --output <explicit-json-path>
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
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
const REVERSE_CANDIDATE_ORDER_VERSION = 'type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1';
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
  const hasher = createHash('sha256');
  hasher.update(Buffer.from('T37-RQUEUE-v1\0', 'ascii'));
  hasher.update(u32be(seedStart));
  hasher.update(u32be(seedCount));
  for (let offset = 0; offset < seedCount; offset += 1) {
    const seed = seedStart + offset;
    hasher.update(u32be(seed));
    for (const type of sequenceForSeed(seed, SEQUENCE_LENGTH)) hasher.update(u8(TYPE_INDEX.get(type)));
  }
  return hasher.digest();
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

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new Error(`${label} has an invalid field set.`);
  }
}

function neighborMask(mask, fixedMask) {
  let neighbors = 0n;
  for (let bit = 0; bit < 100; bit += 1) {
    if ((mask & (1n << BigInt(bit))) === 0n) continue;
    const x = bit % WIDTH;
    const y = Math.floor(bit / WIDTH);
    if (x > 0) neighbors |= 1n << BigInt(bit - 1);
    if (x + 1 < WIDTH) neighbors |= 1n << BigInt(bit + 1);
    if (y > 0) neighbors |= 1n << BigInt(bit - WIDTH);
    if (y + 1 < 10) neighbors |= 1n << BigInt(bit + WIDTH);
  }
  return neighbors & fixedMask;
}

function hardDropMask(boardMask, descriptor) {
  const shape = SHAPES[TYPES[descriptor.typeIndex]][descriptor.rotation];
  const canPlaceMask = (absoluteY) => shape.every(([dx, dy]) => {
    const x = descriptor.x + dx;
    const y = absoluteY + dy;
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return false;
    if (y < TARGET_TOP) return true;
    return (boardMask & (1n << BigInt((y - TARGET_TOP) * WIDTH + x))) === 0n;
  });
  let y = VISIBLE_START - 1;
  if (!canPlaceMask(y)) return null;
  while (canPlaceMask(y + 1)) y += 1;
  return descriptorMask(TYPES[descriptor.typeIndex], descriptor.rotation, descriptor.x, y);
}

function failedKey(frame) {
  return Buffer.concat([
    u8(frame.depth), u32be(frame.trieNodeId), maskBytes(frame.remainingBoard),
    ...frame.forbiddenMasks.map(maskBytes),
  ]);
}

function probeToken(frame, descriptor, candidateIndex, globalProbeIndex, outcome) {
  const token = Buffer.concat([
    u8(1), u64be(globalProbeIndex), u8(frame.depth), u32be(frame.trieNodeId),
    maskBytes(frame.remainingBoard), ...frame.forbiddenMasks.map(maskBytes), u32be(candidateIndex),
    u8(descriptor.typeIndex), u8(descriptor.rotation), i8(descriptor.x), u8(descriptor.absoluteY),
    maskBytes(descriptor.cellMask), u8(outcome),
  ]);
  if (token.length !== 140) throw new Error('Reverse probe token length drifted.');
  return token;
}

function appendProbe(probe, token) {
  probe.partialTokens.push(token);
  probe.nextProbeCount += 1;
  if (probe.partialTokens.length < PROBE_BLOCK_SIZE) return;
  const blockIndex = Math.floor((probe.nextProbeCount - 1) / PROBE_BLOCK_SIZE);
  const blockHash = labeledHash('T37-RPBLOCK-v1', [
    u64be(blockIndex), u32be(PROBE_BLOCK_SIZE), ...probe.partialTokens,
  ]);
  let carry = labeledHash('T37-RPLEAF-v1', [u64be(blockIndex), blockHash]);
  probe.partialTokens = [];
  let level = 0;
  while (probe.peaks[level]) {
    carry = labeledHash('T37-RPNODE-v1', [u32be(level), probe.peaks[level], carry]);
    probe.peaks[level] = null;
    level += 1;
  }
  probe.peaks[level] = carry;
  while (probe.peaks.at(-1) === null) probe.peaks.pop();
}

const FRAME_CANDIDATE_CACHE = new WeakMap();
function frameCandidateTypeMask(node) {
  let typeMask = 0;
  for (let typeIndex = 0; typeIndex < TYPES.length; typeIndex += 1) {
    if (node.children[typeIndex] >= 0) typeMask |= 1 << typeIndex;
  }
  return typeMask;
}

function frameCandidates(context, frame) {
  const node = context.trie[frame.trieNodeId];
  const typeMask = frameCandidateTypeMask(node);
  let cache = FRAME_CANDIDATE_CACHE.get(context);
  if (!cache || cache.catalog !== context.catalog) {
    cache = { catalog: context.catalog, candidatesByTypeMask: new Map() };
    FRAME_CANDIDATE_CACHE.set(context, cache);
  }
  const { candidatesByTypeMask } = cache;
  if (!candidatesByTypeMask.has(typeMask)) {
    candidatesByTypeMask.set(typeMask,
      context.catalog.filter((descriptor) => typeMask & (1 << descriptor.typeIndex)));
  }
  return candidatesByTypeMask.get(typeMask);
}

function createReverseState(context) {
  return {
    frames: [{
      depth: 0, trieNodeId: 0, remainingBoard: context.fixedMask,
      forbiddenMasks: TYPES.map(() => 0n), nextCandidateIndex: 0, enteringDescriptor: null,
    }],
    placements: [],
    failed: new Map(),
    candidateSeen: false,
    probe: { nextProbeCount: 0, peaks: [], partialTokens: [] },
  };
}

function sameDescriptor(left, right) {
  return left && right && left.typeIndex === right.typeIndex && left.rotation === right.rotation
    && left.x === right.x && left.absoluteY === right.absoluteY && left.cellMask === right.cellMask;
}

function candidateBoardRows(descriptors) {
  const rows = Array.from({ length: 20 }, () => Array(WIDTH).fill('.'));
  for (const descriptor of descriptors) {
    for (let bit = 0; bit < 100; bit += 1) if (descriptor.cellMask & (1n << BigInt(bit))) {
      rows[TARGET_TOP - VISIBLE_START + Math.floor(bit / WIDTH)][bit % WIDTH] = TYPES[descriptor.typeIndex];
    }
  }
  return rows.map((row) => row.join(''));
}

function advanceReverse(context, state, nodeBudget, maxRssBytes, rssBytes = () => process.memoryUsage().rss) {
  const startProbeCount = state.probe.nextProbeCount;
  let newProbeCount = 0;
  for (;;) {
    while (state.frames.length > 0) {
      const frame = state.frames.at(-1);
      if (frame.nextCandidateIndex < frameCandidates(context, frame).length) break;
      if (!state.candidateSeen) {
        const key = failedKey(frame);
        state.failed.set(key.toString('hex').toUpperCase(), key);
      }
      state.frames.pop();
      if (frame.enteringDescriptor) state.placements.pop();
    }
    if (state.frames.length === 0) {
      return { status: 'complete-not-found', complete: true, startProbeCount, newProbeCount, result: null };
    }
    if (newProbeCount === nodeBudget) {
      return { status: 'paused-budget', complete: false, startProbeCount, newProbeCount, result: null };
    }
    if ((newProbeCount === 0 || state.probe.nextProbeCount % PROBE_BLOCK_SIZE === 0)
      && rssBytes() > maxRssBytes) {
      return { status: 'memory-guard', complete: false, startProbeCount, newProbeCount, result: null };
    }

    const frame = state.frames.at(-1);
    const candidates = frameCandidates(context, frame);
    const candidateIndex = frame.nextCandidateIndex;
    const descriptor = candidates[candidateIndex];
    frame.nextCandidateIndex += 1;
    let outcome = 0;
    let childFrame = null;
    let result = null;
    if ((descriptor.cellMask & frame.remainingBoard) === descriptor.cellMask) {
      if ((descriptor.cellMask & frame.forbiddenMasks[descriptor.typeIndex]) !== 0n) outcome = 1;
      else {
        const remainingBoard = frame.remainingBoard & ~descriptor.cellMask;
        if (hardDropMask(remainingBoard, descriptor) !== descriptor.cellMask) outcome = 2;
        else {
          const forbiddenMasks = [...frame.forbiddenMasks];
          forbiddenMasks[descriptor.typeIndex] |= neighborMask(descriptor.cellMask, context.fixedMask);
          const trieNodeId = context.trie[frame.trieNodeId].children[descriptor.typeIndex];
          childFrame = {
            depth: frame.depth + 1, trieNodeId, remainingBoard, forbiddenMasks,
            nextCandidateIndex: 0, enteringDescriptor: descriptor,
          };
          const leaf = childFrame.depth === context.sequenceLength && remainingBoard === 0n
            && context.trie[trieNodeId].seeds.length > 0;
          if (leaf) {
            outcome = 5;
            const reversePlacements = [...state.placements, descriptor];
            const forwardDescriptors = reversePlacements.toReversed();
            result = {
              seed: Math.min(...context.trie[trieNodeId].seeds),
              descriptors: forwardDescriptors,
              placements: forwardDescriptors.map((item) => ({
                type: TYPES[item.typeIndex], rotation: item.rotation, x: item.x,
              })),
              boardRows: candidateBoardRows(forwardDescriptors),
            };
          } else {
            const key = failedKey(childFrame).toString('hex').toUpperCase();
            if (state.failed.has(key)) outcome = 3;
            else outcome = 4;
          }
        }
      }
    }
    appendProbe(state.probe, probeToken(frame, descriptor, candidateIndex, state.probe.nextProbeCount, outcome));
    newProbeCount += 1;
    if (result) {
      state.candidateSeen = true;
      return { status: 'candidate', complete: false, startProbeCount, newProbeCount, result };
    }
    if (outcome === 4) {
      state.frames.push(childFrame);
      state.placements.push(descriptor);
    }
  }
}

function continuationBody(state, domainHash, shardIndex) {
  if (state.candidateSeen) throw new Error('Candidate-bearing reverse state is not resumable.');
  return {
    cursorSchemaVersion: REVERSE_CURSOR_SCHEMA_VERSION,
    domainHash: hashHex(domainHash),
    shardIndex,
    nextProbeCount: state.probe.nextProbeCount,
    probeBlockSize: PROBE_BLOCK_SIZE,
    peaks: state.probe.peaks.map((peak) => peak === null ? null : hashHex(peak)),
    partialProbeTokens: state.probe.partialTokens.map((token) => hashHex(token)),
    placements: state.placements.map(descriptorJson),
    failedMemoKeys: [...state.failed.keys()].sort(),
    frames: state.frames.map((frame) => ({
      depth: frame.depth,
      trieNodeId: frame.trieNodeId,
      remainingBoard: maskHex(frame.remainingBoard),
      forbiddenMasks: frame.forbiddenMasks.map(maskHex),
      nextCandidateIndex: frame.nextCandidateIndex,
      enteringDescriptor: frame.enteringDescriptor ? descriptorJson(frame.enteringDescriptor) : null,
    })),
  };
}

function makeContinuation(state, domainHash, shardIndex) {
  const body = continuationBody(state, domainHash, shardIndex);
  const cursorStateHash = hashHex(labeledHash('T37-RCURSOR-v1', [Buffer.from(canonicalJson(body))]));
  return { ...body, cursorStateHash };
}

function parseDescriptorJson(value, label) {
  exactKeys(value, ['typeIndex', 'rotation', 'x', 'absoluteY', 'cellMask'], label);
  if (!Number.isSafeInteger(value.typeIndex) || value.typeIndex < 0 || value.typeIndex >= TYPES.length
    || !Number.isSafeInteger(value.rotation) || value.rotation < 0 || value.rotation > 3
    || !Number.isSafeInteger(value.x) || value.x < -128 || value.x > 127
    || !Number.isSafeInteger(value.absoluteY) || value.absoluteY < 0 || value.absoluteY > 255) {
    throw new Error(`${label} has invalid descriptor integers.`);
  }
  return { ...value, cellMask: parseMaskHex(value.cellMask) };
}

function restoreContinuation(value, context, domainHash, shardIndex) {
  exactKeys(value, [
    'cursorSchemaVersion', 'domainHash', 'shardIndex', 'nextProbeCount', 'probeBlockSize', 'peaks',
    'partialProbeTokens', 'placements', 'failedMemoKeys', 'frames', 'cursorStateHash',
  ], 'continuation');
  const { cursorStateHash, ...body } = value;
  const expectedHash = hashHex(labeledHash('T37-RCURSOR-v1', [Buffer.from(canonicalJson(body))]));
  if (cursorStateHash !== expectedHash || body.cursorSchemaVersion !== REVERSE_CURSOR_SCHEMA_VERSION
    || body.domainHash !== hashHex(domainHash) || body.shardIndex !== shardIndex
    || body.probeBlockSize !== PROBE_BLOCK_SIZE || !Number.isSafeInteger(body.nextProbeCount)
    || body.nextProbeCount < 0) throw new Error('Reverse cursor identity is invalid.');
  if (!Array.isArray(body.peaks) || !Array.isArray(body.partialProbeTokens)
    || !Array.isArray(body.placements) || !Array.isArray(body.failedMemoKeys) || !Array.isArray(body.frames)) {
    throw new Error('Reverse cursor arrays are invalid.');
  }
  const peaks = body.peaks.map((peak) => {
    if (peak === null) return null;
    if (typeof peak !== 'string' || !/^[0-9A-F]{64}$/.test(peak)) throw new Error('Invalid cursor peak.');
    return Buffer.from(peak, 'hex');
  });
  const leafCount = Math.floor(body.nextProbeCount / PROBE_BLOCK_SIZE);
  const minimumPeakLength = leafCount === 0 ? 0 : Math.floor(Math.log2(leafCount)) + 1;
  if (peaks.length !== minimumPeakLength
    || peaks.some((peak, level) => Boolean(peak) !== Boolean(leafCount & (2 ** level)))) {
    throw new Error('Cursor peak frontier does not match its probe count.');
  }
  const partialTokens = body.partialProbeTokens.map((token, index) => {
    if (typeof token !== 'string' || !/^[0-9A-F]{280}$/.test(token)) throw new Error('Invalid partial probe token.');
    const bytes = Buffer.from(token, 'hex');
    const expectedIndex = body.nextProbeCount - body.partialProbeTokens.length + index;
    if (bytes[0] !== 1 || bytes.readBigUInt64BE(1) !== BigInt(expectedIndex)) throw new Error('Partial token index drift.');
    if (bytes[139] === 5) throw new Error('Candidate partial token is not resumable.');
    const tokenNode = bytes.readUInt32BE(10);
    const tokenMasks = [14, 27, 40, 53, 66, 79, 92, 105, 126]
      .map((offset) => bytesMask(bytes.subarray(offset, offset + 13)));
    if (context.trie[tokenNode]?.depth !== bytes[9]
      || tokenMasks.some((mask) => (mask & ~context.fixedMask) !== 0n)
      || bytes[122] >= TYPES.length || bytes[123] >= 4 || bytes[139] >= 6) {
      throw new Error('Partial token domain drift.');
    }
    const tokenFrame = {
      depth: bytes[9], trieNodeId: tokenNode, remainingBoard: tokenMasks[0],
      forbiddenMasks: tokenMasks.slice(1, 8),
    };
    const tokenCandidate = frameCandidates(context, tokenFrame)[bytes.readUInt32BE(118)];
    const tokenDescriptor = {
      typeIndex: bytes[122], rotation: bytes[123], x: bytes.readInt8(124),
      absoluteY: bytes[125], cellMask: tokenMasks[8],
    };
    if (!sameDescriptor(tokenCandidate, tokenDescriptor)) throw new Error('Partial token candidate drift.');
    return bytes;
  });
  if (partialTokens.length !== body.nextProbeCount % PROBE_BLOCK_SIZE) throw new Error('Partial token count drift.');
  const placements = body.placements.map((item, index) => parseDescriptorJson(item, `placement ${index}`));
  const failed = new Map();
  let previous = '';
  for (const key of body.failedMemoKeys) {
    if (typeof key !== 'string' || !/^[0-9A-F]{218}$/.test(key) || (previous && previous >= key)) {
      throw new Error('Invalid or unsorted failed memo key.');
    }
    const bytes = Buffer.from(key, 'hex');
    const keyNode = bytes.readUInt32BE(1);
    const masks = [5, 18, 31, 44, 57, 70, 83, 96].map((offset) => bytesMask(bytes.subarray(offset, offset + 13)));
    if (bytes[0] > context.sequenceLength || keyNode >= context.trie.length
      || context.trie[keyNode].depth !== bytes[0] || masks.some((mask) => (mask & ~context.fixedMask) !== 0n)) {
      throw new Error('Failed memo key escapes the reverse domain.');
    }
    failed.set(key, bytes);
    previous = key;
  }
  const frames = body.frames.map((frame, index) => {
    exactKeys(frame, ['depth', 'trieNodeId', 'remainingBoard', 'forbiddenMasks', 'nextCandidateIndex',
      'enteringDescriptor'], `frame ${index}`);
    if (!Number.isSafeInteger(frame.depth) || !Number.isSafeInteger(frame.trieNodeId)
      || !Number.isSafeInteger(frame.nextCandidateIndex) || !Array.isArray(frame.forbiddenMasks)
      || frame.forbiddenMasks.length !== TYPES.length) throw new Error('Invalid reverse frame integers.');
    return {
      depth: frame.depth, trieNodeId: frame.trieNodeId, remainingBoard: parseMaskHex(frame.remainingBoard),
      forbiddenMasks: frame.forbiddenMasks.map(parseMaskHex), nextCandidateIndex: frame.nextCandidateIndex,
      enteringDescriptor: frame.enteringDescriptor === null ? null
        : parseDescriptorJson(frame.enteringDescriptor, `frame ${index} descriptor`),
    };
  });
  if (frames.length === 0 || placements.length !== frames.length - 1) throw new Error('Cursor path length is invalid.');
  const root = frames[0];
  if (root.depth !== 0 || root.trieNodeId !== 0 || root.remainingBoard !== context.fixedMask
    || root.forbiddenMasks.some(Boolean) || root.enteringDescriptor !== null) throw new Error('Cursor root is invalid.');
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const candidates = frameCandidates(context, frame);
    if (frame.depth !== index || frame.trieNodeId < 0 || frame.trieNodeId >= context.trie.length
      || context.trie[frame.trieNodeId].depth !== frame.depth
      || frame.nextCandidateIndex < 0 || frame.nextCandidateIndex > candidates.length
      || (frame.remainingBoard & ~context.fixedMask) !== 0n
      || frame.forbiddenMasks.some((mask) => (mask & ~context.fixedMask) !== 0n)
      || failed.has(failedKey(frame).toString('hex').toUpperCase())) throw new Error('Cursor frame bounds are invalid.');
    if (index === 0) continue;
    const parent = frames[index - 1];
    const entering = frame.enteringDescriptor;
    if (parent.nextCandidateIndex < 1 || !sameDescriptor(entering, placements[index - 1])
      || !sameDescriptor(entering, frameCandidates(context, parent)[parent.nextCandidateIndex - 1])
      || context.trie[parent.trieNodeId].children[entering.typeIndex] !== frame.trieNodeId
      || (entering.cellMask & parent.remainingBoard) !== entering.cellMask
      || (entering.cellMask & parent.forbiddenMasks[entering.typeIndex]) !== 0n
      || frame.remainingBoard !== (parent.remainingBoard & ~entering.cellMask)
      || hardDropMask(frame.remainingBoard, entering) !== entering.cellMask) throw new Error('Cursor frame transition is invalid.');
    const expectedForbidden = [...parent.forbiddenMasks];
    expectedForbidden[entering.typeIndex] |= neighborMask(entering.cellMask, context.fixedMask);
    if (expectedForbidden.some((mask, type) => mask !== frame.forbiddenMasks[type])) {
      throw new Error('Cursor forbidden transition is invalid.');
    }
  }
  if (frames.at(-1).nextCandidateIndex >= frameCandidates(context, frames.at(-1)).length) {
    throw new Error('Cursor top frame must be ready for a probe.');
  }
  return {
    frames, placements, failed, candidateSeen: false,
    probe: { nextProbeCount: body.nextProbeCount, peaks, partialTokens },
  };
}

const REVERSE_CLAIM = 'F3C seeded-reverse setup candidate only; Core route replay and exact proof remain mandatory.';
function pathIdentity(path) {
  const absolute = resolve(path); let existing = absolute, tail = [];
  while (!existsSync(existing)) { tail.unshift(basename(existing)); existing = dirname(existing); }
  const identity = resolve(realpathSync.native(existing), ...tail);
  return process.platform === 'win32' ? identity.toLowerCase() : identity;
}
function sameExistingFile(leftPath, rightPath) {
  if (!existsSync(leftPath) || !existsSync(rightPath)) return false;
  const left = statSync(leftPath, { bigint: true });
  const right = statSync(rightPath, { bigint: true });
  return left.dev === right.dev && left.ino === right.ino;
}
function parseReverseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || value === undefined) throw new Error('Expected explicit --name value pairs.');
    if (values.has(name)) throw new Error(`Duplicate authoring option: ${name}.`);
    values.set(name, value);
  }
  const allowed = new Set([
    '--algorithm', '--seed-start', '--seed-count', '--shard-count', '--shard-index',
    '--node-budget', '--max-rss-mib', '--output', '--resume',
  ]);
  for (const name of values.keys()) if (!allowed.has(name)) throw new Error(`Unknown reverse option: ${name}.`);
  if (values.get('--algorithm') !== REVERSE_ALGORITHM_VERSION) throw new Error('Unsupported reverse algorithm.');
  const integer = (name, minimum, maximum) => {
    const value = Number(values.get(name));
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
    }
    return value;
  };
  const fullSeedStart = integer('--seed-start', 1, 0xffff_ffff);
  const fullSeedCount = integer('--seed-count', 1, 1_000_000);
  if (fullSeedStart + fullSeedCount - 1 > 0xffff_ffff) throw new Error('The seed range may not wrap uint32.');
  const shardCount = integer('--shard-count', 1, fullSeedCount);
  const shardIndex = integer('--shard-index', 0, shardCount - 1);
  const startOffset = Math.floor((fullSeedCount * shardIndex) / shardCount);
  const endOffset = Math.floor((fullSeedCount * (shardIndex + 1)) / shardCount);
  const outputValue = values.get('--output');
  if (!outputValue) throw new Error('--output is required.');
  const outputPath = resolve(outputValue);
  const resumePath = values.has('--resume') ? resolve(values.get('--resume')) : null;
  if (resumePath && (pathIdentity(resumePath) === pathIdentity(outputPath)
    || sameExistingFile(resumePath, outputPath))) {
    throw new Error('Reverse resume input and output paths must be distinct.');
  }
  return {
    fullSeedStart, fullSeedCount, shardCount, shardIndex, startOffset, endOffset,
    shardSeedStart: fullSeedStart + startOffset, shardSeedCount: endOffset - startOffset,
    nodeBudget: integer('--node-budget', 1, MAX_PROBES),
    maxRssMiB: integer('--max-rss-mib', 128, 4096), outputPath, resumePath,
  };
}
function reverseDomainObject(identity, trieHash, domainHash) {
  return {
    algorithmVersion: REVERSE_ALGORITHM_VERSION,
    setupRulesVersion: SETUP_RULES_VERSION,
    typeOrderVersion: REVERSE_TYPE_ORDER_VERSION,
    queueGeneratorVersion: QUEUE_GENERATOR_VERSION,
    candidateOrderVersion: REVERSE_CANDIDATE_ORDER_VERSION,
    catalogHash: hashHex(identity.catalogHash),
    shapeTableHash: hashHex(identity.shapeHash),
    fullQueueHash: hashHex(identity.queueHash),
    reverseTrieHash: trieHash && hashHex(trieHash),
    domainHash: domainHash && hashHex(domainHash),
    fullSeedStart: identity.options.fullSeedStart,
    fullSeedCount: identity.options.fullSeedCount,
    sequenceLength: SEQUENCE_LENGTH,
    shardCount: identity.options.shardCount,
  };
}
function reverseShardObject(options) {
  return {
    count: options.shardCount, index: options.shardIndex,
    startOffset: options.startOffset, endOffsetExclusive: options.endOffset,
    seedStart: options.shardSeedStart, seedCount: options.shardSeedCount,
  };
}
function reverseResultHash(values) {
  const payload = {
    complete: values.complete,
    cursorStateHash: values.cursorStateHash,
    domainHash: values.domainHash,
    memoHash: values.memoHash,
    nextProbeCount: values.nextProbeCount,
    phase: values.phase,
    probeHash: values.probeHash,
    setup: values.setup,
    status: values.status,
  };
  return hashHex(labeledHash('T37-RRESULT-v1', [Buffer.from(canonicalJson(payload))]));
}
function makeReverseOutput(identity, trieBuild, state, advance, domainHash) {
  if (state?.candidateSeen === true && advance?.status !== 'candidate') {
    throw new Error('A candidate-bearing reverse state cannot produce another formal output.');
  }
  if (advance?.status === 'candidate' && state?.candidateSeen !== true) {
    throw new Error('Candidate output requires candidate-bearing state.');
  }
  const options = identity.options;
  const phase = trieBuild.memoryGuard ? 'trie-build' : 'search';
  const status = trieBuild.memoryGuard ? 'memory-guard' : advance.status;
  const complete = trieBuild.memoryGuard ? false : advance.complete;
  const startProbeCount = trieBuild.memoryGuard ? 0 : advance.startProbeCount;
  const newProbeCount = trieBuild.memoryGuard ? 0 : advance.newProbeCount;
  const nextProbeCount = trieBuild.memoryGuard ? 0 : state.probe.nextProbeCount;
  const setup = advance?.result ? { seed: advance.result.seed, placements: advance.result.placements } : null;
  const boardRows = advance?.result?.boardRows ?? null;
  const resumable = phase === 'search' && (status === 'paused-budget' || status === 'memory-guard');
  const continuation = resumable ? makeContinuation(state, domainHash, options.shardIndex) : null;
  const probeHash = trieBuild.memoryGuard
    ? hashHex(probeRootHash(0, [], []))
    : hashHex(probeRootHash(nextProbeCount, state.probe.peaks, state.probe.partialTokens));
  const memoDigest = trieBuild.memoryGuard ? hashHex(memoHash([])) : hashHex(memoHash(state.failed.values()));
  const domain = reverseDomainObject(identity, trieBuild.memoryGuard ? null : trieBuild.trieHash,
    trieBuild.memoryGuard ? null : domainHash);
  const resultHash = reverseResultHash({
    complete, cursorStateHash: continuation?.cursorStateHash ?? null, domainHash: domain.domainHash,
    memoHash: memoDigest, nextProbeCount, phase, probeHash, setup, status,
  });
  return {
    schemaVersion: 3,
    algorithmVersion: REVERSE_ALGORITHM_VERSION,
    cursorSchemaVersion: REVERSE_CURSOR_SCHEMA_VERSION,
    claim: REVERSE_CLAIM,
    status,
    phase,
    domain,
    shard: reverseShardObject(options),
    coverage: { startProbeCount, newProbeCount, nextProbeCount, complete },
    evidence: {
      probeHash, memoHash: memoDigest, cursorStateHash: continuation?.cursorStateHash ?? null, resultHash,
    },
    targetRows: 10,
    targetMaskRows: TARGET_VISIBLE_ROWS,
    setup,
    boardRows,
    search: {
      nodeBudget: options.nodeBudget,
      maxRssMiB: options.maxRssMiB,
      processedSeeds: trieBuild.processedSeeds,
      catalogDescriptorCount: identity.catalog.descriptors.length,
      reverseTrieNodeCount: trieBuild.nodes.length,
      startProbeCount,
      newProbeCount,
      nextProbeCount,
      failedStateCount: trieBuild.memoryGuard ? 0 : state.failed.size,
    },
    continuation,
  };
}
function validateResumeOutput(output, identity, context, domainHash, trieBuild) {
  exactKeys(output, ['schemaVersion', 'algorithmVersion', 'cursorSchemaVersion', 'claim', 'status', 'phase',
    'domain', 'shard', 'coverage', 'evidence', 'targetRows', 'targetMaskRows', 'setup', 'boardRows', 'search',
    'continuation'], 'resume output');
  exactKeys(output.domain, ['algorithmVersion', 'setupRulesVersion', 'typeOrderVersion', 'queueGeneratorVersion',
    'candidateOrderVersion', 'catalogHash', 'shapeTableHash', 'fullQueueHash', 'reverseTrieHash', 'domainHash',
    'fullSeedStart', 'fullSeedCount', 'sequenceLength', 'shardCount'], 'resume domain');
  exactKeys(output.shard, ['count', 'index', 'startOffset', 'endOffsetExclusive', 'seedStart', 'seedCount'], 'resume shard');
  exactKeys(output.coverage, ['startProbeCount', 'newProbeCount', 'nextProbeCount', 'complete'], 'resume coverage');
  exactKeys(output.evidence, ['probeHash', 'memoHash', 'cursorStateHash', 'resultHash'], 'resume evidence');
  exactKeys(output.search, ['nodeBudget', 'maxRssMiB', 'processedSeeds', 'catalogDescriptorCount',
    'reverseTrieNodeCount', 'startProbeCount', 'newProbeCount', 'nextProbeCount', 'failedStateCount'], 'resume search');
  const expectedDomain = reverseDomainObject(identity, trieBuild.trieHash, domainHash);
  if (output.schemaVersion !== 3 || output.algorithmVersion !== REVERSE_ALGORITHM_VERSION
    || output.cursorSchemaVersion !== REVERSE_CURSOR_SCHEMA_VERSION || output.claim !== REVERSE_CLAIM
    || output.phase !== 'search' || !['paused-budget', 'memory-guard'].includes(output.status)
    || canonicalJson(output.domain) !== canonicalJson(expectedDomain)
    || canonicalJson(output.shard) !== canonicalJson(reverseShardObject(identity.options))
    || output.targetRows !== 10 || canonicalJson(output.targetMaskRows) !== canonicalJson(TARGET_VISIBLE_ROWS)
    || output.setup !== null || output.boardRows !== null || output.coverage.complete !== false) {
    throw new Error('Resume envelope identity is invalid.');
  }
  const state = restoreContinuation(output.continuation, context, domainHash, identity.options.shardIndex);
  const next = state.probe.nextProbeCount;
  const integerFields = [output.coverage.startProbeCount, output.coverage.newProbeCount, next,
    output.search.nodeBudget, output.search.maxRssMiB, output.search.failedStateCount];
  if (integerFields.some((value) => !Number.isSafeInteger(value) || value < 0)
    || output.coverage.startProbeCount + output.coverage.newProbeCount !== next
    || output.coverage.nextProbeCount !== next || output.search.startProbeCount !== output.coverage.startProbeCount
    || output.search.newProbeCount !== output.coverage.newProbeCount || output.search.nextProbeCount !== next
    || output.search.processedSeeds !== identity.options.shardSeedCount
    || output.search.catalogDescriptorCount !== identity.catalog.descriptors.length
    || output.search.reverseTrieNodeCount !== trieBuild.nodes.length
    || output.search.failedStateCount !== state.failed.size) throw new Error('Resume counters are invalid.');
  const expectedProbe = hashHex(probeRootHash(next, state.probe.peaks, state.probe.partialTokens));
  const expectedMemo = hashHex(memoHash(state.failed.values()));
  const expectedResult = reverseResultHash({
    complete: false, cursorStateHash: output.continuation.cursorStateHash, domainHash: expectedDomain.domainHash,
    memoHash: expectedMemo, nextProbeCount: next, phase: 'search', probeHash: expectedProbe,
    setup: null, status: output.status,
  });
  if (output.evidence.probeHash !== expectedProbe || output.evidence.memoHash !== expectedMemo
    || output.evidence.cursorStateHash !== output.continuation.cursorStateHash
    || output.evidence.resultHash !== expectedResult) throw new Error('Resume evidence is invalid.');
  return state;
}
function executeReverse(options, hooks = {}) {
  const fixedMask = rowsMask();
  const catalog = buildReverseCatalog(fixedMask);
  const identity = {
    options, fixedMask, catalog, catalogHash: catalog.catalogHash,
    shapeHash: shapeTableHash(), queueHash: fullQueueHash(options.fullSeedStart, options.fullSeedCount),
  };
  const rssBytes = hooks.rssBytes ?? (() => process.memoryUsage().rss);
  const trieBuild = buildReverseTrie(options.shardSeedStart, options.shardSeedCount,
    options.maxRssMiB * 1024 * 1024, rssBytes);
  if (trieBuild.memoryGuard) return makeReverseOutput(identity, trieBuild, null, null, null);
  identity.trieHash = trieBuild.trieHash;
  const domainHash = reverseDomainHash({
    fixedMask, catalogHash: identity.catalogHash, shapeHash: identity.shapeHash, queueHash: identity.queueHash,
    trieHash: identity.trieHash, fullSeedStart: options.fullSeedStart, fullSeedCount: options.fullSeedCount,
    shardCount: options.shardCount, shardIndex: options.shardIndex,
    startOffset: options.startOffset, endOffset: options.endOffset,
  });
  const context = { fixedMask, catalog: catalog.descriptors, trie: trieBuild.nodes, sequenceLength: SEQUENCE_LENGTH };
  const state = hooks.resumeOutput
    ? validateResumeOutput(hooks.resumeOutput, identity, context, domainHash, trieBuild)
    : createReverseState(context);
  if (state.probe.nextProbeCount > MAX_PROBES - options.nodeBudget) {
    throw new Error(`Reverse probe count may not exceed ${MAX_PROBES}.`);
  }
  const advance = advanceReverse(context, state, options.nodeBudget, options.maxRssMiB * 1024 * 1024, rssBytes);
  return makeReverseOutput(identity, trieBuild, state, advance, domainHash);
}
function runReverseCli(argv) {
  const options = parseReverseArguments(argv);
  let resumeOutput = null;
  if (options.resumePath) {
    const bytes = readFileSync(options.resumePath);
    resumeOutput = JSON.parse(bytes.toString('utf8'));
    if (!bytes.equals(Buffer.from(`${canonicalJson(resumeOutput)}\n`))) throw new Error('Resume JSON is not canonical.');
  }
  const output = executeReverse(options, { resumeOutput });
  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFileSync(options.outputPath, `${canonicalJson(output)}\n`, { encoding: 'utf8' });
  process.stdout.write(`${canonicalJson({
    status: output.status, phase: output.phase, shardIndex: output.shard.index,
    nextProbeCount: output.coverage.nextProbeCount, newProbeCount: output.coverage.newProbeCount,
    setupSeed: output.setup?.seed ?? null,
  })}\n`);
  return output.status === 'candidate' ? 0 : 2;
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
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes('--algorithm')) {
    try {
      process.exitCode = runReverseCli(argv);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  } else runForward(argv);
}

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
  neighborMask,
  hardDropMask,
  failedKey,
  probeToken,
  appendProbe,
  frameCandidateTypeMask,
  frameCandidates,
  createReverseState,
  advanceReverse,
  makeContinuation,
  restoreContinuation,
  candidateBoardRows,
  parseReverseArguments,
  reverseDomainObject,
  reverseShardObject,
  reverseResultHash,
  makeReverseOutput,
  validateResumeOutput,
  executeReverse,
  sequenceForSeed,
  hashHex,
  landing,
  canPlace,
});
