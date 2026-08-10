import type { PuzzleId } from './game/core';
import type { PuzzleTechnique } from './puzzleLessons';

export type PuzzleTechniqueSignature = Readonly<{
  /** Original targets present before the certified route makes any placement. */
  initialTargetCount: number;
  /** Placements that establish the technique before its first target-removing clear. */
  setupLockCount: number;
  /** Targets remaining immediately after the route's first decisive clear. */
  decisiveTargetCount: number;
  /** Settled target frontier after every later placement; the final value must be zero. */
  continuationTargetCounts: readonly number[];
}>;

export type PuzzleOptimalCertificate = Readonly<{
  levelId: PuzzleId;
  technique: PuzzleTechnique;
  optimalOperations: number;
  masteryOperations: number;
  initialStateHash: string;
  route: string;
  exhaustedFrontierWidths: readonly number[];
  exploredStateCount: number;
  transitionCount: number;
  deficitBoundPrunes: number;
  signature: PuzzleTechniqueSignature;
}>;

/**
 * Frozen authoring certificates. The product reads these values only; the exhaustive
 * verifier lives in Core tests and never runs in the browser.
 */
export const PUZZLE_OPTIMAL_CERTIFICATES: readonly PuzzleOptimalCertificate[] = Object.freeze([
  Object.freeze({
    levelId: 't5r-arc-13',
    technique: 'build-support',
    optimalOperations: 5,
    masteryOperations: 10,
    initialStateHash: '1c4d5e6a',
    route: 'SCRRRRHTTTCCLLLHTTTCCRHTTTTTTTTTTTTRRRRHTTTTTTTTTTTTCLLLLHTTTTTTTTTTTT',
    exhaustedFrontierWidths: Object.freeze([1, 5, 13, 13]),
    exploredStateCount: 32,
    transitionCount: 850,
    deficitBoundPrunes: 598,
    signature: Object.freeze({
      initialTargetCount: 24,
      setupLockCount: 2,
      decisiveTargetCount: 17,
      continuationTargetCounts: Object.freeze([16, 0]),
    }),
  }),
  Object.freeze({
    levelId: 't5r-current-12',
    technique: 'retain-opening',
    optimalOperations: 6,
    masteryOperations: 11,
    initialStateHash: '04b7f198',
    route: 'SCHTTTCLLHTTTCRRRRHTTTRRRHTTTCLLLLHTTTTTTTTTTTTCLLLLHTTTTTTTTTTTT',
    exhaustedFrontierWidths: Object.freeze([1, 17, 225, 953, 1890]),
    exploredStateCount: 3086,
    transitionCount: 104102,
    deficitBoundPrunes: 34851,
    signature: Object.freeze({
      initialTargetCount: 24,
      setupLockCount: 4,
      decisiveTargetCount: 8,
      continuationTargetCounts: Object.freeze([0]),
    }),
  }),
  Object.freeze({
    levelId: 't5r-prism-11',
    technique: 'avoid-hole',
    optimalOperations: 6,
    masteryOperations: 11,
    initialStateHash: '3be8a7b4',
    route: 'SCRRRRHTTTCCLLLHTTTCCRHTTTTTTTTTTTTRRRRHTTTTTTTTTTTTCLLLLHTTTTTTTTTTTTCHTTTTTTTTTTTT',
    exhaustedFrontierWidths: Object.freeze([1, 17, 428, 4381, 5735]),
    exploredStateCount: 10562,
    transitionCount: 295627,
    deficitBoundPrunes: 83076,
    signature: Object.freeze({
      initialTargetCount: 24,
      setupLockCount: 2,
      decisiveTargetCount: 17,
      continuationTargetCounts: Object.freeze([16, 8, 0]),
    }),
  }),
]);

export type PuzzleHardMasteryGroup = Readonly<{
  prerequisiteId: PuzzleId;
  technique: PuzzleTechnique;
  hardLevelIds: readonly PuzzleId[];
}>;

function puzzleIds(...ids: PuzzleId[]): readonly PuzzleId[] {
  return Object.freeze(ids);
}

export const PUZZLE_HARD_MASTERY_GROUPS: readonly PuzzleHardMasteryGroup[] = Object.freeze([
  Object.freeze({
    prerequisiteId: 't5r-prism-11',
    technique: 'avoid-hole',
    hardLevelIds: puzzleIds(
      'tm-puzzle-31', 'tm-puzzle-34', 'tm-puzzle-35',
      'tm-puzzle-39', 'tm-puzzle-46', 'tm-puzzle-47',
    ),
  }),
  Object.freeze({
    prerequisiteId: 't5r-current-12',
    technique: 'retain-opening',
    hardLevelIds: puzzleIds(
      'tm-puzzle-32', 'tm-puzzle-33', 'tm-puzzle-40', 'tm-puzzle-41',
      'tm-puzzle-43', 'tm-puzzle-45', 'tm-puzzle-48', 'tm-puzzle-50',
    ),
  }),
  Object.freeze({
    prerequisiteId: 't5r-arc-13',
    technique: 'build-support',
    hardLevelIds: puzzleIds(
      'tm-puzzle-36', 'tm-puzzle-37', 'tm-puzzle-38',
      'tm-puzzle-42', 'tm-puzzle-44', 'tm-puzzle-49',
    ),
  }),
]);

const CERTIFICATE_BY_LEVEL = new Map(PUZZLE_OPTIMAL_CERTIFICATES.map((certificate) => [certificate.levelId, certificate]));
const HARD_GROUP_BY_LEVEL = new Map<PuzzleId, PuzzleHardMasteryGroup>();
for (const group of PUZZLE_HARD_MASTERY_GROUPS) {
  const certificate = CERTIFICATE_BY_LEVEL.get(group.prerequisiteId);
  if (!certificate || certificate.technique !== group.technique) {
    throw new Error(`Puzzle mastery group lacks a matching optimum certificate: ${group.prerequisiteId}.`);
  }
  if (certificate.masteryOperations !== certificate.optimalOperations + 5) {
    throw new Error(`Puzzle mastery threshold must equal optimum plus five: ${group.prerequisiteId}.`);
  }
  for (const levelId of group.hardLevelIds) {
    if (HARD_GROUP_BY_LEVEL.has(levelId)) throw new Error(`Hard Puzzle belongs to multiple mastery groups: ${levelId}.`);
    HARD_GROUP_BY_LEVEL.set(levelId, group);
  }
}
if (HARD_GROUP_BY_LEVEL.size !== 20) throw new Error('Every Hard Puzzle must belong to exactly one mastery group.');

export function puzzleOptimalCertificate(levelId: PuzzleId): PuzzleOptimalCertificate | null {
  return CERTIFICATE_BY_LEVEL.get(levelId) ?? null;
}

export function puzzleHardMasteryGroup(levelId: PuzzleId): PuzzleHardMasteryGroup | null {
  return HARD_GROUP_BY_LEVEL.get(levelId) ?? null;
}
