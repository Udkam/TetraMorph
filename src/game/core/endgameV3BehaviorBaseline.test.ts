import { describe, expect, it } from 'vitest';
import { ENDGAME_DEFINITIONS, type EndgameDefinition } from './endgames';
import type { EndgameId } from './types';

const FROZEN_REV2_BEHAVIOR_HASHES = Object.freeze({
  't3r-cascade-05': '3a5f1687eaf52a185291b9f63019ab142fa8c204b4ebd9a130bc8e73044c8664',
  't5r-delta-07': '27756016444171d91b92175c96f6a091908756db66ada3681493252a33cb9dcf',
  't5r-lattice-09': '29a1dcb1e24fd84c03f412b20d46b3f120bb640f9b6345d2b70aea86660e437c',
  't5r-rift-10': '4d7ce5838d46099e3e296dfa4baa69a0c50fb97af7977dcaf2783a70d08b9612',
  't5r-drift-08': '769edcca3248d451b703b8f9439e3e80e5884cf0ddec7dd010623bc7ac1ab482',
  't5r-pulse-14': '36246f05772e7eb001804ff7ff88c08f7c297ddf3c4cb637d184fb56c5bafd19',
  't5r-arc-13': '53c47c95dfa459fea52c93236323ac27cdafc24afa56ca0c724495f2f171e108',
  't5r-current-12': '7e3c26113dd561c5d2fa3011754260eef306cc89582e52b138eabb0efbb76916',
  't5r-prism-11': '4c83133781f8cfc7ed98a5439d1f860c5454dc84799fcb39a73e5bc369a6a7d7',
  't5r-horizon-15': '4fca7038cc71aab64376f3740b513a7fa54af8593b5c3d1c777ee15585debb25',
  't6r-cairn-17': 'cc418e40c08ffe44a6fd04d28886f59f009eb5eed022c25d3afc214ed84cac08',
  't6r-terrace-18': '751515f49a56bee647527ebdec7808efff65fb921686a22e91850aec8d4b14a3',
  't6r-keystone-20': 'fddf16749f673f20e21b5b9db34a16cbcc8df925eac2ffcbd89c3be32fff88ba',
  't6r-bastion-19': 'ce04ca8e7b3066d12694fb88520fa9483b397798024c391843c62c2900d43738',
  't6r-veil-16': '6b3a7c488d750d3c758a6c6cab9eadaf50e50be279e82c329ff958093238cdee',
  'tm-endgame-21': '10efb0ba55c63c0a7b2ff94dd442427ff371a479b8e9bcf47c6db95e245afff4',
  'tm-endgame-22': '5243b820380bd762d53ec44bf73fca39b027022a1102eff4444292181a68696b',
  'tm-endgame-23': 'f8d312c52c18434e7db7c77aed9fab7908cacfcaba98574dede27f2adee3f6a6',
  'tm-endgame-24': 'df404461bfdd92bf71c6e8adadc77d44acea7d96760c3262a61740f15e2683f9',
  'tm-endgame-25': '105ef30e8106f77294b0e8b6af1a8db1c9dbeb4aed9497e659866b29fc61ad59',
  'tm-endgame-26': 'cce312c7f8de5dcf49ca43df937da60ffc1e63a1d1f43f7e4cf299b4469d2d2c',
  'tm-endgame-27': '3f4a0869ad0a9349b81f506b49d21cd06d28017ee08a08dc1960c7a33af112fe',
  'tm-endgame-28': 'b90f238cf7ea78604da9d9245cc032a97a6e215123bfcc1353d66f96a2e53503',
  'tm-endgame-29': 'b6c9a5daf2b5d0e4c1fbc159b313e433bace1a6c03c5b54428a1692ea624de6a',
  'tm-endgame-30': 'a7dd3c4b5c7c92f99a6c27fd16b2ff7ed494d5728fb275e488399616c777f199',
  'tm-endgame-31': 'd6745cfc003c583f45c173507f0ff4d23d17342ef30f70479d841c7701f47ba4',
  'tm-endgame-33': '6e535748979bc45a5937e30d2485abcfa6d8d40de6d5c7994ef18718e9f29855',
  'tm-endgame-35': '6df083fa8a9f09263aca512088c96ca2119db18165d86bdbf2f389508ad6333e',
  'tm-endgame-36': '990044cba554fcc14cde88a47c46d6f5c92f0875ba3d897283dae983030d5326',
  'tm-endgame-37': 'bb084ee1b442f97bba42beabc8c724c419ee6fdb25feb4d5623caa0eb46470b4',
  'tm-endgame-38': '8caf5d093e97cc92d4a259fdb62d60b27d337bf83800c2dd5bd9bd0dbd8808b8',
  'tm-endgame-41': '5ff6bf991fb21dc9f1292da78dc46bf7ad6f958f4e501e540ba40a16e467787a',
  'tm-endgame-44': 'c474a507cdfed2ffa8deba8ee743fc117ffe15d8ccfb8be79a121afefb5b4ee3',
  'tm-endgame-45': 'a3b6e9bb1614ab47bae817106bfa8b15eec052f7f5d316a9d35800dbe9e8cc9e',
  'tm-endgame-47': '65cb9c38496021ba700673fe73f61fafa09f4257b0e60ff930d584db5f5a6989',
  'tm-endgame-48': 'c632be4e3ace9f2d3c6a902cc64e830a15263220335814059926541da846d11d',
  'tm-endgame-49': '7c700fbf4a3beaed2adc750e5219de1b2feff54c3b8691cb1b376417bcbd04de',
  'tm-endgame-50': '3f93e645b16d12298baee5f9ef8efd2578d53b914135da271ae2d7a305d0eca7',
} satisfies Readonly<Partial<Record<EndgameId, string>>>);

function behaviorPayload(definition: EndgameDefinition): object {
  const initialBoardRows = definition.boardRows.map((row) => row.replace(/[IJLOSTZ]/g, '#'));
  const targetCells = initialBoardRows.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === '#' ? [{ x, y }] : []
  )));
  const anchorCells = [...definition.anchorCells]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ x, y }) => ({ x, y }));
  return {
    schema: 'endgame-behavior-v1',
    dimensions: { width: 10, height: 40, visibleStartRow: 20 },
    goal: 'clear-original-targets',
    operationMetric: 'locked-tetromino',
    rulesetRevision: 'endgame-core-v3-compatible-v1',
    queueModel: 'seven-bag-v1',
    gameplaySeed: definition.seed,
    initialBoardRows,
    targetCells,
    anchorCells,
  };
}

async function behaviorHash(definition: EndgameDefinition): Promise<string> {
  const bytes = new TextEncoder().encode(`${JSON.stringify(behaviorPayload(definition))}\n`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('Endgame v3 frozen revision-2 behavior baselines', () => {
  it('matches all 38 literal F1 hashes with the canonical serializer', async () => {
    const definitions = new Map(ENDGAME_DEFINITIONS.map((definition) => [definition.id, definition]));
    const baselines = Object.entries(FROZEN_REV2_BEHAVIOR_HASHES) as [EndgameId, string][];
    expect(baselines).toHaveLength(38);

    for (const [id, expectedHash] of baselines) {
      const definition = definitions.get(id);
      expect(definition, id).toBeDefined();
      expect(await behaviorHash(definition!), id).toBe(expectedHash);
    }
  });
});
