// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from './constants';
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
  '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-02.json',
  import.meta.url,
);
const fixtureBytes = readFileSync(FIXTURE_URL, 'utf8');
const artifact = JSON.parse(fixtureBytes) as CertificateV8;
const intro01 = ENDGAME_V3_INTRO_DRAFTS[0]!;
const draft = ENDGAME_V3_INTRO_DRAFTS[1]!;
const WELL_X = 6;
const INTRO_01_BYTES = 622;
const INTRO_01_SHA256 = 'DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8';
const LIVE_BYTES = 626;
const LIVE_SHA256 = 'E83542E1A19A248EA26261A7504913A6A6B155DA9EA089622DF1BC04BDEC55B4';

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

function routeEvidence(route: string) {
  const replay = replayEndgameRouteForDefinition(draft, route);
  let current = replayEndgameRouteForDefinition(draft, 'S').state;
  let reconstructed = 'S';
  const releases: number[] = [];
  const remaining: number[] = [];
  const preFinalWellOpen: boolean[] = [];

  replay.locks.forEach((lock, index) => {
    const matching = exhaustiveEndgameLandings(current).filter(({ lock: candidate }) => (
      candidate.signature === lock.signature
    ));
    expect(matching, lock.signature).toHaveLength(1);
    const landing = matching[0]!;
    reconstructed += encodeEndgameRoute(landing.commands);
    releases.push(landing.state.lines - current.lines);
    remaining.push(landing.state.endgameTargetCells.length);
    if (index < replay.locks.length - 1) {
      preFinalWellOpen.push([37, 38, 39].every((y) => landing.state.board[y]![WELL_X] === null));
    }
    current = landing.state;
  });
  return { replay, reconstructed, releases, remaining, preFinalWellOpen };
}

describe('Endgame v3 non-published Intro-02 authoring entry', () => {
  it('appends one deeply frozen draft while preserving both accepted baselines', () => {
    const live = getEndgameDefinition('t3r-shaft-02');
    const liveBytes = JSON.stringify(live);
    const intro01Bytes = JSON.stringify(intro01);
    expect(ENDGAME_DEFINITIONS).toHaveLength(46);
    expect(ENDGAME_V3_INTRO_DRAFTS.filter(({ id }) => id === draft.id)).toEqual([draft]);
    expect(ENDGAME_DEFINITIONS).not.toContain(draft);
    expect(new TextEncoder().encode(liveBytes)).toHaveLength(LIVE_BYTES);
    expect(sha256(liveBytes).toUpperCase()).toBe(LIVE_SHA256);
    expect(new TextEncoder().encode(intro01Bytes)).toHaveLength(INTRO_01_BYTES);
    expect(sha256(intro01Bytes).toUpperCase()).toBe(INTRO_01_SHA256);
    expect(Object.isFrozen(ENDGAME_V3_INTRO_DRAFTS)).toBe(true);
    expect(Object.isFrozen(draft)).toBe(true);
    expect(Object.isFrozen(draft.setup)).toBe(true);
    expect(Object.isFrozen(draft.setup.placements)).toBe(true);
    expect(draft.setup.placements.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(draft.boardRows)).toBe(true);
    expect(Object.isFrozen(draft.hiddenCells)).toBe(true);
    expect(Object.isFrozen(draft.anchorCells)).toBe(true);
  });

  it('rebuilds one unique three-row well and rejects every prior structure match', () => {
    expect(() => validateEndgameDefinition(draft, false)).not.toThrow();
    const rows = replayEndgameSetup(draft.setup).slice(VISIBLE_START_ROW).map((row) => (
      row.map((cell) => cell ?? '.').join('')
    ));
    expect(rows).toEqual(draft.boardRows);
    expect(rows.filter((row) => row !== '..........')).toEqual([
      '.T.JJJ..SS', 'TTTZZJ.SSL', 'IIIIZZ.LLL',
    ]);
    expect(rows.slice(-3).map((row) => [...row].filter((cell) => cell === '.').length))
      .toEqual([4, 1, 1]);
    const wells = Array.from({ length: 10 }, (_, x) => x).filter((x) => (
      rows.slice(-3).every((row) => row[x] === '.')
    ));
    expect(wells).toEqual([WELL_X]);
    expect([...ENDGAME_DEFINITIONS, intro01].every(({ seed }) => seed !== draft.seed)).toBe(true);
    for (const other of [...ENDGAME_DEFINITIONS, intro01]) {
      expect(compareEndgameTopologies(other, draft), other.id).toMatchObject({
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
      rulesetRevision: 'endgame-v3',
      routeTokenVersion: 2,
      searchStateKeyVersion: 2,
      operationMetric: 'locked-tetromino',
      levelId: draft.id,
      optimalLockedPieces: 4,
      solutionMultiplicity: 'multiple',
      proof: { kind: 'exhaustive-shorter-depths', lowerBoundVersion: 'target-column-deficit-v1' },
      techniqueEvidenceId: null,
    });
    expect(artifact.authoringDefinitionHash).toBe(sha256(`${JSON.stringify(authoringPayload(draft))}\n`));
    expect(artifact.behaviorHash).toBe(sha256(`${JSON.stringify(behaviorPayload(draft))}\n`));
    expect(artifact.routeHash).toBe(sha256(`endgame-route-v2\0${artifact.optimalRoute}`));
    expect(artifact.alternatives[0]!.routeHash).toBe(
      sha256(`endgame-route-v2\0${artifact.alternatives[0]!.route}`),
    );
  });

  it('proves both routes preserve the well until the same final vertical I', () => {
    const primary = routeEvidence(artifact.optimalRoute);
    const alternative = routeEvidence(artifact.alternatives[0]!.route);
    for (const [evidence, signatures] of [
      [primary, artifact.lockSignatures],
      [alternative, artifact.alternatives[0]!.lockSignatures],
    ] as const) {
      expect(evidence.reconstructed).toBe(encodeEndgameRoute(evidence.replay.commands));
      expect(evidence.replay.locks.map(({ signature }) => signature)).toEqual(signatures);
      expect(evidence.releases).toEqual([0, 0, 0, 3]);
      expect(evidence.remaining).toEqual([24, 24, 24, 0]);
      expect(evidence.preFinalWellOpen).toEqual([true, true, true]);
      const final = evidence.replay.locks.at(-1)!;
      expect(final.piece).toBe('I');
      expect(final.cells).toEqual([36, 37, 38, 39].map((y) => ({ x: WELL_X, y })));
      expect(evidence.replay.state.endgameCompletion).toBe('finished');
    }
    expect(primary.reconstructed).toBe(artifact.optimalRoute);
    expect(stateHash(primary.replay.state)).toBe(artifact.finalStateHash);
    expect(alternative.reconstructed).toBe(artifact.alternatives[0]!.route);
    expect(stateHash(alternative.replay.state)).toBe('adc8c63c');
    const divergence = primary.replay.locks.findIndex((lock, index) => (
      lock.signature !== alternative.replay.locks[index]?.signature
    )) + 1;
    expect(divergence).toBe(artifact.alternatives[0]!.firstDivergenceLock);
    expect(alternative.replay.locks.length).toBeLessThanOrEqual(artifact.optimalLockedPieces + 2);
  });
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.ENDGAME_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Endgame v3 Intro-02 exact certificate', () => {
  it('exhausts every shorter public-control depth without beam or state caps', () => {
    const certificate = certifyOptimalEndgameRouteForDefinition(draft, artifact.optimalRoute);
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
