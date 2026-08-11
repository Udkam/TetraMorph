import { createHash, randomBytes } from 'node:crypto';
import {
  closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { __reverseTest as base } from './search-puzzle-v3-prototype.mjs';

const ALGORITHM_VERSION = 'tiling-first-v1';
const COVER_TRAVERSAL_VERSION = 'mrv-cell/catalog-index-v1';
const ORDER_TRAVERSAL_VERSION = 'remaining-set/trie-node/catalog-index-v1';
const SCHEMA_VERSION = 1;
const CLAIM = 'F3C tiling-first setup candidate only; current Core replay and exact proof remain mandatory.';
const PROFILE_HASH = '115B19D4A4B6394E3032729222DC16B611313B9C88C6B61E81B3D2520FE98AD4';
const EMPTY_SHA256 = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';
const STOP = Symbol('tiling-first-stop');
const VALIDATED_SEARCH_RESULTS = new WeakSet();

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function registerSearchResult(result) {
  const seen = new WeakSet();
  const freeze = (value) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) freeze(child);
    return Object.isFrozen(value) ? value : Object.freeze(value);
  };
  freeze(result);
  VALIDATED_SEARCH_RESULTS.add(result);
  return result;
}

function hashSnapshot(hasher) {
  return hasher.copy().digest('hex').toUpperCase();
}

function createWorkRuntime({
  workBudget, initialWorkCount = 0, maxRssBytes = Number.POSITIVE_INFINITY,
  rssBytes = () => process.memoryUsage().rss,
}) {
  if (!Number.isSafeInteger(workBudget) || workBudget < 0 || workBudget > 1_000_000_000
    || !Number.isSafeInteger(initialWorkCount) || initialWorkCount < 0
    || initialWorkCount > workBudget || typeof rssBytes !== 'function'
    || !(maxRssBytes >= 0)) throw new Error('Work runtime input is invalid.');
  return {
    workBudget,
    workCount: initialWorkCount,
    maxRssBytes,
    rssBytes,
    trace: createHash('sha256'),
    memoTrace: createHash('sha256'),
    stopStatus: null,
    stopPhase: null,
  };
}

function admitWork(runtime, phase) {
  if (runtime.stopStatus) return false;
  if (runtime.workCount === runtime.workBudget) {
    runtime.stopStatus = 'budget-exhausted';
    runtime.stopPhase = phase;
    return false;
  }
  if (runtime.workCount % 1024 === 0
    && runtime.rssBytes(phase) > runtime.maxRssBytes) {
    runtime.stopStatus = 'memory-guard';
    runtime.stopPhase = phase;
    return false;
  }
  return true;
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

function enumerateStrongTilings({
  fixedMask, catalog, profiles, workBudget, onTiling = () => false, runtime: suppliedRuntime = null,
}) {
  if (!Number.isSafeInteger(workBudget) || workBudget < 0 || workBudget > 1_000_000_000) {
    throw new Error('Internal cover work budget is invalid.');
  }
  if (!Array.isArray(profiles) || profiles.length === 0 || typeof onTiling !== 'function') {
    throw new Error('Exact-cover profile input is invalid.');
  }
  const context = coverCatalog(fixedMask, catalog);
  const runtime = suppliedRuntime ?? createWorkRuntime({ workBudget });
  if (runtime.workBudget !== workBudget) throw new Error('Cover runtime budget drifted.');
  const tilingHasher = createHash('sha256');
  const seenTilings = new Set();
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
      if (onTiling(tiling, { tilingOrdinal: strongTilingCount - 1, runtime }) === true) {
        stoppedTiling = tiling;
        stopReason = 'callback-stop';
        return STOP;
      }
      return null;
    }
    const pivot = selectPivot(context, state);
    if (!pivot || pivot.entries.length === 0) return null;
    for (const { descriptor, catalogIndex } of pivot.entries) {
      if (!admitWork(runtime, 'cover')) {
        stopReason = runtime.stopStatus;
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
      runtime.trace.update(`${base.canonicalJson(coverToken(
        runtime.workCount, profileIndex, state, pivot.bit, catalogIndex, outcome,
      ))}\n`, 'utf8');
      runtime.workCount += 1;
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
    workCount: runtime.workCount,
    coverBranchProbeCount,
    strongTilingCount,
    completedProfileCount,
    traceHash: hashSnapshot(runtime.trace),
    strongTilingHash: tilingHasher.digest('hex').toUpperCase(),
    stoppedTiling,
  };
}

function remainingSetHex(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error('Remaining-set value is invalid.');
  }
  return value.toString(16).toUpperCase().padStart(8, '0');
}

function remainingBoard(descriptors, remainingSet) {
  let board = 0n;
  for (let localIndex = 0; localIndex < descriptors.length; localIndex += 1) {
    if (remainingSet & (2 ** localIndex)) board |= descriptors[localIndex].cellMask;
  }
  return board;
}

function orderStateKey(remainingSet, trieNodeId) {
  return `${remainingSetHex(remainingSet)}:${trieNodeId}`;
}

function orderToken(workIndex, profileIndex, tilingOrdinal, state,
  localIndex, catalogIndex, outcome) {
  return {
    workIndex, kind: 'order', profileIndex, tilingOrdinal,
    depth: state.pieceCount - countBits(BigInt(state.remainingSet)),
    remainingSet: remainingSetHex(state.remainingSet), trieNodeId: state.trieNodeId,
    localIndex, catalogIndex, outcome,
  };
}

function failedMemoToken(profileIndex, tilingOrdinal, remainingSet, trieNodeId) {
  return { profileIndex, tilingOrdinal, remainingSet: remainingSetHex(remainingSet), trieNodeId };
}

function searchTilingOrders({
  tiling, catalog, trie, workBudget, initialWorkCount = 0, tilingOrdinal = 0,
  runtime: suppliedRuntime = null,
}) {
  if (!tiling || !Array.isArray(tiling.catalogIndices) || tiling.catalogIndices.length < 1
    || tiling.catalogIndices.length > 31 || !Array.isArray(catalog) || !Array.isArray(trie)
    || trie.length === 0) throw new Error('Order-search input is invalid.');
  if (!Number.isSafeInteger(workBudget) || workBudget < 0 || workBudget > 1_000_000_000
    || !Number.isSafeInteger(initialWorkCount) || initialWorkCount < 0
    || initialWorkCount > workBudget || !Number.isSafeInteger(tilingOrdinal)
    || tilingOrdinal < 0) throw new Error('Order-search budget or ordinal is invalid.');
  const profileIndex = tiling.profileIndex;
  if (!Number.isSafeInteger(profileIndex) || profileIndex < 0) {
    throw new Error('Order-search profile index is invalid.');
  }
  const indices = tiling.catalogIndices;
  if (indices.some((index, position) => !Number.isSafeInteger(index) || index < 0
    || index >= catalog.length || (position > 0 && index <= indices[position - 1]))) {
    throw new Error('Strong-tiling catalog identity is invalid.');
  }
  const descriptors = indices.map((index) => catalog[index]);
  let tilingMask = 0n;
  for (const descriptor of descriptors) {
    if (!descriptor || !Number.isInteger(descriptor.typeIndex) || descriptor.typeIndex < 0
      || descriptor.typeIndex >= base.TYPES.length || countBits(descriptor.cellMask) !== 4
      || (tilingMask & descriptor.cellMask)) throw new Error('Strong-tiling descriptor is invalid.');
    tilingMask |= descriptor.cellMask;
  }
  const runtime = suppliedRuntime ?? createWorkRuntime({ workBudget, initialWorkCount });
  if (runtime.workBudget !== workBudget || runtime.workCount !== initialWorkCount) {
    throw new Error('Order runtime boundary drifted.');
  }
  const failedMemo = new Set();
  const pieceCount = descriptors.length;
  const fullSet = (2 ** pieceCount) - 1;
  let orderPieceProbeCount = 0;
  let orderStateCount = 1;
  let candidate = null;
  let stopped = false;

  function appendProbe(state, localIndex, outcome) {
    runtime.trace.update(`${base.canonicalJson(orderToken(
      runtime.workCount, profileIndex, tilingOrdinal, state, localIndex, indices[localIndex], outcome,
    ))}\n`, 'utf8');
    runtime.workCount += 1;
    orderPieceProbeCount += 1;
  }

  function addFailedMemo(remainingSet, trieNodeId) {
    const key = orderStateKey(remainingSet, trieNodeId);
    if (failedMemo.has(key)) throw new Error('Failed order memo repeated.');
    failedMemo.add(key);
    runtime.memoTrace.update(`${base.canonicalJson(failedMemoToken(
      profileIndex, tilingOrdinal, remainingSet, trieNodeId,
    ))}\n`, 'utf8');
  }

  function visit(remainingSet, trieNodeId, peelLocalIndices) {
    const node = trie[trieNodeId];
    if (!node || !Array.isArray(node.children) || node.children.length !== base.TYPES.length) {
      throw new Error('Reverse trie node is invalid.');
    }
    const state = { remainingSet, trieNodeId, pieceCount };
    for (let localIndex = 0; localIndex < pieceCount; localIndex += 1) {
      if (!(remainingSet & (2 ** localIndex))) continue;
      if (!admitWork(runtime, 'order')) {
        stopped = true;
        return STOP;
      }
      const descriptor = descriptors[localIndex];
      const childId = node.children[descriptor.typeIndex];
      if (!Number.isInteger(childId) || childId < 0) {
        appendProbe(state, localIndex, 'no-child');
        continue;
      }
      const nextSet = remainingSet - (2 ** localIndex);
      const nextBoard = remainingBoard(descriptors, nextSet);
      if (base.hardDropMask(nextBoard, descriptor) !== descriptor.cellMask) {
        appendProbe(state, localIndex, 'hard-drop-miss');
        continue;
      }
      orderStateCount += 1;
      const child = trie[childId];
      if (!child || !Array.isArray(child.seeds)) throw new Error('Reverse trie child is invalid.');
      const nextKey = orderStateKey(nextSet, childId);
      if (nextSet === 0 && child.seeds.length > 0) {
        appendProbe(state, localIndex, 'candidate');
        const peel = [...peelLocalIndices, localIndex];
        candidate = {
          seed: Math.min(...child.seeds),
          peelLocalIndices: peel,
          forwardCatalogIndices: peel.toReversed().map((index) => indices[index]),
        };
        return candidate;
      }
      if (failedMemo.has(nextKey)) {
        appendProbe(state, localIndex, 'memo-hit');
        continue;
      }
      appendProbe(state, localIndex, nextSet === 0 ? 'dead-leaf' : 'descend');
      if (nextSet !== 0) {
        const result = visit(nextSet, childId, [...peelLocalIndices, localIndex]);
        if (result === STOP || result) return result;
      }
    }
    addFailedMemo(remainingSet, trieNodeId);
    return null;
  }

  visit(fullSet, 0, []);
  return {
    status: candidate ? 'candidate' : stopped ? runtime.stopStatus : 'complete-not-found',
    complete: !candidate && !stopped,
    workCount: runtime.workCount,
    orderPieceProbeCount,
    orderStateCount,
    failedMemoCount: failedMemo.size,
    traceHash: hashSnapshot(runtime.trace),
    failedMemoTraceHash: hashSnapshot(runtime.memoTrace),
    candidate,
  };
}

function canonicalHash(label, value) {
  return sha256Hex(Buffer.from(`${label}\0${base.canonicalJson(value)}`, 'utf8'));
}

function buildTilingDomain({
  maxRssBytes = Number.POSITIVE_INFINITY,
  rssBytes = () => process.memoryUsage().rss,
} = {}) {
  if (!(maxRssBytes >= 0) || typeof rssBytes !== 'function') {
    throw new Error('Domain-build memory input is invalid.');
  }
  const guarded = () => rssBytes('domain-build') > maxRssBytes;
  if (guarded()) return {
    memoryGuard: true, phase: 'domain-build', processedSeeds: 0, reverseTrieNodeCount: 0,
  };
  const fixedMask = base.rowsMask();
  const catalogBuild = base.buildReverseCatalog(fixedMask);
  const profileBuild = deriveProfiles(1, 20_000);
  const fixedHashes = {
    targetMask: base.maskHex(fixedMask),
    catalogDescriptorCount: catalogBuild.descriptors.length,
    catalogHash: base.hashHex(catalogBuild.catalogHash),
    shapeTableHash: base.hashHex(base.shapeTableHash()),
    fullQueueHash: base.hashHex(base.fullQueueHash(1, 20_000)),
  };
  if (fixedHashes.targetMask !== 'DFF7FCFFFBFE3DFE3FFCFF387'
    || fixedHashes.catalogDescriptorCount !== 662
    || fixedHashes.catalogHash !== '6A4739D980BAA5AC7D6DAA631A88742421630F6762583738018DE3541E9A6B39'
    || fixedHashes.shapeTableHash !== '868FB052469D00DED00A967177B58A34F7267EE48E6F3BA68AF0C852CFF2C2DE'
    || fixedHashes.fullQueueHash !== '9FAE1D03284F99CF356FD48320B55CD78D30CBAF1340AF4371B8182C795EEB67'
    || profileBuild.profileHash !== PROFILE_HASH
    || base.REVERSE_ALGORITHM_VERSION !== 'seeded-reverse-v1'
    || base.SETUP_RULES_VERSION
      !== 'visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1'
    || base.REVERSE_TYPE_ORDER_VERSION !== 'I,O,T,S,Z,J,L-v1'
    || base.QUEUE_GENERATOR_VERSION !== 'xorshift32-fisher-yates-seven-bag-v1'
    || base.REVERSE_CANDIDATE_ORDER_VERSION
      !== 'type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1') {
    throw new Error('Tiling-first fixed identity drifted.');
  }
  const trieBuild = base.buildReverseTrie(1, 20_000, maxRssBytes,
    () => rssBytes('domain-build'));
  if (trieBuild.memoryGuard || guarded()) {
    return {
      memoryGuard: true, phase: 'domain-build', processedSeeds: trieBuild.processedSeeds,
      reverseTrieNodeCount: trieBuild.nodes.length,
    };
  }
  const trieHash = base.hashHex(trieBuild.trieHash);
  if (trieBuild.nodes.length !== 282_615
    || trieHash !== '4C78BE1A2353B67A20F8C77C55E3DC433B0C304D960B16DA6223CE3DAC769981') {
    throw new Error('Tiling-first reverse trie identity drifted.');
  }
  const identity = {
    algorithmVersion: ALGORITHM_VERSION,
    coverTraversalVersion: COVER_TRAVERSAL_VERSION,
    orderTraversalVersion: ORDER_TRAVERSAL_VERSION,
    sourceAlgorithmVersion: base.REVERSE_ALGORITHM_VERSION,
    setupRulesVersion: base.SETUP_RULES_VERSION,
    typeOrderVersion: base.REVERSE_TYPE_ORDER_VERSION,
    queueGeneratorVersion: base.QUEUE_GENERATOR_VERSION,
    candidateOrderVersion: base.REVERSE_CANDIDATE_ORDER_VERSION,
    fullSeedStart: 1,
    fullSeedCount: 20_000,
    sequenceLength: 20,
    targetRows: 10,
    targetMask: fixedHashes.targetMask,
    catalogDescriptorCount: fixedHashes.catalogDescriptorCount,
    catalogHash: fixedHashes.catalogHash,
    shapeTableHash: fixedHashes.shapeTableHash,
    fullQueueHash: fixedHashes.fullQueueHash,
    reverseTrieHash: trieHash,
    reverseTrieNodeCount: trieBuild.nodes.length,
    profileHash: profileBuild.profileHash,
    profileCounts: profileBuild.profiles.map(({ counts }) => counts),
  };
  return {
    memoryGuard: false,
    fixedMask,
    catalog: catalogBuild.descriptors,
    profiles: profileBuild.profiles,
    trie: trieBuild.nodes,
    identity,
    domainHash: canonicalHash('T37-TDOMAIN-v1', identity),
    processedSeeds: trieBuild.processedSeeds,
  };
}

function tilingDomainObject(identity, domainHash) {
  const fallback = {
    algorithmVersion: ALGORITHM_VERSION,
    coverTraversalVersion: COVER_TRAVERSAL_VERSION,
    orderTraversalVersion: ORDER_TRAVERSAL_VERSION,
    sourceAlgorithmVersion: 'seeded-reverse-v1',
    setupRulesVersion: 'visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1',
    typeOrderVersion: 'I,O,T,S,Z,J,L-v1',
    queueGeneratorVersion: 'xorshift32-fisher-yates-seven-bag-v1',
    candidateOrderVersion:
      'type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1',
    fullSeedStart: 1,
    fullSeedCount: 20_000,
    sequenceLength: 20,
    targetRows: 10,
    targetMask: 'DFF7FCFFFBFE3DFE3FFCFF387',
    catalogDescriptorCount: 662,
    catalogHash: '6A4739D980BAA5AC7D6DAA631A88742421630F6762583738018DE3541E9A6B39',
    shapeTableHash: '868FB052469D00DED00A967177B58A34F7267EE48E6F3BA68AF0C852CFF2C2DE',
    fullQueueHash: '9FAE1D03284F99CF356FD48320B55CD78D30CBAF1340AF4371B8182C795EEB67',
    reverseTrieHash: null,
    reverseTrieNodeCount: null,
    profileHash: PROFILE_HASH,
    profileCounts: Array.from({ length: 7 }, (_, two) =>
      Array.from({ length: 7 }, (_, type) => type === two ? 2 : 3)),
  };
  return { ...(identity ?? fallback), domainHash };
}

function candidateArtifacts(domain, candidate) {
  if (!candidate) return { setup: null, boardRows: null };
  const descriptors = candidate.forwardCatalogIndices.map((index) => domain.catalog[index]);
  if (descriptors.some((descriptor) => !descriptor)
    || remainingBoard(descriptors, (2 ** descriptors.length) - 1) !== domain.fixedMask) {
    throw new Error('Candidate tiling does not reconstruct the fixed mask.');
  }
  return {
    setup: {
      seed: candidate.seed,
      placements: descriptors.map((descriptor) => ({
        type: base.TYPES[descriptor.typeIndex], rotation: descriptor.rotation, x: descriptor.x,
      })),
    },
    boardRows: base.candidateBoardRows(descriptors),
  };
}

function executeTilingSearch({
  workBudget, maxRssBytes, rssBytes = () => process.memoryUsage().rss, preparedDomain = null,
}) {
  if (!Number.isSafeInteger(workBudget) || workBudget < 0 || workBudget > 1_000_000_000
    || !(maxRssBytes >= 0) || typeof rssBytes !== 'function') {
    throw new Error('Combined tiling search input is invalid.');
  }
  const domain = preparedDomain ?? buildTilingDomain({ maxRssBytes, rssBytes });
  if (domain.memoryGuard) {
    const result = {
      status: 'memory-guard', phase: 'domain-build', complete: false,
      domain: tilingDomainObject(null, null), domainHash: null,
      workCount: 0, coverBranchProbeCount: 0,
      orderPieceProbeCount: 0, orderStateCount: 0, failedMemoCount: 0,
      strongTilingCount: 0, completedProfileCount: 0,
      traceHash: EMPTY_SHA256, strongTilingHash: EMPTY_SHA256,
      failedMemoTraceHash: EMPTY_SHA256, candidate: null, setup: null, boardRows: null,
      processedSeeds: domain.processedSeeds, catalogDescriptorCount: 662,
      reverseTrieNodeCount: domain.reverseTrieNodeCount,
    };
    return registerSearchResult(result);
  }
  if (!domain.fixedMask || !Array.isArray(domain.catalog) || !Array.isArray(domain.profiles)
    || !Array.isArray(domain.trie) || !domain.identity || !domain.domainHash) {
    throw new Error('Prepared tiling domain is invalid.');
  }
  const runtime = createWorkRuntime({ workBudget, maxRssBytes, rssBytes });
  let candidate = null;
  let orderPieceProbeCount = 0;
  let orderStateCount = 0;
  let failedMemoCount = 0;
  const cover = enumerateStrongTilings({
    fixedMask: domain.fixedMask,
    catalog: domain.catalog,
    profiles: domain.profiles,
    workBudget,
    runtime,
    onTiling: (tiling, { tilingOrdinal }) => {
      const order = searchTilingOrders({
        tiling,
        catalog: domain.catalog,
        trie: domain.trie,
        workBudget,
        initialWorkCount: runtime.workCount,
        tilingOrdinal,
        runtime,
      });
      orderPieceProbeCount += order.orderPieceProbeCount;
      orderStateCount += order.orderStateCount;
      failedMemoCount += order.failedMemoCount;
      if (order.candidate) {
        candidate = { profileIndex: tiling.profileIndex, tilingOrdinal, ...order.candidate };
        return true;
      }
      return runtime.stopStatus !== null;
    },
  });
  const status = candidate ? 'candidate'
    : runtime.stopStatus ?? (cover.complete ? 'complete-not-found' : null);
  if (!status) throw new Error('Combined tiling search stopped without a terminal status.');
  const artifacts = candidateArtifacts(domain, candidate);
  const result = {
    status,
    phase: candidate ? 'order' : runtime.stopPhase ?? 'cover',
    complete: status === 'complete-not-found',
    domain: tilingDomainObject(domain.identity, domain.domainHash),
    domainHash: domain.domainHash,
    workCount: runtime.workCount,
    coverBranchProbeCount: cover.coverBranchProbeCount,
    orderPieceProbeCount,
    orderStateCount,
    failedMemoCount,
    strongTilingCount: cover.strongTilingCount,
    completedProfileCount: cover.completedProfileCount,
    traceHash: hashSnapshot(runtime.trace),
    strongTilingHash: cover.strongTilingHash,
    failedMemoTraceHash: hashSnapshot(runtime.memoTrace),
    candidate,
    ...artifacts,
    processedSeeds: domain.processedSeeds,
    catalogDescriptorCount: domain.catalog.length,
    reverseTrieNodeCount: domain.trie.length,
  };
  return registerSearchResult(result);
}

function tilingResultHash({ status, phase, domainHash, coverage, evidence, setup, boardRows, search }) {
  return canonicalHash('T37-TRESULT-v1', {
    status, phase, domainHash, coverage, evidence, setup, boardRows, search,
  });
}

function exactObjectKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
}

function makeTilingOutput(result, { workBudget, maxRssMiB }) {
  const allowed = new Set([
    'candidate:order', 'complete-not-found:cover', 'budget-exhausted:cover',
    'budget-exhausted:order', 'memory-guard:domain-build', 'memory-guard:cover',
    'memory-guard:order',
  ]);
  const domainKeys = [
    'algorithmVersion', 'coverTraversalVersion', 'orderTraversalVersion',
    'sourceAlgorithmVersion', 'setupRulesVersion', 'typeOrderVersion',
    'queueGeneratorVersion', 'candidateOrderVersion', 'fullSeedStart', 'fullSeedCount',
    'sequenceLength', 'targetRows', 'targetMask', 'catalogDescriptorCount', 'catalogHash',
    'shapeTableHash', 'fullQueueHash', 'reverseTrieHash', 'reverseTrieNodeCount',
    'profileHash', 'profileCounts', 'domainHash',
  ];
  const integers = [
    result?.workCount, result?.coverBranchProbeCount, result?.orderPieceProbeCount,
    result?.orderStateCount, result?.failedMemoCount, result?.strongTilingCount,
    result?.completedProfileCount, result?.processedSeeds, result?.catalogDescriptorCount,
    result?.reverseTrieNodeCount,
  ];
  const setupValid = result?.setup && exactObjectKeys(result.setup, ['seed', 'placements'])
    && Number.isSafeInteger(result.setup.seed) && result.setup.seed >= 1
    && result.setup.seed <= 0xffff_ffff && Array.isArray(result.setup.placements)
    && result.setup.placements.length === 20
    && result.setup.placements.every((placement) => exactObjectKeys(placement, ['type', 'rotation', 'x'])
      && base.TYPES.includes(placement.type) && Number.isInteger(placement.rotation)
      && placement.rotation >= 0 && placement.rotation <= 3 && Number.isInteger(placement.x));
  const boardValid = Array.isArray(result?.boardRows) && result.boardRows.length === 20
    && result.boardRows.every((row) => /^[.IOTSZJL]{10}$/.test(row))
    && base.canonicalJson(result.boardRows.map((row) => row.replace(/[IOTSZJL]/g, '#')))
      === base.canonicalJson(base.TARGET_VISIBLE_ROWS);
  const hashOrNull = (value) => value === null || /^[0-9A-F]{64}$/.test(value);
  if (!result || !VALIDATED_SEARCH_RESULTS.has(result)
    || !allowed.has(`${result.status}:${result.phase}`)
    || !Number.isSafeInteger(workBudget) || workBudget < 1 || workBudget > 1_000_000_000
    || !Number.isSafeInteger(maxRssMiB) || maxRssMiB < 128 || maxRssMiB > 4096
    || result.complete !== (result.status === 'complete-not-found')
    || !exactObjectKeys(result.domain, domainKeys) || result.domain.domainHash !== result.domainHash
    || result.domain.profileHash !== PROFILE_HASH || integers.some((value) =>
      !Number.isSafeInteger(value) || value < 0)
    || result.workCount !== result.coverBranchProbeCount + result.orderPieceProbeCount
    || !hashOrNull(result.domainHash) || !hashOrNull(result.domain.reverseTrieHash)
    || ![result.traceHash, result.strongTilingHash, result.failedMemoTraceHash]
      .every((value) => /^[0-9A-F]{64}$/.test(value))
    || (result.phase === 'domain-build') !== (result.domainHash === null)
    || (result.status === 'candidate') !== (result.candidate !== null)
    || (result.status === 'candidate' && (result.candidate.seed !== result.setup?.seed
      || result.candidate.forwardCatalogIndices?.length !== 20
      || result.candidate.peelLocalIndices?.length !== 20))
    || (result.status === 'candidate' ? !(setupValid && boardValid)
      : result.setup !== null || result.boardRows !== null)) {
    throw new Error('Tiling output state is invalid.');
  }
  const coverage = {
    complete: result.complete,
    workCount: result.workCount,
    coverBranchProbeCount: result.coverBranchProbeCount,
    orderPieceProbeCount: result.orderPieceProbeCount,
    strongTilingCount: result.strongTilingCount,
    completedProfileCount: result.completedProfileCount,
  };
  const evidence = {
    profileHash: result.domain.profileHash,
    domainHash: result.domainHash,
    traceHash: result.traceHash,
    strongTilingHash: result.strongTilingHash,
    failedMemoTraceHash: result.failedMemoTraceHash,
  };
  const search = {
    workBudget,
    maxRssMiB,
    processedSeeds: result.processedSeeds,
    catalogDescriptorCount: result.catalogDescriptorCount,
    reverseTrieNodeCount: result.reverseTrieNodeCount,
    orderStateCount: result.orderStateCount,
    failedMemoCount: result.failedMemoCount,
  };
  const resultHash = tilingResultHash({
    status: result.status, phase: result.phase, domainHash: result.domainHash,
    coverage, evidence, setup: result.setup, boardRows: result.boardRows, search,
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    claim: CLAIM,
    status: result.status,
    phase: result.phase,
    domain: result.domain,
    coverage,
    evidence: { ...evidence, resultHash },
    targetRows: 10,
    targetMaskRows: base.TARGET_VISIBLE_ROWS,
    setup: result.setup,
    boardRows: result.boardRows,
    search,
  };
}

function pathEntryExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function parseTilingArguments(argv) {
  if (!Array.isArray(argv) || argv.length % 2 !== 0) {
    throw new Error('Expected explicit --name value pairs.');
  }
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error('Expected explicit --name value pairs.');
    }
    if (values.has(name)) throw new Error(`Duplicate tiling option: ${name}.`);
    values.set(name, value);
  }
  const allowed = new Set(['--algorithm', '--work-budget', '--max-rss-mib', '--output']);
  for (const name of values.keys()) {
    if (!allowed.has(name)) throw new Error(`Unknown tiling option: ${name}.`);
  }
  if (values.get('--algorithm') !== ALGORITHM_VERSION) {
    throw new Error('Unsupported tiling algorithm.');
  }
  const integer = (name, minimum, maximum) => {
    const raw = values.get(name);
    if (!/^[1-9]\d*$/.test(raw ?? '')) {
      throw new Error(`${name} must be a canonical positive integer.`);
    }
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
    }
    return value;
  };
  const outputValue = values.get('--output');
  if (!outputValue) throw new Error('--output is required.');
  const outputPath = resolve(outputValue);
  if (pathEntryExists(outputPath)) throw new Error('Tiling output path must not already exist.');
  return {
    workBudget: integer('--work-budget', 1, 1_000_000_000),
    maxRssMiB: integer('--max-rss-mib', 128, 4096),
    outputPath,
  };
}

function writeAtomicAbsent(outputPath, bytes, nonceBytes = randomBytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || typeof nonceBytes !== 'function'
    || pathEntryExists(outputPath)) {
    throw new Error('Atomic tiling output input is invalid or already exists.');
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  if (pathEntryExists(outputPath)) throw new Error('Tiling output appeared before publication.');
  let temporaryPath = null;
  let ownedTemporaryPath = null;
  let descriptor = null;
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      temporaryPath = resolve(dirname(outputPath),
        `.${basename(outputPath)}.${process.pid}.${nonceBytes(8).toString('hex')}.tmp`);
      try {
        descriptor = openSync(temporaryPath, 'wx', 0o600);
        ownedTemporaryPath = temporaryPath;
        break;
      } catch (error) {
        if (error?.code !== 'EEXIST' || attempt === 7) throw error;
      }
    }
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    linkSync(temporaryPath, outputPath);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    if (ownedTemporaryPath && pathEntryExists(ownedTemporaryPath)) unlinkSync(ownedTemporaryPath);
  }
}

function runTilingCli(argv) {
  const options = parseTilingArguments(argv);
  const result = executeTilingSearch({
    workBudget: options.workBudget,
    maxRssBytes: options.maxRssMiB * 1024 * 1024,
  });
  const output = makeTilingOutput(result, options);
  const bytes = Buffer.from(`${base.canonicalJson(output)}\n`, 'utf8');
  writeAtomicAbsent(options.outputPath, bytes);
  process.stdout.write(`${base.canonicalJson({
    status: output.status,
    phase: output.phase,
    workCount: output.coverage.workCount,
    resultHash: output.evidence.resultHash,
  })}\n`);
  return output.status === 'candidate' ? 0 : 2;
}

export const __tilingTest = Object.freeze({
  ALGORITHM_VERSION,
  COVER_TRAVERSAL_VERSION,
  ORDER_TRAVERSAL_VERSION,
  sha256Hex,
  hashSnapshot,
  createWorkRuntime,
  admitWork,
  countBits,
  typeCounts,
  deriveProfiles,
  coverCatalog,
  liveEntries,
  selectPivot,
  coverToken,
  enumerateStrongTilings,
  remainingSetHex,
  remainingBoard,
  orderStateKey,
  orderToken,
  failedMemoToken,
  searchTilingOrders,
  canonicalHash,
  buildTilingDomain,
  executeTilingSearch,
  tilingDomainObject,
  candidateArtifacts,
  tilingResultHash,
  makeTilingOutput,
  pathEntryExists,
  parseTilingArguments,
  writeAtomicAbsent,
  runTilingCli,
  base,
});

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    process.exitCode = runTilingCli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
