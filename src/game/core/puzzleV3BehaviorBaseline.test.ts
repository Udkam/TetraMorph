import { describe, expect, it } from 'vitest';
import { PUZZLE_DEFINITIONS, type PuzzleDefinition } from './puzzles';
import type { PuzzleId } from './types';

const FROZEN_REV2_BEHAVIOR_HASHES = Object.freeze({
  't3r-cascade-05': 'af68657b7c59ccbdae05d4ddf2105eb6cbba12df513eccabe760f111d06545ce',
  't5r-delta-07': 'e66c395dd168cd4728c9f39e976249dc7d3cf3ebcb0cc5a87ad58806ed6ff317',
  't5r-lattice-09': '455013fb5522deddde42f28642d1779f5e63b3734684515a71dc483dada54741',
  't5r-rift-10': 'f9b024af530db83c1a904811c551c4fa5f160af9e66f41ccdab278940ff62d7e',
  't5r-drift-08': '2432362ed6ba2fbb41cdf1a9448a9ad75e94828ca32dd47496f3eb0955c98860',
  't5r-pulse-14': 'fc634a927472983523b29127cbd705d6e6f21de6800a701b12182bae62523d46',
  't5r-arc-13': 'd12a9d18fe65ec415d3985f7d1be5eb8015391946270e4a86609dbcc8b834325',
  't5r-current-12': 'c372902e3c157fb66dfa1b8257a04cbc5637600835c7a7912c67d7e43b1d3aaf',
  't5r-prism-11': '2dc01118c633fc74921c926324c50a00d4407b52fb77d21d2bb14b7eacf91058',
  't5r-horizon-15': 'f07ec0766eb0a0f7e5dd57930f4bf39b822837e45683dcca54bc16e048af03c9',
  't6r-cairn-17': '975dbe9259b46abc93ed67bdbfffb6aa193c5eedc108cdb3ea4c10dafbd3ced7',
  't6r-terrace-18': '290dfff1dde551e775350369d0d5e91816a219bcc7155771ea5670b7a4891db1',
  't6r-keystone-20': 'a33220646ea5338d670bd5e89595cdd92fc1d3324013e4d3bff93e68110744d7',
  't6r-bastion-19': 'd53551d30144c17d8842f884206b5827479fab5de009d5348fa8c6c66de4e4a7',
  't6r-veil-16': 'a0fe1287f60d2d771f9fb2bdf72bdb414e90445092bbb262c59a57a1b645be16',
  'tm-puzzle-21': '0d1f10ee52296959cb7fb06d4d8fdd386cb461c3502ddda7b7ce2e693dff7618',
  'tm-puzzle-22': '91a87bbb5692688cd5fdb13164c302f70b6e702c8ffc0a38f10eb8db771e52f6',
  'tm-puzzle-23': 'd29a988d9345453b8b0318a6aa2ec7396e5b71ac19a655e270059feac606b120',
  'tm-puzzle-24': '1821bdbcbd5bd6c07b589b8f5b135de1d36f5ac73170636e4e5108e1539841dd',
  'tm-puzzle-25': '11b440821e1a0773ec596e0bd7969de78068d3b1bf9d8799ea77303db74d4b88',
  'tm-puzzle-26': '3372ad01a33cee1bda532fb8cf7ce078d70ea9711c800e24f44e5a40a4baaeb8',
  'tm-puzzle-27': 'fe58e766c093485aead8e416ea12814952ae87094e2eab78b323190c1d36f215',
  'tm-puzzle-28': '42ccfc20227beeaed63f1cdeb496df3699ca522a8a96130f6e985f124a828d50',
  'tm-puzzle-29': '845157781f5e3a9b70336f5f2fedc6e87cdd1441f85f9931186a86ab23bd2a2e',
  'tm-puzzle-30': '0b1efdf42fdac2773d9c1e5ff5f084c2939908798b9d4d5b8831e662c6f779a3',
  'tm-puzzle-31': 'ce42be553636caae6d6275b4a9ccc61aff15c77af73a011d322b4081e92aad3b',
  'tm-puzzle-33': 'cc6d97d7b88f6a98055af19fe8f0f0fd314a38349199a756d7555eb2b3acc177',
  'tm-puzzle-35': '39bc5f4108f4e79ad44a001a09d405a4a6b96a516532b09b93ec6438dd4da719',
  'tm-puzzle-36': 'f35af4e3a1006214c6c5488dff4d4ec3171e774d6f156a71d6235c6f998759af',
  'tm-puzzle-37': '58b4dd7c157599c09d25901ee11e89bf56408c452cb17610194307a12d02bdb1',
  'tm-puzzle-38': '729a4afbd81ee80a6441a7158d6d0c09f7b3d0f82d0fdfcd26b57a85ef7240a1',
  'tm-puzzle-41': '2f3d8bc50dfe3d7926e744b9c6960ba102ce687887a512e2f411e1d9e89707b3',
  'tm-puzzle-44': '11c42f1a90a934f9bfb8e2d1ebc67428f695fd278ff1e1058044bb5e3855414e',
  'tm-puzzle-45': 'c643bd7fb5ca0807013646aa198122c4590fa782e01cda326f24a0c413a15f08',
  'tm-puzzle-47': '88f537b58817cc45dd310f40914866e21edaf7c3aa060cdc05593c016fc5b2e7',
  'tm-puzzle-48': 'b55fda5016508df85927e72a408d9f9428bacd4d3855dda69d99f14a68ebb0ff',
  'tm-puzzle-49': '338d4964f402cb83e54fd38851e1530e8f7a8d477307548102f5838ed7e8dc9d',
  'tm-puzzle-50': '06ef5a600ed8d2af9dc587e61d54c2a8e1265c6380d9e231369ffbbbc16db5c0',
} satisfies Readonly<Partial<Record<PuzzleId, string>>>);

function behaviorPayload(definition: PuzzleDefinition): object {
  const initialBoardRows = definition.boardRows.map((row) => row.replace(/[IJLOSTZ]/g, '#'));
  const targetCells = initialBoardRows.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === '#' ? [{ x, y }] : []
  )));
  const anchorCells = [...definition.anchorCells]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ x, y }) => ({ x, y }));
  return {
    schema: 'puzzle-behavior-v1',
    dimensions: { width: 10, height: 40, visibleStartRow: 20 },
    goal: 'clear-original-targets',
    operationMetric: 'locked-tetromino',
    rulesetRevision: 'puzzle-core-v3-compatible-v1',
    queueModel: 'seven-bag-v1',
    gameplaySeed: definition.seed,
    initialBoardRows,
    targetCells,
    anchorCells,
  };
}

async function behaviorHash(definition: PuzzleDefinition): Promise<string> {
  const bytes = new TextEncoder().encode(`${JSON.stringify(behaviorPayload(definition))}\n`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('Puzzle v3 frozen revision-2 behavior baselines', () => {
  it('matches all 38 literal F1 hashes with the canonical serializer', async () => {
    const definitions = new Map(PUZZLE_DEFINITIONS.map((definition) => [definition.id, definition]));
    const baselines = Object.entries(FROZEN_REV2_BEHAVIOR_HASHES) as [PuzzleId, string][];
    expect(baselines).toHaveLength(38);

    for (const [id, expectedHash] of baselines) {
      const definition = definitions.get(id);
      expect(definition, id).toBeDefined();
      expect(await behaviorHash(definition!), id).toBe(expectedHash);
    }
  });
});
