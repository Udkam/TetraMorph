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
const TRUSTED_RESULTS = new WeakMap();

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
    || profileBuild.profileHash !== PROFILE_HASH
    || base.SETUP_RULES_VERSION !== 'visible-spawn19-vertical-hard-drop-no-clear-no-hidden-no-same-type-touch-v1') {
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
  if (candidate.forwardCatalogIndices.some((index) => !Number.isSafeInteger(index) || index < 0)
    || candidate.peelLocalIndices.some((index) => !Number.isSafeInteger(index) || index < 0)
    || !Array.isArray(output.boardRows) || output.boardRows.length !== 20) {
    throw new Error('V2 candidate arrays are invalid.');
  }
  const queue = base.sequenceForSeed(candidate.seed, 20);
  const counts = v1.typeCounts(queue);
  const profileIndex = counts.indexOf(2);
  if (profileIndex !== candidate.profileIndex || profileIndex !== output.coverage.completedProfileCount
    || candidate.tilingOrdinal + 1 !== output.coverage.strongTilingCount
    || base.canonicalJson(counts) !== base.canonicalJson(output.domain.profileCounts[profileIndex])) {
    throw new Error('V2 candidate profile or prefix is invalid.');
  }
  for (const placement of output.setup.placements) {
    exactKeys(placement, ['type', 'rotation', 'x'], 'V2 setup placement');
    if (!base.TYPES.includes(placement.type) || !Number.isInteger(placement.rotation)
      || placement.rotation < 0 || placement.rotation > 3 || !Number.isInteger(placement.x)) {
      throw new Error('V2 setup placement is invalid.');
    }
  }
}

const TOP_LEVEL_KEYS = [
  'algorithmVersion', 'boardRows', 'candidate', 'claim', 'coverReference', 'coverage', 'domain',
  'evidence', 'phase', 'schemaVersion', 'search', 'series', 'setup', 'shard', 'status',
  'targetMaskRows', 'targetRows',
];

function validateShardOutput(output) {
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
  const integers = [...Object.values(output.coverage).slice(1), output.search.processedSeeds,
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
      || output.evidence.strongTilingHash !== COVER_REFERENCE.strongTilingHash) {
      throw new Error('V2 natural completion does not match the cover reference.');
    }
  }
  if (output.status === 'candidate') validateCandidateShape(output);
  else if (output.candidate !== null || output.setup !== null || output.boardRows !== null) {
    throw new Error('V2 noncandidate output contains candidate artifacts.');
  }
  return output;
}

function formatShardOutputForTest(result) {
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
  validateShardOutput(output);
  return deepFreeze(output);
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
  const output = formatShardOutputForTest(result);
  TRUSTED_RESULTS.set(result, output);
  return result;
}

export const __tilingV2Test = Object.freeze({
  ALGORITHM_VERSION, SCHEMA_VERSION, SERIES_VERSION, MANIFEST_VERSION, CLAIM,
  SHARD_COUNT, SHARD_SIZE, SERIES_SEED_START, SERIES_SEED_COUNT, WORK_BUDGET, MAX_RSS_MIB,
  PROFILE_HASH, TARGET_MASK, CATALOG_HASH, SHAPE_TABLE_HASH, FULL_STRONG_TILING_HASH,
  V1_FILE_HASH, V1_RESULT_HASH, SERIES_BODY, SERIES_HASH, SERIES, COVER_REFERENCE,
  exactKeys, deepFreeze, shardRange, profileMembership, buildShardDomain, validateDomain,
  validateCandidateShape, validateShardOutput, formatShardOutputForTest, v1,
});
