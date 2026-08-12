import { describe, expect, it } from 'vitest';
import { ENDGAME_OPTIMAL_CERTIFICATES } from '../../endgameMastery';
import { getEndgameDefinition, type EndgameDefinition } from './endgames';
import {
  certifyOptimalEndgameRoute,
  certifyOptimalEndgameRouteForDefinition,
  encodeEndgameRoute,
  type EndgameOptimalRouteCertificate,
  type EndgameOptimalRouteDepthRecord,
} from './endgameRouteSearch';

function freezeDepthRecords(
  records: readonly EndgameOptimalRouteDepthRecord[],
): readonly EndgameOptimalRouteDepthRecord[] {
  return Object.freeze(records.map((record) => Object.freeze(record)));
}

const MASTERY_EXHAUSTED_DEPTHS = Object.freeze({
  't5r-arc-13': freezeDepthRecords([
    { lockedPieces: 0, frontierStates: 1, transitions: 17, boundPrunes: 12 },
    { lockedPieces: 1, frontierStates: 5, transitions: 170, boundPrunes: 157 },
    { lockedPieces: 2, frontierStates: 13, transitions: 442, boundPrunes: 429 },
    { lockedPieces: 3, frontierStates: 13, transitions: 221, boundPrunes: 0 },
  ]),
  't5r-current-12': freezeDepthRecords([
    { lockedPieces: 0, frontierStates: 1, transitions: 17, boundPrunes: 0 },
    { lockedPieces: 1, frontierStates: 17, transitions: 298, boundPrunes: 73 },
    { lockedPieces: 2, frontierStates: 225, transitions: 3_925, boundPrunes: 2_972 },
    { lockedPieces: 3, frontierStates: 953, transitions: 33_696, boundPrunes: 31_806 },
    { lockedPieces: 4, frontierStates: 1_890, transitions: 66_166, boundPrunes: 0 },
  ]),
  't5r-prism-11': freezeDepthRecords([
    { lockedPieces: 0, frontierStates: 1, transitions: 17, boundPrunes: 0 },
    { lockedPieces: 1, frontierStates: 17, transitions: 586, boundPrunes: 158 },
    { lockedPieces: 2, frontierStates: 428, transitions: 15_098, boundPrunes: 10_717 },
    { lockedPieces: 3, frontierStates: 4_381, transitions: 77_936, boundPrunes: 72_201 },
    { lockedPieces: 4, frontierStates: 5_735, transitions: 201_990, boundPrunes: 0 },
  ]),
});

const driftDefinition = getEndgameDefinition('t5r-drift-08');
const dualAnchorDriftDefinition: EndgameDefinition = Object.freeze({
  ...driftDefinition,
  anchorCells: Object.freeze([...driftDefinition.anchorCells, { x: 4, y: 16 }]),
});
const ANCHOR_ADMISSION_CERTIFICATES = Object.freeze([
  Object.freeze({
    label: 'one-anchor',
    definition: driftDefinition,
    route: 'SQLLLHTTTLDDDDDDDDDDDDDDDDLLHTTTTTTTTTTTTCRRRRHTTTTTTTTTTTTRHTTTTTTTTTTTT',
    optimalOperations: 4,
    initialStateHash: 'e9b71c20',
    exhaustedDepths: freezeDepthRecords([
      { lockedPieces: 0, frontierStates: 1, transitions: 20, boundPrunes: 0 },
      { lockedPieces: 1, frontierStates: 20, transitions: 769, boundPrunes: 0 },
      { lockedPieces: 2, frontierStates: 769, transitions: 14_582, boundPrunes: 0 },
    ]),
    exhaustedFrontierWidths: Object.freeze([1, 20, 769]),
    exploredStateCount: 790,
    transitionCount: 15_371,
    deficitBoundPrunes: 0,
    supportedCellCount: 4,
  }),
  Object.freeze({
    label: 'two-anchor',
    definition: dualAnchorDriftDefinition,
    route: 'SQHTTTQLLDDDDDDDDDDDDDDDCHTTTTTTTTTTTTCRRRRHTTTTTTTTTTTTCRDDDDDDDDDDDDDDDDDCHTTTTTTTTTTTT',
    optimalOperations: 4,
    initialStateHash: '696f86a0',
    exhaustedDepths: freezeDepthRecords([
      { lockedPieces: 0, frontierStates: 1, transitions: 20, boundPrunes: 0 },
      { lockedPieces: 1, frontierStates: 20, transitions: 750, boundPrunes: 0 },
      { lockedPieces: 2, frontierStates: 750, transitions: 13_870, boundPrunes: 0 },
    ]),
    exhaustedFrontierWidths: Object.freeze([1, 20, 750]),
    exploredStateCount: 771,
    transitionCount: 14_640,
    deficitBoundPrunes: 0,
    supportedCellCount: 4,
  }),
]);

// The proof is intentionally opt-in: complete public-control searches can take several
// minutes on one worker. Release verification runs this file once with
// ENDGAME_EXACT_CERTIFICATES=1; the ordinary suite still validates every frozen field.
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.ENDGAME_EXACT_CERTIFICATES === '1';

function expectDepthTelemetry(
  certificate: EndgameOptimalRouteCertificate,
  expectedDepths: readonly EndgameOptimalRouteDepthRecord[],
): void {
  expect(certificate.exhaustedDepths).toEqual(expectedDepths);
  expect(Object.isFrozen(certificate.exhaustedDepths)).toBe(true);
  certificate.exhaustedDepths.forEach((record, lockedPieces) => {
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.keys(record)).toEqual([
      'lockedPieces', 'frontierStates', 'transitions', 'boundPrunes',
    ]);
    expect(record.lockedPieces).toBe(lockedPieces);
  });
  expect(certificate.exhaustedFrontierWidths).toEqual(
    certificate.exhaustedDepths.map(({ frontierStates }) => frontierStates),
  );
  expect(certificate.exploredStateCount).toBe(
    certificate.exhaustedDepths.reduce((sum, { frontierStates }) => sum + frontierStates, 0),
  );
  expect(certificate.transitionCount).toBe(
    certificate.exhaustedDepths.reduce((sum, { transitions }) => sum + transitions, 0),
  );
  expect(certificate.deficitBoundPrunes).toBe(
    certificate.exhaustedDepths.reduce((sum, { boundPrunes }) => sum + boundPrunes, 0),
  );
}

describe.runIf(RUN_EXACT)('strict Endgame mastery optimum certificates', () => {
  for (const expected of ENDGAME_OPTIMAL_CERTIFICATES) {
    it(`exhausts every shorter public-control route for ${expected.levelId}`, () => {
      const actual = certifyOptimalEndgameRoute(expected.levelId, expected.route);
      expect(actual).not.toBeNull();
      if (actual === null) throw new Error(`Missing exact certificate for ${expected.levelId}.`);
      expectDepthTelemetry(
        actual,
        MASTERY_EXHAUSTED_DEPTHS[
          expected.levelId as keyof typeof MASTERY_EXHAUSTED_DEPTHS
        ],
      );
      expect({
        levelId: actual.levelId,
        optimalOperations: actual.optimalLocks,
        initialStateHash: actual.initialStateHash,
        route: encodeEndgameRoute(actual.replay.commands),
        exhaustedFrontierWidths: actual.exhaustedFrontierWidths,
        exploredStateCount: actual.exploredStateCount,
        transitionCount: actual.transitionCount,
        deficitBoundPrunes: actual.deficitBoundPrunes,
      }).toEqual({
        levelId: expected.levelId,
        optimalOperations: expected.optimalOperations,
        initialStateHash: expected.initialStateHash,
        route: expected.route,
        exhaustedFrontierWidths: expected.exhaustedFrontierWidths,
        exploredStateCount: expected.exploredStateCount,
        transitionCount: expected.transitionCount,
        deficitBoundPrunes: expected.deficitBoundPrunes,
      });
    }, 600_000);
  }

  for (const admission of ANCHOR_ADMISSION_CERTIFICATES) {
    it(`exhausts every shorter public-control route for the ${admission.label} admission fixture`, () => {
      const actual = certifyOptimalEndgameRouteForDefinition(admission.definition, admission.route);
      expect(actual).not.toBeNull();
      if (actual === null) throw new Error(`Missing exact certificate for ${admission.label}.`);
      expectDepthTelemetry(actual, admission.exhaustedDepths);
      expect({
        optimalOperations: actual.optimalLocks,
        initialStateHash: actual.initialStateHash,
        route: encodeEndgameRoute(actual.replay.commands),
        exhaustedFrontierWidths: actual.exhaustedFrontierWidths,
        exploredStateCount: actual.exploredStateCount,
        transitionCount: actual.transitionCount,
        deficitBoundPrunes: actual.deficitBoundPrunes,
        completion: actual.replay.state.endgameCompletion,
        remainingTargetCount: actual.replay.state.endgameTargetCells.length,
        supportedCellCount: actual.replay.state.endgameAnchorSupportedCells.length,
      }).toEqual({
        optimalOperations: admission.optimalOperations,
        initialStateHash: admission.initialStateHash,
        route: admission.route,
        exhaustedFrontierWidths: admission.exhaustedFrontierWidths,
        exploredStateCount: admission.exploredStateCount,
        transitionCount: admission.transitionCount,
        deficitBoundPrunes: admission.deficitBoundPrunes,
        completion: 'finished',
        remainingTargetCount: 0,
        supportedCellCount: admission.supportedCellCount,
      });
    }, 180_000);
  }
});
