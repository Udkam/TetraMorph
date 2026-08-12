import { describe, expect, it } from 'vitest';
import hard31To40File from '../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-31-40.json';
import hard41To50File from '../docs/workstreams/tetris-t37-endgame/fixtures/t15/endgame-levels-41-50.json';
import hard36File from '../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-36.json';
import hard38File from '../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-38.json';
import hard47File from '../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-47.json';
import hard46To50File from '../docs/workstreams/tetris-t37-endgame/fixtures/t32/endgame-levels-changed-46-50-r2.json';
import { replayEndgameRoute } from './game/core/endgameRouteSearch';
import { CAMPAIGN_LEVELS, ENDGAME_CATEGORIES } from './endgameProgress';
import {
  ENDGAME_HARD_MASTERY_GROUPS,
  ENDGAME_OPTIMAL_CERTIFICATES,
  endgameHardMasteryGroup,
  endgameOptimalCertificate,
} from './endgameMastery';

type HardTechniqueWitness = {
  id: string;
  routes: readonly { commandStream: string; locks: number }[];
};

type HardTechniqueArtifact = { levels: readonly HardTechniqueWitness[] };

const hardTechniqueWitnessById = new Map<string, HardTechniqueWitness>();
for (const file of [hard31To40File, hard41To50File] as unknown as readonly HardTechniqueArtifact[]) {
  for (const witness of file.levels) hardTechniqueWitnessById.set(witness.id, witness);
}
for (const file of [hard36File, hard38File, hard47File, hard46To50File] as unknown as readonly HardTechniqueArtifact[]) {
  for (const witness of file.levels) hardTechniqueWitnessById.set(witness.id, witness);
}

describe('Endgame mastery certificate registry', () => {
  it('freezes three completed public-command witnesses at optimum plus five', () => {
    expect(ENDGAME_OPTIMAL_CERTIFICATES).toHaveLength(3);
    for (const certificate of ENDGAME_OPTIMAL_CERTIFICATES) {
      const replay = replayEndgameRoute(certificate.levelId, certificate.route);
      expect(replay.state.status, certificate.levelId).toBe('finished');
      expect(replay.state.endgameCompletion, certificate.levelId).toBe('finished');
      expect(replay.locks, certificate.levelId).toHaveLength(certificate.optimalOperations);
      expect(certificate.optimalOperations, certificate.levelId).toBeLessThanOrEqual(7);
      expect(certificate.masteryOperations, certificate.levelId).toBe(certificate.optimalOperations + 5);
      expect(certificate.exhaustedFrontierWidths, certificate.levelId).toHaveLength(certificate.optimalOperations - 1);
      expect(certificate.exploredStateCount, certificate.levelId).toBe(
        certificate.exhaustedFrontierWidths.reduce((sum, width) => sum + width, 0),
      );
      expect(endgameOptimalCertificate(certificate.levelId)).toBe(certificate);
    }
  });

  it('replays each technique signature from setup through contraction', () => {
    for (const certificate of ENDGAME_OPTIMAL_CERTIFICATES) {
      const { signature } = certificate;
      const initial = replayEndgameRoute(certificate.levelId, 'S');
      const settledTargetCounts: number[] = [];

      for (let index = 1; index <= certificate.route.length; index += 1) {
        const replay = replayEndgameRoute(certificate.levelId, certificate.route.slice(0, index));
        if (replay.locks.length > 0) {
          settledTargetCounts[replay.locks.length - 1] = replay.state.endgameTargetCells.length;
        }
      }

      expect(initial.state.endgameTargetCells, certificate.levelId).toHaveLength(signature.initialTargetCount);
      expect(settledTargetCounts, certificate.levelId).toHaveLength(certificate.optimalOperations);
      expect(settledTargetCounts.slice(0, signature.setupLockCount), certificate.levelId).toEqual(
        Array.from({ length: signature.setupLockCount }, () => signature.initialTargetCount),
      );
      expect(settledTargetCounts[signature.setupLockCount], certificate.levelId).toBe(
        signature.decisiveTargetCount,
      );
      expect(settledTargetCounts.slice(signature.setupLockCount + 1), certificate.levelId).toEqual([
        ...signature.continuationTargetCounts,
      ]);

      const contraction = [signature.decisiveTargetCount, ...signature.continuationTargetCounts];
      expect(contraction.at(-1), certificate.levelId).toBe(0);
      expect(contraction.every((count, index) => index === 0 || count < contraction[index - 1]), certificate.levelId).toBe(
        true,
      );
    }
  });

  it('assigns every Hard level to exactly one related Easy mastery group', () => {
    const easyIds = new Set(ENDGAME_CATEGORIES.find(({ id }) => id === 'easy')!.levels.map(({ id }) => id));
    const hardIds = ENDGAME_CATEGORIES.find(({ id }) => id === 'hard')!.levels.map(({ id }) => id);
    const assigned = ENDGAME_HARD_MASTERY_GROUPS.flatMap(({ hardLevelIds }) => hardLevelIds);
    expect(new Set(assigned)).toEqual(new Set(hardIds));
    expect(assigned).toHaveLength(new Set(assigned).size);
    for (const group of ENDGAME_HARD_MASTERY_GROUPS) {
      expect(easyIds.has(group.prerequisiteId), group.prerequisiteId).toBe(true);
      expect(endgameOptimalCertificate(group.prerequisiteId)?.technique).toBe(group.technique);
      for (const levelId of group.hardLevelIds) expect(endgameHardMasteryGroup(levelId)).toBe(group);
    }
    expect(CAMPAIGN_LEVELS).toHaveLength(50);
  });

  it('replays every Hard witness through its Easy technique contraction contract', () => {
    for (const group of ENDGAME_HARD_MASTERY_GROUPS) {
      const certificate = endgameOptimalCertificate(group.prerequisiteId);
      expect(certificate?.technique, group.prerequisiteId).toBe(group.technique);
      expect(certificate?.signature.setupLockCount, group.prerequisiteId).toBeGreaterThan(0);
      expect(certificate?.signature.decisiveTargetCount, group.prerequisiteId).toBeLessThan(
        certificate?.signature.initialTargetCount ?? 0,
      );
      expect(certificate?.signature.continuationTargetCounts.at(-1), group.prerequisiteId).toBe(0);

      for (const levelId of group.hardLevelIds) {
        const witness = hardTechniqueWitnessById.get(levelId);
        expect(witness, levelId).toBeDefined();
        if (!witness) continue;

        const primary = witness.routes[0];
        expect(primary, levelId).toBeDefined();
        if (!primary) continue;

        const initialTargetCount = replayEndgameRoute(levelId, 'S').state.endgameTargetCells.length;
        const lockEndpoints = [...primary.commandStream.matchAll(/HT*/g)].map(
          (match) => (match.index ?? -1) + match[0].length,
        );
        expect(lockEndpoints, levelId).toHaveLength(primary.locks);

        const targetCounts = lockEndpoints.map(
          (endpoint) => replayEndgameRoute(levelId, primary.commandStream.slice(0, endpoint)).state
            .endgameTargetCells.length,
        );
        const decisiveIndex = targetCounts.findIndex((count) => count < initialTargetCount);
        expect(initialTargetCount, levelId).toBeGreaterThan(0);
        expect(decisiveIndex, levelId).toBeGreaterThanOrEqual(0);
        expect(targetCounts.slice(0, decisiveIndex), levelId).toEqual(
          Array.from({ length: decisiveIndex }, () => initialTargetCount),
        );

        const contraction = targetCounts.slice(decisiveIndex);
        expect(contraction[0], levelId).toBeLessThan(initialTargetCount);
        expect(contraction.at(-1), levelId).toBe(0);
        expect(
          contraction.every((count, index) => index === 0 || count <= contraction[index - 1]),
          levelId,
        ).toBe(true);
        expect(replayEndgameRoute(levelId, primary.commandStream).state.endgameCompletion, levelId).toBe(
          'finished',
        );
      }
    }
  });
});
