import assert from 'node:assert/strict';

import { __tilingTest as tiling } from './search-puzzle-v3-tiling-first.mjs';

const { base } = tiling;
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

assert.throws(() => tiling.coverCatalog(0n, []), /positive multiple of four/i);
assert.throws(() => tiling.enumerateStrongTilings({
  fixedMask: floorO.cellMask, catalog: singleCatalog, profiles: singleProfile, workBudget: -1,
}), /work budget/i);

process.stdout.write('tiling-first cover contract: all standalone checks pass\n');
