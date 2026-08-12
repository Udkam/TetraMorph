// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs this repository-fixture test in Node while product types omit Node.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISIBLE_START_ROW } from './constants';
import { stateHash } from './engine';
import { compareEndgameTopologies } from './endgameFingerprints';
import * as introModule from './endgameV3IntroDefinitions';
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

type RouteEntry = Readonly<{
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
  alternatives: readonly RouteEntry[];
  techniqueEvidenceId: string | null;
}>;

const FIXTURE_URL = new URL(
  '../../../docs/workstreams/tetris-t37-endgame/fixtures/t37/endgame-v3-intro-01.json',
  import.meta.url,
);
const fixtureBytes = readFileSync(FIXTURE_URL, 'utf8');
const artifact = JSON.parse(fixtureBytes) as CertificateV8;
const draft = introModule.ENDGAME_V3_INTRO_DRAFTS[0]!;
const BASE_BYTES = 625;
const BASE_SHA256 = '7678C0321BC76CEED6971BD644AB6BBC21134540706F71BBE7FA1BAE91AC1FA1';
const DRAFT_BYTES = 622;
const DRAFT_SHA256 = 'DFC1DACDF8A8F0851C2F7BFCF41ED67C9088105D8583544E68A82A557223FDA8';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function authoringPayload(definition: EndgameDefinition): object {
  const hiddenCells = [...definition.hiddenCells]
    .sort((left, right) => left.y - right.y || left.x - right.x || left.type.localeCompare(right.type))
    .map(({ x, y, type }) => ({ x, y, type }));
  const anchorCells = [...definition.anchorCells]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ x, y }) => ({ x, y }));
  return {
    schema: 'endgame-authoring-definition-v1',
    stableId: definition.id,
    targetRows: definition.targetRows,
    setup: {
      seed: definition.setup.seed,
      placements: definition.setup.placements.map(({ type, rotation, x }) => ({ type, rotation, x })),
    },
    boardRows: [...definition.boardRows],
    hiddenCells,
    anchorCells,
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

function routeEvidence(definition: EndgameDefinition, route: string) {
  const replay = replayEndgameRouteForDefinition(definition, route);
  let current = replayEndgameRouteForDefinition(definition, 'S').state;
  let reconstructed = 'S';
  const releases: number[] = [];
  const remaining: number[] = [];
  for (const lock of replay.locks) {
    const matching = exhaustiveEndgameLandings(current).filter(({ lock: candidate }) => (
      candidate.signature === lock.signature
    ));
    expect(matching, lock.signature).toHaveLength(1);
    const landing = matching[0]!;
    reconstructed += encodeEndgameRoute(landing.commands);
    releases.push(landing.state.lines - current.lines);
    remaining.push(landing.state.endgameTargetCells.length);
    current = landing.state;
  }
  return { replay, reconstructed, releases, remaining };
}

function expectBaseUnchanged(reference: EndgameDefinition, bytes: string): void {
  const after = getEndgameDefinition('t3r-shaft-01');
  expect(after).toBe(reference);
  expect(JSON.stringify(after)).toBe(bytes);
  expect(new TextEncoder().encode(bytes)).toHaveLength(BASE_BYTES);
  expect(sha256(bytes).toUpperCase()).toBe(BASE_SHA256);
}

describe('Endgame v3 non-published Intro-01 authoring entry', () => {
  it('keeps one deeply frozen draft outside the live 50-level library', () => {
    const base = getEndgameDefinition('t3r-shaft-01');
    const baseBytes = JSON.stringify(base);
    expect(Object.keys(introModule)).toEqual(['ENDGAME_V3_INTRO_DRAFTS']);
    expect(ENDGAME_DEFINITIONS).toHaveLength(50);
    expect(introModule.ENDGAME_V3_INTRO_DRAFTS.filter(({ id }) => id === draft.id)).toEqual([draft]);
    const draftBytes = JSON.stringify(draft);
    expect(new TextEncoder().encode(draftBytes)).toHaveLength(DRAFT_BYTES);
    expect(sha256(draftBytes).toUpperCase()).toBe(DRAFT_SHA256);
    expect(ENDGAME_DEFINITIONS).not.toContain(draft);
    expect(Object.isFrozen(introModule.ENDGAME_V3_INTRO_DRAFTS)).toBe(true);
    expect(Object.isFrozen(draft)).toBe(true);
    expect(Object.isFrozen(draft.setup)).toBe(true);
    expect(Object.isFrozen(draft.setup.placements)).toBe(true);
    expect(draft.setup.placements.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(draft.boardRows)).toBe(true);
    expect(Object.isFrozen(draft.hiddenCells)).toBe(true);
    expect(Object.isFrozen(draft.anchorCells)).toBe(true);
    expectBaseUnchanged(base, baseBytes);
  });

  it('rebuilds the legal three-row setup and rejects every live structural match', () => {
    expect(() => validateEndgameDefinition(draft, false)).not.toThrow();
    const boardRows = replayEndgameSetup(draft.setup).slice(VISIBLE_START_ROW).map((row) => (
      row.map((cell) => cell ?? '.').join('')
    ));
    expect(boardRows).toEqual(draft.boardRows);
    expect(boardRows.filter((row) => row !== '..........')).toEqual([
      'IIIITTT.S.', '.OO.JTZZSS', '.OO.JJJZZS',
    ]);
    expect(boardRows.slice(-3).map((row) => [...row].filter((cell) => cell === '.').length))
      .toEqual([2, 2, 2]);
    expect(ENDGAME_DEFINITIONS.every((definition) => definition.seed !== draft.seed)).toBe(true);
    for (const live of ENDGAME_DEFINITIONS) {
      expect(compareEndgameTopologies(live, draft), live.id).toMatchObject({
        exactMatch: false,
        topologyMatch: false,
        nearTopology: false,
      });
    }
  });

  it('is one canonical schema-8 JSON line with all hashes rebuilt from literals', () => {
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
    for (const depth of artifact.proof.exhaustedDepths) {
      expect(Object.keys(depth)).toEqual([
        'lockedPieces', 'frontierStates', 'transitions', 'boundPrunes',
      ]);
    }
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
      proof: {
        kind: 'exhaustive-shorter-depths',
        lowerBoundVersion: 'target-column-deficit-v1',
      },
      techniqueEvidenceId: null,
    });
    expect(artifact.authoringDefinitionHash).toBe(
      sha256(`${JSON.stringify(authoringPayload(draft))}\n`),
    );
    expect(artifact.behaviorHash).toBe(sha256(`${JSON.stringify(behaviorPayload(draft))}\n`));
    expect(artifact.routeHash).toBe(sha256(`endgame-route-v2\0${artifact.optimalRoute}`));
    expect(artifact.alternatives[0]!.routeHash).toBe(
      sha256(`endgame-route-v2\0${artifact.alternatives[0]!.route}`),
    );
  });

  it('replays the optimal and early-divergent routes with readable one-then-two releases', () => {
    const primary = routeEvidence(draft, artifact.optimalRoute);
    const alternative = routeEvidence(draft, artifact.alternatives[0]!.route);
    expect(primary.reconstructed).toBe(artifact.optimalRoute);
    expect(primary.replay.locks.map(({ signature }) => signature)).toEqual(artifact.lockSignatures);
    expect(primary.releases).toEqual([0, 1, 0, 2]);
    expect(primary.remaining).toEqual([24, 16, 16, 0]);
    expect(primary.replay.state.endgameCompletion).toBe('finished');
    expect(stateHash(primary.replay.state)).toBe(artifact.finalStateHash);
    expect(alternative.reconstructed).toBe(artifact.alternatives[0]!.route);
    expect(alternative.replay.locks.map(({ signature }) => signature))
      .toEqual(artifact.alternatives[0]!.lockSignatures);
    expect(alternative.releases).toEqual([0, 1, 0, 2]);
    expect(alternative.remaining).toEqual([24, 16, 16, 0]);
    expect(alternative.replay.state.endgameCompletion).toBe('finished');
    const firstDivergence = primary.replay.locks.findIndex((lock, index) => (
      lock.signature !== alternative.replay.locks[index]?.signature
    )) + 1;
    expect(firstDivergence).toBe(artifact.alternatives[0]!.firstDivergenceLock);
    expect(alternative.replay.locks.length).toBeLessThanOrEqual(artifact.optimalLockedPieces + 2);
  });
});

// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.ENDGAME_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('Endgame v3 Intro-01 exact certificate', () => {
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
