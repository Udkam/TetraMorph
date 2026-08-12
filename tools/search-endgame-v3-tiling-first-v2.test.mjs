import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as v2Module from './search-endgame-v3-tiling-first-v2.mjs';
import { __tilingTest as v1 } from './search-endgame-v3-tiling-first.mjs';
const { __tilingV2Test: v2 } = v2Module;
const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const ZERO_HASH = '0'.repeat(64);
const V2_SOURCE_HASH = '16039546E0BEBF62CA6644DB4518A92CE8D7A9AF8693BC8EF3461FD033C1F5DC';
const V1_SOURCE_HASH = 'DC5DD8018BC703A3C1375B548BC5CF359E37C0CB0BC8CE8B9830F280D741781B';
const V1_TEST_HASH = 'CA146F7045486ACE2479EE74D30B2B603B908C91BE61BD5534C609C04C3A19CA';
const SERIES_HASH = 'E3A52F0439273FBCC09463C0B448EE66D3C087BB8A1BC18C552A1BFFE53EB58D';
const PROFILE_COUNTS = [
  [2851, 2861, 2833, 2895, 2779, 2886, 2895],
  [2859, 2777, 2954, 2862, 2860, 2837, 2851],
  [2786, 2809, 2889, 2912, 2895, 2871, 2838],
  [2901, 2833, 2861, 2903, 2801, 2892, 2809],
  [2931, 2792, 2894, 2856, 2879, 2808, 2840],
  [2861, 2878, 2857, 2826, 2880, 2826, 2872],
  [2779, 2869, 2905, 2880, 2847, 2867, 2853],
  [2874, 2939, 2838, 2849, 2902, 2808, 2790],
  [2850, 2894, 2908, 2840, 2830, 2833, 2845],
];
const MEMBERSHIP_HASHES = [
  '1BC789CBA075E3A92361C2EEDD61E9EE4D2AFA4DFB25A1536CB0629F239CB9C5',
  '6F029F3F789C0D8B1951168128A528E4179C13E3F03A0BDCC57E6B5FAC43706D',
  'E432ACE904AAB6FF82CCF97550ECF802D4DCA20E7D043112F782275782D1EBA5',
  '8585328A159936FA1184211EEE1AB698873DE12B9C5ED18937AF9D6B985468FE',
  'AF581E530FAA3BE02B77CFC6F38E4788B6161C3838F827C8A462D32B933B36F6',
  '20DCB3256B00377215A91A406BD2EA8CF9B2D684A7F6C0CFAE0A068E8AAC2B82',
  '878913B31DAACCB23220A21C3EB73531D23F132536A604ADBACDC81AA6F1C40D',
  '069672F649388E64C417458F4C581BEC7F875C1E2A755DC7F86CB889D5EFA09F',
  '4E55A1862A80B9541BF57DAE4B7CEC73B68E4E7B3FB3C4E7C3046215351025AA',
];
const V1_BYTES = Buffer.from('eyJhbGdvcml0aG1WZXJzaW9uIjoidGlsaW5nLWZpcnN0LXYxIiwiYm9hcmRSb3dzIjpudWxsLCJjbGFpbSI6IkYzQyB0aWxpbmctZmlyc3Qgc2V0dXAgY2FuZGlkYXRlIG9ubHk7IGN1cnJlbnQgQ29yZSByZXBsYXkgYW5kIGV4YWN0IHByb29mIHJlbWFpbiBtYW5kYXRvcnkuIiwiY292ZXJhZ2UiOnsiY29tcGxldGUiOnRydWUsImNvbXBsZXRlZFByb2ZpbGVDb3VudCI6NywiY292ZXJCcmFuY2hQcm9iZUNvdW50IjozNDUxNDksIm9yZGVyUGllY2VQcm9iZUNvdW50IjoxMDY1MDMwLCJzdHJvbmdUaWxpbmdDb3VudCI6MzczLCJ3b3JrQ291bnQiOjE0MTAxNzl9LCJkb21haW4iOnsiYWxnb3JpdGhtVmVyc2lvbiI6InRpbGluZy1maXJzdC12MSIsImNhbmRpZGF0ZU9yZGVyVmVyc2lvbiI6InR5cGUtaW5kZXgvcm90YXRpb24tMC4uMy94LWFzY2VuZGluZy9hYnNvbHV0ZS15LWFzY2VuZGluZy9sYW5kaW5nLWNlbGwtZGVkdXBlL3JlYWwtdHJpZS1jaGlsZC12MSIsImNhdGFsb2dEZXNjcmlwdG9yQ291bnQiOjY2MiwiY2F0YWxvZ0hhc2giOiI2QTQ3MzlEOTgwQkFBNUFDN0Q2REFBNjMxQTg4NzQyNDIxNjMwRjY3NjI1ODM3MzgwMThERTM1NDFFOUE2QjM5IiwiY292ZXJUcmF2ZXJzYWxWZXJzaW9uIjoibXJ2LWNlbGwvY2F0YWxvZy1pbmRleC12MSIsImRvbWFpbkhhc2giOiI1MUJDNURGNTcwRkUxMzU2RDFCRTM0NTg0QjJCMDYzMjJBQTcyRkZCOTg4RTZDMUIzN0FCRkU5MkQ0OUMwRDM0IiwiZnVsbFF1ZXVlSGFzaCI6IjlGQUUxRDAzMjg0Rjk5Q0YzNTZGRDQ4MzIwQjU1Q0Q3OEQzMENCQUYxMzQwQUY0MzcxQjgxODJDNzk1RUVCNjciLCJmdWxsU2VlZENvdW50IjoyMDAwMCwiZnVsbFNlZWRTdGFydCI6MSwib3JkZXJUcmF2ZXJzYWxWZXJzaW9uIjoicmVtYWluaW5nLXNldC90cmllLW5vZGUvY2F0YWxvZy1pbmRleC12MSIsInByb2ZpbGVDb3VudHMiOltbMiwzLDMsMywzLDMsM10sWzMsMiwzLDMsMywzLDNdLFszLDMsMiwzLDMsMywzXSxbMywzLDMsMiwzLDMsM10sWzMsMywzLDMsMiwzLDNdLFszLDMsMywzLDMsMiwzXSxbMywzLDMsMywzLDMsMl1dLCJwcm9maWxlSGFzaCI6IjExNUIxOUQ0QTRCNjM5NEUzMDMyNzI5MjIyREMxNkI2MTEzMTNCOUM4OEM2QjYxRTgxQjNEMjUyMEZFOThBRDQiLCJxdWV1ZUdlbmVyYXRvclZlcnNpb24iOiJ4b3JzaGlmdDMyLWZpc2hlci15YXRlcy1zZXZlbi1iYWctdjEiLCJyZXZlcnNlVHJpZUhhc2giOiI0Qzc4QkUxQTIzNTNCNjdBMjBGOEM3N0M1NUUzREM0MzNCMEMzMDREOTYwQjE2REE2MjIzQ0UzREFDNzY5OTgxIiwicmV2ZXJzZVRyaWVOb2RlQ291bnQiOjI4MjYxNSwic2VxdWVuY2VMZW5ndGgiOjIwLCJzZXR1cFJ1bGVzVmVyc2lvbiI6InZpc2libGUtc3Bhd24xOS12ZXJ0aWNhbC1oYXJkLWRyb3Atbm8tY2xlYXItbm8taGlkZGVuLW5vLXNhbWUtdHlwZS10b3VjaC12MSIsInNoYXBlVGFibGVIYXNoIjoiODY4RkIwNTI0NjlEMDBERUQwMEE5NjcxNzdCNThBMzRGNzI2N0VFNDhFNkYzQkE2OEFGMEM4NTJDRkYyQzJERSIsInNvdXJjZUFsZ29yaXRobVZlcnNpb24iOiJzZWVkZWQtcmV2ZXJzZS12MSIsInRhcmdldE1hc2siOiJERkY3RkNGRkZCRkUzREZFM0ZGQ0ZGMzg3IiwidGFyZ2V0Um93cyI6MTAsInR5cGVPcmRlclZlcnNpb24iOiJJLE8sVCxTLFosSixMLXYxIn0sImV2aWRlbmNlIjp7ImRvbWFpbkhhc2giOiI1MUJDNURGNTcwRkUxMzU2RDFCRTM0NTg0QjJCMDYzMjJBQTcyRkZCOTg4RTZDMUIzN0FCRkU5MkQ0OUMwRDM0IiwiZmFpbGVkTWVtb1RyYWNlSGFzaCI6IjU5MjNCNzhFRjZGRkRGRkRCN0MyREFENkVCRDMwRTMzMjkyQzRGNTRGNUIxRTY5MDE4MjgzMEJDRjIzNTk4NzciLCJwcm9maWxlSGFzaCI6IjExNUIxOUQ0QTRCNjM5NEUzMDMyNzI5MjIyREMxNkI2MTEzMTNCOUM4OEM2QjYxRTgxQjNEMjUyMEZFOThBRDQiLCJyZXN1bHRIYXNoIjoiQzFFMzE1RTY2QjgxOTU5MzI3OUU0ODVEQzI0QUMyRkU0RTlDQzdCNzU0MzcyNDc0ODIyMkE0NUI0MkZCRjc1OCIsInN0cm9uZ1RpbGluZ0hhc2giOiI4QjIzMzg3MUE5NUIwQTE0OTE1RDcyN0VDMjY3NTFGOTBGRjlFNUMxMzhFNjU4RUVFMkUwM0Y3QjkxODE0QjY0IiwidHJhY2VIYXNoIjoiQUM3QzlCOEM0OTczRTk5MTA4MjlGNUFDNDQ0OUNENDk1NUQyQkFGOTE2QTAxQUFFQTk2NDQyRDBBRjZGRDdBQSJ9LCJwaGFzZSI6ImNvdmVyIiwic2NoZW1hVmVyc2lvbiI6MSwic2VhcmNoIjp7ImNhdGFsb2dEZXNjcmlwdG9yQ291bnQiOjY2MiwiZmFpbGVkTWVtb0NvdW50Ijo3NDIxOSwibWF4UnNzTWlCIjo5MDAsIm9yZGVyU3RhdGVDb3VudCI6NzUzMTUsInByb2Nlc3NlZFNlZWRzIjoyMDAwMCwicmV2ZXJzZVRyaWVOb2RlQ291bnQiOjI4MjYxNSwid29ya0J1ZGdldCI6MTAwMDAwMDB9LCJzZXR1cCI6bnVsbCwic3RhdHVzIjoiY29tcGxldGUtbm90LWZvdW5kIiwidGFyZ2V0TWFza1Jvd3MiOlsiLi4uLi4uLi4uLiIsIi4uLi4uLi4uLi4iLCIuLi4uLi4uLi4uIiwiLi4uLi4uLi4uLiIsIi4uLi4uLi4uLi4iLCIuLi4uLi4uLi4uIiwiLi4uLi4uLi4uLiIsIi4uLi4uLi4uLi4iLCIuLi4uLi4uLi4uIiwiLi4uLi4uLi4uLiIsIiMjIy4uLi4jIyMiLCIuLiMjIyMjIyMjIiwiLi4jIyMjIyMjIyIsIiMjIyMuLi4jIyMiLCIjIyMjIy4jIyMjIiwiLi4uIyMjIyMjIyIsIiMjLiMjIyMjIyMiLCIjIyMjIyMuLiMjIiwiIyMjIyMjIy4jIyIsIiMjIyMjIyMuIyMiXSwidGFyZ2V0Um93cyI6MTB9Cg==', 'base64');
let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const deepEqual = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const throws = (fn, expected, message) => { checks += 1; assert.throws(fn, expected, message); };
const clone = (value) => JSON.parse(JSON.stringify(value));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const textHash = (text) => sha(Buffer.from(text, 'utf8'));
const independentHash = (label, value) => createHash('sha256').update(label, 'utf8')
  .update(Buffer.from([0])).update(v1.base.canonicalJson(value), 'utf8').digest('hex').toUpperCase();
function nextSeed(seed) {
  let value = seed >>> 0;
  if (value === 0) value = 0x6d2b79f5;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}
function oracleSequence(seed) {
  let randomizerSeed = seed >>> 0 || 0x6d2b79f5;
  let bag = [];
  const sequence = [];
  while (sequence.length < 20) {
    if (bag.length === 0) {
      bag = [...TYPES];
      for (let index = 6; index > 0; index -= 1) {
        randomizerSeed = nextSeed(randomizerSeed);
        const swapIndex = randomizerSeed % (index + 1);
        [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
      }
    }
    sequence.push(bag.shift());
  }
  return sequence;
}
function oracleProfiles(range) {
  const profiles = Array.from({ length: 7 }, (_, countTwoTypeIndex) => ({
    countTwoTypeIndex,
    counts: Array.from({ length: 7 }, (_, type) => type === countTwoTypeIndex ? 2 : 3),
    seeds: [],
  }));
  for (let seed = range.seedStart; seed < range.seedEndExclusive; seed += 1) {
    const counts = Array(7).fill(0);
    for (const type of oracleSequence(seed)) counts[TYPES.indexOf(type)] += 1;
    profiles[counts.indexOf(2)].seeds.push(seed);
  }
  return profiles;
}
function makeDomain(shardIndex) {
  const range = v2.shardRange(shardIndex);
  const body = {
    algorithmVersion: v2.ALGORITHM_VERSION,
    coverTraversalVersion: v1.COVER_TRAVERSAL_VERSION,
    orderTraversalVersion: v1.ORDER_TRAVERSAL_VERSION,
    sourceAlgorithmVersion: v1.base.REVERSE_ALGORITHM_VERSION,
    setupRulesVersion: v1.base.SETUP_RULES_VERSION,
    typeOrderVersion: v1.base.REVERSE_TYPE_ORDER_VERSION,
    queueGeneratorVersion: v1.base.QUEUE_GENERATOR_VERSION,
    candidateOrderVersion: v1.base.REVERSE_CANDIDATE_ORDER_VERSION,
    seriesVersion: v2.SERIES_VERSION,
    seriesHash: v2.SERIES_HASH,
    ...range,
    sequenceLength: 20,
    targetRows: 10,
    targetMask: v2.TARGET_MASK,
    catalogDescriptorCount: 662,
    catalogHash: v2.CATALOG_HASH,
    shapeTableHash: v2.SHAPE_TABLE_HASH,
    fullQueueHash: textHash('queue-' + shardIndex),
    reverseTrieHash: textHash('trie-' + shardIndex),
    reverseTrieNodeCount: 280_000 + shardIndex,
    profileHash: v2.PROFILE_HASH,
    profileCounts: Array.from({ length: 7 }, (_, two) =>
      Array.from({ length: 7 }, (_, type) => type === two ? 2 : 3)),
    profileSeedCounts: PROFILE_COUNTS[shardIndex],
    profileMembershipHash: MEMBERSHIP_HASHES[shardIndex],
  };
  return { ...body, domainHash: v1.canonicalHash('T37-TDOMAIN-v2', body) };
}
function makeResult(domain, overrides = {}) {
  return {
    domain,
    status: 'complete-not-found',
    phase: 'cover',
    complete: true,
    workCount: 345_149,
    coverBranchProbeCount: 345_149,
    orderPieceProbeCount: 0,
    strongTilingCount: 373,
    completedProfileCount: 7,
    traceHash: textHash('trace-' + domain.shardIndex),
    strongTilingHash: v2.FULL_STRONG_TILING_HASH,
    failedMemoTraceHash: textHash('memo-' + domain.shardIndex),
    processedSeeds: 20_000,
    catalogDescriptorCount: 662,
    reverseTrieNodeCount: domain.reverseTrieNodeCount,
    orderStateCount: 0,
    failedMemoCount: 0,
    candidate: null,
    setup: null,
    boardRows: null,
    ...overrides,
  };
}
function createToy(shardIndex) {
  const domain = makeDomain(shardIndex);
  const seed = domain.seedStart;
  const queue = oracleSequence(seed);
  const targetMask = v1.base.rowsMask();
  const visibleMask = (1n << 100n) - 1n;
  const bits = Array.from({ length: 100 }, (_, bit) => bit)
    .filter((bit) => targetMask & (1n << BigInt(bit)));
  const catalog = Array.from({ length: 20 }, (_, index) => ({
    typeIndex: TYPES.indexOf(queue[index]),
    rotation: index % 4,
    x: index - 5,
    cellMask: bits.slice(index * 4, index * 4 + 4)
      .reduce((mask, bit) => mask | (1n << BigInt(bit)), 0n),
  }));
  const boardRows = Array.from({ length: 20 }, (_, index) => 'toy-' + shardIndex + '-' + index);
  const rowMasks = Array.from({ length: 10 }, (_, row) => 0x3ffn << BigInt(row * 10));
  const context = createToyContext({ queue, catalog, targetMask, visibleMask, rowMasks, boardRows });
  const counts = TYPES.map((type) => queue.filter((entry) => entry === type).length);
  const candidate = {
    profileIndex: counts.indexOf(2),
    tilingOrdinal: 0,
    seed,
    forwardCatalogIndices: Array.from({ length: 20 }, (_, index) => index),
    peelLocalIndices: Array.from({ length: 20 }, (_, index) => 19 - index),
  };
  const setup = {
    seed,
    placements: catalog.map((descriptor, index) => ({
      type: queue[index], rotation: descriptor.rotation, x: descriptor.x,
    })),
  };
  const result = makeResult(domain, {
    status: 'candidate',
    phase: 'order',
    complete: false,
    workCount: 40,
    coverBranchProbeCount: 20,
    orderPieceProbeCount: 20,
    strongTilingCount: 1,
    completedProfileCount: candidate.profileIndex,
    strongTilingHash: textHash('prefix-' + shardIndex),
    orderStateCount: 20,
    candidate,
    setup,
    boardRows,
  });
  return { domain, seed, queue, targetMask, visibleMask, rowMasks, catalog, boardRows, context, result };
}
function createToyContext({ queue, catalog, targetMask, visibleMask, rowMasks, boardRows,
  hardDropMask = (_board, descriptor) => descriptor.cellMask,
  neighborMask = () => 0n }) {
  return v2.createCandidateReplayContext({
    types: TYPES,
    catalog: catalog.map((descriptor) => ({ ...descriptor })),
    targetMask,
    visibleMask,
    rowMasks: [...rowMasks],
    sequenceForSeed: () => [...queue],
    hardDropMask,
    neighborMask,
    candidateBoardRows: () => [...boardRows],
  });
}
function rehashOutput(value) {
  const output = clone(value);
  const evidence = { ...output.evidence };
  delete evidence.resultHash;
  output.evidence.resultHash = v1.canonicalHash('T37-TRESULT-v2', {
    status: output.status,
    phase: output.phase,
    series: output.series,
    shard: output.shard,
    domainHash: output.domain.domainHash,
    coverReference: output.coverReference,
    coverage: output.coverage,
    evidence,
    candidate: output.candidate,
    setup: output.setup,
    boardRows: output.boardRows,
    search: output.search,
  });
  return output;
}
function record(output, bytes = v2.canonicalBytes(output)) {
  return {
    bytes,
    expectedFileSha256: sha(bytes),
    expectedResultHash: output.evidence.resultHash,
  };
}

const v2SourcePath = fileURLToPath(new URL('./search-endgame-v3-tiling-first-v2.mjs', import.meta.url));
const v1SourcePath = fileURLToPath(new URL('./search-endgame-v3-tiling-first.mjs', import.meta.url));
const v1TestPath = fileURLToPath(new URL('./search-endgame-v3-tiling-first.test.mjs', import.meta.url));
equal(sha(readFileSync(v2SourcePath)), V2_SOURCE_HASH, 'accepted V2 source bytes drifted');
equal(sha(readFileSync(v1SourcePath)), V1_SOURCE_HASH, 'accepted V1 source bytes drifted');
equal(sha(readFileSync(v1TestPath)), V1_TEST_HASH, 'accepted V1 standalone bytes drifted');
deepEqual(Object.keys(v2Module), ['__tilingV2Test']);
ok(Object.isFrozen(v2));
equal(Object.keys(v2).join(','), 'ALGORITHM_VERSION,SCHEMA_VERSION,SERIES_VERSION,MANIFEST_VERSION,CLAIM,SHARD_COUNT,SHARD_SIZE,SERIES_SEED_START,SERIES_SEED_COUNT,WORK_BUDGET,MAX_RSS_MIB,PROFILE_HASH,TARGET_MASK,CATALOG_HASH,SHAPE_TABLE_HASH,FULL_STRONG_TILING_HASH,V1_FILE_HASH,V1_RESULT_HASH,SERIES_BODY,SERIES_HASH,SERIES,COVER_REFERENCE,exactKeys,deepFreeze,shardRange,profileMembership,buildShardDomain,validateDomain,validateCandidateShape,createCandidateReplayContext,replayCandidateWithContext,validateCandidateReplay,validateShardOutput,validateShardOutputForTest,formatShardOutputForTest,parseCanonicalBytes,validateV1PredecessorBytes,validateShardBytes,validateShardBytesForTest,createManifestTestDependencies,buildManifestData,externalPath,buildManifestFromFiles,parseArguments,canonicalBytes');
for (const forbidden of ['v1', 'publishShard', 'publishManifest', 'runCli', 'executeShardSearch',
  'formatTrustedShardOutput', 'writeAtomicAbsent', 'base', 'PUBLISH_CAPABILITY', 'TRUSTED_RESULTS',
  'REPLAY_CONTEXTS', 'MANIFEST_TEST_DEPENDENCIES']) {
  equal(Object.hasOwn(v2, forbidden), false, forbidden + ' must remain private');
}
const v1Run = spawnSync(process.execPath, [v1TestPath], { encoding: 'utf8', timeout: 30_000 });
equal(v1Run.status, 0, v1Run.stderr);
ok(v1Run.stdout.includes('all standalone checks pass'));
equal(v2.ALGORITHM_VERSION, 'tiling-first-sharded-v2');
equal(v2.SCHEMA_VERSION, 2);
equal(v2.SERIES_VERSION, 'seed-series-20001-200000-20000-v1');
equal(v2.MANIFEST_VERSION, 'tiling-first-sharded-v2-manifest-v1');
equal(v2.SERIES_HASH, SERIES_HASH);
equal(independentHash('T37-TSERIES-ID-v2', v2.SERIES_BODY), SERIES_HASH);
deepEqual(v2.SERIES.ranges, Array.from({ length: 9 }, (_, shardIndex) => ({
  shardIndex,
  seedStart: 20_001 + shardIndex * 20_000,
  seedCount: 20_000,
  seedEndExclusive: 40_001 + shardIndex * 20_000,
})));
ok(Object.isFrozen(v2.SERIES.ranges[0]));
for (const invalid of [-1, 9, 0.5, '0', Number.MAX_SAFE_INTEGER]) {
  throws(() => v2.shardRange(invalid), /integer from 0 through 8/);
}
const oracleByShard = [];
for (let shardIndex = 0; shardIndex < 9; shardIndex += 1) {
  const range = v2.shardRange(shardIndex);
  const profiles = oracleProfiles(range);
  const membership = v2.profileMembership(profiles, range);
  oracleByShard.push(profiles);
  deepEqual(membership.profileSeedCounts, PROFILE_COUNTS[shardIndex], 'profile counts ' + shardIndex);
  equal(membership.profileMembershipHash, MEMBERSHIP_HASHES[shardIndex], 'membership hash ' + shardIndex);
  equal(membership.profileMembershipHash,
    independentHash('T37-TPROFILE-MEMBERSHIP-v2', profiles));
}
const brokenProfiles = clone(oracleByShard[0]);
brokenProfiles[0].seeds.pop();
throws(() => v2.profileMembership(brokenProfiles, v2.shardRange(0)), /incomplete/);
const duplicateProfiles = clone(oracleByShard[0]);
duplicateProfiles[0].seeds[1] = duplicateProfiles[0].seeds[0];
throws(() => v2.profileMembership(duplicateProfiles, v2.shardRange(0)), /strict partition/);
const unsortedProfiles = clone(oracleByShard[0]); [unsortedProfiles[0].seeds[0], unsortedProfiles[0].seeds[1]] = [unsortedProfiles[0].seeds[1], unsortedProfiles[0].seeds[0]]; throws(() => v2.profileMembership(unsortedProfiles, v2.shardRange(0)), /strict partition/);
const outOfRangeProfiles = clone(oracleByShard[0]); outOfRangeProfiles[0].seeds[0] = 20_000; throws(() => v2.profileMembership(outOfRangeProfiles, v2.shardRange(0)), /strict partition/);
const wrongProfile = clone(oracleByShard[0]);
wrongProfile[0].counts[0] = 3;
throws(() => v2.profileMembership(wrongProfile, v2.shardRange(0)), /counts drifted/);
throws(() => v2.buildShardDomain(0, { maxRssBytes: 0, rssBytes: () => 1 }), /memory guard/);
const realDomain = v2.buildShardDomain(0);
deepEqual({
  domainHash: realDomain.domainHash,
  fullQueueHash: realDomain.identity.fullQueueHash,
  reverseTrieHash: realDomain.identity.reverseTrieHash,
  reverseTrieNodeCount: realDomain.identity.reverseTrieNodeCount,
}, {
  domainHash: '1A49679A6F649653B21B78A3D58FD904F5BE9A957ACA8E3E3F1358D381763AD5',
  fullQueueHash: '9D5ADDF55A18F7A9115144B946AE013337E244309E863D3C06FEA392313B3DFD',
  reverseTrieHash: 'C804A59051F5AB2CBBBE3333489A390242F094E74287F47CF6A4063E7049FFF2',
  reverseTrieNodeCount: 282_530,
});
deepEqual(v2.validateDomain(makeDomain(8)), v2.shardRange(8));
const badDomain = makeDomain(0);
badDomain.seedEndExclusive += 1;
badDomain.domainHash = v1.canonicalHash('T37-TDOMAIN-v2',
  Object.fromEntries(Object.entries(badDomain).filter(([key]) => key !== 'domainHash')));
throws(() => v2.validateDomain(badDomain), /domain identity/);
const toy0 = createToy(0);
deepEqual(toy0.queue, v1.base.sequenceForSeed(toy0.seed, 20), 'independent queue oracle drifted');
const candidate0 = v2.formatShardOutputForTest(toy0.result, toy0.context);
equal(v2.replayCandidateWithContext(candidate0, toy0.context), candidate0);
equal(v2.validateShardOutputForTest(candidate0, toy0.context), candidate0);
equal(candidate0.coverReference.strongTilingCount, 373);
equal(candidate0.coverage.strongTilingCount, 1);
equal(candidate0.coverage.complete, false);
ok(Object.isFrozen(candidate0.setup.placements[0]));
throws(() => v2.validateShardOutputForTest(candidate0, { ...toy0.context }), /not registered/);
throws(() => v2.validateShardOutputForTest(candidate0, new Proxy(toy0.context, {})), /not registered/);
for (const mutate of [
  (output) => { output.candidate.seed = output.domain.seedEndExclusive; output.setup.seed = output.candidate.seed; },
  (output) => { output.candidate.profileIndex = (output.candidate.profileIndex + 1) % 7; output.coverage.completedProfileCount = output.candidate.profileIndex; },
  (output) => { output.candidate.peelLocalIndices[0] = 0; },
  (output) => { output.candidate.forwardCatalogIndices[1] = 0; },
  (output) => { output.setup.placements[0].type = output.setup.placements[1].type; },
  (output) => { output.boardRows[0] = 'tampered'; },
]) {
  const altered = clone(candidate0);
  mutate(altered);
  throws(() => v2.replayCandidateWithContext(altered, toy0.context),
    /range|queue profile|peel|catalog indices|physical replay|board/);
}
const hardDropContext = createToyContext({ ...toy0, hardDropMask: () => 0n });
throws(() => v2.replayCandidateWithContext(candidate0, hardDropContext), /physical replay/);
const touchContext = createToyContext({ ...toy0, neighborMask: () => toy0.visibleMask });
throws(() => v2.replayCandidateWithContext(candidate0, touchContext), /physical replay/);
const clearContext = createToyContext({
  ...toy0,
  rowMasks: [toy0.catalog[0].cellMask, toy0.visibleMask ^ toy0.catalog[0].cellMask],
});
throws(() => v2.replayCandidateWithContext(candidate0, clearContext), /clears during setup/);
const overlapCatalog = toy0.catalog.map((descriptor) => ({ ...descriptor }));
overlapCatalog[1].cellMask = overlapCatalog[0].cellMask;
const overlapContext = createToyContext({ ...toy0, catalog: overlapCatalog });
throws(() => v2.replayCandidateWithContext(candidate0, overlapContext), /physical replay/);
const hiddenCatalog = toy0.catalog.map((descriptor) => ({ ...descriptor }));
hiddenCatalog[0].cellMask = 0xfn << 100n;
const hiddenContext = createToyContext({ ...toy0, catalog: hiddenCatalog });
throws(() => v2.replayCandidateWithContext(candidate0, hiddenContext), /physical replay/);
const mismatchCatalog = toy0.catalog.map((descriptor) => ({ ...descriptor })); mismatchCatalog[0].cellMask = (1n << 3n) | (1n << 10n) | (1n << 34n) | (1n << 50n);
const mismatchContext = createToyContext({ ...toy0, catalog: mismatchCatalog }); throws(() => v2.replayCandidateWithContext(candidate0, mismatchContext), /board does not reconstruct/);
const completeOutputs = Array.from({ length: 9 }, (_, index) =>
  v2.formatShardOutputForTest(makeResult(makeDomain(index))));
const budgetOutput = v2.formatShardOutputForTest(makeResult(makeDomain(0), {
  status: 'budget-exhausted',
  complete: false,
  workCount: 1,
  coverBranchProbeCount: 1,
  strongTilingCount: 0,
  completedProfileCount: 0,
  strongTilingHash: ZERO_HASH,
}));
equal(completeOutputs[0].coverage.complete, true);
equal(completeOutputs[0].candidate, null);
equal(budgetOutput.coverage.complete, false);
equal(budgetOutput.setup, null);
const wrongHash = clone(completeOutputs[0]);
wrongHash.coverage.workCount -= 1;
throws(() => v2.validateShardOutput(wrongHash), /invalid/);
const artifactBudget = rehashOutput({ ...clone(budgetOutput), candidate: clone(candidate0.candidate) });
throws(() => v2.validateShardOutput(artifactBudget), /candidate artifacts/);
const extraTop = rehashOutput({ ...clone(completeOutputs[0]), qaExtra: true }); throws(() => v2.validateShardOutput(extraTop), /field set/);
const extraSetup = clone(candidate0); extraSetup.setup.qaExtra = true; throws(() => v2.validateShardOutputForTest(rehashOutput(extraSetup), toy0.context), /field set/);
equal(v1.sha256Hex(V1_BYTES), v2.V1_FILE_HASH);
deepEqual(v2.validateV1PredecessorBytes(V1_BYTES), {
  seedStart: 1,
  seedCount: 20_000,
  seedEndExclusive: 20_001,
  status: 'complete-not-found',
  fileSha256: v2.V1_FILE_HASH,
  resultHash: v2.V1_RESULT_HASH,
});
throws(() => v2.validateV1PredecessorBytes(Buffer.from('{}\n')), /identity|unsupported/);
deepEqual(v2.parseCanonicalBytes(Buffer.from('{"a":1}\n'), 'fixture'), { a: 1 });
for (const bytes of [Buffer.from('{"a":1}\r\n'), Buffer.from('{"a":1}\n\n'),
  Buffer.from('{"b":1,"a":2}\n'), Buffer.from([0xc3, 0x28]), Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d, 0x0a])]) {
  throws(() => v2.parseCanonicalBytes(bytes, 'fixture'), /canonical|valid JSON|valid UTF-8/);
}
const deps0 = v2.createManifestTestDependencies(toy0.context);
throws(() => v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [record(completeOutputs[0])] }, { ...deps0 }), /not registered/);
const completeRecords = completeOutputs.map((output) => record(output));
const prefix = v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: completeRecords.slice(0, 8) }, deps0);
const full = v2.buildManifestData({ predecessorBytes: V1_BYTES, records: completeRecords }, deps0);
const candidateOnly = v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [record(candidate0)] }, deps0);
equal(prefix.status, 'prefix-complete');
equal(full.status, 'complete-not-found');
equal(candidateOnly.status, 'candidate');
deepEqual(Object.keys(full).sort(), ['algorithmVersion', 'entries', 'manifestHash',
  'manifestVersion', 'predecessor', 'schemaVersion', 'series', 'status']);
const fullBody = { ...full };
delete fullBody.manifestHash;
equal(full.manifestHash, independentHash('T37-TSERIES-v2', fullBody));
const toy1 = createToy(1);
const candidate1 = v2.formatShardOutputForTest(toy1.result, toy1.context);
const deps1 = v2.createManifestTestDependencies(toy1.context);
equal(v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [completeRecords[0], record(candidate1)] }, deps1).status, 'candidate');
for (const records of [
  [],
  [...completeRecords, completeRecords[0]],
  [completeRecords[1]],
  [completeRecords[1], completeRecords[0]],
  [completeRecords[0], completeRecords[0]],
  [record(budgetOutput)],
  [record(candidate0), completeRecords[1]],
]) {
  throws(() => v2.buildManifestData({ predecessorBytes: V1_BYTES, records }, deps0),
    /one through nine|prefix/);
}
const fileMismatch = { ...completeRecords[0], expectedFileSha256: ZERO_HASH };
throws(() => v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [fileMismatch] }, deps0), /file hash/);
const resultMismatch = { ...completeRecords[0], expectedResultHash: ZERO_HASH };
throws(() => v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [resultMismatch] }, deps0), /result hash/);
const noncanonicalBytes = Buffer.concat([completeRecords[0].bytes, Buffer.from('\n')]);
throws(() => v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [{ ...completeRecords[0], bytes: noncanonicalBytes,
    expectedFileSha256: sha(noncanonicalBytes) }] }, deps0), /canonical/);
const forgedCandidate = clone(candidate0);
forgedCandidate.setup.placements[0].x += 1;
const forgedRehashed = rehashOutput(forgedCandidate);
throws(() => v2.buildManifestData({ predecessorBytes: V1_BYTES,
  records: [record(forgedRehashed)] }, deps0), /physical replay/);
const testRoot = mkdtempSync(join(tmpdir(), 't37-v2-standalone-'));
try {
  const predecessorPath = join(testRoot, 'v1.json');
  const shardPath = join(testRoot, 'shard-0.json');
  const listPath = join(testRoot, 'list.json');
  const outputPath = join(testRoot, 'future-output.json');
  const existingPath = join(testRoot, 'existing.json');
  writeFileSync(predecessorPath, V1_BYTES);
  writeFileSync(shardPath, completeRecords[0].bytes);
  writeFileSync(existingPath, 'sentinel', 'utf8');
  const list = { records: [{ path: shardPath,
    expectedFileSha256: completeRecords[0].expectedFileSha256,
    expectedResultHash: completeRecords[0].expectedResultHash }] };
  writeFileSync(listPath, v2.canonicalBytes(list));
  equal(v2.buildManifestFromFiles(predecessorPath, listPath).status, 'prefix-complete');
  const duplicateList = { records: [list.records[0], list.records[0]] };
  writeFileSync(listPath, v2.canonicalBytes(duplicateList));
  throws(() => v2.buildManifestFromFiles(predecessorPath, listPath), /distinct/);
  writeFileSync(listPath, v2.canonicalBytes(list));

  const shardArgs = (index, work = '10000000', rss = '900', output = outputPath) => [
    '--algorithm', 'tiling-first-sharded-v2', '--mode', 'shard', '--shard-index', index,
    '--work-budget', work, '--max-rss-mib', rss, '--output', output,
  ];
  deepEqual(v2.parseArguments(shardArgs('0')), {
    mode: 'shard', shardIndex: 0, outputPath,
  });
  equal(v2.parseArguments(shardArgs('8')).shardIndex, 8);
  for (const index of ['00', '+0', '-0', '0.0', '-1', '9']) {
    throws(() => v2.parseArguments(shardArgs(index)), /canonical fixed/);
  }
  throws(() => v2.parseArguments(shardArgs('0', '9999999')), /canonical fixed/);
  throws(() => v2.parseArguments(shardArgs('0', '10000000', '899')), /canonical fixed/);
  throws(() => v2.parseArguments([...shardArgs('0'), '--preparedDomain', 'forbidden']),
    /invalid option set/);
  throws(() => v2.parseArguments([...shardArgs('0'), '--shard-index', '1']),
    /unique explicit pairs/);
  throws(() => v2.parseArguments(shardArgs('0', '10000000', '900', existingPath)),
    /existence contract/);
  throws(() => v2.externalPath(v2SourcePath, { mustExist: true }), /outside the repository/);
  throws(() => v2.externalPath('relative.json'), /absolute/);

  const manifestArgs = [
    '--algorithm', 'tiling-first-sharded-v2', '--mode', 'manifest',
    '--v1-output', predecessorPath, '--input-list', listPath, '--output', outputPath,
  ];
  deepEqual(v2.parseArguments(manifestArgs), {
    mode: 'manifest',
    v1Path: predecessorPath,
    inputListPath: listPath,
    outputPath,
  });
  throws(() => v2.parseArguments([...manifestArgs, '--work-budget', '10000000']),
    /invalid option set/);
  equal(existsSync(outputPath), false, 'parser must never publish output');
} finally {
  rmSync(testRoot, { recursive: true, force: true });
}
process.stdout.write('tiling-first v2 standalone: ' + checks + ' checks pass\n');
