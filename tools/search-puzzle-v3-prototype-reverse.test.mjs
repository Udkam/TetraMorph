import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
} finally {
  rmSync(tempRoot, { recursive: true });
}

process.stdout.write('seeded-reverse checkpoint 1: codecs, identities, trie, and forward regression pass\n');
