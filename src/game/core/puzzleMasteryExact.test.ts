import { describe, expect, it } from 'vitest';
import { PUZZLE_OPTIMAL_CERTIFICATES } from '../../puzzleMastery';
import { getPuzzleDefinition, type PuzzleDefinition } from './puzzles';
import {
  certifyOptimalPuzzleRoute,
  certifyOptimalPuzzleRouteForDefinition,
  encodePuzzleRoute,
} from './puzzleRouteSearch';

const driftDefinition = getPuzzleDefinition('t5r-drift-08');
const dualAnchorDriftDefinition: PuzzleDefinition = Object.freeze({
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
    exhaustedFrontierWidths: Object.freeze([1, 20, 750]),
    exploredStateCount: 771,
    transitionCount: 14_640,
    deficitBoundPrunes: 0,
    supportedCellCount: 4,
  }),
]);

// The proof is intentionally opt-in: complete public-control searches can take several
// minutes on one worker. Release verification runs this file once with
// PUZZLE_EXACT_CERTIFICATES=1; the ordinary suite still validates every frozen field.
// @ts-expect-error Node environment variables are available to Vitest but not product types.
const RUN_EXACT = process.env.PUZZLE_EXACT_CERTIFICATES === '1';

describe.runIf(RUN_EXACT)('strict Puzzle mastery optimum certificates', () => {
  for (const expected of PUZZLE_OPTIMAL_CERTIFICATES) {
    it(`exhausts every shorter public-control route for ${expected.levelId}`, () => {
      const actual = certifyOptimalPuzzleRoute(expected.levelId, expected.route);
      expect(actual).not.toBeNull();
      expect(actual && {
        levelId: actual.levelId,
        optimalOperations: actual.optimalLocks,
        initialStateHash: actual.initialStateHash,
        route: encodePuzzleRoute(actual.replay.commands),
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
      const actual = certifyOptimalPuzzleRouteForDefinition(admission.definition, admission.route);
      expect(actual).not.toBeNull();
      expect(actual && {
        optimalOperations: actual.optimalLocks,
        initialStateHash: actual.initialStateHash,
        route: encodePuzzleRoute(actual.replay.commands),
        exhaustedFrontierWidths: actual.exhaustedFrontierWidths,
        exploredStateCount: actual.exploredStateCount,
        transitionCount: actual.transitionCount,
        deficitBoundPrunes: actual.deficitBoundPrunes,
        completion: actual.replay.state.puzzleCompletion,
        remainingTargetCount: actual.replay.state.puzzleTargetCells.length,
        supportedCellCount: actual.replay.state.puzzleAnchorSupportedCells.length,
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
