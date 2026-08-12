// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from './constants';
import { createInitialState, dispatch, stateHash } from './engine';
import {
  getPuzzleDefinition,
  replayPuzzleSetup,
  validatePuzzleDefinition,
  type PuzzleDefinition,
  type PuzzleSetupHistory,
} from './puzzles';
import {
  certifyOptimalPuzzleRouteForDefinition,
  encodePuzzleRoute,
  exhaustivePuzzleLandings,
  metricsForPuzzleRoute,
  puzzleRouteLockLowerBound,
  replayPuzzleRouteForDefinition,
} from './puzzleRouteSearch';
import type { PuzzleId } from './types';

type PrototypeArtifact = Readonly<{
  artifactVersion: string;
  certificate: Readonly<{
    deficitBoundPrunes: number;
    exhaustedFrontierWidths: readonly number[];
    exploredStateCount: number;
    initialStateHash: string;
    optimalLocks: number;
    transitionCount: number;
  }>;
  claim: string;
  definition: Readonly<{
    anchorCells: readonly [];
    baseId: PuzzleId;
    boardRows: readonly string[];
    gameplaySeed: number;
    hiddenCells: readonly [];
    setup: PuzzleSetupHistory;
    targetRows: number;
  }>;
  provenance: Readonly<{
    algorithmVersion: string;
    candidateIdentitySha256: string;
    manifestFileSha256: string;
    manifestHash: string;
    manifestInputFileSha256: string;
    placementSha256: string;
    profileIndex: number;
    rawFileSha256: string;
    rawResultHash: string;
    seriesVersion: string;
    shardIndex: number;
    targetMask: string;
    tilingOrdinal: number;
    typedBoardSha256: string;
  }>;
  route: Readonly<{
    commandStream: string;
    cumulativeClears: readonly number[];
    finalStateHash: string;
    initialStateHash: string;
    lockSignatures: readonly string[];
    lowerBounds: readonly number[];
    metrics: Readonly<{
      commandCount: number;
      locks: number;
      moveCount: number;
      rotationCount: number;
    }>;
    remainingTargetCounts: readonly number[];
    rowReleaseCounts: readonly number[];
  }>;
  schemaVersion: number;
}>;

const FIXTURE_URL = new URL(
  '../../../docs/workstreams/tetris-t37-puzzle/puzzle-v3-ten-row-prototype.json',
  import.meta.url,
);
const fixtureBytes = readFileSync(FIXTURE_URL, 'utf8');
const artifact = JSON.parse(fixtureBytes) as PrototypeArtifact;
const BASE_ID = 't3r-shaft-01' as const;
const BASE_BYTES = 625;
const BASE_SHA256 = '7678C0321BC76CEED6971BD644AB6BBC21134540706F71BBE7FA1BAE91AC1FA1';
const PROVENANCE = Object.freeze({
  algorithmVersion: 'tiling-first-sharded-v2',
  candidateIdentitySha256: '0BC992097687B867AB10EA372467D0FE0F6FD7F4AF9FE552E8D168CB4C478C28',
  manifestFileSha256: '59596FA1C1FE2A5347BAA579690B4A5EBC78C9C0BA6B05085FB16C0C0DCC74D1',
  manifestHash: '25BF784987C3FE466F7DA084076959EAA0E4825F4FEF646EE9E1F016DA89616D',
  manifestInputFileSha256: '23F8D13471DDD39627A4883C6B142F5D51CAB3D9000D067E0AD0FB15509630A3',
  placementSha256: 'B2D5C90F4BE0018F6B9BCB63A371E2B735E220A5607E1599D0532730E9E1F6DA',
  profileIndex: 1,
  rawFileSha256: '74550EA86D7C9424F71C904B6A8678C6FAE48C2C0719C0F93A13338CB5DA9891',
  rawResultHash: 'A0C94A2D1C96F5AA595296AF614E0BE762AD88A371C578A235102F2CF31F7819',
  seriesVersion: 'seed-series-20001-200000-20000-v1',
  shardIndex: 4,
  targetMask: 'DFF7FCFFFBFE3DFE3FFCFF387',
  tilingOrdinal: 82,
  typedBoardSha256: '9EE9FBC3C1AC6197DECB642B87C957F0534E219E95D455CEC7DF1C17CA4B409E',
});

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase();
}

function canonicalBaseBytes(): string {
  return JSON.stringify(getPuzzleDefinition(BASE_ID));
}

function prototypeDefinition(): PuzzleDefinition {
  const source = getPuzzleDefinition(artifact.definition.baseId);
  const setup = Object.freeze({
    placements: Object.freeze(artifact.definition.setup.placements.map((placement) => (
      Object.freeze({ ...placement })
    ))),
    seed: artifact.definition.setup.seed,
  });
  return Object.freeze({
    ...source,
    name: 'F3C ten-row non-published prototype',
    seed: artifact.definition.gameplaySeed,
    targetRows: artifact.definition.targetRows,
    setup,
    boardRows: Object.freeze([...artifact.definition.boardRows]),
    hiddenCells: Object.freeze([]),
    anchorCells: Object.freeze([]),
  });
}

function startedState(definition: PuzzleDefinition) {
  const initial = createInitialState(
    0x51a1f00d,
    'puzzle',
    definition.id,
    undefined,
    undefined,
    definition,
  );
  return dispatch(initial, { type: 'start' }).state;
}

function expectBaseUnchanged(reference: PuzzleDefinition, bytes: string): void {
  const after = getPuzzleDefinition(BASE_ID);
  expect(after).toBe(reference);
  expect(canonicalBaseBytes()).toBe(bytes);
  expect(new TextEncoder().encode(bytes)).toHaveLength(BASE_BYTES);
  expect(sha256(bytes)).toBe(BASE_SHA256);
}

describe('Puzzle v3 non-published ten-row prototype artifact', () => {
  it('is one canonical UTF-8/LF JSON line with the exact frozen schema and provenance', () => {
    expect(fixtureBytes.charCodeAt(0)).not.toBe(0xfeff);
    expect(fixtureBytes).not.toContain('\r');
    expect(fixtureBytes.match(/\n/g)).toHaveLength(1);
    expect(fixtureBytes).toBe(`${JSON.stringify(artifact)}\n`);
    expect(Object.keys(artifact)).toEqual([
      'artifactVersion', 'certificate', 'claim', 'definition', 'provenance', 'route', 'schemaVersion',
    ]);
    expect(Object.keys(artifact.certificate)).toEqual([
      'deficitBoundPrunes', 'exhaustedFrontierWidths', 'exploredStateCount',
      'initialStateHash', 'optimalLocks', 'transitionCount',
    ]);
    expect(Object.keys(artifact.definition)).toEqual([
      'anchorCells', 'baseId', 'boardRows', 'gameplaySeed', 'hiddenCells', 'setup', 'targetRows',
    ]);
    expect(Object.keys(artifact.definition.setup)).toEqual(['placements', 'seed']);
    for (const placement of artifact.definition.setup.placements) {
      expect(Object.keys(placement)).toEqual(['rotation', 'type', 'x']);
    }
    expect(Object.keys(artifact.provenance)).toEqual([
      'algorithmVersion', 'candidateIdentitySha256', 'manifestFileSha256', 'manifestHash',
      'manifestInputFileSha256', 'placementSha256', 'profileIndex', 'rawFileSha256',
      'rawResultHash', 'seriesVersion', 'shardIndex', 'targetMask', 'tilingOrdinal',
      'typedBoardSha256',
    ]);
    expect(Object.keys(artifact.route)).toEqual([
      'commandStream', 'cumulativeClears', 'finalStateHash', 'initialStateHash',
      'lockSignatures', 'lowerBounds', 'metrics', 'remainingTargetCounts', 'rowReleaseCounts',
    ]);
    expect(Object.keys(artifact.route.metrics)).toEqual([
      'commandCount', 'locks', 'moveCount', 'rotationCount',
    ]);
    expect(artifact).toMatchObject({
      artifactVersion: 't37-puzzle-v3-ten-row-prototype-v1',
      claim: 'T37 F3C non-published ten-row prototype; current-Core replay and no-beam exact certificate are mandatory.',
      schemaVersion: 1,
      provenance: PROVENANCE,
    });
    expect(artifact.definition).toMatchObject({
      anchorCells: [],
      baseId: BASE_ID,
      gameplaySeed: 4091,
      hiddenCells: [],
      targetRows: 10,
      setup: { seed: 106933 },
    });
    expect(artifact.definition.setup.placements).toHaveLength(20);
    expect(artifact.definition.boardRows).toHaveLength(20);
  });

  it('replays the literal setup and starts the independent gameplay bag without mutating the base', () => {
    const base = getPuzzleDefinition(BASE_ID);
    const baseBytes = canonicalBaseBytes();
    expect(new TextEncoder().encode(baseBytes)).toHaveLength(BASE_BYTES);
    expect(sha256(baseBytes)).toBe(BASE_SHA256);

    const definition = prototypeDefinition();
    expect(() => validatePuzzleDefinition(definition, false)).not.toThrow();
    const setupBoard = replayPuzzleSetup(definition.setup);
    expect(setupBoard.slice(VISIBLE_START_ROW).map((row) => (
      row.map((cell) => cell ?? '.').join('')
    ))).toEqual(artifact.definition.boardRows);
    expect(setupBoard.slice(0, VISIBLE_START_ROW).flat().filter(Boolean)).toHaveLength(0);
    expect(setupBoard.flat().filter(Boolean)).toHaveLength(80);

    const started = startedState(definition);
    expect(started.active?.type).toBe('I');
    expect(started.queue).toEqual(['O', 'T', 'J', 'L', 'S']);
    expect(started.randomizer.bag).toEqual(['Z']);
    expect(stateHash(started)).toBe(artifact.route.initialStateHash);
    expect(puzzleRouteLockLowerBound(started)).toBe(artifact.route.lowerBounds[0]);
    expectBaseUnchanged(base, baseBytes);
  });

  it('reconstructs every lock through exhaustive landings and replays every settled prefix', () => {
    const base = getPuzzleDefinition(BASE_ID);
    const baseBytes = canonicalBaseBytes();
    const definition = prototypeDefinition();
    let current = startedState(definition);
    let commandStream = 'S';
    const signatures: string[] = [];
    const cumulativeClears: number[] = [];
    const rowReleaseCounts: number[] = [];
    const remainingTargetCounts: number[] = [];
    const lowerBounds = [puzzleRouteLockLowerBound(current)];

    for (const expectedSignature of artifact.route.lockSignatures) {
      const matching = exhaustivePuzzleLandings(current).filter(({ lock }) => (
        lock.signature === expectedSignature
      ));
      expect(matching, expectedSignature).toHaveLength(1);
      const landing = matching[0]!;
      const previousLines = current.lines;
      current = landing.state;
      commandStream += encodePuzzleRoute(landing.commands);
      signatures.push(landing.lock.signature);
      cumulativeClears.push(current.lines);
      rowReleaseCounts.push(current.lines - previousLines);
      remainingTargetCounts.push(current.puzzleTargetCells.length);
      lowerBounds.push(puzzleRouteLockLowerBound(current));

      const prefixReplay = replayPuzzleRouteForDefinition(definition, commandStream);
      expect(encodePuzzleRoute(prefixReplay.commands)).toBe(commandStream);
      expect(prefixReplay.locks.map(({ signature }) => signature)).toEqual(signatures);
      expect(prefixReplay.state.lines).toBe(current.lines);
      expect(prefixReplay.state.puzzleTargetCells).toHaveLength(current.puzzleTargetCells.length);
    }

    expect(commandStream).toBe(artifact.route.commandStream);
    expect(metricsForPuzzleRoute(commandStream)).toEqual(artifact.route.metrics);
    expect(signatures).toEqual(artifact.route.lockSignatures);
    expect(cumulativeClears).toEqual(artifact.route.cumulativeClears);
    expect(rowReleaseCounts).toEqual(artifact.route.rowReleaseCounts);
    expect(remainingTargetCounts).toEqual(artifact.route.remainingTargetCounts);
    expect(lowerBounds).toEqual(artifact.route.lowerBounds);

    const replay = replayPuzzleRouteForDefinition(definition, artifact.route.commandStream);
    expect(encodePuzzleRoute(replay.commands)).toBe(artifact.route.commandStream);
    expect(replay.locks.map(({ signature }) => signature)).toEqual(artifact.route.lockSignatures);
    expect(replay.state.status).toBe('finished');
    expect(replay.state.puzzleCompletion).toBe('finished');
    expect(replay.state.puzzleTargetCells).toHaveLength(0);
    expect(replay.state.lines).toBe(10);
    expect(replay.state.pieceCount).toBe(5);
    expect(stateHash(replay.state)).toBe(artifact.route.finalStateHash);
    expectBaseUnchanged(base, baseBytes);
  });
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.PUZZLE_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Puzzle v3 ten-row exact certificate', () => {
  it('exhausts every shorter public-control depth without beam or state caps', () => {
    const base = getPuzzleDefinition(BASE_ID);
    const baseBytes = canonicalBaseBytes();
    const definition = prototypeDefinition();
    const certificate = certifyOptimalPuzzleRouteForDefinition(
      definition,
      artifact.route.commandStream,
    );
    expect(certificate).not.toBeNull();
    expect(certificate?.exhaustedDepths).toEqual([
      { lockedPieces: 0, frontierStates: 1, transitions: 0, boundPrunes: 1 },
    ]);
    expect(certificate && {
      deficitBoundPrunes: certificate.deficitBoundPrunes,
      exhaustedFrontierWidths: certificate.exhaustedFrontierWidths,
      exploredStateCount: certificate.exploredStateCount,
      initialStateHash: certificate.initialStateHash,
      optimalLocks: certificate.optimalLocks,
      transitionCount: certificate.transitionCount,
    }).toEqual(artifact.certificate);
    expect(certificate && encodePuzzleRoute(certificate.replay.commands)).toBe(
      artifact.route.commandStream,
    );
    expect(certificate?.replay.locks.map(({ signature }) => signature)).toEqual(
      artifact.route.lockSignatures,
    );
    expect(certificate?.replay.state.puzzleCompletion).toBe('finished');
    expect(certificate && stateHash(certificate.replay.state)).toBe(artifact.route.finalStateHash);
    expectBaseUnchanged(base, baseBytes);
  });
});
