import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { __tilingTest as v1 } from './search-puzzle-v3-tiling-first.mjs';

const { base } = v1;
const ALGORITHM_VERSION = 'tiling-first-sharded-v2';
const SCHEMA_VERSION = 2;
const SERIES_VERSION = 'seed-series-20001-200000-20000-v1';
const MANIFEST_VERSION = 'tiling-first-sharded-v2-manifest-v1';
const CLAIM = 'F3C sharded tiling setup candidate only; current Core replay and exact proof remain mandatory.';
const SHARD_COUNT = 9;
const SHARD_SIZE = 20_000;
const SERIES_SEED_START = 20_001;
const SERIES_SEED_COUNT = SHARD_COUNT * SHARD_SIZE;
const WORK_BUDGET = 10_000_000;
const MAX_RSS_MIB = 900;
const PROFILE_HASH = '115B19D4A4B6394E3032729222DC16B611313B9C88C6B61E81B3D2520FE98AD4';
const TARGET_MASK = 'DFF7FCFFFBFE3DFE3FFCFF387';
const CATALOG_HASH = '6A4739D980BAA5AC7D6DAA631A88742421630F6762583738018DE3541E9A6B39';
const SHAPE_TABLE_HASH = '868FB052469D00DED00A967177B58A34F7267EE48E6F3BA68AF0C852CFF2C2DE';
const FULL_STRONG_TILING_HASH = '8B233871A95B0A14915D727EC26751F90FF9E5C138E658EEE2E03F7B91814B64';
const V1_FILE_HASH = 'F9E94210ECB61E4284F3434363833748B1D5990E58DB666A90A2836FB0A840B3';
const V1_RESULT_HASH = 'C1E315E66B819593279E485DC24AC2FE4E9CC7B7543724748222A45B42FBF758';
const HASH_PATTERN = /^[0-9A-F]{64}$/;
const REPOSITORY_ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const PUBLISH_CAPABILITY = Object.freeze({});
const TRUSTED_RESULTS = new WeakMap();
const REPLAY_CONTEXTS = new WeakSet();
const MANIFEST_TEST_DEPENDENCIES = new WeakSet();

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new Error(`${label} has an invalid field set.`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

function shardRange(shardIndex) {
  if (!Number.isSafeInteger(shardIndex) || shardIndex < 0 || shardIndex >= SHARD_COUNT) {
    throw new Error('Shard index must be an integer from 0 through 8.');
  }
  const seedStart = SERIES_SEED_START + shardIndex * SHARD_SIZE;
  const seedEndExclusive = seedStart + SHARD_SIZE;
  if (!Number.isSafeInteger(seedEndExclusive)) throw new Error('Shard range overflowed.');
  return { shardIndex, seedStart, seedCount: SHARD_SIZE, seedEndExclusive };
}

const SERIES_BODY = deepFreeze({
  seriesVersion: SERIES_VERSION,
  seedStart: SERIES_SEED_START,
  seedCount: SERIES_SEED_COUNT,
  shardSize: SHARD_SIZE,
  shardCount: SHARD_COUNT,
  ranges: Array.from({ length: SHARD_COUNT }, (_, index) => shardRange(index)),
});
const SERIES_HASH = v1.canonicalHash('T37-TSERIES-ID-v2', SERIES_BODY);
const SERIES = deepFreeze({ ...SERIES_BODY, seriesHash: SERIES_HASH });
const COVER_REFERENCE = deepFreeze({
  coverBranchProbeCount: 345_149,
  strongTilingCount: 373,
  strongTilingHash: FULL_STRONG_TILING_HASH,
});

function profileMembership(profiles, range) {
  if (!Array.isArray(profiles) || profiles.length !== base.TYPES.length) {
    throw new Error('Shard profiles must contain all seven count profiles.');
  }
  const seen = new Set();
  for (const [index, profile] of profiles.entries()) {
    exactKeys(profile, ['countTwoTypeIndex', 'counts', 'seeds'], 'Shard profile');
    if (profile.countTwoTypeIndex !== index || !Array.isArray(profile.counts)
      || profile.counts.length !== 7 || profile.counts.some((count, typeIndex) =>
        count !== (typeIndex === index ? 2 : 3)) || !Array.isArray(profile.seeds)) {
      throw new Error('Shard profile counts drifted.');
    }
    let previous = range.seedStart - 1;
    for (const seed of profile.seeds) {
      if (!Number.isSafeInteger(seed) || seed <= previous || seed < range.seedStart
        || seed >= range.seedEndExclusive || seen.has(seed)) {
        throw new Error('Shard profile membership is not a strict partition.');
      }
      const counts = v1.typeCounts(base.sequenceForSeed(seed, 20));
      if (base.canonicalJson(counts) !== base.canonicalJson(profile.counts)) {
        throw new Error('Shard profile member has the wrong queue profile.');
      }
      seen.add(seed);
      previous = seed;
    }
  }
  if (seen.size !== range.seedCount) throw new Error('Shard profile membership is incomplete.');
  return {
    profileSeedCounts: profiles.map(({ seeds }) => seeds.length),
    profileMembershipHash: v1.canonicalHash('T37-TPROFILE-MEMBERSHIP-v2', profiles),
  };
}

function domainBody(range, profileBuild, membership, fixedHashes, trieBuild) {
  return {
    algorithmVersion: ALGORITHM_VERSION,
    coverTraversalVersion: v1.COVER_TRAVERSAL_VERSION,
    orderTraversalVersion: v1.ORDER_TRAVERSAL_VERSION,
    sourceAlgorithmVersion: base.REVERSE_ALGORITHM_VERSION,
    setupRulesVersion: base.SETUP_RULES_VERSION,
    typeOrderVersion: base.REVERSE_TYPE_ORDER_VERSION,
    queueGeneratorVersion: base.QUEUE_GENERATOR_VERSION,
    candidateOrderVersion: base.REVERSE_CANDIDATE_ORDER_VERSION,
    seriesVersion: SERIES_VERSION,
    seriesHash: SERIES_HASH,
    ...range,
    sequenceLength: 20,
    targetRows: 10,
    targetMask: fixedHashes.targetMask,
    catalogDescriptorCount: fixedHashes.catalogDescriptorCount,
    catalogHash: fixedHashes.catalogHash,
    shapeTableHash: fixedHashes.shapeTableHash,
    fullQueueHash: fixedHashes.fullQueueHash,
    reverseTrieHash: fixedHashes.reverseTrieHash,
    reverseTrieNodeCount: trieBuild.nodes.length,
    profileHash: profileBuild.profileHash,
    profileCounts: profileBuild.profiles.map(({ counts }) => counts),
    profileSeedCounts: membership.profileSeedCounts,
    profileMembershipHash: membership.profileMembershipHash,
  };
}

function buildShardDomain(shardIndex, {
  maxRssBytes = MAX_RSS_MIB * 1024 * 1024,
  rssBytes = () => process.memoryUsage().rss,
} = {}) {
  if (!(maxRssBytes >= 0) || typeof rssBytes !== 'function') {
    throw new Error('Shard domain memory input is invalid.');
  }
  const guarded = () => rssBytes('domain-build') > maxRssBytes;
  if (guarded()) throw new Error('Shard domain stopped at the memory guard.');
  const range = shardRange(shardIndex);
  const fixedMask = base.rowsMask();
  const catalogBuild = base.buildReverseCatalog(fixedMask);
  const profileBuild = v1.deriveProfiles(range.seedStart, range.seedCount);
  const membership = profileMembership(profileBuild.profiles, range);
  const fixedHashes = {
    targetMask: base.maskHex(fixedMask),
    catalogDescriptorCount: catalogBuild.descriptors.length,
    catalogHash: base.hashHex(catalogBuild.catalogHash),
    shapeTableHash: base.hashHex(base.shapeTableHash()),
    fullQueueHash: base.hashHex(base.fullQueueHash(range.seedStart, range.seedCount)),
    reverseTrieHash: null,
  };
  if (guarded()) throw new Error('Shard domain stopped at the memory guard.');
  const trieBuild = base.buildReverseTrie(range.seedStart, range.seedCount, maxRssBytes,
    () => rssBytes('domain-build'));
  if (trieBuild.memoryGuard || guarded()) throw new Error('Shard domain stopped at the memory guard.');
  fixedHashes.reverseTrieHash = base.hashHex(trieBuild.trieHash);
  if (fixedHashes.targetMask !== TARGET_MASK || fixedHashes.catalogDescriptorCount !== 662
    || fixedHashes.catalogHash !== CATALOG_HASH || fixedHashes.shapeTableHash !== SHAPE_TABLE_HASH
    || profileBuild.profileHash !== PROFILE_HASH || trieBuild.processedSeeds !== range.seedCount
    || v1.COVER_TRAVERSAL_VERSION !== 'mrv-cell/catalog-index-v1'
    || v1.ORDER_TRAVERSAL_VERSION !== 'remaining-set/trie-node/catalog-index-v1'
    || base.REVERSE_ALGORITHM_VERSION !== 'seeded-reverse-v1'
    || base.SETUP_RULES_VERSION !== 'visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1'
    || base.REVERSE_TYPE_ORDER_VERSION !== 'I,O,T,S,Z,J,L-v1'
    || base.QUEUE_GENERATOR_VERSION !== 'xorshift32-fisher-yates-seven-bag-v1'
    || base.REVERSE_CANDIDATE_ORDER_VERSION
      !== 'type-index/rotation-0..3/x-ascending/absolute-y-ascending/landing-cell-dedupe/real-trie-child-v1') {
    throw new Error('Shard fixed identity drifted.');
  }
  const identity = domainBody(range, profileBuild, membership, fixedHashes, trieBuild);
  return {
    memoryGuard: false,
    fixedMask,
    catalog: catalogBuild.descriptors,
    profiles: profileBuild.profiles,
    trie: trieBuild.nodes,
    identity,
    domainHash: v1.canonicalHash('T37-TDOMAIN-v2', identity),
    processedSeeds: trieBuild.processedSeeds,
  };
}

const DOMAIN_KEYS = [
  'algorithmVersion', 'coverTraversalVersion', 'orderTraversalVersion', 'sourceAlgorithmVersion',
  'setupRulesVersion', 'typeOrderVersion', 'queueGeneratorVersion', 'candidateOrderVersion',
  'seriesVersion', 'seriesHash', 'shardIndex', 'seedStart', 'seedCount', 'seedEndExclusive',
  'sequenceLength', 'targetRows', 'targetMask', 'catalogDescriptorCount', 'catalogHash',
  'shapeTableHash', 'fullQueueHash', 'reverseTrieHash', 'reverseTrieNodeCount', 'profileHash',
  'profileCounts', 'profileSeedCounts', 'profileMembershipHash', 'domainHash',
];

function validateDomain(domain) {
  exactKeys(domain, DOMAIN_KEYS, 'V2 domain');
  const range = shardRange(domain.shardIndex);
  const body = { ...domain };
  delete body.domainHash;
  if (domain.algorithmVersion !== ALGORITHM_VERSION || domain.coverTraversalVersion !== v1.COVER_TRAVERSAL_VERSION
    || domain.orderTraversalVersion !== v1.ORDER_TRAVERSAL_VERSION
    || domain.sourceAlgorithmVersion !== base.REVERSE_ALGORITHM_VERSION
    || domain.setupRulesVersion !== base.SETUP_RULES_VERSION
    || domain.typeOrderVersion !== base.REVERSE_TYPE_ORDER_VERSION
    || domain.queueGeneratorVersion !== base.QUEUE_GENERATOR_VERSION
    || domain.candidateOrderVersion !== base.REVERSE_CANDIDATE_ORDER_VERSION
    || domain.seriesVersion !== SERIES_VERSION || domain.seriesHash !== SERIES_HASH
    || ['seedStart', 'seedCount', 'seedEndExclusive'].some((key) => domain[key] !== range[key])
    || domain.sequenceLength !== 20 || domain.targetRows !== 10 || domain.targetMask !== TARGET_MASK
    || domain.catalogDescriptorCount !== 662 || domain.catalogHash !== CATALOG_HASH
    || domain.shapeTableHash !== SHAPE_TABLE_HASH || domain.profileHash !== PROFILE_HASH
    || !HASH_PATTERN.test(domain.fullQueueHash) || !HASH_PATTERN.test(domain.reverseTrieHash)
    || !Number.isSafeInteger(domain.reverseTrieNodeCount) || domain.reverseTrieNodeCount < 1
    || !Array.isArray(domain.profileCounts) || domain.profileCounts.length !== 7
    || domain.profileCounts.some((counts, two) => !Array.isArray(counts) || counts.length !== 7
      || counts.some((count, type) => count !== (type === two ? 2 : 3)))
    || !Array.isArray(domain.profileSeedCounts) || domain.profileSeedCounts.length !== 7
    || domain.profileSeedCounts.some((count) => !Number.isSafeInteger(count) || count < 1)
    || domain.profileSeedCounts.reduce((sum, count) => sum + count, 0) !== SHARD_SIZE
    || !HASH_PATTERN.test(domain.profileMembershipHash)
    || domain.domainHash !== v1.canonicalHash('T37-TDOMAIN-v2', body)) {
    throw new Error('V2 domain identity is invalid.');
  }
  return range;
}

function validateCandidateShape(output) {
  const candidate = output.candidate;
  exactKeys(candidate, ['profileIndex', 'tilingOrdinal', 'seed', 'forwardCatalogIndices', 'peelLocalIndices'],
    'V2 candidate');
  exactKeys(output.setup, ['seed', 'placements'], 'V2 candidate setup');
  const range = shardRange(output.shard.shardIndex);
  if (!Number.isSafeInteger(candidate.seed) || candidate.seed < range.seedStart
    || candidate.seed >= range.seedEndExclusive || output.setup.seed !== candidate.seed
    || !Array.isArray(candidate.forwardCatalogIndices) || candidate.forwardCatalogIndices.length !== 20
    || !Array.isArray(candidate.peelLocalIndices) || candidate.peelLocalIndices.length !== 20
    || !Array.isArray(output.setup.placements) || output.setup.placements.length !== 20) {
    throw new Error('V2 candidate range or cardinality is invalid.');
  }
  if (!Number.isSafeInteger(candidate.profileIndex) || candidate.profileIndex < 0
    || candidate.profileIndex > 6 || !Number.isSafeInteger(candidate.tilingOrdinal)
    || candidate.tilingOrdinal < 0) throw new Error('V2 candidate ordinal is invalid.');
  if (candidate.forwardCatalogIndices.some((index) => !Number.isSafeInteger(index) || index < 0)
    || candidate.peelLocalIndices.some((index) => !Number.isSafeInteger(index) || index < 0)
    || !Array.isArray(output.boardRows) || output.boardRows.length !== 20) {
    throw new Error('V2 candidate arrays are invalid.');
  }
  if (candidate.profileIndex !== output.coverage.completedProfileCount
    || candidate.tilingOrdinal + 1 !== output.coverage.strongTilingCount) {
    throw new Error('V2 candidate prefix is invalid.');
  }
  for (const placement of output.setup.placements) {
    exactKeys(placement, ['type', 'rotation', 'x'], 'V2 setup placement');
    if (!base.TYPES.includes(placement.type) || !Number.isInteger(placement.rotation)
      || placement.rotation < 0 || placement.rotation > 3 || !Number.isInteger(placement.x)) {
      throw new Error('V2 setup placement is invalid.');
    }
  }
}

function createCandidateReplayContext(config) {
  exactKeys(config, ['types', 'catalog', 'targetMask', 'visibleMask', 'rowMasks',
    'sequenceForSeed', 'hardDropMask', 'neighborMask', 'candidateBoardRows'], 'Candidate replay context');
  const { types, catalog, targetMask, visibleMask, rowMasks,
    sequenceForSeed, hardDropMask, neighborMask, candidateBoardRows } = config;
  if (!Array.isArray(types) || base.canonicalJson(types) !== base.canonicalJson(base.TYPES)
    || !Array.isArray(catalog) || catalog.length < 20 || typeof targetMask !== 'bigint'
    || targetMask <= 0n || v1.countBits(targetMask) !== 80 || typeof visibleMask !== 'bigint'
    || visibleMask <= 0n || (targetMask & visibleMask) !== targetMask || !Array.isArray(rowMasks)
    || rowMasks.length < 1 || [sequenceForSeed, hardDropMask, neighborMask, candidateBoardRows]
      .some((value) => typeof value !== 'function')) {
    throw new Error('Candidate replay context is invalid.');
  }
  let rowUnion = 0n;
  for (const rowMask of rowMasks) {
    if (typeof rowMask !== 'bigint' || rowMask <= 0n || (rowMask & visibleMask) !== rowMask
      || (rowUnion & rowMask) !== 0n) throw new Error('Candidate replay rows are invalid.');
    rowUnion |= rowMask;
  }
  if (rowUnion !== visibleMask || catalog.some((descriptor) => !descriptor
    || !Number.isInteger(descriptor.typeIndex) || descriptor.typeIndex < 0 || descriptor.typeIndex > 6
    || !Number.isInteger(descriptor.rotation) || descriptor.rotation < 0 || descriptor.rotation > 3
    || !Number.isInteger(descriptor.x) || typeof descriptor.cellMask !== 'bigint'
    || descriptor.cellMask <= 0n || v1.countBits(descriptor.cellMask) !== 4)) {
    throw new Error('Candidate replay catalog or visible rows are invalid.');
  }
  const context = deepFreeze({
    types: [...types], catalog: [...catalog], targetMask, visibleMask, rowMasks: [...rowMasks],
    sequenceForSeed, hardDropMask, neighborMask, candidateBoardRows,
  });
  REPLAY_CONTEXTS.add(context);
  return context;
}

let productionReplayContext = null;
function getProductionReplayContext() {
  if (productionReplayContext) return productionReplayContext;
  productionReplayContext = createCandidateReplayContext({
    types: base.TYPES,
    catalog: base.buildReverseCatalog(base.rowsMask()).descriptors,
    targetMask: base.rowsMask(),
    visibleMask: (1n << 100n) - 1n,
    rowMasks: Array.from({ length: 10 }, (_, row) => 0x3ffn << BigInt(row * 10)),
    sequenceForSeed: (seed, count) => base.sequenceForSeed(seed, count),
    hardDropMask: (board, descriptor) => base.hardDropMask(board, descriptor),
    neighborMask: (mask) => base.neighborMask(mask, base.rowsMask()),
    candidateBoardRows: (descriptors) => base.candidateBoardRows(descriptors),
  });
  return productionReplayContext;
}

function replayCandidateWithContext(output, context) {
  if (!REPLAY_CONTEXTS.has(context)) throw new Error('Candidate replay context is not registered.');
  validateCandidateShape(output);
  const { candidate } = output;
  const { catalog } = context;
  const indices = candidate.forwardCatalogIndices;
  if (new Set(indices).size !== 20 || indices.some((index) => index >= catalog.length)) {
    throw new Error('V2 candidate catalog indices are invalid.');
  }
  const sorted = [...indices].sort((left, right) => left - right);
  const expectedPeel = indices.toReversed().map((index) => sorted.indexOf(index));
  if (base.canonicalJson(expectedPeel) !== base.canonicalJson(candidate.peelLocalIndices)) {
    throw new Error('V2 candidate peel order is invalid.');
  }
  const queue = context.sequenceForSeed(candidate.seed, 20);
  if (!Array.isArray(queue) || queue.length !== 20
    || queue.some((type) => !context.types.includes(type))) throw new Error('V2 candidate queue is invalid.');
  const counts = context.types.map((type) => queue.filter((entry) => entry === type).length);
  const profileIndex = counts.indexOf(2);
  if (profileIndex !== candidate.profileIndex || counts.filter((count) => count === 2).length !== 1
    || counts.some((count, index) => count !== (index === profileIndex ? 2 : 3))
    || base.canonicalJson(counts) !== base.canonicalJson(output.domain.profileCounts[profileIndex])) {
    throw new Error('V2 candidate queue profile is invalid.');
  }
  let board = 0n;
  const typedMasks = Array.from({ length: 7 }, () => 0n);
  const descriptors = [];
  for (const [position, index] of indices.entries()) {
    const descriptor = catalog[index];
    const placement = output.setup.placements[position];
    if ((descriptor.cellMask & context.visibleMask) !== descriptor.cellMask
      || queue[position] !== context.types[descriptor.typeIndex]
      || placement.type !== queue[position] || placement.rotation !== descriptor.rotation
      || placement.x !== descriptor.x || context.hardDropMask(board, descriptor) !== descriptor.cellMask
      || (board & descriptor.cellMask) !== 0n
      || (context.neighborMask(descriptor.cellMask) & typedMasks[descriptor.typeIndex]) !== 0n) {
      throw new Error('V2 candidate physical replay failed.');
    }
    board |= descriptor.cellMask;
    typedMasks[descriptor.typeIndex] |= descriptor.cellMask;
    for (const rowMask of context.rowMasks) {
      if ((board & rowMask) === rowMask) throw new Error('V2 candidate clears during setup.');
    }
    descriptors.push(descriptor);
  }
  if (board !== context.targetMask
    || base.canonicalJson(context.candidateBoardRows(descriptors)) !== base.canonicalJson(output.boardRows)) {
    throw new Error('V2 candidate board does not reconstruct the target.');
  }
  return output;
}

function validateCandidateReplay(output) {
  return replayCandidateWithContext(output, getProductionReplayContext());
}

const TOP_LEVEL_KEYS = [
  'algorithmVersion', 'boardRows', 'candidate', 'claim', 'coverReference', 'coverage', 'domain',
  'evidence', 'phase', 'schemaVersion', 'search', 'series', 'setup', 'shard', 'status',
  'targetMaskRows', 'targetRows',
];

function validateShardOutputData(output, candidateReplay) {
  if (typeof candidateReplay !== 'function') throw new Error('Candidate replay validator is invalid.');
  exactKeys(output, TOP_LEVEL_KEYS, 'V2 shard output');
  exactKeys(output.coverReference, ['coverBranchProbeCount', 'strongTilingCount', 'strongTilingHash'],
    'V2 cover reference');
  exactKeys(output.coverage, ['complete', 'workCount', 'coverBranchProbeCount', 'orderPieceProbeCount',
    'strongTilingCount', 'completedProfileCount'], 'V2 coverage');
  exactKeys(output.evidence, ['profileHash', 'profileMembershipHash', 'domainHash', 'traceHash',
    'strongTilingHash', 'failedMemoTraceHash', 'resultHash'], 'V2 evidence');
  exactKeys(output.search, ['workBudget', 'maxRssMiB', 'processedSeeds', 'catalogDescriptorCount',
    'reverseTrieNodeCount', 'orderStateCount', 'failedMemoCount'], 'V2 search');
  exactKeys(output.series, [...Object.keys(SERIES_BODY), 'seriesHash'], 'V2 series');
  exactKeys(output.shard, ['shardIndex', 'seedStart', 'seedCount', 'seedEndExclusive'], 'V2 shard');
  const range = validateDomain(output.domain);
  const allowed = new Set(['candidate:order', 'complete-not-found:cover', 'budget-exhausted:cover',
    'budget-exhausted:order', 'memory-guard:cover', 'memory-guard:order']);
  const integers = [output.coverage.workCount, output.coverage.coverBranchProbeCount,
    output.coverage.orderPieceProbeCount, output.coverage.strongTilingCount,
    output.coverage.completedProfileCount, output.search.processedSeeds,
    output.search.catalogDescriptorCount, output.search.reverseTrieNodeCount,
    output.search.orderStateCount, output.search.failedMemoCount];
  const evidence = { ...output.evidence };
  delete evidence.resultHash;
  const expectedHash = v1.canonicalHash('T37-TRESULT-v2', {
    status: output.status, phase: output.phase, series: output.series, shard: output.shard,
    domainHash: output.domain.domainHash, coverReference: output.coverReference,
    coverage: output.coverage, evidence, candidate: output.candidate, setup: output.setup,
    boardRows: output.boardRows, search: output.search,
  });
  if (output.schemaVersion !== SCHEMA_VERSION || output.algorithmVersion !== ALGORITHM_VERSION
    || output.claim !== CLAIM || base.canonicalJson(output.series) !== base.canonicalJson(SERIES)
    || base.canonicalJson(output.shard) !== base.canonicalJson(range)
    || base.canonicalJson(output.coverReference) !== base.canonicalJson(COVER_REFERENCE)
    || output.targetRows !== 10
    || base.canonicalJson(output.targetMaskRows) !== base.canonicalJson(base.TARGET_VISIBLE_ROWS)
    || !allowed.has(`${output.status}:${output.phase}`)
    || integers.some((value) => !Number.isSafeInteger(value) || value < 0)
    || output.coverage.workCount !== output.coverage.coverBranchProbeCount
      + output.coverage.orderPieceProbeCount
    || output.coverage.completedProfileCount > 7 || output.coverage.strongTilingCount > 373
    || output.coverage.coverBranchProbeCount > 345_149
    || output.search.workBudget !== WORK_BUDGET || output.search.maxRssMiB !== MAX_RSS_MIB
    || output.search.processedSeeds !== SHARD_SIZE || output.search.catalogDescriptorCount !== 662
    || output.search.reverseTrieNodeCount !== output.domain.reverseTrieNodeCount
    || output.evidence.profileHash !== output.domain.profileHash
    || output.evidence.profileMembershipHash !== output.domain.profileMembershipHash
    || output.evidence.domainHash !== output.domain.domainHash
    || ![output.evidence.traceHash, output.evidence.strongTilingHash,
      output.evidence.failedMemoTraceHash, output.evidence.resultHash].every((hash) => HASH_PATTERN.test(hash))
    || output.evidence.resultHash !== expectedHash
    || output.coverage.complete !== (output.status === 'complete-not-found')) {
    throw new Error('V2 shard output is invalid.');
  }
  if (output.status === 'complete-not-found') {
    if (output.coverage.coverBranchProbeCount !== COVER_REFERENCE.coverBranchProbeCount
      || output.coverage.strongTilingCount !== COVER_REFERENCE.strongTilingCount
      || output.coverage.completedProfileCount !== 7
      || output.evidence.strongTilingHash !== COVER_REFERENCE.strongTilingHash) {
      throw new Error('V2 natural completion does not match the cover reference.');
    }
  }
  if (output.status === 'candidate') candidateReplay(output);
  else if (output.candidate !== null || output.setup !== null || output.boardRows !== null) {
    throw new Error('V2 noncandidate output contains candidate artifacts.');
  }
  return output;
}

function validateShardOutput(output) {
  return validateShardOutputData(output, validateCandidateReplay);
}

function validateShardOutputForTest(output, candidateReplayContext) {
  if (!REPLAY_CONTEXTS.has(candidateReplayContext)) {
    throw new Error('Candidate replay context is not registered.');
  }
  return validateShardOutputData(output,
    (candidate) => replayCandidateWithContext(candidate, candidateReplayContext));
}

function formatShardOutputData(result, candidateReplay) {
  const domain = result?.domain;
  const shard = validateDomain(domain);
  const coverage = {
    complete: result.complete,
    workCount: result.workCount,
    coverBranchProbeCount: result.coverBranchProbeCount,
    orderPieceProbeCount: result.orderPieceProbeCount,
    strongTilingCount: result.strongTilingCount,
    completedProfileCount: result.completedProfileCount,
  };
  const evidence = {
    profileHash: domain.profileHash,
    profileMembershipHash: domain.profileMembershipHash,
    domainHash: domain.domainHash,
    traceHash: result.traceHash,
    strongTilingHash: result.strongTilingHash,
    failedMemoTraceHash: result.failedMemoTraceHash,
  };
  const search = {
    workBudget: WORK_BUDGET,
    maxRssMiB: MAX_RSS_MIB,
    processedSeeds: result.processedSeeds,
    catalogDescriptorCount: result.catalogDescriptorCount,
    reverseTrieNodeCount: result.reverseTrieNodeCount,
    orderStateCount: result.orderStateCount,
    failedMemoCount: result.failedMemoCount,
  };
  const preimage = {
    status: result.status, phase: result.phase, series: SERIES, shard,
    domainHash: domain.domainHash, coverReference: COVER_REFERENCE, coverage, evidence,
    candidate: result.candidate, setup: result.setup, boardRows: result.boardRows, search,
  };
  const output = {
    schemaVersion: SCHEMA_VERSION, algorithmVersion: ALGORITHM_VERSION, claim: CLAIM,
    status: result.status, phase: result.phase, series: SERIES, shard,
    domain, coverReference: COVER_REFERENCE, coverage,
    evidence: { ...evidence, resultHash: v1.canonicalHash('T37-TRESULT-v2', preimage) },
    targetRows: 10, targetMaskRows: base.TARGET_VISIBLE_ROWS,
    candidate: result.candidate, setup: result.setup, boardRows: result.boardRows, search,
  };
  validateShardOutputData(output, candidateReplay);
  return deepFreeze(output);
}

function formatShardOutputForTest(result, candidateReplayContext = null) {
  const replay = candidateReplayContext === null ? validateCandidateReplay
    : (output) => replayCandidateWithContext(output, candidateReplayContext);
  return formatShardOutputData(result, replay);
}

function formatTrustedShardOutput(result) {
  return formatShardOutputData(result, validateCandidateReplay);
}

function executeShardSearch(shardIndex) {
  const domain = buildShardDomain(shardIndex);
  const result = v1.executeTilingSearch({
    workBudget: WORK_BUDGET,
    maxRssBytes: MAX_RSS_MIB * 1024 * 1024,
    preparedDomain: domain,
  });
  if (result.domainHash !== domain.domainHash || result.processedSeeds !== SHARD_SIZE) {
    throw new Error('V1 returned a result for the wrong V2 domain.');
  }
  const output = formatTrustedShardOutput(result);
  TRUSTED_RESULTS.set(result, output);
  return result;
}

function parseCanonicalBytes(bytes, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error(`${label} is empty.`);
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error(`${label} is not valid UTF-8.`);
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(`${label} is not valid JSON.`); }
  if (`${base.canonicalJson(value)}\n` !== text) throw new Error(`${label} is not canonical UTF-8/LF JSON.`);
  return value;
}

function validateV1PredecessorBytes(bytes) {
  const fileSha256 = v1.sha256Hex(bytes);
  const output = parseCanonicalBytes(bytes, 'V1 predecessor');
  const evidence = {
    profileHash: output.evidence?.profileHash,
    domainHash: output.evidence?.domainHash,
    traceHash: output.evidence?.traceHash,
    strongTilingHash: output.evidence?.strongTilingHash,
    failedMemoTraceHash: output.evidence?.failedMemoTraceHash,
  };
  const recomputed = v1.tilingResultHash({
    status: output.status, phase: output.phase, domainHash: output.domain?.domainHash,
    coverage: output.coverage, evidence, setup: output.setup, boardRows: output.boardRows,
    search: output.search,
  });
  if (fileSha256 !== V1_FILE_HASH || output.schemaVersion !== 1
    || output.algorithmVersion !== 'tiling-first-v1' || output.status !== 'complete-not-found'
    || output.phase !== 'cover' || output.coverage?.complete !== true
    || output.domain?.fullSeedStart !== 1 || output.domain?.fullSeedCount !== 20_000
    || output.evidence?.resultHash !== V1_RESULT_HASH || recomputed !== V1_RESULT_HASH) {
    throw new Error('V1 predecessor identity is invalid.');
  }
  return deepFreeze({
    seedStart: 1, seedCount: 20_000, seedEndExclusive: 20_001,
    status: 'complete-not-found', fileSha256, resultHash: V1_RESULT_HASH,
  });
}

function validateShardBytesData(bytes, expectedFileSha256, expectedResultHash, validateOutput) {
  if (!HASH_PATTERN.test(expectedFileSha256) || !HASH_PATTERN.test(expectedResultHash)
    || v1.sha256Hex(bytes) !== expectedFileSha256) throw new Error('Shard file hash differs from QA expectation.');
  const output = validateOutput(parseCanonicalBytes(bytes, 'V2 shard output'));
  if (output.evidence.resultHash !== expectedResultHash) {
    throw new Error('Shard result hash differs from QA expectation.');
  }
  return { output, fileSha256: expectedFileSha256 };
}

function validateShardBytes(bytes, expectedFileSha256, expectedResultHash) {
  return validateShardBytesData(bytes, expectedFileSha256, expectedResultHash, validateShardOutput);
}

function validateShardBytesForTest(bytes, expectedFileSha256, expectedResultHash, candidateReplayContext) {
  if (!REPLAY_CONTEXTS.has(candidateReplayContext)) {
    throw new Error('Candidate replay context is not registered.');
  }
  return validateShardBytesData(bytes, expectedFileSha256, expectedResultHash,
    (output) => validateShardOutputForTest(output, candidateReplayContext));
}

const PRODUCTION_MANIFEST_DEPENDENCIES = Object.freeze({
  validatePredecessorBytes: validateV1PredecessorBytes,
  validateShardRecord: validateShardBytes,
});

function createManifestTestDependencies(candidateReplayContext,
  validatePredecessorBytes = validateV1PredecessorBytes) {
  if (!REPLAY_CONTEXTS.has(candidateReplayContext) || typeof validatePredecessorBytes !== 'function') {
    throw new Error('Manifest test dependencies are invalid.');
  }
  const dependencies = Object.freeze({
    validatePredecessorBytes,
    validateShardRecord: (bytes, fileHash, resultHash) =>
      validateShardBytesForTest(bytes, fileHash, resultHash, candidateReplayContext),
  });
  MANIFEST_TEST_DEPENDENCIES.add(dependencies);
  return dependencies;
}

function buildManifestData({ predecessorBytes, records }, dependencies = null) {
  if (!Array.isArray(records) || records.length < 1 || records.length > SHARD_COUNT) {
    throw new Error('Manifest needs one through nine shard records.');
  }
  const validators = dependencies ?? PRODUCTION_MANIFEST_DEPENDENCIES;
  if (dependencies !== null && !MANIFEST_TEST_DEPENDENCIES.has(dependencies)) {
    throw new Error('Manifest validators are not registered test dependencies.');
  }
  const predecessor = validators.validatePredecessorBytes(predecessorBytes);
  exactKeys(predecessor, ['seedStart', 'seedCount', 'seedEndExclusive', 'status',
    'fileSha256', 'resultHash'], 'Manifest predecessor');
  if (![predecessor.seedStart, predecessor.seedCount, predecessor.seedEndExclusive]
    .every((value) => Number.isSafeInteger(value) && value >= 0)
    || predecessor.status !== 'complete-not-found' || !HASH_PATTERN.test(predecessor.fileSha256)
    || !HASH_PATTERN.test(predecessor.resultHash)) throw new Error('Manifest predecessor is invalid.');
  const entries = [];
  const seenHashes = new Set();
  let candidateSeen = false;
  for (const [position, record] of records.entries()) {
    exactKeys(record, ['bytes', 'expectedFileSha256', 'expectedResultHash'], 'Manifest data record');
    const { output, fileSha256 } = validators.validateShardRecord(
      record.bytes, record.expectedFileSha256, record.expectedResultHash,
    );
    const hashIdentity = `${fileSha256}:${output.evidence.resultHash}`;
    if (output.shard.shardIndex !== position || candidateSeen || seenHashes.has(hashIdentity)
      || !['complete-not-found', 'candidate'].includes(output.status)
      || (output.status === 'complete-not-found' && output.coverage.complete !== true)
      || (output.status === 'candidate' && position !== records.length - 1)) {
      throw new Error('Manifest shard prefix is invalid.');
    }
    candidateSeen = output.status === 'candidate';
    seenHashes.add(hashIdentity);
    entries.push({ ...output.shard, status: output.status, fileSha256,
      resultHash: output.evidence.resultHash });
  }
  const status = candidateSeen ? 'candidate'
    : entries.length === SHARD_COUNT ? 'complete-not-found' : 'prefix-complete';
  const body = {
    schemaVersion: SCHEMA_VERSION, algorithmVersion: ALGORITHM_VERSION,
    manifestVersion: MANIFEST_VERSION, series: SERIES, predecessor, entries, status,
  };
  return deepFreeze({ ...body, manifestHash: v1.canonicalHash('T37-TSERIES-v2', body) });
}

function insideRepository(path) {
  const rel = relative(REPOSITORY_ROOT, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function externalPath(raw, { mustExist = false, mustBeAbsent = false } = {}) {
  if (typeof raw !== 'string' || !isAbsolute(raw)) throw new Error('Path must be absolute.');
  const target = resolve(raw);
  const exists = v1.pathEntryExists(target);
  if ((mustExist && !exists) || (mustBeAbsent && exists)) throw new Error('Path existence contract failed.');
  let anchor = exists ? target : dirname(target);
  while (!v1.pathEntryExists(anchor)) {
    const parent = dirname(anchor);
    if (parent === anchor) throw new Error('Path has no existing ancestor.');
    anchor = parent;
  }
  const realTarget = exists ? realpathSync(target)
    : resolve(realpathSync(anchor), relative(anchor, target));
  if (insideRepository(realTarget)) throw new Error('Path must be outside the repository.');
  return target;
}

function buildManifestFromFiles(v1Path, inputListPath) {
  const predecessorPath = externalPath(v1Path, { mustExist: true });
  const list = parseCanonicalBytes(readFileSync(resolve(inputListPath)), 'Manifest input list');
  exactKeys(list, ['records'], 'Manifest input list');
  if (!Array.isArray(list.records) || list.records.length < 1 || list.records.length > SHARD_COUNT) {
    throw new Error('Manifest input list has an invalid record count.');
  }
  const seen = new Set();
  const records = list.records.map((record) => {
    exactKeys(record, ['path', 'expectedFileSha256', 'expectedResultHash'], 'Manifest input record');
    const path = externalPath(record.path, { mustExist: true });
    const identity = realpathSync(path).toLowerCase();
    if (seen.has(identity)) throw new Error('Manifest input paths must be distinct.');
    seen.add(identity);
    return { bytes: readFileSync(path), expectedFileSha256: record.expectedFileSha256,
      expectedResultHash: record.expectedResultHash };
  });
  return buildManifestData({ predecessorBytes: readFileSync(predecessorPath), records });
}

function parseArguments(argv) {
  if (!Array.isArray(argv) || argv.length % 2 !== 0) throw new Error('Expected explicit --name value pairs.');
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!name?.startsWith('--') || argv[index + 1] === undefined || values.has(name)) {
      throw new Error('CLI options must be unique explicit pairs.');
    }
    values.set(name, argv[index + 1]);
  }
  if (values.get('--algorithm') !== ALGORITHM_VERSION) throw new Error('Unsupported V2 algorithm.');
  const mode = values.get('--mode');
  const required = mode === 'shard'
    ? ['--algorithm', '--mode', '--shard-index', '--work-budget', '--max-rss-mib', '--output']
    : mode === 'manifest'
      ? ['--algorithm', '--mode', '--v1-output', '--input-list', '--output'] : [];
  if (required.length === 0 || [...values.keys()].sort().join('\0') !== required.sort().join('\0')) {
    throw new Error('CLI mode has an invalid option set.');
  }
  const outputPath = externalPath(values.get('--output'), { mustBeAbsent: true });
  if (mode === 'shard') {
    if (!/^[0-8]$/.test(values.get('--shard-index') ?? '')
      || values.get('--work-budget') !== String(WORK_BUDGET)
      || values.get('--max-rss-mib') !== String(MAX_RSS_MIB)) {
      throw new Error('Shard mode requires canonical fixed production values.');
    }
    return { mode, shardIndex: Number(values.get('--shard-index')), outputPath };
  }
  const inputList = values.get('--input-list');
  if (!inputList || !v1.pathEntryExists(resolve(inputList))) throw new Error('Manifest input list is missing.');
  return { mode, v1Path: externalPath(values.get('--v1-output'), { mustExist: true }),
    inputListPath: resolve(inputList), outputPath };
}

function canonicalBytes(value) {
  return Buffer.from(`${base.canonicalJson(value)}\n`, 'utf8');
}

function publishShard(result, outputPath, capability) {
  const output = TRUSTED_RESULTS.get(result);
  if (capability !== PUBLISH_CAPABILITY || !output) throw new Error('Shard publication is not authorized.');
  v1.writeAtomicAbsent(outputPath, canonicalBytes(output));
  return output;
}

function publishManifest(manifest, outputPath, capability) {
  if (capability !== PUBLISH_CAPABILITY) throw new Error('Manifest publication is not authorized.');
  v1.writeAtomicAbsent(outputPath, canonicalBytes(manifest));
}

function runCli(argv) {
  const options = parseArguments(argv);
  if (options.mode === 'shard') {
    const result = executeShardSearch(options.shardIndex);
    const output = publishShard(result, options.outputPath, PUBLISH_CAPABILITY);
    process.stdout.write(`${base.canonicalJson({ status: output.status, phase: output.phase,
      shardIndex: output.shard.shardIndex, workCount: output.coverage.workCount,
      resultHash: output.evidence.resultHash })}\n`);
    return output.status === 'candidate' ? 0 : 2;
  }
  const manifest = buildManifestFromFiles(options.v1Path, options.inputListPath);
  publishManifest(manifest, options.outputPath, PUBLISH_CAPABILITY);
  process.stdout.write(`${base.canonicalJson({ status: manifest.status,
    entryCount: manifest.entries.length, manifestHash: manifest.manifestHash })}\n`);
  return manifest.status === 'candidate' ? 0 : 2;
}

export const __tilingV2Test = Object.freeze({
  ALGORITHM_VERSION, SCHEMA_VERSION, SERIES_VERSION, MANIFEST_VERSION, CLAIM,
  SHARD_COUNT, SHARD_SIZE, SERIES_SEED_START, SERIES_SEED_COUNT, WORK_BUDGET, MAX_RSS_MIB,
  PROFILE_HASH, TARGET_MASK, CATALOG_HASH, SHAPE_TABLE_HASH, FULL_STRONG_TILING_HASH,
  V1_FILE_HASH, V1_RESULT_HASH, SERIES_BODY, SERIES_HASH, SERIES, COVER_REFERENCE,
  exactKeys, deepFreeze, shardRange, profileMembership, buildShardDomain, validateDomain,
  validateCandidateShape, createCandidateReplayContext, replayCandidateWithContext,
  validateCandidateReplay, validateShardOutput, validateShardOutputForTest, formatShardOutputForTest,
  parseCanonicalBytes, validateV1PredecessorBytes, validateShardBytes, validateShardBytesForTest,
  createManifestTestDependencies, buildManifestData, externalPath, buildManifestFromFiles,
  parseArguments, canonicalBytes,
});

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try { process.exitCode = runCli(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
