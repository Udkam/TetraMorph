import { createHash } from 'node:crypto';

import { __reverseTest as base } from './search-puzzle-v3-prototype.mjs';

const ALGORITHM_VERSION = 'tiling-first-v1';
const COVER_TRAVERSAL_VERSION = 'mrv-cell/catalog-index-v1';
const ORDER_TRAVERSAL_VERSION = 'remaining-set/trie-node/catalog-index-v1';
const STOP = Symbol('tiling-first-stop');

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function countBits(mask) {
  let count = 0;
  for (let rest = mask; rest; rest &= rest - 1n) count += 1;
  return count;
}

function typeCounts(sequence) {
  const counts = Array.from({ length: base.TYPES.length }, () => 0);
  for (const type of sequence) {
    const typeIndex = base.TYPES.indexOf(type);
    if (typeIndex < 0) throw new Error('Queue contains an unknown type.');
    counts[typeIndex] += 1;
  }
  return counts;
}

function deriveProfiles(seedStart = 1, seedCount = 20_000) {
  if (!Number.isSafeInteger(seedStart) || seedStart < 1 || !Number.isSafeInteger(seedCount) || seedCount < 1) {
    throw new Error('Profile seed range is invalid.');
  }
  const byTuple = new Map();
  for (let seed = seedStart; seed < seedStart + seedCount; seed += 1) {
    const counts = typeCounts(base.sequenceForSeed(seed, 20));
    const sorted = [...counts].sort((left, right) => left - right);
    if (sorted[0] !== 2 || sorted.slice(1).some((count) => count !== 3)) {
      throw new Error('A 20-draw queue violated its seven-bag count profile.');
    }
    const key = counts.join(',');
    if (!byTuple.has(key)) byTuple.set(key, { counts, seeds: [] });
    byTuple.get(key).seeds.push(seed);
  }
  const profiles = [...byTuple.values()].map(({ counts, seeds }) => ({
    countTwoTypeIndex: counts.indexOf(2), counts: [...counts], seeds: [...seeds],
  })).sort((left, right) => left.countTwoTypeIndex - right.countTwoTypeIndex);
  if (profiles.length !== base.TYPES.length
    || profiles.some((profile, index) => profile.countTwoTypeIndex !== index)) {
    throw new Error('The fixed seed domain must materialize all seven count profiles.');
  }
  const stream = profiles.map((profile) =>
    `${profile.countTwoTypeIndex}:${profile.counts.join(',')}\n`).join('');
  return { profiles, profileHash: sha256Hex(Buffer.from(stream, 'utf8')) };
}

function coverCatalog(fixedMask, catalog) {
  if (typeof fixedMask !== 'bigint' || fixedMask <= 0n || countBits(fixedMask) % 4 !== 0) {
    throw new Error('Exact-cover mask must contain a positive multiple of four cells.');
  }
  if (!Array.isArray(catalog)) throw new Error('Exact-cover catalog is invalid.');
  const entries = catalog.map((descriptor, catalogIndex) => {
    if ((descriptor.cellMask & fixedMask) !== descriptor.cellMask || countBits(descriptor.cellMask) !== 4) {
      throw new Error('Catalog descriptor escaped the exact-cover mask.');
    }
    return { descriptor, catalogIndex };
  });
  const byBit = Array.from({ length: 100 }, () => []);
  for (const entry of entries) {
    for (let bit = 0; bit < 100; bit += 1) {
      if (entry.descriptor.cellMask & (1n << BigInt(bit))) byBit[bit].push(entry);
    }
  }
  return { fixedMask, entries, byBit, pieceCount: countBits(fixedMask) / 4 };
}

function liveEntries(context, state, bit) {
  return context.byBit[bit].filter(({ descriptor }) => state.remainingCounts[descriptor.typeIndex] > 0
    && (descriptor.cellMask & state.uncoveredMask) === descriptor.cellMask
    && !(descriptor.cellMask & state.forbiddenMasks[descriptor.typeIndex]));
}

function selectPivot(context, state) {
  let selected = null;
  for (let bit = 0; bit < 100; bit += 1) {
    if (!(state.uncoveredMask & (1n << BigInt(bit)))) continue;
    const entries = liveEntries(context, state, bit);
    if (!selected || entries.length < selected.entries.length) selected = { bit, entries };
    if (entries.length === 0) break;
  }
  return selected;
}

function coverToken(workIndex, profileIndex, state, pivotBit, catalogIndex, outcome) {
  return {
    workIndex, kind: 'cover', profileIndex, depth: state.chosen.length,
    uncoveredMask: base.maskHex(state.uncoveredMask), remainingCounts: state.remainingCounts,
    forbiddenMasks: state.forbiddenMasks.map(base.maskHex), pivotBit, catalogIndex, outcome,
  };
}

function enumerateStrongTilings({ fixedMask, catalog, profiles, workBudget, onTiling = () => false }) {
  if (!Number.isSafeInteger(workBudget) || workBudget < 0 || workBudget > 1_000_000_000) {
    throw new Error('Internal cover work budget is invalid.');
  }
  if (!Array.isArray(profiles) || profiles.length === 0 || typeof onTiling !== 'function') {
    throw new Error('Exact-cover profile input is invalid.');
  }
  const context = coverCatalog(fixedMask, catalog);
  const trace = createHash('sha256');
  const tilingHasher = createHash('sha256');
  const seenTilings = new Set();
  let workCount = 0;
  let coverBranchProbeCount = 0;
  let strongTilingCount = 0;
  let completedProfileCount = 0;
  let stopReason = null;
  let stoppedTiling = null;

  function visit(profileIndex, state) {
    if (state.uncoveredMask === 0n) {
      if (state.chosen.length !== context.pieceCount || state.remainingCounts.some(Boolean)) {
        throw new Error('Strong tiling completion invariant drifted.');
      }
      const indices = [...state.chosen].sort((left, right) => left - right);
      const key = `${profileIndex}:${indices.join(',')}`;
      if (seenTilings.has(key)) throw new Error('Strong tiling identity repeated.');
      seenTilings.add(key);
      strongTilingCount += 1;
      tilingHasher.update(`${profileIndex}:${indices.join(',')}\n`, 'utf8');
      const tiling = { profileIndex, catalogIndices: indices };
      if (onTiling(tiling) === true) {
        stoppedTiling = tiling;
        stopReason = 'callback-stop';
        return STOP;
      }
      return null;
    }
    const pivot = selectPivot(context, state);
    if (!pivot || pivot.entries.length === 0) return null;
    for (const { descriptor, catalogIndex } of pivot.entries) {
      if (workCount === workBudget) {
        stopReason = 'budget-exhausted';
        return STOP;
      }
      const nextCounts = [...state.remainingCounts];
      nextCounts[descriptor.typeIndex] -= 1;
      const nextForbidden = [...state.forbiddenMasks];
      nextForbidden[descriptor.typeIndex] |= base.neighborMask(descriptor.cellMask, fixedMask);
      const nextState = {
        uncoveredMask: state.uncoveredMask & ~descriptor.cellMask,
        remainingCounts: nextCounts,
        forbiddenMasks: nextForbidden,
        chosen: [...state.chosen, catalogIndex],
      };
      const outcome = nextState.uncoveredMask === 0n ? 'strong-tiling' : 'descend';
      trace.update(`${base.canonicalJson(coverToken(
        workCount, profileIndex, state, pivot.bit, catalogIndex, outcome,
      ))}\n`, 'utf8');
      workCount += 1;
      coverBranchProbeCount += 1;
      if (visit(profileIndex, nextState) === STOP) return STOP;
    }
    return null;
  }

  for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
    const counts = [...profiles[profileIndex].counts];
    if (counts.length !== base.TYPES.length || counts.some((count) => !Number.isInteger(count) || count < 0)
      || counts.reduce((sum, count) => sum + count, 0) !== context.pieceCount) {
      throw new Error('Exact-cover profile count does not match the mask.');
    }
    const state = {
      uncoveredMask: fixedMask,
      remainingCounts: counts,
      forbiddenMasks: base.TYPES.map(() => 0n),
      chosen: [],
    };
    if (visit(profileIndex, state) === STOP) break;
    completedProfileCount += 1;
  }
  if (!stopReason) stopReason = 'complete-not-found';
  return {
    status: stopReason,
    complete: stopReason === 'complete-not-found',
    workCount,
    coverBranchProbeCount,
    strongTilingCount,
    completedProfileCount,
    traceHash: trace.digest('hex').toUpperCase(),
    strongTilingHash: tilingHasher.digest('hex').toUpperCase(),
    stoppedTiling,
  };
}

export const __tilingTest = Object.freeze({
  ALGORITHM_VERSION,
  COVER_TRAVERSAL_VERSION,
  ORDER_TRAVERSAL_VERSION,
  sha256Hex,
  countBits,
  typeCounts,
  deriveProfiles,
  coverCatalog,
  liveEntries,
  selectPivot,
  coverToken,
  enumerateStrongTilings,
  base,
});
