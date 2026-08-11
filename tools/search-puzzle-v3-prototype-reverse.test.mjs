import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, linkSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { __reverseTest as reverse } from './search-puzzle-v3-prototype.mjs';
const toolPath = fileURLToPath(new URL('./search-puzzle-v3-prototype.mjs', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();

function runForward(outputPath, cursor, budget) {
  return spawnSync(process.execPath, [
    toolPath,
    '--seed-start', '11',
    '--seed-count', '3',
    '--shard-count', '1',
    '--shard-index', '0',
    '--cursor', String(cursor),
    '--node-budget', String(budget),
    '--max-rss-mib', '128',
    '--output', outputPath,
  ], { encoding: null });
}

function runReverse(outputPath, budget, extra = []) {
  return spawnSync(process.execPath, [toolPath, '--algorithm', 'seeded-reverse-v1',
    '--seed-start', '11', '--seed-count', '1', '--shard-count', '1', '--shard-index', '0',
    '--node-budget', String(budget), '--max-rss-mib', '128', ...extra, '--output', outputPath],
  { encoding: null });
}
assert.equal(reverse.REVERSE_ALGORITHM_VERSION, 'seeded-reverse-v1');
assert.equal(reverse.REVERSE_CURSOR_SCHEMA_VERSION, 1);
assert.equal(reverse.SETUP_RULES_VERSION,
  'visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1');
assert.equal(reverse.REVERSE_TYPE_ORDER_VERSION, 'I,O,T,S,Z,J,L-v1');
assert.equal(reverse.QUEUE_GENERATOR_VERSION, 'xorshift32-fisher-yates-seven-bag-v1');
assert.equal(reverse.REVERSE_CANDIDATE_ORDER_VERSION,
  'type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1');
assert.equal(reverse.canonicalJson({ 'é': 3, z: 2, a: [true, null, 'x'] }),
  '{"a":[true,null,"x"],"z":2,"é":3}');

const fixedMask = reverse.rowsMask();
assert.equal(fixedMask.toString(2).replaceAll('0', '').length, 80);
assert.equal(reverse.maskHex(fixedMask), 'DFF7FCFFFBFE3DFE3FFCFF387');
assert.equal(reverse.maskBytes(fixedMask).length, 13);
assert.equal(reverse.maskBytes(fixedMask)[0] & 0xf0, 0);
assert.equal(reverse.parseMaskHex(reverse.maskHex(fixedMask)), fixedMask);
assert.throws(() => reverse.parseMaskHex(`0${reverse.maskHex(fixedMask)}`), /Invalid reverse mask/);

const catalog = reverse.buildReverseCatalog();
assert.equal(catalog.descriptors.length, 662);
assert.equal(reverse.hashHex(catalog.catalogHash),
  '6A4739D980BAA5AC7D6DAA631A88742421630F6762583738018DE3541E9A6B39');
assert.deepEqual(catalog.descriptors.slice(0, 2).map(reverse.descriptorJson), [
  { typeIndex: 0, rotation: 0, x: 0, absoluteY: 32, cellMask: '00000000000000003C0000000' },
  { typeIndex: 0, rotation: 0, x: 0, absoluteY: 33, cellMask: '00000000000000F0000000000' },
]);
assert(catalog.descriptors.every((descriptor) => reverse.descriptorBytes(descriptor).length === 17));
assert.equal(new Set(catalog.descriptors.map((descriptor) =>
  `${descriptor.typeIndex}:${reverse.maskHex(descriptor.cellMask)}`)).size, catalog.descriptors.length);
assert.equal(reverse.hashHex(reverse.shapeTableHash()),
  '868FB052469D00DED00A967177B58A34F7267EE48E6F3BA68AF0C852CFF2C2DE');
assert.equal(reverse.hashHex(reverse.fullQueueHash(11, 3)),
  '6E5D7B1CC712588F84CABB4FE4874596F3CE17D742447E78C6026ABAEE5CE455');
assert.equal(reverse.hashHex(reverse.fullQueueHash(11, 8)),
  '0C4F375D24189A46982F088520B6FB9D81969CE2917528903BCF1CA7BA02C86B');
const shardSeeds = [0, 1, 2, 3].flatMap((index) => reverse.buildReverseTrie(11 + index * 2, 2, Number.MAX_SAFE_INTEGER, () => 0).nodes.flatMap((node) => node.seeds));
assert.deepEqual(shardSeeds.sort((left, right) => left - right), [11, 12, 13, 14, 15, 16, 17, 18]);

const trie = reverse.buildReverseTrie(11, 3, Number.MAX_SAFE_INTEGER, () => 0);
assert.equal(trie.memoryGuard, false);
assert.equal(trie.processedSeeds, 3);
assert.equal(trie.nodes.length, 58);
assert.equal(reverse.hashHex(trie.trieHash),
  '290F6A50B788C4F4EFC54FF9468D0C6412A46CE7487745DCDAB32F6604740AD3');
for (let seed = 11; seed < 14; seed += 1) {
  let node = 0;
  for (const type of reverse.sequenceForSeed(seed, 20).toReversed()) {
    node = trie.nodes[node].children[reverse.TYPES.indexOf(type)];
    assert(node >= 0);
  }
  assert(trie.nodes[node].seeds.includes(seed));
}

assert.equal(reverse.hashHex(reverse.memoHash([])),
  '1853F77C68198E07DC7A6038F2D055CF0B1C9C9F2C2F9EAD59379CEF07FCFC97');
assert.equal(reverse.hashHex(reverse.probeRootHash(0, [], [])),
  'C07AA09A429443F5FC5F930F033012D8EECE50DB060894EBA7324C211002D0CA');
const context = {
  fixedMask,
  catalog: catalog.descriptors,
  trie: trie.nodes,
  sequenceLength: 20,
};
const domainHash = Buffer.alloc(32, 7);
const oneShotState = reverse.createReverseState(context);
const oneShot = reverse.advanceReverse(context, oneShotState, 1500, Number.MAX_SAFE_INTEGER, () => 0);
assert.deepEqual({ status: oneShot.status, start: oneShot.startProbeCount, added: oneShot.newProbeCount },
  { status: 'paused-budget', start: 0, added: 1500 });
assert(oneShotState.failed.size > 0);
const splitState = reverse.createReverseState(context);
const firstSplit = reverse.advanceReverse(context, splitState, 750, Number.MAX_SAFE_INTEGER, () => 0);
assert.equal(firstSplit.status, 'paused-budget');
const splitCursor = reverse.makeContinuation(splitState, domainHash, 0);
assert.equal(Object.hasOwn(splitCursor, 'candidateSeen'), false);
const restoredState = reverse.restoreContinuation(splitCursor, context, domainHash, 0);
assert.equal(restoredState.candidateSeen, false);
const secondSplit = reverse.advanceReverse(context, restoredState, 750, Number.MAX_SAFE_INTEGER, () => 0);
assert.deepEqual({ status: secondSplit.status, start: secondSplit.startProbeCount, added: secondSplit.newProbeCount },
  { status: 'paused-budget', start: 750, added: 750 });
assert.equal(restoredState.probe.nextProbeCount, 1500);
assert.equal(reverse.hashHex(reverse.probeRootHash(
  restoredState.probe.nextProbeCount, restoredState.probe.peaks, restoredState.probe.partialTokens,
)), reverse.hashHex(reverse.probeRootHash(
  oneShotState.probe.nextProbeCount, oneShotState.probe.peaks, oneShotState.probe.partialTokens,
)));
assert.equal(reverse.hashHex(reverse.memoHash(restoredState.failed.values())),
  reverse.hashHex(reverse.memoHash(oneShotState.failed.values())));
assert.equal(reverse.canonicalJson(reverse.makeContinuation(restoredState, domainHash, 0)),
  reverse.canonicalJson(reverse.makeContinuation(oneShotState, domainHash, 0)));
const activeKey = reverse.failedKey(restoredState.frames.at(-1)).toString('hex').toUpperCase();
assert.equal(restoredState.failed.has(activeKey), false, 'an interrupted frame must not enter the memo');

const forbiddenVariant = { ...restoredState.frames.at(-1), forbiddenMasks: [...restoredState.frames.at(-1).forbiddenMasks] };
forbiddenVariant.forbiddenMasks[0] |= 1n;
assert.notEqual(reverse.failedKey(forbiddenVariant).toString('hex'),
  reverse.failedKey(restoredState.frames.at(-1)).toString('hex'));
const badVersion = structuredClone(splitCursor);
badVersion.cursorSchemaVersion = 2;
assert.throws(() => reverse.restoreContinuation(badVersion, context, domainHash, 0), /identity/);
assert.throws(() => reverse.restoreContinuation(splitCursor, context, domainHash, 1), /identity/);
const badRootState = reverse.restoreContinuation(splitCursor, context, domainHash, 0);
badRootState.frames[0].remainingBoard ^= 1n;
const badRoot = reverse.makeContinuation(badRootState, domainHash, 0);
assert.throws(() => reverse.restoreContinuation(badRoot, context, domainHash, 0), /root/);
const activeMemoState = reverse.restoreContinuation(splitCursor, context, domainHash, 0);
const activeMemoKey = reverse.failedKey(activeMemoState.frames.at(-1));
activeMemoState.failed.set(activeMemoKey.toString('hex').toUpperCase(), activeMemoKey);
assert.throws(() => reverse.restoreContinuation(reverse.makeContinuation(activeMemoState, domainHash, 0),
  context, domainHash, 0), /frame bounds/);
const badDepthContext = { ...context, trie: context.trie.map((node) => ({ ...node })) };
badDepthContext.trie[activeMemoState.frames.at(-1).trieNodeId].depth += 1;
assert.throws(() => reverse.restoreContinuation(splitCursor, badDepthContext, domainHash, 0), /domain drift|frame bounds/);
const badMemoState = reverse.restoreContinuation(splitCursor, context, domainHash, 0);
const hole = [...Array(100).keys()].find((bit) => (fixedMask & (1n << BigInt(bit))) === 0n);
const badMemoKey = reverse.failedKey({ ...badMemoState.frames.at(-1), remainingBoard: 1n << BigInt(hole) });
badMemoState.failed.set(badMemoKey.toString('hex').toUpperCase(), badMemoKey);
assert.throws(() => reverse.restoreContinuation(reverse.makeContinuation(badMemoState, domainHash, 0),
  context, domainHash, 0), /failed memo/i);
function digestProbeVector(count) {
  const probe = { nextProbeCount: 0, peaks: [], partialTokens: [] };
  for (let index = 0; index < count; index += 1) {
    const token = Buffer.alloc(140);
    token[0] = 1;
    token.writeBigUInt64BE(BigInt(index), 1);
    token[139] = index % 6;
    reverse.appendProbe(probe, token);
  }
  return {
    peaks: probe.peaks.map((peak) => peak && reverse.hashHex(peak)),
    partial: probe.partialTokens.length,
    root: reverse.hashHex(reverse.probeRootHash(probe.nextProbeCount, probe.peaks, probe.partialTokens)),
  };
}

assert.deepEqual(digestProbeVector(7), {
  peaks: [], partial: 7, root: 'A1041AE5D999DE1DCEC43D2A7CD3D7572157DDC893AD34075824C46B4514502D',
});
assert.deepEqual(digestProbeVector(1024), {
  peaks: ['967E8FAC44251FAA0D6474D0766644F450675CA344F21E1B7C8EEAED0C629082'],
  partial: 0,
  root: 'F71CA897005A5291056E1EDC336EA17E719FA701FF3542777381D7D870D56F4F',
});
assert.deepEqual(digestProbeVector(3079), {
  peaks: [
    'CC1C7F36A7A91A2566C775B0739E3F8F0735644FE715A586104E9052236A8D29',
    '59B1D5C9328B7BC12FC0528ABFBA252D786E75E3CE5E566963433449EEA6B72B',
  ],
  partial: 7,
  root: 'CB4FB8340EB17BDD3E42E7A7439EECEA73BE40FF82BDD59BB2ACD828194F1A7E',
});
const reverseOptions = reverse.parseReverseArguments([
  '--algorithm', 'seeded-reverse-v1', '--seed-start', '11', '--seed-count', '1',
  '--shard-count', '1', '--shard-index', '0', '--node-budget', '1',
  '--max-rss-mib', '128', '--output', join(tmpdir(), 'unused-t37-reverse.json'),
]);
const pausedOutput = reverse.executeReverse(reverseOptions, { rssBytes: () => 0 });
const oneSeedTrie = reverse.buildReverseTrie(11, 1, Number.MAX_SAFE_INTEGER, () => 0);
const oneSeedContext = {
  fixedMask, catalog: catalog.descriptors, trie: oneSeedTrie.nodes, sequenceLength: 20,
};
const oneSeedDomainHash = Buffer.from(pausedOutput.domain.domainHash, 'hex');
const oneSeedIdentity = {
  options: reverseOptions, fixedMask, catalog, catalogHash: catalog.catalogHash,
  shapeHash: reverse.shapeTableHash(), queueHash: reverse.fullQueueHash(11, 1), trieHash: oneSeedTrie.trieHash,
};
function pausedOutputForState(state, startProbeCount, newProbeCount, nodeBudget = reverseOptions.nodeBudget) {
  return reverse.makeReverseOutput({
    ...oneSeedIdentity, options: { ...oneSeedIdentity.options, nodeBudget },
  }, oneSeedTrie, state, {
    status: 'paused-budget', complete: false, startProbeCount, newProbeCount, result: null,
  }, oneSeedDomainHash);
}
function stateAtProbeCount(count) {
  const state = reverse.restoreContinuation(pausedOutput.continuation, oneSeedContext, oneSeedDomainHash, 0);
  const template = state.probe.partialTokens[0];
  const partialCount = count % reverse.PROBE_BLOCK_SIZE;
  state.probe.nextProbeCount = count;
  state.probe.partialTokens = Array.from({ length: partialCount }, (_, index) => {
    const token = Buffer.from(template);
    token.writeBigUInt64BE(BigInt(count - partialCount + index), 1);
    return token;
  });
  const leafCount = Math.floor(count / reverse.PROBE_BLOCK_SIZE);
  const peakLength = leafCount === 0 ? 0 : Math.floor(Math.log2(leafCount)) + 1;
  state.probe.peaks = Array.from({ length: peakLength }, (_, level) =>
    leafCount & (2 ** level) ? Buffer.alloc(32, level + 1) : null);
  return state;
}
const badCandidateTokenState = reverse.restoreContinuation(
  pausedOutput.continuation, oneSeedContext, oneSeedDomainHash, 0,
);
badCandidateTokenState.probe.partialTokens[0].writeUInt32BE(0xffff_ffff, 118);
const badCandidateTokenOutput = pausedOutputForState(badCandidateTokenState, 0, 1);
assert.throws(() => reverse.restoreContinuation(
  badCandidateTokenOutput.continuation, oneSeedContext, oneSeedDomainHash, 0,
), /token candidate drift/i);
assert.throws(() => reverse.executeReverse(reverseOptions, {
  resumeOutput: badCandidateTokenOutput, rssBytes: () => 0,
}), /token candidate drift/i);
const badDescriptorTokenState = reverse.restoreContinuation(
  pausedOutput.continuation, oneSeedContext, oneSeedDomainHash, 0,
);
badDescriptorTokenState.probe.partialTokens[0][124] ^= 1;
const badDescriptorTokenOutput = pausedOutputForState(badDescriptorTokenState, 0, 1);
assert.throws(() => reverse.executeReverse(reverseOptions, {
  resumeOutput: badDescriptorTokenOutput, rssBytes: () => 0,
}), /token candidate drift/i);
const candidateTokenState = reverse.restoreContinuation(
  pausedOutput.continuation, oneSeedContext, oneSeedDomainHash, 0,
);
candidateTokenState.probe.partialTokens[0][139] = 5;
const candidateTokenOutput = pausedOutputForState(candidateTokenState, 0, 1);
assert.throws(() => reverse.restoreContinuation(
  candidateTokenOutput.continuation, oneSeedContext, oneSeedDomainHash, 0,
), /candidate partial token is not resumable/i);
assert.throws(() => reverse.executeReverse(reverseOptions, {
  resumeOutput: candidateTokenOutput, rssBytes: () => 0,
}), /candidate partial token is not resumable/i);
let rssChecks = 0;
const postBuildMemory = reverse.executeReverse(reverseOptions, { rssBytes: () => ++rssChecks === 1 ? 0 : Infinity });
rssChecks = 0;
const searchMemory = reverse.executeReverse(reverseOptions, { rssBytes: () => ++rssChecks <= 2 ? 0 : Infinity });
const liveMemory = reverse.executeReverse({
  ...reverseOptions, maxRssMiB: Math.max(0, Math.floor(process.memoryUsage().rss / 1024 / 1024) - 1),
});
assert.equal(liveMemory.phase, 'trie-build');
assert.equal(postBuildMemory.search.processedSeeds, 1);
assert.equal(postBuildMemory.domain.reverseTrieHash, null);
assert.equal(postBuildMemory.domain.domainHash, null);
const [floorDescriptor, highDescriptor] = [true, false].map((isFloor) => catalog.descriptors.find((item) =>
  (reverse.hardDropMask(0n, item) === item.cellMask) === isFloor));
assert(floorDescriptor && highDescriptor);
const floorO = catalog.descriptors.find((item) => item.typeIndex === 1 && reverse.hardDropMask(0n, item) === item.cellMask);
const touchingO = catalog.descriptors.find((item) => item.typeIndex === 1 && !(item.cellMask & floorO.cellMask) && (reverse.neighborMask(floorO.cellMask, fixedMask) & item.cellMask));
const separatedO = catalog.descriptors.find((item) => item.typeIndex === 1 && !(item.cellMask & floorO.cellMask) && !(reverse.neighborMask(floorO.cellMask, fixedMask) & item.cellMask));
assert(touchingO && (reverse.neighborMask(touchingO.cellMask, fixedMask) & floorO.cellMask) && (reverse.neighborMask(floorO.cellMask, fixedMask) & floorO.cellMask));
assert(separatedO && !(reverse.neighborMask(separatedO.cellMask, fixedMask) & floorO.cellMask));
assert.equal(reverse.buildReverseCatalog(floorO.cellMask).descriptors.filter((item) => item.typeIndex === 1).length, 1);
const ORACLE_TYPES = Object.freeze(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
const ORACLE_SHAPES = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
  ],
  O: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
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
};
assert.deepEqual(reverse.TYPES, ORACLE_TYPES, 'the independent oracle type order must stay explicit');
function oracleCellsAt(type, rotation, x, absoluteY) {
  const shape = ORACLE_SHAPES[type][rotation];
  return shape.map(([dx, dy]) => [x + dx, absoluteY + dy]);
}
function oraclePhysicalDrop(board, type, rotation, x) {
  const canPlace = (absoluteY) => oracleCellsAt(type, rotation, x, absoluteY).every(([cellX, cellY]) =>
    cellX >= 0 && cellX < 10 && cellY >= 0 && cellY < 40 && !board.has(`${cellX},${cellY}`));
  let absoluteY = 19;
  if (!canPlace(absoluteY)) return null;
  while (canPlace(absoluteY + 1)) absoluteY += 1;
  return { type, rotation, x, absoluteY, cells: oracleCellsAt(type, rotation, x, absoluteY) };
}
function oracleMaskForCells(cells) {
  let cellMask = 0n;
  for (const [cellX, cellY] of cells) {
    if (cellX < 0 || cellX >= 10 || cellY < 30 || cellY >= 40) return null;
    cellMask |= 1n << BigInt((cellY - 30) * 10 + cellX);
  }
  return cellMask;
}
function catalogDescriptorSignature(item) {
  return `${item.typeIndex},${item.rotation},${item.x},${item.absoluteY},` +
    item.cellMask.toString(16).toUpperCase().padStart(25, '0');
}
function independentCatalogDescriptors(targetMask) {
  const descriptors = [];
  for (let typeIndex = 0; typeIndex < ORACLE_TYPES.length; typeIndex += 1) {
    const type = ORACLE_TYPES[typeIndex];
    const seenMasks = new Set();
    for (let rotation = 0; rotation < ORACLE_SHAPES[type].length; rotation += 1) {
      const shape = ORACLE_SHAPES[type][rotation];
      const minimumX = -Math.min(...shape.map(([dx]) => dx)) || 0;
      const maximumX = 9 - Math.max(...shape.map(([dx]) => dx));
      const minimumY = 30 - Math.min(...shape.map(([, dy]) => dy));
      const maximumY = 39 - Math.max(...shape.map(([, dy]) => dy));
      for (let x = minimumX; x <= maximumX; x += 1) {
        for (let absoluteY = minimumY; absoluteY <= maximumY; absoluteY += 1) {
          const cellMask = oracleMaskForCells(oracleCellsAt(type, rotation, x, absoluteY));
          if (cellMask === null || (cellMask & targetMask) !== cellMask) continue;
          const maskKey = cellMask.toString(16);
          if (seenMasks.has(maskKey)) continue;
          seenMasks.add(maskKey);
          descriptors.push({ typeIndex, rotation, x, absoluteY, cellMask });
        }
      }
    }
  }
  return descriptors;
}
function catalogSummary(descriptors) {
  const records = descriptors.map(catalogDescriptorSignature);
  return { count: records.length, digest: sha256(Buffer.from(records.join('\n'), 'utf8')) };
}
function oracleDrop(board, type, rotation, x) {
  const physical = oraclePhysicalDrop(board, type, rotation, x);
  if (!physical) return null;
  const cellMask = oracleMaskForCells(physical.cells);
  if (cellMask === null) return null;
  const nextCells = oracleCellsAt(type, rotation, x, physical.absoluteY + 1);
  return {
    ...physical,
    cellMask,
    supportedByPiece: nextCells.some(([cellX, cellY]) => board.has(`${cellX},${cellY}`)),
  };
}
function oracleSignature(placements) {
  return placements.map((item) =>
    `${item.type}:${item.rotation}:${item.x}:${item.absoluteY}:${item.cellMask.toString(16).toUpperCase().padStart(25, '0')}`).join('/');
}
function independentForwardHistories(queue, targetMask) {
  const histories = new Map();
  function visit(index, board, placements, boardMask) {
    if (index === queue.length) {
      if (boardMask === targetMask) histories.set(oracleSignature(placements), placements);
      return;
    }
    const type = queue[index];
    for (let rotation = 0; rotation < ORACLE_SHAPES[type].length; rotation += 1) {
      const shape = ORACLE_SHAPES[type][rotation];
      const minX = Math.min(...shape.map(([dx]) => dx));
      const maxX = Math.max(...shape.map(([dx]) => dx));
      for (let x = -minX; x < 10 - maxX; x += 1) {
        const landed = oracleDrop(board, type, rotation, x);
        if (!landed || (landed.cellMask & targetMask) !== landed.cellMask) continue;
        const touchesSameType = landed.cells.some(([cellX, cellY]) =>
          [[cellX - 1, cellY], [cellX + 1, cellY], [cellX, cellY - 1], [cellX, cellY + 1]]
            .some(([nearX, nearY]) => board.get(`${nearX},${nearY}`) === type));
        if (touchesSameType) continue;
        const nextBoard = new Map(board);
        for (const [cellX, cellY] of landed.cells) nextBoard.set(`${cellX},${cellY}`, type);
        visit(index + 1, nextBoard, [...placements, landed], boardMask | landed.cellMask);
      }
    }
  }
  visit(0, new Map(), [], 0n);
  return histories;
}
function exactQueueContext(targetMask, forwardQueue) {
  const nodes = [{ depth: 0, children: Array(7).fill(-1), seeds: [] }];
  let parent = 0;
  for (const type of forwardQueue.toReversed()) {
    const child = nodes.length;
    nodes[parent].children[reverse.TYPES.indexOf(type)] = child;
    nodes.push({ depth: nodes[parent].depth + 1, children: Array(7).fill(-1), seeds: [] });
    parent = child;
  }
  nodes[parent].seeds.push(77);
  const exactContext = {
    fixedMask: targetMask,
    catalog: reverse.buildReverseCatalog(targetMask).descriptors,
    trie: nodes,
    sequenceLength: forwardQueue.length,
  };
  assert.deepEqual(catalogSummary(exactContext.catalog),
    catalogSummary(independentCatalogDescriptors(targetMask)),
    'the exact traversal must receive the independently complete canonical catalog');
  return exactContext;
}
function reverseTrieQueue(contextValue) {
  const queue = [];
  let nodeIndex = 0;
  for (let depth = 0; depth < contextValue.sequenceLength; depth += 1) {
    const childTypes = contextValue.trie[nodeIndex].children
      .map((child, typeIndex) => ({ child, typeIndex })).filter(({ child }) => child >= 0);
    assert.equal(childTypes.length, 1, 'bounded exact-queue trie must have one child per depth');
    queue.push(reverse.TYPES[childTypes[0].typeIndex]);
    nodeIndex = childTypes[0].child;
  }
  return queue;
}
function reverseHistorySignature(result) {
  return oracleSignature(result.descriptors.map((item) => ({
    ...item, type: reverse.TYPES[item.typeIndex],
  })));
}
function completeReverseHistories(targetMask, forwardQueue) {
  const exactContext = exactQueueContext(targetMask, forwardQueue);
  assert.deepEqual(reverseTrieQueue(exactContext), forwardQueue.toReversed(),
    'the exact forward queue must enter the reverse trie in reverse order');
  const state = reverse.createReverseState(exactContext);
  const histories = [];
  let failedCountAfterCandidate = null;
  for (;;) {
    const result = reverse.advanceReverse(
      exactContext, state, 1_000_000, Number.MAX_SAFE_INTEGER, () => 0,
    );
    if (result.status === 'candidate') {
      assert.equal(state.candidateSeen, true);
      if (failedCountAfterCandidate === null) failedCountAfterCandidate = state.failed.size;
      else assert.equal(state.failed.size, failedCountAfterCandidate,
        'candidate enumeration must not add false failed memo entries');
      histories.push(reverseHistorySignature(result.result));
      continue;
    }
    assert.equal(result.status, 'complete-not-found', 'bounded enumeration must end naturally');
    assert.equal(result.complete, true);
    assert.equal(state.frames.length, 0);
    break;
  }
  assert.equal(new Set(histories).size, histories.length, 'reverse enumeration returned a duplicate history');
  if (histories.length > 0) {
    assert.equal(state.candidateSeen, true);
    assert.equal(state.failed.size, failedCountAfterCandidate,
      'successful enumeration must leave the pre-candidate failed memo unchanged');
  } else {
    assert.equal(state.candidateSeen, false);
    assert(state.failed.size > 0, 'candidate-free enumeration must retain normal failed memoization');
  }
  return { histories, historySet: new Set(histories), context: exactContext, state };
}
function compareCompleteHistorySets(queue, targetMask, label) {
  const forward = independentForwardHistories(queue, targetMask);
  const backward = completeReverseHistories(targetMask, queue);
  assert.deepEqual([...backward.historySet].sort(), [...forward.keys()].sort(), label);
  return { forward, backward };
}
function oraclePlacementAt(type, rotation, x, absoluteY) {
  const cells = oracleCellsAt(type, rotation, x, absoluteY);
  const cellMask = oracleMaskForCells(cells);
  assert.notEqual(cellMask, null, 'manual oracle placement must stay in the reverse domain');
  return { type, rotation, x, absoluteY, cells, cellMask, supportedByPiece: false };
}
function boardFromPlacements(placements) {
  const board = new Map();
  for (const placement of placements) {
    for (const [cellX, cellY] of placement.cells) board.set(`${cellX},${cellY}`, placement.type);
  }
  return board;
}
function rowsFromBoard(board) {
  const rows = Array(40).fill(0);
  for (const key of board.keys()) {
    const [cellX, cellY] = key.split(',').map(Number);
    rows[cellY] |= 1 << cellX;
  }
  return rows;
}

const ownerRows = reverse.TYPES.map(() => Array(40).fill(0));
const permissiveRows = Array(40).fill(1023);
const floorBlockerBoard = new Map([['0,39', 'blocker']]);
const floorBlockerLanding = oraclePhysicalDrop(floorBlockerBoard, 'I', 0, 0);
assert.equal(floorBlockerLanding.absoluteY, 37);
assert.equal(reverse.landing(rowsFromBoard(floorBlockerBoard), ownerRows[0], permissiveRows, 'I', 0, 0).y,
  floorBlockerLanding.absoluteY);
const inDomainUpperBlockerBoard = new Map([['0,30', 'blocker']]);
const inDomainUpperLanding = oraclePhysicalDrop(inDomainUpperBlockerBoard, 'I', 0, 0);
assert.equal(inDomainUpperLanding.absoluteY, 28);
assert.equal(reverse.landing(rowsFromBoard(inDomainUpperBlockerBoard), ownerRows[0], permissiveRows, 'I', 0, 0).y,
  inDomainUpperLanding.absoluteY);
assert.equal(oracleDrop(inDomainUpperBlockerBoard, 'I', 0, 0), null,
  'an upper obstruction that leaves the piece above row 30 is outside the reverse landing domain');
const horizontalIAtZero = catalog.descriptors.find((item) => item.typeIndex === 0 && item.rotation === 0 && item.x === 0);
assert.equal(reverse.hardDropMask(1n, horizontalIAtZero), null,
  'production-domain hard drop must reject a landing above the ten-row mask');
const outsideDomainSpawnBlockerBoard = new Map([['0,20', 'blocker']]);
assert.equal(oraclePhysicalDrop(outsideDomainSpawnBlockerBoard, 'I', 0, 0), null);
assert.equal(reverse.landing(rowsFromBoard(outsideDomainSpawnBlockerBoard), ownerRows[0], permissiveRows,
  'I', 0, 0), null);
assert.equal(oracleMaskForCells([[0, 20]]), null,
  'the spawn blocker is deliberately outside rows 30..39 and must not be encoded as a reverse mask');
function syntheticContext(descriptor, leaf, depth = 1) {
  const nodes = [{ depth: 0, children: Array(7).fill(-1), seeds: [] }];
  let parent = 0;
  for (let index = 1; index <= depth; index += 1) {
    const child = nodes.length;
    nodes[parent].children[descriptor.typeIndex] = child;
    nodes.push({ depth: index, children: Array(7).fill(-1), seeds: index === depth && leaf ? [77] : [] });
    parent = child;
  }
  return { fixedMask: descriptor.cellMask, catalog: [descriptor], trie: nodes, sequenceLength: depth };
}
function firstOutcome(contextValue, mutate = () => {}, budget = 1, rss = () => 0) {
  const state = reverse.createReverseState(contextValue);
  mutate(state, contextValue);
  const result = reverse.advanceReverse(contextValue, state, budget, Number.MAX_SAFE_INTEGER, rss);
  return { state, result, outcome: state.probe.partialTokens[0]?.[139] };
}
const outcome0 = firstOutcome(syntheticContext(floorDescriptor, true), (state) => { state.frames[0].remainingBoard = 0n; });
const outcome1 = firstOutcome(syntheticContext(floorDescriptor, true), (state) => {
  state.frames[0].forbiddenMasks[floorDescriptor.typeIndex] = floorDescriptor.cellMask;
});
const outcome2 = firstOutcome(syntheticContext(highDescriptor, true));
const branchContext = syntheticContext(floorDescriptor, false, 2);
const outcome4 = firstOutcome(branchContext);
const outcome3 = firstOutcome(branchContext, (state, value) => {
  const forbiddenMasks = Array(7).fill(0n);
  forbiddenMasks[floorDescriptor.typeIndex] = reverse.neighborMask(floorDescriptor.cellMask, value.fixedMask);
  const child = { depth: 1, trieNodeId: 1, remainingBoard: 0n, forbiddenMasks,
    nextCandidateIndex: 0, enteringDescriptor: floorDescriptor };
  const key = reverse.failedKey(child);
  state.failed.set(key.toString('hex').toUpperCase(), key);
});
const leafContext = syntheticContext(floorDescriptor, true);
const outcome5 = firstOutcome(leafContext);
assert.deepEqual([outcome0.outcome, outcome1.outcome, outcome2.outcome, outcome3.outcome, outcome4.outcome, outcome5.outcome],
  [0, 1, 2, 3, 4, 5]);
assert.equal(outcome5.state.candidateSeen, true);
assert.throws(() => reverse.makeContinuation(outcome5.state, Buffer.alloc(32, 4), 0),
  /candidate-bearing reverse state is not resumable/i);
assert.equal(firstOutcome(branchContext, () => {}, 0, () => Infinity).result.status, 'paused-budget');
assert.equal(firstOutcome({ ...branchContext, catalog: [] }, () => {}, 0, () => Infinity).result.status,
  'complete-not-found');
let candidateRssChecks = 0;
assert.equal(firstOutcome(syntheticContext(floorDescriptor, true), () => {}, 1,
  () => candidateRssChecks++ === 0 ? 0 : Infinity).result.status, 'candidate');
assert.equal(firstOutcome(branchContext, () => {}, 1).result.status, 'paused-budget');
const fakeIdentity = {
  options: reverseOptions, fixedMask: floorDescriptor.cellMask, catalog: { descriptors: [floorDescriptor] },
  catalogHash: catalog.catalogHash, shapeHash: reverse.shapeTableHash(), queueHash: reverse.fullQueueHash(11, 1),
};
const fakeTrieBuild = { memoryGuard: false, processedSeeds: 1, nodes: outcome5.state.frames.length
  ? syntheticContext(floorDescriptor, true).trie : [], trieHash: Buffer.alloc(32, 3) };
const candidateOutput = reverse.makeReverseOutput(fakeIdentity, fakeTrieBuild, outcome5.state,
  outcome5.result, Buffer.alloc(32, 4));
const candidateFailedCount = outcome5.state.failed.size;
const afterCandidate = reverse.advanceReverse(
  leafContext, outcome5.state, 1, Number.MAX_SAFE_INTEGER, () => 0,
);
assert.equal(afterCandidate.status, 'complete-not-found');
assert.equal(outcome5.state.failed.size, candidateFailedCount);
assert.throws(() => reverse.makeReverseOutput(
  fakeIdentity, fakeTrieBuild, outcome5.state, afterCandidate, Buffer.alloc(32, 4),
), /candidate-bearing reverse state cannot produce another formal output/i);
const completeState = reverse.createReverseState({ ...branchContext, catalog: [] });
const completeAdvance = reverse.advanceReverse({ ...branchContext, catalog: [] }, completeState, 0, 0, () => Infinity);
assert.equal(completeState.candidateSeen, false);
assert(completeState.failed.size > 0, 'candidate-free completion must still memoize failed frames');
const completeOutput = reverse.makeReverseOutput({ ...fakeIdentity, catalog: { descriptors: [] } },
  { ...fakeTrieBuild, nodes: branchContext.trie }, completeState, completeAdvance, Buffer.alloc(32, 4));
const topKeys = ['schemaVersion', 'algorithmVersion', 'cursorSchemaVersion', 'claim', 'status', 'phase', 'domain',
  'shard', 'coverage', 'evidence', 'targetRows', 'targetMaskRows', 'setup', 'boardRows', 'search', 'continuation'];
for (const output of [postBuildMemory, pausedOutput, searchMemory, candidateOutput, completeOutput]) {
  assert.deepEqual(Object.keys(output).sort(), [...topKeys].sort());
  assert.deepEqual(Object.keys(output.coverage).sort(), ['complete', 'newProbeCount', 'nextProbeCount', 'startProbeCount']);
  assert.deepEqual(Object.keys(output.evidence).sort(), ['cursorStateHash', 'memoHash', 'probeHash', 'resultHash']);
  assert.deepEqual(Object.keys(output.domain).sort(), ['algorithmVersion', 'candidateOrderVersion', 'catalogHash', 'domainHash', 'fullQueueHash', 'fullSeedCount', 'fullSeedStart', 'queueGeneratorVersion', 'reverseTrieHash', 'sequenceLength', 'setupRulesVersion', 'shapeTableHash', 'shardCount', 'typeOrderVersion']);
  assert.deepEqual(Object.keys(output.shard).sort(), ['count', 'endOffsetExclusive', 'index', 'seedCount', 'seedStart', 'startOffset']);
  assert.deepEqual(Object.keys(output.search).sort(), ['catalogDescriptorCount', 'failedStateCount', 'maxRssMiB', 'newProbeCount', 'nextProbeCount', 'nodeBudget', 'processedSeeds', 'reverseTrieNodeCount', 'startProbeCount']);
  assert.equal(output.evidence.resultHash, reverse.reverseResultHash({
    complete: output.coverage.complete, cursorStateHash: output.evidence.cursorStateHash,
    domainHash: output.domain.domainHash, memoHash: output.evidence.memoHash,
    nextProbeCount: output.coverage.nextProbeCount, phase: output.phase,
    probeHash: output.evidence.probeHash, setup: output.setup, status: output.status,
  }));
}
assert.deepEqual([postBuildMemory.status, pausedOutput.status, searchMemory.status,
  candidateOutput.status, completeOutput.status],
['memory-guard', 'paused-budget', 'memory-guard', 'candidate', 'complete-not-found']);
assert.deepEqual([postBuildMemory.continuation, pausedOutput.continuation !== null,
  searchMemory.continuation !== null, candidateOutput.continuation, completeOutput.continuation],
  [null, true, true, null, null]);
const tempRoot = mkdtempSync(join(tmpdir(), 't37-reverse-contract-'));
try {
  const firstPath = join(tempRoot, 'forward-1500.json');
  const first = runForward(firstPath, 0, 1500);
  assert.equal(first.status, 2, first.stderr.toString());
  const firstBytes = readFileSync(firstPath);
  assert.equal(sha256(firstBytes), 'B334010D7CEC7E38A35EDB429FE9DA3333D5A312893B78EFB4E8659455419A2A');
  assert.equal(sha256(first.stdout), '90075FF8B9F72A2295A1946BB18BFDE685F60F8944801C11317D48BC6B3E8C42');
  const firstJson = JSON.parse(firstBytes);
  assert.equal(firstJson.domain.domainHash, 'AA59890E709C8870AA75213FA793688BF46AA727B7559486A494205C803985FD');
  assert.equal(firstJson.domain.queueSequenceDigest,
    '72B12EA371CB53F9D8390AE9AA4B6E419278DDE0355AE3B4F972BA567AFC3A07');
  assert.equal(firstJson.evidence.probeHash, '7553AD77B6DE58BDB044625F0CD266854522B2F7F9BECE428641FE338C808273');
  assert.equal(firstJson.evidence.memoHash, 'A75C9B7A6D58707822FCB644D79DE78D2D233CD9F4E3C1202607FCD8427BD4BA');

  const resumedPath = join(tempRoot, 'forward-resumed.json');
  const resumed = runForward(resumedPath, 750, 750);
  assert.equal(resumed.status, 2, resumed.stderr.toString());
  assert.equal(sha256(readFileSync(resumedPath)),
    'B5BCCC97D05CF107F988907E9E45E525D97D145CE684F140455317896A8AB454');
  const [reverseA, reverseB] = ['reverse-a.json', 'reverse-b.json'].map((name) => join(tempRoot, name));
  assert.equal(runReverse(reverseA, 1).status, 2);
  assert.equal(runReverse(reverseB, 1).status, 2);
  assert.equal(sha256(readFileSync(reverseA)), 'AB6EC5CDBB08E9227A4F75F8C8F06D42729DC9E44F8F87CE629F82BC8BA240DE');
  assert.equal(sha256(readFileSync(reverseA)), sha256(readFileSync(reverseB)));
  const [oneShotPath, splitAPath, splitBPath] = ['reverse-12.json', 'reverse-7.json', 'reverse-7-5.json']
    .map((name) => join(tempRoot, name));
  assert.equal(runReverse(oneShotPath, 12).status, 2);
  assert.equal(runReverse(splitAPath, 7).status, 2);
  assert.equal(runReverse(splitBPath, 5, ['--resume', splitAPath]).status, 2);
  const oneShotReverse = JSON.parse(readFileSync(oneShotPath));
  const splitReverse = JSON.parse(readFileSync(splitBPath));
  assert.deepEqual(splitReverse.coverage, { startProbeCount: 7, newProbeCount: 5, nextProbeCount: 12, complete: false });
  for (const key of ['probeHash', 'memoHash', 'cursorStateHash', 'resultHash']) {
    assert.equal(splitReverse.evidence[key], oneShotReverse.evidence[key]);
  }
  const invalidCursor = join(tempRoot, 'invalid-cursor.json');
  assert.equal(runReverse(invalidCursor, 1, ['--cursor', '0']).status, 1);
  assert.equal(existsSync(invalidCursor), false);
  const unknownOutput = join(tempRoot, 'unknown.json');
  const unknown = spawnSync(process.execPath, [toolPath, '--algorithm', 'other', '--output', unknownOutput], { encoding: null });
  assert.equal(unknown.status, 1);
  assert.equal(existsSync(unknownOutput), false);
  const beforeSamePath = sha256(readFileSync(splitAPath));
  assert.equal(runReverse(splitAPath, 1, ['--resume', join(tempRoot, '.', 'reverse-7.json')]).status, 1);
  assert.equal(sha256(readFileSync(splitAPath)), beforeSamePath);

  const hardLinkPath = join(tempRoot, 'reverse-7-hard-link.json');
  linkSync(splitAPath, hardLinkPath);
  const beforeHardLink = sha256(readFileSync(splitAPath));
  const hardLinkResume = runReverse(hardLinkPath, 1, ['--resume', splitAPath]);
  assert.equal(hardLinkResume.status, 1, hardLinkResume.stderr.toString());
  assert.equal(sha256(readFileSync(splitAPath)), beforeHardLink);
  assert.equal(sha256(readFileSync(hardLinkPath)), beforeHardLink);
  const distinctExistingPath = join(tempRoot, 'reverse-distinct-existing.json');
  writeFileSync(distinctExistingPath, 'not-a-resume-alias\n', 'utf8');
  const distinctExisting = runReverse(distinctExistingPath, 1, ['--resume', splitAPath]);
  assert.equal(distinctExisting.status, 2, distinctExisting.stderr.toString());
  assert.equal(JSON.parse(readFileSync(distinctExistingPath)).coverage.startProbeCount, 7);

  const maxProbes = 1_000_000_000;
  const maxMinusOneResumePath = join(tempRoot, 'reverse-max-minus-one.json');
  const maxMinusOneState = stateAtProbeCount(maxProbes - 1);
  const maxMinusOneOutput = pausedOutputForState(
    maxMinusOneState, 0, maxProbes - 1, maxProbes - 1,
  );
  writeFileSync(maxMinusOneResumePath, `${reverse.canonicalJson(maxMinusOneOutput)}\n`, 'utf8');
  const maxBoundaryPath = join(tempRoot, 'reverse-max.json');
  const maxBoundary = runReverse(maxBoundaryPath, 1, ['--resume', maxMinusOneResumePath]);
  assert.equal(maxBoundary.status, 2, maxBoundary.stderr.toString());
  assert.deepEqual(JSON.parse(readFileSync(maxBoundaryPath)).coverage, {
    startProbeCount: maxProbes - 1, newProbeCount: 1, nextProbeCount: maxProbes, complete: false,
  });
  const overflowPath = join(tempRoot, 'reverse-max-plus-one.json');
  const beforeOverflow = sha256(readFileSync(maxMinusOneResumePath));
  const overflow = runReverse(overflowPath, 2, ['--resume', maxMinusOneResumePath]);
  assert.equal(overflow.status, 1, overflow.stderr.toString());
  assert.match(overflow.stderr.toString(), /probe count may not exceed 1000000000/i);
  assert.equal(existsSync(overflowPath), false);
  assert.equal(sha256(readFileSync(maxMinusOneResumePath)), beforeOverflow);
} finally {
  rmSync(tempRoot, { recursive: true });
}
const typeHook = registerHooks({
  resolve(specifier, contextValue, nextResolve) {
    const url = specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)
      ? new URL(`${specifier}.ts`, contextValue.parentURL) : null;
    if (url && existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
    return nextResolve(specifier, contextValue);
  },
  load(url, contextValue, nextLoad) {
    return url.endsWith('.ts') ? { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(
      readFileSync(fileURLToPath(url), 'utf8'), { mode: 'strip', sourceUrl: url }) } : nextLoad(url, contextValue);
  },
});
try {
  const puzzles = await import(pathToFileURL(fileURLToPath(new URL('../src/game/core/puzzles.ts', import.meta.url))));
  const definition = puzzles.getPuzzleDefinition('t3r-shaft-01');
  const coreBoard = puzzles.replayPuzzleSetup(definition.setup);
  const coreRows = coreBoard.slice(20).map((row) => row.map((cell) => cell ?? '.').join(''));
  assert(coreRows.slice(0, 10).every((row) => row === '..........'));
  let coreMask = 0n;
  for (let y = 10; y < 20; y += 1) for (let x = 0; x < 10; x += 1) {
    if (coreRows[y][x] !== '.') coreMask |= 1n << BigInt((y - 10) * 10 + x);
  }
  const coreCatalog = reverse.buildReverseCatalog(coreMask).descriptors;
  const coreTrie = [{ depth: 0, children: Array(7).fill(-1), seeds: [] }];
  let trieNode = 0;
  for (const type of definition.setup.placements.map((item) => item.type).toReversed()) {
    const child = coreTrie.length;
    coreTrie[trieNode].children[reverse.TYPES.indexOf(type)] = child;
    coreTrie.push({ depth: coreTrie[trieNode].depth + 1, children: Array(7).fill(-1), seeds: [] });
    trieNode = child;
  }
  coreTrie[trieNode].seeds.push(definition.setup.seed);
  assert.deepEqual(reverse.sequenceForSeed(definition.setup.seed, definition.setup.placements.length),
    definition.setup.placements.map((item) => item.type));
  const coreContext = { fixedMask: coreMask, catalog: coreCatalog, trie: coreTrie, sequenceLength: definition.setup.placements.length };
  const coreState = reverse.createReverseState(coreContext);
  const coreCandidate = reverse.advanceReverse(coreContext, coreState, 1_000_000, Number.MAX_SAFE_INTEGER, () => 0);
  assert.equal(coreCandidate.status, 'candidate');
  assert.deepEqual(puzzles.replayPuzzleSetup({ seed: coreCandidate.result.seed,
    placements: coreCandidate.result.placements }), coreBoard);
  assert.deepEqual(coreCandidate.result.boardRows, coreRows);
  let settled = 0n, usedSupport = false;
  for (const descriptor of coreCandidate.result.descriptors) {
    usedSupport ||= reverse.hardDropMask(0n, descriptor) !== descriptor.cellMask;
    assert.equal(reverse.hardDropMask(settled, descriptor), descriptor.cellMask);
    settled |= descriptor.cellMask;
  }
  assert(usedSupport, 'Core candidate must exercise piece support');

  const emptyOracleBoard = new Map();
  const separated = [oracleDrop(emptyOracleBoard, 'O', 0, 0), oracleDrop(emptyOracleBoard, 'O', 0, 4)];
  const separatedMask = separated[0].cellMask | separated[1].cellMask;
  const separatedComparison = compareCompleteHistorySets(
    ['O', 'O'], separatedMask, 'canonical reverse traversal must enumerate both separated O orders',
  );
  assert.equal(separatedComparison.forward.size, 2,
    'the independent oracle must enumerate both separated O orders');
  assert.equal(separatedComparison.backward.histories.length, 2,
    'one canonical reverse state must return both separated O histories before completion');

  const separatedT = [-1, 2, 5].map((x) => oracleDrop(emptyOracleBoard, 'T', 1, x));
  assert(separatedT.every((placement) => placement?.absoluteY === 37));
  const separatedTMask = separatedT.reduce((mask, placement) => mask | placement.cellMask, 0n);
  assert.deepEqual(catalogSummary(independentCatalogDescriptors(separatedTMask)), {
    count: 3,
    digest: '507A17B7D0105D0CB56C45BD0858FEFA0A36A8C46C5D66BAD7762C077D3A6362',
  }, 'the non-I/O fixture must pin its independent catalog');
  const separatedTComparison = compareCompleteHistorySets(
    ['T', 'T', 'T'], separatedTMask,
    'the canonical traversal must enumerate every non-I/O separated placement order',
  );
  assert.equal(separatedTComparison.forward.size, 6,
    'the independent oracle must enumerate all six separated T orders');
  assert.equal(separatedTComparison.backward.histories.length, 6,
    'one canonical reverse state must return all six separated T histories before completion');

  const touching = [oracleDrop(emptyOracleBoard, 'O', 0, 0), oracleDrop(emptyOracleBoard, 'O', 0, 2)];
  const touchingMask = touching[0].cellMask | touching[1].cellMask;
  const touchingComparison = compareCompleteHistorySets(
    ['O', 'O'], touchingMask, 'same-type contact must exclude both placement orders',
  );
  assert.equal(touchingComparison.forward.size, 0);
  assert.equal(touchingComparison.backward.histories.length, 0);

  const mixed = [oracleDrop(emptyOracleBoard, 'O', 0, 0), oracleDrop(emptyOracleBoard, 'I', 0, 4)];
  const mixedMask = mixed[0].cellMask | mixed[1].cellMask;
  const mixedOI = compareCompleteHistorySets(
    ['O', 'I'], mixedMask, 'canonical reverse traversal must preserve O/I queue order',
  );
  const mixedIO = compareCompleteHistorySets(
    ['I', 'O'], mixedMask, 'canonical reverse traversal must preserve I/O queue order',
  );
  assert.equal(mixedOI.forward.size, 1);
  assert.equal(mixedIO.forward.size, 1);
  assert.notDeepEqual([...mixedOI.forward.keys()], [...mixedIO.forward.keys()],
    'opposite mixed queues must produce different ordered histories');

  const supportBase = oracleDrop(emptyOracleBoard, 'O', 0, 0);
  const supportBoard = boardFromPlacements([supportBase]);
  const supportedI = oracleDrop(supportBoard, 'I', 0, 0);
  assert.equal(supportedI.supportedByPiece, true, 'the second piece must land on the first piece');
  const supportMask = supportBase.cellMask | supportedI.cellMask;
  const supportComparison = compareCompleteHistorySets(
    ['O', 'I'], supportMask, 'piece-supported histories must match exactly',
  );
  assert([...supportComparison.forward.values()].some((history) =>
    history.some((placement) => placement.supportedByPiece)),
  'the compared forward set must contain a real piece-supported landing');

  const floatingI = oraclePlacementAt('I', 0, 0, supportedI.absoluteY - 2);
  const floatingMask = supportBase.cellMask | floatingI.cellMask;
  const floatingComparison = compareCompleteHistorySets(
    ['O', 'I'], floatingMask, 'a floating upper placement must be absent from both complete sets',
  );
  assert.equal(floatingComparison.forward.size, 0);
  assert.equal(floatingComparison.backward.histories.length, 0);
} finally {
  typeHook.deregister();
}

process.stdout.write('seeded-reverse contract: all standalone checks pass\n');
