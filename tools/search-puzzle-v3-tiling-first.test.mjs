import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { __tilingTest as tiling } from './search-puzzle-v3-tiling-first.mjs';

const { base } = tiling;
const toolPath = fileURLToPath(new URL('./search-puzzle-v3-tiling-first.mjs', import.meta.url));
const EMPTY_SHA256 = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';

assert.equal(tiling.ALGORITHM_VERSION, 'tiling-first-v1');
assert.equal(tiling.COVER_TRAVERSAL_VERSION, 'mrv-cell/catalog-index-v1');
assert.equal(tiling.ORDER_TRAVERSAL_VERSION, 'remaining-set/trie-node/catalog-index-v1');
assert.equal(tiling.sha256Hex(Buffer.alloc(0)), EMPTY_SHA256);
assert.equal(tiling.countBits(0b101101n), 4);
assert.deepEqual(tiling.typeCounts(['I', 'O', 'I']), [2, 1, 0, 0, 0, 0, 0]);
assert.throws(() => tiling.typeCounts(['?']), /unknown type/i);

const fixedMask = base.rowsMask();
const catalogBuild = base.buildReverseCatalog(fixedMask);
const catalog = catalogBuild.descriptors;
assert.equal(base.maskHex(fixedMask), 'DFF7FCFFFBFE3DFE3FFCFF387');
assert.equal(catalog.length, 662);
assert.equal(base.hashHex(catalogBuild.catalogHash),
  '6A4739D980BAA5AC7D6DAA631A88742421630F6762583738018DE3541E9A6B39');
assert.equal(base.hashHex(base.shapeTableHash()),
  '868FB052469D00DED00A967177B58A34F7267EE48E6F3BA68AF0C852CFF2C2DE');

const profileBuild = tiling.deriveProfiles();
assert.equal(profileBuild.profileHash,
  '115B19D4A4B6394E3032729222DC16B611313B9C88C6B61E81B3D2520FE98AD4');
assert.deepEqual(profileBuild.profiles.map(({ seeds }) => seeds.length),
  [3014, 2787, 2892, 2803, 2831, 2857, 2816]);
assert.deepEqual(profileBuild.profiles.map(({ countTwoTypeIndex, counts }) => ({
  countTwoTypeIndex, counts,
})), Array.from({ length: 7 }, (_, countTwoTypeIndex) => ({
  countTwoTypeIndex,
  counts: Array.from({ length: 7 }, (_, index) => index === countTwoTypeIndex ? 2 : 3),
})));
const allProfileSeeds = profileBuild.profiles.flatMap(({ seeds }) => seeds);
assert.equal(new Set(allProfileSeeds).size, 20_000);
assert.deepEqual([...allProfileSeeds].sort((left, right) => left - right),
  Array.from({ length: 20_000 }, (_, index) => index + 1));
assert.throws(() => tiling.deriveProfiles(1, 1), /all seven count profiles/i);

function independentNeighborMask(mask, boundary) {
  let result = 0n;
  for (let bit = 0; bit < 100; bit += 1) {
    if (!(mask & (1n << BigInt(bit)))) continue;
    const x = bit % 10;
    const y = Math.floor(bit / 10);
    if (x > 0) result |= 1n << BigInt(bit - 1);
    if (x < 9) result |= 1n << BigInt(bit + 1);
    if (y > 0) result |= 1n << BigInt(bit - 10);
    if (y < 9) result |= 1n << BigInt(bit + 10);
  }
  return result & boundary;
}

function bruteStrongTilingSet(mask, descriptors, counts) {
  const expectedPieces = tiling.countBits(mask) / 4;
  const results = new Set();
  function visit(start, covered, remaining, chosen, selectedMasks) {
    if (chosen.length === expectedPieces) {
      if (covered === mask && remaining.every((count) => count === 0)) {
        results.add(chosen.join(','));
      }
      return;
    }
    for (let index = start; index < descriptors.length; index += 1) {
      const descriptor = descriptors[index];
      if (remaining[descriptor.typeIndex] === 0 || (covered & descriptor.cellMask)) continue;
      if (selectedMasks[descriptor.typeIndex].some((prior) =>
        independentNeighborMask(prior, mask) & descriptor.cellMask)) continue;
      const nextRemaining = [...remaining];
      nextRemaining[descriptor.typeIndex] -= 1;
      const nextSelected = selectedMasks.map((items) => [...items]);
      nextSelected[descriptor.typeIndex].push(descriptor.cellMask);
      visit(index + 1, covered | descriptor.cellMask, nextRemaining,
        [...chosen, index], nextSelected);
    }
  }
  visit(0, 0n, [...counts], [], Array.from({ length: 7 }, () => []));
  return results;
}

function enumeratedStrongTilingSet(mask, descriptors, counts) {
  const results = new Set();
  const run = tiling.enumerateStrongTilings({
    fixedMask: mask,
    catalog: descriptors,
    profiles: [{ counts }],
    workBudget: 1_000_000,
    onTiling: ({ catalogIndices }) => {
      results.add(catalogIndices.join(','));
      return false;
    },
  });
  assert.equal(run.status, 'complete-not-found');
  assert.equal(run.complete, true);
  assert.equal(run.strongTilingCount, results.size);
  return results;
}

const floorO = catalog.find((descriptor) => descriptor.typeIndex === 1
  && base.hardDropMask(0n, descriptor) === descriptor.cellMask);
const touchingO = catalog.find((descriptor) => descriptor.typeIndex === 1
  && !(descriptor.cellMask & floorO.cellMask)
  && (independentNeighborMask(floorO.cellMask, fixedMask) & descriptor.cellMask));
const separatedO = catalog.find((descriptor) => descriptor.typeIndex === 1
  && !(descriptor.cellMask & floorO.cellMask)
  && !(independentNeighborMask(floorO.cellMask, fixedMask) & descriptor.cellMask));
assert(floorO && touchingO && separatedO);

for (const { name, mask, counts } of [
  { name: 'single O', mask: floorO.cellMask, counts: [0, 1, 0, 0, 0, 0, 0] },
  { name: 'touching O pair', mask: floorO.cellMask | touchingO.cellMask,
    counts: [0, 2, 0, 0, 0, 0, 0] },
  { name: 'separated O pair', mask: floorO.cellMask | separatedO.cellMask,
    counts: [0, 2, 0, 0, 0, 0, 0] },
]) {
  const descriptors = base.buildReverseCatalog(mask).descriptors;
  assert.deepEqual(enumeratedStrongTilingSet(mask, descriptors, counts),
    bruteStrongTilingSet(mask, descriptors, counts), name);
}

const singleCatalog = base.buildReverseCatalog(floorO.cellMask).descriptors;
const singleProfile = [{ counts: [0, 1, 0, 0, 0, 0, 0] }];
const zeroBudget = tiling.enumerateStrongTilings({
  fixedMask: floorO.cellMask, catalog: singleCatalog, profiles: singleProfile, workBudget: 0,
});
assert.deepEqual({ status: zeroBudget.status, workCount: zeroBudget.workCount,
  traceHash: zeroBudget.traceHash, strongTilingHash: zeroBudget.strongTilingHash }, {
  status: 'budget-exhausted', workCount: 0,
  traceHash: EMPTY_SHA256, strongTilingHash: EMPTY_SHA256,
});
const oneBudget = tiling.enumerateStrongTilings({
  fixedMask: floorO.cellMask, catalog: singleCatalog, profiles: singleProfile, workBudget: 1,
  onTiling: () => true,
});
assert.equal(oneBudget.status, 'callback-stop');
assert.equal(oneBudget.workCount, 1);
assert.equal(oneBudget.strongTilingCount, 1);

const canonicalFirst = () => tiling.enumerateStrongTilings({
  fixedMask,
  catalog,
  profiles: profileBuild.profiles,
  workBudget: 2_000,
  onTiling: () => true,
});
const firstRun = canonicalFirst();
assert.deepEqual({
  status: firstRun.status,
  workCount: firstRun.workCount,
  coverBranchProbeCount: firstRun.coverBranchProbeCount,
  strongTilingCount: firstRun.strongTilingCount,
  completedProfileCount: firstRun.completedProfileCount,
  traceHash: firstRun.traceHash,
  strongTilingHash: firstRun.strongTilingHash,
  stoppedTiling: firstRun.stoppedTiling,
}, {
  status: 'callback-stop',
  workCount: 1542,
  coverBranchProbeCount: 1542,
  strongTilingCount: 1,
  completedProfileCount: 0,
  traceHash: '695A6D69E8504B78704A39CB19EF6F25BB5FB165172E70F4B54D4E7F3F93C88E',
  strongTilingHash: '06A49A48903ED102042EDFE94804480B9A2ED4F1FFDAB4FCA8C010C9FD433C35',
  stoppedTiling: {
    profileIndex: 0,
    catalogIndices: [1, 4, 81, 101, 109, 124, 155, 231, 280, 286,
      302, 337, 338, 384, 455, 507, 522, 525, 562, 587],
  },
});
assert.deepEqual(canonicalFirst(), firstRun, 'canonical cover traversal must repeat byte-for-byte');

function exactTrieForForwardTypes(types, seeds = [77]) {
  const nodes = [{ depth: 0, children: Array(7).fill(-1), seeds: [] }];
  let parent = 0;
  for (const typeIndex of types.toReversed()) {
    const child = nodes.length;
    nodes[parent].children[typeIndex] = child;
    nodes.push({ depth: nodes[parent].depth + 1, children: Array(7).fill(-1), seeds: [] });
    parent = child;
  }
  nodes[parent].seeds.push(...seeds);
  return nodes;
}

function independentDropMask(boardMask, descriptor) {
  const shape = base.SHAPES[base.TYPES[descriptor.typeIndex]][descriptor.rotation];
  const canPlace = (absoluteY) => shape.every(([dx, dy]) => {
    const x = descriptor.x + dx;
    const y = absoluteY + dy;
    if (x < 0 || x >= 10 || y < 0 || y >= 40) return false;
    return y < 30 || !(boardMask & (1n << BigInt((y - 30) * 10 + x)));
  });
  let absoluteY = 19;
  if (!canPlace(absoluteY)) return null;
  while (canPlace(absoluteY + 1)) absoluteY += 1;
  let mask = 0n;
  for (const [dx, dy] of shape) {
    const x = descriptor.x + dx;
    const y = absoluteY + dy;
    if (y < 30) return null;
    mask |= 1n << BigInt((y - 30) * 10 + x);
  }
  return mask;
}

function independentForwardAccepts(descriptors, order) {
  let board = 0n;
  for (const localIndex of order) {
    const descriptor = descriptors[localIndex];
    if (independentDropMask(board, descriptor) !== descriptor.cellMask) return false;
    board |= descriptor.cellMask;
  }
  return true;
}

const supportedOther = catalog.find((descriptor) => descriptor.typeIndex !== floorO.typeIndex
  && !(descriptor.cellMask & floorO.cellMask)
  && base.hardDropMask(floorO.cellMask, descriptor) === descriptor.cellMask
  && base.hardDropMask(0n, descriptor) !== descriptor.cellMask);
assert(supportedOther, 'the order oracle needs one real supported non-O piece');
const supportCatalog = [floorO, supportedOther];
const supportTiling = { profileIndex: 0, catalogIndices: [0, 1] };
const twoOrders = [[0, 1], [1, 0]];
const oracleOrders = new Set(twoOrders.filter((order) =>
  independentForwardAccepts(supportCatalog, order)).map((order) => order.join(',')));
const searchedOrders = new Set();
for (const order of twoOrders) {
  const trie = exactTrieForForwardTypes(order.map((index) => supportCatalog[index].typeIndex), [91, 77]);
  const result = tiling.searchTilingOrders({
    tiling: supportTiling, catalog: supportCatalog, trie, workBudget: 20,
  });
  if (result.status === 'candidate') {
    searchedOrders.add(result.candidate.forwardCatalogIndices.join(','));
    assert.equal(result.candidate.seed, 77, 'a real leaf must choose its minimum seed');
    const exactBoundary = tiling.searchTilingOrders({
      tiling: supportTiling, catalog: supportCatalog, trie,
      workBudget: result.orderPieceProbeCount,
    });
    assert.equal(exactBoundary.status, 'candidate', 'a last admitted probe must beat budget');
    assert.equal(exactBoundary.workCount, result.orderPieceProbeCount);
  }
}
assert.deepEqual(searchedOrders, oracleOrders,
  'order DFS must equal the independent forward physical-drop permutation set');
assert.deepEqual([...oracleOrders], ['0,1']);

const isolatedFailure = tiling.searchTilingOrders({
  tiling: supportTiling,
  catalog: supportCatalog,
  trie: exactTrieForForwardTypes([supportedOther.typeIndex, floorO.typeIndex]),
  workBudget: 20,
});
const isolatedSuccess = tiling.searchTilingOrders({
  tiling: supportTiling,
  catalog: supportCatalog,
  trie: exactTrieForForwardTypes([floorO.typeIndex, supportedOther.typeIndex]),
  workBudget: 20,
});
assert.equal(isolatedFailure.status, 'complete-not-found');
assert.equal(isolatedSuccess.status, 'candidate', 'failed memo must not cross tilings/runs');

const fullTrie = base.buildReverseTrie(1, 20_000, Number.MAX_SAFE_INTEGER, () => 0);
assert.equal(fullTrie.memoryGuard, false);
assert.equal(fullTrie.processedSeeds, 20_000);
assert.equal(fullTrie.nodes.length, 282_615);
assert.equal(base.hashHex(base.fullQueueHash(1, 20_000)),
  '9FAE1D03284F99CF356FD48320B55CD78D30CBAF1340AF4371B8182C795EEB67');
assert.equal(base.hashHex(fullTrie.trieHash),
  '4C78BE1A2353B67A20F8C77C55E3DC433B0C304D960B16DA6223CE3DAC769981');
const canonicalOrderInput = {
  tiling: firstRun.stoppedTiling,
  catalog,
  trie: fullTrie.nodes,
  initialWorkCount: 1542,
};
const canonicalOrder = tiling.searchTilingOrders({
  ...canonicalOrderInput, workBudget: 7524,
});
assert.deepEqual(canonicalOrder, {
  status: 'complete-not-found',
  complete: true,
  workCount: 7524,
  orderPieceProbeCount: 5982,
  orderStateCount: 443,
  failedMemoCount: 424,
  traceHash: '3BF73A16B8B99DB6879271C7D1B43A8872752627F92F547B39A58681812C1173',
  failedMemoTraceHash: '25E37B72BDA08E653C4783B47F0A7691FE9D4C94E837388F83352034F4D57181',
  candidate: null,
});
assert.deepEqual(tiling.searchTilingOrders({ ...canonicalOrderInput, workBudget: 7524 }),
  canonicalOrder, 'canonical order traversal must repeat byte-for-byte');
const oneShort = tiling.searchTilingOrders({ ...canonicalOrderInput, workBudget: 7523 });
assert.equal(oneShort.status, 'budget-exhausted');
assert.equal(oneShort.workCount, 7523);
assert.equal(oneShort.orderPieceProbeCount, 5981);
assert(oneShort.failedMemoCount < canonicalOrder.failedMemoCount,
  'STOP must not memoize the interrupted path');
const zeroOrderBudget = tiling.searchTilingOrders({ ...canonicalOrderInput, workBudget: 1542 });
assert.deepEqual({
  status: zeroOrderBudget.status,
  workCount: zeroOrderBudget.workCount,
  orderPieceProbeCount: zeroOrderBudget.orderPieceProbeCount,
  failedMemoCount: zeroOrderBudget.failedMemoCount,
  traceHash: zeroOrderBudget.traceHash,
  failedMemoTraceHash: zeroOrderBudget.failedMemoTraceHash,
}, {
  status: 'budget-exhausted', workCount: 1542, orderPieceProbeCount: 0,
  failedMemoCount: 0, traceHash: EMPTY_SHA256, failedMemoTraceHash: EMPTY_SHA256,
});

const preDomainGuard = tiling.buildTilingDomain({ maxRssBytes: 0, rssBytes: () => 1 });
assert.deepEqual(preDomainGuard,
  { memoryGuard: true, phase: 'domain-build', processedSeeds: 0, reverseTrieNodeCount: 0 });
let midDomainChecks = 0;
const midDomainGuard = tiling.buildTilingDomain({
  maxRssBytes: 0,
  rssBytes: () => {
    midDomainChecks += 1;
    return midDomainChecks >= 3 ? 1 : 0;
  },
});
assert.deepEqual({
  memoryGuard: midDomainGuard.memoryGuard,
  phase: midDomainGuard.phase,
  processedSeeds: midDomainGuard.processedSeeds,
}, { memoryGuard: true, phase: 'domain-build', processedSeeds: 1024 });
assert(midDomainGuard.reverseTrieNodeCount > 1);
let postDomainChecks = 0;
const postDomainGuard = tiling.buildTilingDomain({
  maxRssBytes: 0,
  rssBytes: () => {
    postDomainChecks += 1;
    return postDomainChecks === 23 ? 1 : 0;
  },
});
assert.deepEqual(postDomainGuard,
  { memoryGuard: true, phase: 'domain-build', processedSeeds: 20_000,
    reverseTrieNodeCount: 282_615 });

const combinedDomain = tiling.buildTilingDomain();
assert.equal(combinedDomain.memoryGuard, false);
assert.equal(combinedDomain.processedSeeds, 20_000);
assert.equal(combinedDomain.domainHash,
  '51BC5DF570FE1356D1BE34584B2B06322AA72FFB988E6C1B37ABFE92D49C0D34');
assert.deepEqual({
  algorithmVersion: combinedDomain.identity.algorithmVersion,
  fullSeedStart: combinedDomain.identity.fullSeedStart,
  fullSeedCount: combinedDomain.identity.fullSeedCount,
  reverseTrieNodeCount: combinedDomain.identity.reverseTrieNodeCount,
  reverseTrieHash: combinedDomain.identity.reverseTrieHash,
  profileHash: combinedDomain.identity.profileHash,
}, {
  algorithmVersion: 'tiling-first-v1',
  fullSeedStart: 1,
  fullSeedCount: 20_000,
  reverseTrieNodeCount: 282_615,
  reverseTrieHash: '4C78BE1A2353B67A20F8C77C55E3DC433B0C304D960B16DA6223CE3DAC769981',
  profileHash: '115B19D4A4B6394E3032729222DC16B611313B9C88C6B61E81B3D2520FE98AD4',
});
const combinedInput = {
  maxRssBytes: Number.POSITIVE_INFINITY,
  rssBytes: () => 0,
  preparedDomain: combinedDomain,
};
const combinedZero = tiling.executeTilingSearch({ ...combinedInput, workBudget: 0 });
assert.deepEqual({
  status: combinedZero.status, phase: combinedZero.phase, workCount: combinedZero.workCount,
  traceHash: combinedZero.traceHash, strongTilingCount: combinedZero.strongTilingCount,
}, {
  status: 'budget-exhausted', phase: 'cover', workCount: 0,
  traceHash: EMPTY_SHA256, strongTilingCount: 0,
});
const beforeFirstTiling = tiling.executeTilingSearch({ ...combinedInput, workBudget: 1541 });
assert.equal(beforeFirstTiling.phase, 'cover');
assert.equal(beforeFirstTiling.strongTilingCount, 0);
const atFirstTiling = tiling.executeTilingSearch({ ...combinedInput, workBudget: 1542 });
assert.deepEqual({
  status: atFirstTiling.status, phase: atFirstTiling.phase,
  workCount: atFirstTiling.workCount, strongTilingCount: atFirstTiling.strongTilingCount,
  orderPieceProbeCount: atFirstTiling.orderPieceProbeCount,
}, {
  status: 'budget-exhausted', phase: 'order', workCount: 1542,
  strongTilingCount: 1, orderPieceProbeCount: 0,
});
const combinedCanonical = tiling.executeTilingSearch({ ...combinedInput, workBudget: 7524 });
assert.deepEqual({
  status: combinedCanonical.status,
  phase: combinedCanonical.phase,
  complete: combinedCanonical.complete,
  domainHash: combinedCanonical.domainHash,
  workCount: combinedCanonical.workCount,
  coverBranchProbeCount: combinedCanonical.coverBranchProbeCount,
  orderPieceProbeCount: combinedCanonical.orderPieceProbeCount,
  orderStateCount: combinedCanonical.orderStateCount,
  failedMemoCount: combinedCanonical.failedMemoCount,
  strongTilingCount: combinedCanonical.strongTilingCount,
  completedProfileCount: combinedCanonical.completedProfileCount,
  traceHash: combinedCanonical.traceHash,
  strongTilingHash: combinedCanonical.strongTilingHash,
  failedMemoTraceHash: combinedCanonical.failedMemoTraceHash,
  candidate: combinedCanonical.candidate,
  processedSeeds: combinedCanonical.processedSeeds,
}, {
  status: 'budget-exhausted', phase: 'cover', complete: false,
  domainHash: '51BC5DF570FE1356D1BE34584B2B06322AA72FFB988E6C1B37ABFE92D49C0D34',
  workCount: 7524, coverBranchProbeCount: 1542, orderPieceProbeCount: 5982,
  orderStateCount: 443, failedMemoCount: 424, strongTilingCount: 1,
  completedProfileCount: 0,
  traceHash: '6BDC4EB7A77DD81D9E3EF54F6A292858302BEB20342DAA8CAEA49E3D9E015479',
  strongTilingHash: '06A49A48903ED102042EDFE94804480B9A2ED4F1FFDAB4FCA8C010C9FD433C35',
  failedMemoTraceHash: '25E37B72BDA08E653C4783B47F0A7691FE9D4C94E837388F83352034F4D57181',
  candidate: null, processedSeeds: 20_000,
});
let coverRssChecks = 0;
const searchMemory = tiling.executeTilingSearch({
  ...combinedInput,
  workBudget: 2000,
  maxRssBytes: 0,
  rssBytes: (phase) => {
    if (phase !== 'cover') return 0;
    coverRssChecks += 1;
    return coverRssChecks === 2 ? 1 : 0;
  },
});
assert.deepEqual({ status: searchMemory.status, phase: searchMemory.phase,
  workCount: searchMemory.workCount },
{ status: 'memory-guard', phase: 'cover', workCount: 1024 });
let equalBoundaryRssChecks = 0;
const budgetWinsRss = tiling.executeTilingSearch({
  ...combinedInput, workBudget: 0, maxRssBytes: 0,
  rssBytes: () => { equalBoundaryRssChecks += 1; return 1; },
});
assert.equal(budgetWinsRss.status, 'budget-exhausted');
assert.equal(equalBoundaryRssChecks, 0, 'budget must win an equal-boundary RSS stop');
const tinyDomain = {
  memoryGuard: false,
  fixedMask: floorO.cellMask,
  catalog: singleCatalog,
  profiles: singleProfile,
  trie: exactTrieForForwardTypes([floorO.typeIndex], [91, 77]),
  identity: { fixture: 'single-o' },
  domainHash: 'TINY-DOMAIN',
  processedSeeds: 2,
};
const tinyCandidate = tiling.executeTilingSearch({
  workBudget: 2, maxRssBytes: Number.POSITIVE_INFINITY,
  rssBytes: () => 0, preparedDomain: tinyDomain,
});
assert.deepEqual({
  status: tinyCandidate.status, phase: tinyCandidate.phase,
  workCount: tinyCandidate.workCount, coverBranchProbeCount: tinyCandidate.coverBranchProbeCount,
  orderPieceProbeCount: tinyCandidate.orderPieceProbeCount, candidate: tinyCandidate.candidate,
}, {
  status: 'candidate', phase: 'order', workCount: 2,
  coverBranchProbeCount: 1, orderPieceProbeCount: 1,
  candidate: {
    profileIndex: 0, tilingOrdinal: 0, seed: 77,
    peelLocalIndices: [0], forwardCatalogIndices: [0],
  },
});
const staticDeadDomain = { ...tinyDomain, catalog: [], identity: { fixture: 'static-dead' } };
let naturalRssChecks = 0;
const naturalWinsLimits = tiling.executeTilingSearch({
  workBudget: 0, maxRssBytes: 0, preparedDomain: staticDeadDomain,
  rssBytes: () => { naturalRssChecks += 1; return 1; },
});
assert.equal(naturalWinsLimits.status, 'complete-not-found');
assert.equal(naturalWinsLimits.complete, true);
assert.equal(naturalWinsLimits.workCount, 0);
assert.equal(naturalRssChecks, 0, 'zero-probe natural completion must beat budget and RSS');

const canonicalOutput = tiling.makeTilingOutput(combinedCanonical,
  { workBudget: 7524, maxRssMiB: 900 });
assert.deepEqual(Object.keys(canonicalOutput).sort(), [
  'algorithmVersion', 'boardRows', 'claim', 'coverage', 'domain', 'evidence', 'phase',
  'schemaVersion', 'search', 'setup', 'status', 'targetMaskRows', 'targetRows',
]);
assert.deepEqual(Object.keys(canonicalOutput.coverage).sort(), [
  'complete', 'completedProfileCount', 'coverBranchProbeCount', 'orderPieceProbeCount',
  'strongTilingCount', 'workCount',
]);
assert.deepEqual(Object.keys(canonicalOutput.evidence).sort(), [
  'domainHash', 'failedMemoTraceHash', 'profileHash', 'resultHash', 'strongTilingHash',
  'traceHash',
]);
assert.deepEqual(Object.keys(canonicalOutput.search).sort(), [
  'catalogDescriptorCount', 'failedMemoCount', 'maxRssMiB', 'orderStateCount',
  'processedSeeds', 'reverseTrieNodeCount', 'workBudget',
]);
assert.equal(canonicalOutput.schemaVersion, 1);
assert.equal(canonicalOutput.setup, null);
assert.equal(canonicalOutput.boardRows, null);
assert.equal(canonicalOutput.evidence.resultHash,
  '1918339339B9D9ABF4F703BC194EA274CE699286B882E0250CAB74F2F53BEFC6');
const tamperedCoverage = { ...canonicalOutput.coverage, workCount: 7523 };
assert.notEqual(tiling.tilingResultHash({
  status: canonicalOutput.status,
  phase: canonicalOutput.phase,
  domainHash: canonicalOutput.domain.domainHash,
  coverage: tamperedCoverage,
  evidence: {
    profileHash: canonicalOutput.evidence.profileHash,
    domainHash: canonicalOutput.evidence.domainHash,
    traceHash: canonicalOutput.evidence.traceHash,
    strongTilingHash: canonicalOutput.evidence.strongTilingHash,
    failedMemoTraceHash: canonicalOutput.evidence.failedMemoTraceHash,
  },
  setup: null,
  boardRows: null,
  search: canonicalOutput.search,
}), canonicalOutput.evidence.resultHash);
const fakeCandidateArtifacts = tiling.candidateArtifacts(combinedDomain, {
  seed: 49,
  forwardCatalogIndices: firstRun.stoppedTiling.catalogIndices,
});
assert.equal(fakeCandidateArtifacts.setup.placements.length, 20);
assert(fakeCandidateArtifacts.setup.placements.every((placement) =>
  Object.keys(placement).sort().join(',') === 'rotation,type,x'));
assert.equal(fakeCandidateArtifacts.boardRows.length, 20);
assert.deepEqual(fakeCandidateArtifacts.boardRows.map((row) => row.replace(/[IOTSZJL]/g, '#')),
  base.TARGET_VISIBLE_ROWS);
const fakeCandidateOutput = tiling.makeTilingOutput({
  ...combinedCanonical,
  status: 'candidate',
  phase: 'order',
  complete: false,
  candidate: { seed: 49 },
  ...fakeCandidateArtifacts,
}, { workBudget: 7524, maxRssMiB: 900 });
assert.equal(fakeCandidateOutput.status, 'candidate');
assert.equal(fakeCandidateOutput.setup.seed, 49);
assert.equal(fakeCandidateOutput.setup.placements.length, 20);
assert.throws(() => tiling.makeTilingOutput({
  ...combinedCanonical,
  setup: fakeCandidateArtifacts.setup,
  boardRows: null,
}, { workBudget: 7524, maxRssMiB: 900 }), /output state/i);
const domainMemoryResult = tiling.executeTilingSearch({
  workBudget: 1, maxRssBytes: 0, rssBytes: () => 1,
});
const domainMemoryOutput = tiling.makeTilingOutput(domainMemoryResult,
  { workBudget: 1, maxRssMiB: 128 });
assert.equal(domainMemoryOutput.status, 'memory-guard');
assert.equal(domainMemoryOutput.phase, 'domain-build');
assert.equal(domainMemoryOutput.domain.reverseTrieHash, null);
assert.equal(domainMemoryOutput.domain.domainHash, null);
assert.equal(domainMemoryOutput.setup, null);

const cliRoot = mkdtempSync(join(tmpdir(), 't37-tiling-cli-'));
try {
  const outputA = join(cliRoot, 'nested', 'first.json');
  const outputB = join(cliRoot, 'nested', 'second.json');
  const cliArgs = (output) => [
    toolPath, '--algorithm', 'tiling-first-v1', '--work-budget', '1',
    '--max-rss-mib', '900', '--output', output,
  ];
  const firstCli = spawnSync(process.execPath, cliArgs(outputA), { encoding: 'utf8' });
  assert.equal(firstCli.status, 2, firstCli.stderr);
  assert.equal(firstCli.stderr, '');
  const firstBytes = readFileSync(outputA);
  assert.equal(tiling.sha256Hex(firstBytes),
    '62EFFA6717279AC32962E756CDC6A6AE90E94BDB064EDCAEC545B1E0714624F5');
  assert.equal(firstBytes[0] === 0xef && firstBytes[1] === 0xbb && firstBytes[2] === 0xbf, false);
  assert.equal(firstBytes.at(-1), 0x0a);
  assert.notEqual(firstBytes.at(-2), 0x0a);
  const parsed = JSON.parse(firstBytes.toString('utf8'));
  assert.equal(`${base.canonicalJson(parsed)}\n`, firstBytes.toString('utf8'));
  assert.equal(parsed.evidence.resultHash,
    '8DB2124AAD3349460146B24E0E15984F1EA2B63060F01FB62699A66EE787E376');
  assert.deepEqual(JSON.parse(firstCli.stdout), {
    phase: 'cover',
    resultHash: parsed.evidence.resultHash,
    status: 'budget-exhausted',
    workCount: 1,
  });
  const secondCli = spawnSync(process.execPath, cliArgs(outputB), { encoding: 'utf8' });
  assert.equal(secondCli.status, 2, secondCli.stderr);
  assert.deepEqual(readFileSync(outputB), firstBytes, 'two fixed-domain CLI runs must match byte-for-byte');
  const beforeExisting = readFileSync(outputA);
  const existingCli = spawnSync(process.execPath, cliArgs(outputA), { encoding: 'utf8' });
  assert.equal(existingCli.status, 1);
  assert.deepEqual(readFileSync(outputA), beforeExisting);
  const invalidOutput = join(cliRoot, 'invalid.json');
  const invalidCli = spawnSync(process.execPath,
    [...cliArgs(invalidOutput), '--cursor', 'forbidden'], { encoding: 'utf8' });
  assert.equal(invalidCli.status, 1);
  assert.match(invalidCli.stderr, /unknown tiling option/i);
  assert.equal(existsSync(invalidOutput), false);
  const sentinel = join(cliRoot, 'sentinel.json');
  writeFileSync(sentinel, 'sentinel', { encoding: 'utf8' });
  assert.throws(() => tiling.parseTilingArguments([
    '--algorithm', 'tiling-first-v1', '--work-budget', '1e3',
    '--max-rss-mib', '900', '--output', join(cliRoot, 'unused.json'),
  ]), /canonical positive integer/i);
  assert.throws(() => tiling.parseTilingArguments([
    '--algorithm', 'tiling-first-v1', '--work-budget', '1',
    '--max-rss-mib', '900', '--output', sentinel,
  ]), /must not already exist/i);
  assert.throws(() => tiling.parseTilingArguments([
    '--algorithm', 'tiling-first-v1', '--work-budget', '1', '--work-budget', '2',
    '--max-rss-mib', '900', '--output', join(cliRoot, 'duplicate.json'),
  ]), /duplicate tiling option/i);
  assert.throws(() => tiling.parseTilingArguments([
    '--algorithm', 'tiling-first-v1', '--work-budget', '1',
    '--max-rss-mib', '127', '--output', join(cliRoot, 'low-rss.json'),
  ]), /128 through 4096/i);
  assert.equal(readFileSync(sentinel, 'utf8'), 'sentinel');
} finally {
  rmSync(cliRoot, { recursive: true, force: true });
}

assert.throws(() => tiling.coverCatalog(0n, []), /positive multiple of four/i);
assert.throws(() => tiling.enumerateStrongTilings({
  fixedMask: floorO.cellMask, catalog: singleCatalog, profiles: singleProfile, workBudget: -1,
}), /work budget/i);
assert.throws(() => tiling.searchTilingOrders({
  tiling: { profileIndex: 0, catalogIndices: [0, 0] },
  catalog: supportCatalog, trie: exactTrieForForwardTypes([1, 1]), workBudget: 1,
}), /catalog identity/i);

process.stdout.write('tiling-first full tool contract: all standalone checks pass\n');
