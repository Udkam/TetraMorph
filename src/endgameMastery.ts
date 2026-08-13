import type { EndgameId } from './game/core';
import type { EndgameTechnique } from './endgameLessons';

export type EndgameTechniqueSignature = Readonly<{
  /** Original targets present before the certified route makes any placement. */
  initialTargetCount: number;
  /** Placements that establish the technique before its first target-removing clear. */
  setupLockCount: number;
  /** Targets remaining immediately after the route's first decisive clear. */
  decisiveTargetCount: number;
  /** Settled target frontier after every later placement; the final value must be zero. */
  continuationTargetCounts: readonly number[];
}>;

export type EndgameOptimalCertificate = Readonly<{
  levelId: EndgameId;
  technique: EndgameTechnique;
  optimalOperations: number;
  masteryOperations: number;
  initialStateHash: string;
  route: string;
  exhaustedFrontierWidths: readonly number[];
  exploredStateCount: number;
  transitionCount: number;
  deficitBoundPrunes: number;
  signature: EndgameTechniqueSignature;
}>;

/**
 * Frozen authoring certificates. The product reads these values only; the exhaustive
 * verifier lives in Core tests and never runs in the browser.
 */
export const ENDGAME_OPTIMAL_CERTIFICATES: readonly EndgameOptimalCertificate[] = Object.freeze([
  Object.freeze({
    levelId: 't5r-arc-13',
    technique: 'build-support',
    optimalOperations: 5,
    masteryOperations: 10,
    initialStateHash: 'b9d99302',
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
    initialStateHash: 'a5cb7240',
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
    initialStateHash: '845c1bd0',
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

export type EndgameHardMasteryGroup = Readonly<{
  prerequisiteId: EndgameId;
  technique: EndgameTechnique;
  hardLevelIds: readonly EndgameId[];
}>;

function endgameIds(...ids: EndgameId[]): readonly EndgameId[] {
  return Object.freeze(ids);
}

export const ENDGAME_HARD_MASTERY_GROUPS: readonly EndgameHardMasteryGroup[] = Object.freeze([
  Object.freeze({
    prerequisiteId: 't5r-prism-11',
    technique: 'avoid-hole',
    hardLevelIds: endgameIds(
      'tm-endgame-31', 'tm-endgame-34', 'tm-endgame-35',
      'tm-endgame-39', 'tm-endgame-46', 'tm-endgame-47',
    ),
  }),
  Object.freeze({
    prerequisiteId: 't5r-current-12',
    technique: 'retain-opening',
    hardLevelIds: endgameIds(
      'tm-endgame-32', 'tm-endgame-33', 'tm-endgame-40', 'tm-endgame-41',
      'tm-endgame-43', 'tm-endgame-45', 'tm-endgame-48', 'tm-endgame-50',
    ),
  }),
  Object.freeze({
    prerequisiteId: 't5r-arc-13',
    technique: 'build-support',
    hardLevelIds: endgameIds(
      'tm-endgame-36', 'tm-endgame-37', 'tm-endgame-38',
      'tm-endgame-42', 'tm-endgame-44', 'tm-endgame-49',
    ),
  }),
]);

const CERTIFICATE_BY_LEVEL = new Map(ENDGAME_OPTIMAL_CERTIFICATES.map((certificate) => [certificate.levelId, certificate]));
const HARD_GROUP_BY_LEVEL = new Map<EndgameId, EndgameHardMasteryGroup>();
for (const group of ENDGAME_HARD_MASTERY_GROUPS) {
  const certificate = CERTIFICATE_BY_LEVEL.get(group.prerequisiteId);
  if (!certificate || certificate.technique !== group.technique) {
    throw new Error(`Endgame mastery group lacks a matching optimum certificate: ${group.prerequisiteId}.`);
  }
  if (certificate.masteryOperations !== certificate.optimalOperations + 5) {
    throw new Error(`Endgame mastery threshold must equal optimum plus five: ${group.prerequisiteId}.`);
  }
  for (const levelId of group.hardLevelIds) {
    if (HARD_GROUP_BY_LEVEL.has(levelId)) throw new Error(`Hard Endgame belongs to multiple mastery groups: ${levelId}.`);
    HARD_GROUP_BY_LEVEL.set(levelId, group);
  }
}
if (HARD_GROUP_BY_LEVEL.size !== 20) throw new Error('Every Hard Endgame must belong to exactly one mastery group.');

export function endgameOptimalCertificate(levelId: EndgameId): EndgameOptimalCertificate | null {
  return CERTIFICATE_BY_LEVEL.get(levelId) ?? null;
}

export function endgameHardMasteryGroup(levelId: EndgameId): EndgameHardMasteryGroup | null {
  return HARD_GROUP_BY_LEVEL.get(levelId) ?? null;
}
