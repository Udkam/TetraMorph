// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from './constants';
import { stateHash } from './engine';
import { comparePuzzleTopologies } from './puzzleFingerprints';
import { PUZZLE_V3_INTRO_DRAFTS } from './puzzleV3IntroDefinitions';
import {
  PUZZLE_DEFINITIONS,
  getPuzzleDefinition,
  replayPuzzleSetup,
  validatePuzzleDefinition,
  type PuzzleDefinition,
} from './puzzles';
import {
  certifyOptimalPuzzleRouteForDefinition,
  encodePuzzleRoute,
  exhaustivePuzzleLandings,
  replayPuzzleRouteForDefinition,
} from './puzzleRouteSearch';

type Depth = Readonly<{
  lockedPieces: number;
  frontierStates: number;
  transitions: number;
  boundPrunes: number;
}>;

type Alternative = Readonly<{
  route: string;
  routeHash: string;
  lockSignatures: readonly string[];
  firstDivergenceLock: number;
}>;

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
    exhaustedDepths: readonly Depth[];
    exploredStateCount: number;
    transitionCount: number;
  }>;
  alternatives: readonly Alternative[];
  techniqueEvidenceId: string | null;
}>;

const FIXTURE_URL = new URL(
  '../../../docs/workstreams/tetris-t37-puzzle/puzzle-v3-intro-03.json',
  import.meta.url,
);
const fixtureBytes = readFileSync(FIXTURE_URL, 'utf8');
const artifact = JSON.parse(fixtureBytes) as CertificateV8;
const intro01 = PUZZLE_V3_INTRO_DRAFTS[0]!;
const intro02 = PUZZLE_V3_INTRO_DRAFTS[1]!;
const draft = PUZZLE_V3_INTRO_DRAFTS[2]!;
const LIVE_BYTES = 625;
const LIVE_SHA256 = '0979CED2EEA842DC7722E8236229CBD4566CC6468D17E67007FD316D7740A7D2';
const PRIOR_DRAFTS = Object.freeze([
  Object.freeze({ definition: intro01, bytes: 622, sha: 'DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8' }),
  Object.freeze({ definition: intro02, bytes: 621, sha: '1E67D9E72F64769DDF4703FF9909A3C08EA4454638662B7E76DD1E001884A9EB' }),
]);
const ROUTE_GEOMETRY = Object.freeze([
  Object.freeze({ run: [3, 4, 5, 6], blockers: ['4,34', '5,34'], open: ['3,34', '6,34'] }),
  Object.freeze({ run: [2, 3, 4, 5], blockers: ['3,34', '4,34'], open: ['2,34', '5,34'] }),
]);

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function authoringPayload(definition: PuzzleDefinition): object {
  return {
    schema: 'puzzle-authoring-definition-v1',
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
    rulesetRevision: 'puzzle-v3',
  };
}

function behaviorPayload(definition: PuzzleDefinition): object {
  const initialBoardRows = definition.boardRows.map((row) => row.replace(/[IJLOSTZ]/g, '#'));
  const targetCells = initialBoardRows.flatMap((row, y) => [...row].flatMap((cell, x) => (
    cell === '#' ? [{ x, y }] : []
  )));
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
    anchorCells: [],
  };
}

function routeEvidence(route: string) {
  const replay = replayPuzzleRouteForDefinition(draft, route);
  let current = replayPuzzleRouteForDefinition(draft, 'S').state;
  let reconstructed = 'S';
  const releases: number[] = [];
  const remaining: number[] = [];
  const before = [];
  for (const lock of replay.locks) {
    before.push(current);
    const matching = exhaustivePuzzleLandings(current).filter(({ lock: candidate }) => (
      candidate.signature === lock.signature
    ));
    expect(matching, lock.signature).toHaveLength(1);
    const landing = matching[0]!;
    reconstructed += encodePuzzleRoute(landing.commands);
    releases.push(landing.state.lines - current.lines);
    remaining.push(landing.state.puzzleTargetCells.length);
    current = landing.state;
  }
  return { replay, reconstructed, releases, remaining, before };
}

describe('Puzzle v3 non-published Intro-03 authoring entry', () => {
  it('appends one deeply frozen draft while preserving every accepted baseline', () => {
    const liveBytes = JSON.stringify(getPuzzleDefinition('t3r-shaft-03'));
    expect(PUZZLE_DEFINITIONS).toHaveLength(50);
    expect(PUZZLE_V3_INTRO_DRAFTS.filter(({ id }) => id === draft.id)).toEqual([draft]);
    expect(PUZZLE_DEFINITIONS).not.toContain(draft);
    expect(new TextEncoder().encode(liveBytes)).toHaveLength(LIVE_BYTES);
    expect(sha256(liveBytes).toUpperCase()).toBe(LIVE_SHA256);
    for (const prior of PRIOR_DRAFTS) {
      const serialized = JSON.stringify(prior.definition);
      expect(new TextEncoder().encode(serialized)).toHaveLength(prior.bytes);
      expect(sha256(serialized).toUpperCase()).toBe(prior.sha);
    }
    expect(Object.isFrozen(PUZZLE_V3_INTRO_DRAFTS)).toBe(true);
    expect([draft, draft.setup, draft.setup.placements, ...draft.setup.placements,
      draft.boardRows, draft.hiddenCells, draft.anchorCells].every(Object.isFrozen)).toBe(true);
  });

  it('rebuilds one unique legal four-row support lesson', () => {
    expect(() => validatePuzzleDefinition(draft, false)).not.toThrow();
    const rows = replayPuzzleSetup(draft.setup).slice(VISIBLE_START_ROW).map((row) => (
      row.map((cell) => cell ?? '.').join('')
    ));
    expect(rows).toEqual(draft.boardRows);
    expect(rows.filter((row) => row !== '..........')).toEqual([
      '...ZJOOSLL', 'L.ZZJOOSSL', 'L.ZJJTTTSL', 'LLIIIIT...',
    ]);
    expect(rows.slice(-4).map((row) => [...row].filter((cell) => cell === '.').length))
      .toEqual([3, 1, 1, 3]);
    expect([...PUZZLE_DEFINITIONS, intro01, intro02].every(({ seed }) => seed !== draft.seed)).toBe(true);
    for (const other of [...PUZZLE_DEFINITIONS, intro01, intro02]) {
      expect(comparePuzzleTopologies(other, draft), other.id).toMatchObject({
        exactMatch: false,
        topologyMatch: false,
        nearTopology: false,
      });
    }
  });

  it('is canonical schema 8 and rebuilds every frozen hash', () => {
    expect(fixtureBytes.charCodeAt(0)).not.toBe(0xfeff);
    expect(fixtureBytes).not.toContain('\r');
    expect(fixtureBytes.match(/\n/g)).toHaveLength(1);
    expect(fixtureBytes).toBe(`${JSON.stringify(artifact)}\n`);
    expect(new TextEncoder().encode(fixtureBytes)).toHaveLength(1603);
    expect(sha256(fixtureBytes)).toBe('f24752c4dafa95aeadaa0ca8e7c83916d367b868dd572ee38cd03ab33af44121');
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
    expect(artifact.alternatives).toHaveLength(1);
    expect(Object.keys(artifact.alternatives[0]!)).toEqual([
      'route', 'routeHash', 'lockSignatures', 'firstDivergenceLock',
    ]);
    expect(artifact).toMatchObject({
      schemaVersion: 8,
      campaignRevision: 3,
      rulesetRevision: 'puzzle-v3',
      routeTokenVersion: 2,
      searchStateKeyVersion: 2,
      operationMetric: 'locked-tetromino',
      levelId: draft.id,
      optimalLockedPieces: 5,
      solutionMultiplicity: 'multiple',
      proof: { kind: 'exhaustive-shorter-depths', lowerBoundVersion: 'target-column-deficit-v1' },
      techniqueEvidenceId: null,
    });
    expect(artifact.authoringDefinitionHash).toBe(sha256(`${JSON.stringify(authoringPayload(draft))}\n`));
    expect(artifact.behaviorHash).toBe(sha256(`${JSON.stringify(behaviorPayload(draft))}\n`));
    expect(artifact.routeHash).toBe(sha256(`puzzle-route-v2\0${artifact.optimalRoute}`));
    expect(artifact.alternatives[0]!.routeHash).toBe(
      sha256(`puzzle-route-v2\0${artifact.alternatives[0]!.route}`),
    );
  });

  it('proves both early-divergent routes build support before spanning it', () => {
    const routes = [routeEvidence(artifact.optimalRoute), routeEvidence(artifact.alternatives[0]!.route)];
    routes.forEach((evidence, index) => {
      const signatures = index === 0 ? artifact.lockSignatures : artifact.alternatives[0]!.lockSignatures;
      expect(evidence.reconstructed).toBe(index === 0 ? artifact.optimalRoute : artifact.alternatives[0]!.route);
      expect(evidence.replay.locks.map(({ signature }) => signature)).toEqual(signatures);
      expect(evidence.releases).toEqual([0, 0, 2, 1, 1]);
      expect(evidence.remaining).toEqual([32, 32, 16, 7, 0]);
      const support = evidence.replay.locks[0]!;
      const bridge = evidence.replay.locks[1]!;
      const initial = evidence.before[0]!;
      const preBridge = evidence.before[1]!;
      expect(support.cells.every(({ x, y }) => initial.board[y]![x] === null)).toBe(true);
      expect(bridge.cells).toEqual(ROUTE_GEOMETRY[index]!.run.map((x) => ({ x, y: 33 })));
      const shifted = bridge.cells.map(({ x, y }) => ({ x, y: y + 1 }));
      const blockers = shifted.filter(({ x, y }) => preBridge.board[y]![x] !== null);
      expect(blockers.map(({ x, y }) => `${x},${y}`)).toEqual(ROUTE_GEOMETRY[index]!.blockers);
      const supportKeys = new Set(support.cells.map(({ x, y }) => `${x},${y}`));
      expect(blockers.every(({ x, y }) => supportKeys.has(`${x},${y}`))).toBe(true);
      expect(ROUTE_GEOMETRY[index]!.open.every((cell) => {
        const [x, y] = cell.split(',').map(Number);
        return preBridge.board[y]![x] === null;
      })).toBe(true);
      expect(evidence.replay.state.puzzleCompletion).toBe('finished');
    });
    expect(stateHash(routes[0]!.replay.state)).toBe(artifact.finalStateHash);
    expect(stateHash(routes[1]!.replay.state)).toBe('92a715fe');
    const divergence = routes[0]!.replay.locks.findIndex((lock, index) => (
      lock.signature !== routes[1]!.replay.locks[index]?.signature
    )) + 1;
    expect(divergence).toBe(artifact.alternatives[0]!.firstDivergenceLock);
    expect(routes[1]!.replay.locks.length).toBeLessThanOrEqual(artifact.optimalLockedPieces + 2);
  });
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.PUZZLE_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Puzzle v3 Intro-03 exact certificate', () => {
  it('exhausts every shorter public-control depth without beam or state caps', () => {
    const certificate = certifyOptimalPuzzleRouteForDefinition(draft, artifact.optimalRoute);
    expect(certificate).not.toBeNull();
    expect(certificate?.optimalLocks).toBe(artifact.optimalLockedPieces);
    expect(certificate?.initialStateHash).toBe(artifact.initialStateHash);
    expect(certificate?.exhaustedDepths).toEqual(artifact.proof.exhaustedDepths);
    expect(certificate?.exploredStateCount).toBe(artifact.proof.exploredStateCount);
    expect(certificate?.transitionCount).toBe(artifact.proof.transitionCount);
    expect(certificate?.deficitBoundPrunes).toBe(
      artifact.proof.exhaustedDepths.reduce((sum, depth) => sum + depth.boundPrunes, 0),
    );
    expect(certificate && encodePuzzleRoute(certificate.replay.commands)).toBe(artifact.optimalRoute);
    expect(certificate?.replay.locks.map(({ signature }) => signature)).toEqual(artifact.lockSignatures);
    expect(certificate?.replay.state.puzzleCompletion).toBe('finished');
    expect(certificate && stateHash(certificate.replay.state)).toBe(artifact.finalStateHash);
  }, 600_000);
});
