// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH, VISIBLE_START_ROW } from './constants';
import { stateHash } from './engine';
import { compareEndgameTopologies } from './endgameFingerprints';
import { ENDGAME_V3_INTRO_DRAFTS } from './endgameV3IntroDefinitions';
import {
  ENDGAME_DEFINITIONS,
  getEndgameDefinition,
  replayEndgameSetup,
  validateEndgameDefinition,
  type EndgameDefinition,
} from './endgames';
import {
  certifyOptimalEndgameRouteForDefinition,
  encodeEndgameRoute,
  exhaustiveEndgameLandings,
  replayEndgameRouteForDefinition,
} from './endgameRouteSearch';
import type { Cell, GameState } from './types';

type CertificateV8 = Readonly<{
  schemaVersion: number;
  campaignRevision: number;
  rulesetRevision: string;
  routeTokenVersion: number;
  searchStateKeyVersion: number;
  operationMetric: string;
  levelId: string;
  authoringDefinitionHash: string;
  behaviorHash: string;
  initialStateHash: string;
  optimalLockedPieces: number;
  optimalRoute: string;
  routeHash: string;
  lockSignatures: readonly string[];
  finalStateHash: string;
  solutionMultiplicity: string;
  proof: Readonly<{
    kind: string;
    lowerBoundVersion: string;
    exhaustedDepths: readonly Readonly<{
      lockedPieces: number;
      frontierStates: number;
      transitions: number;
      boundPrunes: number;
    }>[];
    exploredStateCount: number;
    transitionCount: number;
  }>;
  alternatives: readonly Readonly<{
    route: string;
    routeHash: string;
    lockSignatures: readonly string[];
    firstDivergenceLock: number;
  }>[];
  techniqueEvidenceId: string | null;
}>;

const FIXTURE_URL = new URL(
  '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-04.json',
  import.meta.url,
);
const fixtureBytes = readFileSync(FIXTURE_URL, 'utf8');
const artifact = JSON.parse(fixtureBytes) as CertificateV8;
const [intro01, intro02, intro03, draft] = ENDGAME_V3_INTRO_DRAFTS;
const OPENING_X = 4;
const PRIOR_DRAFTS = Object.freeze([
  Object.freeze({ definition: intro01!, bytes: 622, sha: 'DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8' }),
  Object.freeze({ definition: intro02!, bytes: 621, sha: '1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB' }),
  Object.freeze({ definition: intro03!, bytes: 682, sha: 'A825A82CE4B96DDA78E2FB7A2C696F354CAC49B6C63AF5FDAA7722665F53EC9E' }),
]);

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function authoringPayload(definition: EndgameDefinition): object {
  return {
    schema: 'endgame-authoring-definition-v1',
    stableId: definition.id,
    targetRows: definition.targetRows,
    setup: {
      seed: definition.setup.seed,
      placements: definition.setup.placements.map(({ type, rotation, x }) => ({ type, rotation, x })),
    },
    boardRows: [...definition.boardRows],
    hiddenCells: [],
    anchorCells: [],
    gameplaySeed: definition.seed,
    dimensions: { width: 10, height: 40, visibleStartRow: 20 },
    goal: 'clear-original-targets',
    rulesetRevision: 'endgame-v3',
  };
}

function behaviorPayload(definition: EndgameDefinition): object {
  const initialBoardRows = definition.boardRows.map((row) => row.replace(/[IJLOSTZ]/g, '#'));
  const targetCells = initialBoardRows.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === '#' ? [{ x, y }] : []
  )));
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
    anchorCells: [],
  };
}

function openingColumns(state: GameState): number[] {
  const deepestTargetY = state.endgameTargetCells.reduce((deepest, cell) => Math.max(deepest, cell.y), -1);
  if (deepestTargetY < VISIBLE_START_ROW) return [];
  return Array.from({ length: BOARD_WIDTH }, (_, x) => x).filter((x) => (
    Array.from({ length: deepestTargetY - VISIBLE_START_ROW + 1 }, (_, offset) => (
      state.board[VISIBLE_START_ROW + offset]![x] === null
    )).every(Boolean)
  ));
}

function completedRowsBeforeClear(state: GameState, cells: readonly Cell[]): number[] {
  const additions = new Set(cells.map(({ x, y }) => `${x},${y}`));
  return Array.from({ length: BOARD_HEIGHT }, (_, y) => y).filter((y) => (
    Array.from({ length: BOARD_WIDTH }, (_, x) => (
      state.board[y]![x] !== null || additions.has(`${x},${y}`)
    )).every(Boolean)
  ));
}

function routeEvidence(route: string) {
  const replay = replayEndgameRouteForDefinition(draft!, route);
  let current = replayEndgameRouteForDefinition(draft!, 'S').state;
  let reconstructed = 'S';
  const before: GameState[] = [];
  const after: GameState[] = [];
  for (const lock of replay.locks) {
    before.push(current);
    const matches = exhaustiveEndgameLandings(current).filter(({ lock: candidate }) => (
      candidate.signature === lock.signature
    ));
    expect(matches, lock.signature).toHaveLength(1);
    const landing = matches[0]!;
    reconstructed += encodeEndgameRoute(landing.commands);
    current = landing.state;
    after.push(current);
  }
  return {
    replay,
    reconstructed,
    before,
    after,
    releases: after.map((state, index) => state.lines - before[index]!.lines),
    remaining: after.map((state) => state.endgameTargetCells.length),
    openings: after.map(openingColumns),
    hashes: after.map(stateHash),
  };
}

describe('Endgame v3 non-published Intro-04 authoring entry', () => {
  it('appends one deeply frozen draft while preserving the live and prior draft baselines', () => {
    const liveBytes = JSON.stringify(getEndgameDefinition('t3r-cascade-06'));
    const serialized = JSON.stringify(draft);
    expect(ENDGAME_DEFINITIONS).toHaveLength(50);
    expect(ENDGAME_V3_INTRO_DRAFTS).toHaveLength(4);
    expect(ENDGAME_V3_INTRO_DRAFTS.filter(({ id }) => id === draft!.id)).toEqual([draft]);
    expect(ENDGAME_DEFINITIONS).not.toContain(draft);
    expect(new TextEncoder().encode(liveBytes)).toHaveLength(627);
    expect(sha256(liveBytes).toUpperCase()).toBe('7B10203C8C02B1C575761BFDE6F471E8CD298FE0E7B3FD3AC3E8E1E25D1CDAFE');
    for (const prior of PRIOR_DRAFTS) {
      const bytes = JSON.stringify(prior.definition);
      expect(new TextEncoder().encode(bytes)).toHaveLength(prior.bytes);
      expect(sha256(bytes).toUpperCase()).toBe(prior.sha);
    }
    expect(new TextEncoder().encode(serialized)).toHaveLength(647);
    expect(sha256(serialized).toUpperCase()).toBe('4D542D3A270F4B22352F026FDE1DD4FCC5E1DBB2A4EBC7DC321400616484941A');
    expect(Object.isFrozen(ENDGAME_V3_INTRO_DRAFTS)).toBe(true);
    expect([draft, draft!.setup, draft!.setup.placements, ...draft!.setup.placements,
      draft!.boardRows, draft!.hiddenCells, draft!.anchorCells].every(Object.isFrozen)).toBe(true);
  });

  it('replays seven legal zero-clear drops into one admitted four-row corridor', () => {
    expect(() => validateEndgameDefinition(draft!, false)).not.toThrow();
    const rows = replayEndgameSetup(draft!.setup).slice(VISIBLE_START_ROW).map((row) => (
      row.map((cell) => cell ?? '.').join('')
    ));
    expect(draft!.setup.placements).toHaveLength(7);
    expect(rows).toEqual(draft!.boardRows);
    expect(rows.filter((row) => row !== '..........')).toEqual([
      '...Z..SSOO', 'T.ZZ.SSJOO', 'TTZL...JJJ', 'TLLL..IIII',
    ]);
    expect(rows.slice(-4).map((row) => [...row].filter((cell) => cell === '.').length))
      .toEqual([5, 2, 3, 2]);
    expect(openingColumns(replayEndgameRouteForDefinition(draft!, 'S').state)).toEqual([OPENING_X]);
    const prior = [...ENDGAME_DEFINITIONS, intro01!, intro02!, intro03!];
    expect(prior).toHaveLength(53);
    expect(prior.every(({ seed }) => seed !== draft!.seed)).toBe(true);
    for (const other of prior) {
      expect(compareEndgameTopologies(other, draft!), other.id).toMatchObject({
        exactMatch: false,
        topologyMatch: false,
        nearTopology: false,
      });
    }
  });

  it('keeps one canonical schema-8 artifact and rebuilds every frozen hash', () => {
    expect(fixtureBytes.charCodeAt(0)).not.toBe(0xfeff);
    expect(fixtureBytes).not.toContain('\r');
    expect(fixtureBytes.match(/\n/g)).toHaveLength(1);
    expect(fixtureBytes).toBe(`${JSON.stringify(artifact)}\n`);
    expect(new TextEncoder().encode(fixtureBytes)).toHaveLength(1478);
    expect(sha256(fixtureBytes).toUpperCase()).toBe('DB46CF1DB9B206A7866F7295DFC054B27C5FC1DA4855944FBA2BA7C87E9D5725');
    expect(Object.keys(artifact)).toEqual([
      'schemaVersion', 'campaignRevision', 'rulesetRevision', 'routeTokenVersion',
      'searchStateKeyVersion', 'operationMetric', 'levelId', 'authoringDefinitionHash',
      'behaviorHash', 'initialStateHash', 'optimalLockedPieces', 'optimalRoute', 'routeHash',
      'lockSignatures', 'finalStateHash', 'solutionMultiplicity', 'proof', 'alternatives',
      'techniqueEvidenceId',
    ]);
    expect(Object.keys(artifact.proof)).toEqual([
      'kind', 'lowerBoundVersion', 'exhaustedDepths', 'exploredStateCount', 'transitionCount',
    ]);
    expect(artifact.proof.exhaustedDepths.every((depth) => (
      Object.keys(depth).join(',') === 'lockedPieces,frontierStates,transitions,boundPrunes'
    ))).toBe(true);
    expect(artifact).toMatchObject({
      schemaVersion: 8,
      campaignRevision: 3,
      rulesetRevision: 'endgame-v3',
      routeTokenVersion: 2,
      searchStateKeyVersion: 2,
      operationMetric: 'locked-tetromino',
      levelId: draft!.id,
      optimalLockedPieces: 4,
      solutionMultiplicity: 'multiple',
      proof: { kind: 'exhaustive-shorter-depths', lowerBoundVersion: 'target-column-deficit-v1' },
      techniqueEvidenceId: null,
    });
    expect(artifact.alternatives).toHaveLength(1);
    expect(artifact.authoringDefinitionHash).toBe(sha256(`${JSON.stringify(authoringPayload(draft!))}\n`));
    expect(artifact.behaviorHash).toBe(sha256(`${JSON.stringify(behaviorPayload(draft!))}\n`));
    expect(artifact.routeHash).toBe(sha256(`endgame-route-v2\0${artifact.optimalRoute}`));
    expect(artifact.alternatives[0]!.routeHash).toBe(
      sha256(`endgame-route-v2\0${artifact.alternatives[0]!.route}`),
    );
  });

  it('proves the local clear and both lock-2-divergent corridor migrations', () => {
    const primary = routeEvidence(artifact.optimalRoute);
    const alternative = routeEvidence(artifact.alternatives[0]!.route);
    const initial = primary.before[0]!;
    const local = primary.replay.locks[0]!;
    expect(stateHash(initial)).toBe(artifact.initialStateHash);
    expect(Array.from({ length: BOARD_WIDTH }, (_, x) => x).filter((x) => initial.board[39]![x] === null))
      .toEqual([4, 5]);
    expect(local.cells.filter(({ y }) => y === 39)).toEqual([{ x: 4, y: 39 }, { x: 5, y: 39 }]);
    expect(completedRowsBeforeClear(initial, local.cells)).toEqual([39]);
    expect(local.cells.filter(({ y }) => y !== 39)).toEqual([{ x: 5, y: 38 }, { x: 6, y: 38 }]);
    expect([5, 6].map((x) => primary.after[0]!.board[39]![x])).toEqual(['S', 'S']);

    const expected = [
      {
        evidence: primary,
        route: artifact.optimalRoute,
        signatures: artifact.lockSignatures,
        releases: [1, 0, 2, 1],
        remaining: [20, 20, 5, 0],
        openings: [[4], [4], [0], []],
        hashes: ['0c5b3ba4', '88515565', 'ca5bae61', '64e3c3c2'],
        migrated: 0,
      },
      {
        evidence: alternative,
        route: artifact.alternatives[0]!.route,
        signatures: artifact.alternatives[0]!.lockSignatures,
        releases: [1, 0, 1, 2],
        remaining: [20, 20, 13, 0],
        openings: [[4], [4], [1], []],
        hashes: ['0c5b3ba4', '67038bca', '021be490', '5b0f5cec'],
        migrated: 1,
      },
    ] as const;
    for (const item of expected) {
      expect(item.evidence.reconstructed).toBe(item.route);
      expect(item.evidence.replay.locks.map(({ signature }) => signature)).toEqual(item.signatures);
      expect(item.evidence.releases).toEqual(item.releases);
      expect(item.evidence.remaining).toEqual(item.remaining);
      expect(item.evidence.openings).toEqual(item.openings);
      expect(item.evidence.hashes).toEqual(item.hashes);
      expect(item.evidence.replay.locks[2]!.cells.some(({ x }) => x === OPENING_X)).toBe(true);
      expect(item.evidence.replay.locks[3]!.cells.some(({ x }) => x === item.migrated)).toBe(true);
      expect(item.evidence.replay.state.endgameCompletion).toBe('finished');
    }
    expect(primary.after[0]!.endgameCompletion).toBe('active');
    expect(primary.after[0]!.endgameTargetCells.length).toBeLessThan(initial.endgameTargetCells.length);
    expect(stateHash(primary.replay.state)).toBe(artifact.finalStateHash);
    expect(stateHash(alternative.replay.state)).toBe('5b0f5cec');
    const divergence = primary.replay.locks.findIndex((lock, index) => (
      lock.signature !== alternative.replay.locks[index]?.signature
    )) + 1;
    expect(divergence).toBe(artifact.alternatives[0]!.firstDivergenceLock);
    expect(primary.replay.locks).toHaveLength(artifact.optimalLockedPieces);
    expect(alternative.replay.locks).toHaveLength(artifact.optimalLockedPieces);
  });
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.ENDGAME_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Endgame v3 Intro-04 exact certificate', () => {
  it('exhausts every shorter public-control depth without beam or state caps', () => {
    const certificate = certifyOptimalEndgameRouteForDefinition(draft!, artifact.optimalRoute);
    expect(certificate).not.toBeNull();
    expect(certificate?.optimalLocks).toBe(artifact.optimalLockedPieces);
    expect(certificate?.initialStateHash).toBe(artifact.initialStateHash);
    expect(certificate?.exhaustedDepths).toEqual(artifact.proof.exhaustedDepths);
    expect(certificate?.exploredStateCount).toBe(artifact.proof.exploredStateCount);
    expect(certificate?.transitionCount).toBe(artifact.proof.transitionCount);
    expect(certificate?.deficitBoundPrunes).toBe(
      artifact.proof.exhaustedDepths.reduce((sum, depth) => sum + depth.boundPrunes, 0),
    );
    expect(certificate && encodeEndgameRoute(certificate.replay.commands)).toBe(artifact.optimalRoute);
    expect(certificate?.replay.locks.map(({ signature }) => signature)).toEqual(artifact.lockSignatures);
    expect(certificate?.replay.state.endgameCompletion).toBe('finished');
    expect(certificate && stateHash(certificate.replay.state)).toBe(artifact.finalStateHash);
  }, 600_000);
});
